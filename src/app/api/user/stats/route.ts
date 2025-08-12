import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '../../../../database';

export async function GET() {
  let connection;
  try {
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

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
    
    // Buscar estatísticas do usuário
    const [productStats] = await connection.execute(
      'SELECT COUNT(*) as totalProducts FROM products WHERE user_id = ?',
      [userId]
    ) as [{ totalProducts: number }[], unknown];
    
    const [movementStats] = await connection.execute(
      'SELECT COUNT(*) as totalMovements FROM movements WHERE user_id = ? AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())',
      [userId]
    ) as [{ totalMovements: number }[], unknown];
    
    const [accountStats] = await connection.execute(
      'SELECT COUNT(*) as totalAccounts FROM accounts WHERE user_id = ?',
      [userId]
    ) as [{ totalAccounts: number }[], unknown];
    
    const [pendingStats] = await connection.execute(
      'SELECT COUNT(*) as pendingAccounts FROM accounts WHERE user_id = ? AND status = "pendente"',
      [userId]
    ) as [{ pendingAccounts: number }[], unknown];

    const stats = {
      totalProducts: productStats[0]?.totalProducts || 0,
      totalMovements: movementStats[0]?.totalMovements || 0,
      totalAccounts: accountStats[0]?.totalAccounts || 0,
      pendingAccounts: pendingStats[0]?.pendingAccounts || 0
    };

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
  } finally {
    if (connection) connection.end();
  }
}