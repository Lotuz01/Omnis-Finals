import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database.js';
import { cookies } from 'next/headers';

// GET - Listar todas as contas
export async function GET(request: Request) {
  let connection;
  try {
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'pagar' ou 'receber'
    const status = searchParams.get('status'); // 'pendente', 'pago', 'vencido'
    
    connection = await connectToDatabase();
    
    // Buscar o usuário pelo username
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;
    
    let query = `
      SELECT 
        a.*,
        u.name as user_name
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
    `;
    
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
    
    const [rows] = await connection.execute(query, params) as [unknown[], unknown];
    
    // Atualizar status para vencido se necessário (apenas para o usuário logado)
    const today = new Date().toISOString().split('T')[0];
    await connection.execute(
      "UPDATE accounts SET status = 'vencido' WHERE due_date < ? AND status = 'pendente' AND user_id = ?",
      [today, userId]
    );
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { message: 'Error fetching accounts', error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.end();
  }
}

// POST - Criar nova conta
export async function POST(request: Request) {
  let connection;
  try {
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth_token')?.value;

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

    connection = await connectToDatabase();

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    
    // Buscar o usuário pelo username
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;

    // Inserir a conta
    const [result] = await connection.execute(
      `INSERT INTO accounts 
       (type, description, amount, due_date, category, supplier_customer, notes, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [type, description, amount, due_date, category || null, supplier_customer || null, notes || null, userId]
    ) as [{ insertId: number }, unknown];

    // Vincular produtos à conta
    if (products && Array.isArray(products)) {
      for (const item of products) {
        await connection.execute(
          'INSERT INTO account_products (account_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [result.insertId, item.product_id, item.quantity, item.price]
        );
      }
    }

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
  } finally {
    if (connection) connection.end();
  }
}