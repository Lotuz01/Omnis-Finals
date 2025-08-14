import { NextResponse } from 'next/server';
import { dbPool } from '@/utils/database-pool';
import { cookies } from 'next/headers';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../../lib/redis';
import { invalidateCacheByRoute } from '../../../middleware/cache';

// GET - Listar todas as contas
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'pagar' ou 'receber'
    const status = searchParams.get('status'); // 'pendente', 'pago', 'vencido'
    
    // Buscar o usuário pelo username - usando índice idx_users_username
    const [userRows] = await dbPool.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;
    
    // Verificar cache primeiro
    const cacheKey = `${CACHE_KEYS.ACCOUNTS}:${username}:${type || 'all'}:${status || 'all'}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData && typeof cachedData === 'string') {
      return NextResponse.json(JSON.parse(cachedData));
    }
    
    let query = `
      SELECT 
        a.*,
        u.name as user_name
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
    `;
    
    // Comentário: Query otimizada para usar índice idx_accounts_user_due_date
    
    const params: unknown[] = [userId];
    
    if (type) {
      query += ' AND a.type = ?';
      params.push(type);
    }
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY a.due_date ASC';
    
    const [rows] = await dbPool.execute(query, params) as [unknown[], unknown];
    
    // Atualizar status para vencido se necessário - usando índice idx_accounts_status_due_date
    const today = new Date().toISOString().split('T')[0];
    await dbPool.execute(
      "UPDATE accounts SET status = 'vencido', updated_at = NOW() WHERE due_date < ? AND status = 'pendente' AND user_id = ?",
      [today, userId]
    );
    
    // Cache do resultado por 5 minutos
    await cache.set(cacheKey, rows, CACHE_TTL.MEDIUM);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { message: 'Error fetching accounts', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Criar nova conta
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { 
      type, 
      description, 
      amount, 
      due_date, 
      category, 
      supplier_customer, 
      notes,
      products // Novo campo para vincular produtos
    } = await request.json();

    if (!type || !description || !amount || !due_date) {
      return NextResponse.json(
        { message: 'Missing required fields: type, description, amount, due_date' },
        { status: 400 }
      );
    }

    if (type !== 'pagar' && type !== 'receber') {
      return NextResponse.json(
        { message: 'Type must be "pagar" or "receber"' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { message: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    
    // Buscar o usuário pelo username - usando índice idx_users_username
    const [userRows] = await dbPool.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;

    // Inserir a conta - query otimizada com campos reordenados
    const [result] = await dbPool.execute(
      `INSERT INTO accounts 
       (user_id, type, description, amount, due_date, category, supplier_customer, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, type, description, amount, due_date, category || null, supplier_customer || null, notes || null]
    ) as [{ insertId: number }, unknown];

    // Vincular produtos à conta
    if (products && Array.isArray(products)) {
      for (const item of products) {
        await dbPool.execute(
          'INSERT INTO account_products (account_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [result.insertId, item.product_id, item.quantity, item.price]
        );
      }
    }

    // Invalidar cache após criação
    await cache.del(`${CACHE_KEYS.ACCOUNTS}:${username}:*`);
    await invalidateCacheByRoute('/api/accounts');
    
    return NextResponse.json(
      { 
        message: 'Account created successfully',
        accountId: result.insertId
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { message: 'Error creating account', error: (error as Error).message },
      { status: 500 }
    );
  }
}