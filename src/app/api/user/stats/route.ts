import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { executeQuery } from '../../../../database.js';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    
    // Verificar cache primeiro
    const cachedStats = await cache.get(CACHE_KEYS.USER_STATS(username));
    if (cachedStats && typeof cachedStats === 'string') {
      return NextResponse.json(JSON.parse(cachedStats));
    }
    
    // Buscar o usuário pelo username - usando índice idx_users_username
    const [userRows] = await executeQuery(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;
    
    // Buscar estatísticas do usuário - queries otimizadas com índices
    const [productStats] = await executeQuery(
      'SELECT COUNT(*) as totalProducts FROM products WHERE user_id = ?',
      [userId]
    );
    
    // Query otimizada para movimentações do mês atual - usando índice idx_movements_main
    const [movementStats] = await executeQuery(
      'SELECT COUNT(*) as totalMovements FROM movements WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW(), "%Y-%m-01")',
      [userId]
    );
    
    // Query otimizada para contas - usando índice idx_accounts_user_due_date
    const [accountStats] = await executeQuery(
      'SELECT COUNT(*) as totalAccounts FROM accounts WHERE user_id = ?',
      [userId]
    );
    
    // Query otimizada para contas pendentes - usando índice idx_accounts_status_due_date
    const [pendingStats] = await executeQuery(
      'SELECT COUNT(*) as pendingAccounts FROM accounts WHERE user_id = ? AND status = "pendente"',
      [userId]
    );

    const stats = {
      totalProducts: productStats[0]?.totalProducts || 0,
      totalMovements: movementStats[0]?.totalMovements || 0,
      totalAccounts: accountStats[0]?.totalAccounts || 0,
      pendingAccounts: pendingStats[0]?.pendingAccounts || 0
    };
    
    // Armazenar no cache por 2 minutos
    await cache.set(CACHE_KEYS.USER_STATS(username), stats, CACHE_TTL.SHORT);

    return NextResponse.json(stats);

  } catch (error: unknown) {
    console.error('🔴 [API USER STATS] Error fetching user stats:', error);
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