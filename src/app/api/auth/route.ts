import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  let connection;
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Missing username or password' }, { status: 400 });
    }

    connection = await connectToDatabase();
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ?', [username]
    ) as [{ id: number; username: string; password: string; isAdmin: number; [key: string]: unknown }[], unknown];

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ message: 'Login successful', user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
    
    // Configurar cookie como cookie de sessão (sem persistência) para exigir login em cada nova sessão do navegador
    const timestamp = Date.now();
    response.cookies.set('auth_token', `${user.username}_${timestamp}`, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      sameSite: 'lax'
    });

    // Também armazenar dados do usuário como cookie de sessão
    const userPayload = { id: user.id, username: user.username, isAdmin: Boolean(user.isAdmin) };
    response.cookies.set('user', JSON.stringify(userPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax'
    });
    
    // Adicionar headers para evitar cache
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}