import { NextResponse } from 'next/server';
import { executeQuery } from '../../../database.js';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Missing username or password' }, { status: 400 });
    }

    const rows = await executeQuery(
      'SELECT id, username, password, name, is_admin FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ 
      message: 'Login successful', 
      user: { 
        id: user.id, 
        username: user.username, 
        is_admin: Boolean(user.is_admin),
        isAdmin: Boolean(user.is_admin)
      } 
    });
    
    const timestamp = Date.now();
    response.cookies.set('auth_token', `${user.username}_${timestamp}`, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      sameSite: 'lax'
    });

    const userPayload = { id: user.id, username: user.username, is_admin: Boolean(user.is_admin) };
    response.cookies.set('user', JSON.stringify(userPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax'
    });
    
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
  }
}