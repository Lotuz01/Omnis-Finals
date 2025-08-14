import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbPool } from '../../../utils/database-pool';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const [rows] = await dbPool.execute(
      'SELECT id, username, name, is_admin FROM users WHERE username = ?', [username]
    ) as [{ id: number; username: string; name: string; is_admin: boolean }[], unknown];

    if (rows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = rows[0];
    return NextResponse.json({ id: user.id, username: user.username, name: user.name, isAdmin: user.is_admin });

  } catch (error: unknown) {
    console.error('🔴 [API USER] Error fetching user data:', error);
    if (error instanceof Error) {
      return NextResponse.json({
        message: 'Internal server error',
        error: error.message,
        stack: error.stack
      }, { status: 500 });
    } else {
      return NextResponse.json({
        message: 'Internal server error',
        error: 'Unknown error',
        details: JSON.stringify(error)
      }, { status: 500 });
    }
  }
}