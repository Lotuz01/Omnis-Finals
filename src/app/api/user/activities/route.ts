import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbPool } from '../../../../utils/database-pool';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../../../lib/cache';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    
    // Verificar cache primeiro - cache por 1 minuto para atividades
    const cachedActivities = await cache.get(CACHE_KEYS.USER_ACTIVITIES(username));
    if (cachedActivities && typeof cachedActivities === 'string') {
      return NextResponse.json(JSON.parse(cachedActivities));
    }
    
    // Buscar o usuário pelo username - usando índice idx_users_username
    const [userRows] = await dbPool.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;
    
    // Buscar atividades reais do banco de dados
    const activities: any[] = [];

    // Buscar produtos recentes do usuário - usando índice idx_products_user_updated
    const [products] = await dbPool.execute(
      'SELECT name, price as value, updated_at as created_at FROM products WHERE user_id = ? ORDER BY updated_at DESC LIMIT 3',
      [userId]
    ) as [{ name: string; value: number; created_at: Date }[], unknown];

    products.forEach(product => {
      activities.push({
        type: 'product',
        name: product.name,
        value: product.value?.toString() || '0',
        created_at: new Date() // Usar data atual como fallback
      });
    });

    // Buscar movimentações recentes do usuário - usando índice idx_movements_main
    const [movements] = await dbPool.execute(
      'SELECT p.name, m.quantity as value, m.created_at FROM movements m JOIN products p ON m.product_id = p.id AND p.user_id = m.user_id WHERE m.user_id = ? ORDER BY m.created_at DESC LIMIT 3',
      [userId]
    ) as [{ name: string; value: number; created_at: Date }[], unknown];

    movements.forEach(movement => {
      activities.push({
        type: 'movement',
        name: movement.name,
        value: movement.value?.toString() || '0',
        created_at: movement.created_at
      });
    });

    // Buscar contas recentes do usuário - usando índice idx_accounts_user_due_date
    const [accounts] = await dbPool.execute(
      'SELECT description as name, amount as value, created_at FROM accounts WHERE user_id = ? ORDER BY created_at DESC LIMIT 2',
      [userId]
    ) as [{ name: string; value: number; created_at: Date }[], unknown];

    accounts.forEach(account => {
      activities.push({
        type: 'account',
        name: account.name,
        value: account.value?.toString() || '0',
        created_at: account.created_at
      });
    });

    // Ordenar todas as atividades por data (mais recentes primeiro)
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Retornar apenas as 8 atividades mais recentes
    const result = activities.slice(0, 8);
    
    // Armazenar no cache por 1 minuto
    await cache.set(CACHE_KEYS.USER_ACTIVITIES(username), result, CACHE_TTL.SHORT);
    
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('🔴 [API USER ACTIVITIES] Error fetching user activities:', error);
    if (error instanceof Error) {
      return NextResponse.json({
        message: 'Internal server error',
        error: error.message
      }, { status: 500 });
    } else {
      return NextResponse.json({
        message: 'Internal server error',
        error: 'Unknown error'
      }, { status: 500 });
    }
  }
}