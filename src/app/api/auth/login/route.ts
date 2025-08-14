import { NextResponse } from 'next/server';
import { dbPool } from '../../../../utils/database-pool';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    console.log('🔐 [LOGIN] Tentativa de login para:', username);

    if (!username || !password) {
      console.log('🔐 [LOGIN] Dados faltando - username:', !!username, 'password:', !!password);
      return NextResponse.json({ message: 'Missing username or password' }, { status: 400 });
    }

    const [rows] = await dbPool.execute(
      'SELECT id, username, password, name, is_admin FROM users WHERE username = ?',
      [username]
    ) as [{ id: number; username: string; password: string; name: string; is_admin: number }[], unknown];

    console.log('🔐 [LOGIN] Usuários encontrados:', rows.length);
    
    if (rows.length === 0) {
      console.log('🔐 [LOGIN] Usuário não encontrado:', username);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const user = rows[0];
    console.log('🔐 [LOGIN] Usuário encontrado:', user.username, 'is_admin:', user.is_admin);
    console.log('🔐 [LOGIN] Hash da senha:', user.password.substring(0, 20) + '...');
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 [LOGIN] Senha válida:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('🔐 [LOGIN] Senha inválida para usuário:', username);
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
    
    // Configurar cookie como cookie de sessão (sem persistência) para exigir login em cada nova sessão do navegador
    const timestamp = Date.now();
    response.cookies.set('auth_token', `${user.username}_${timestamp}`, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      sameSite: 'lax'
    });

    // Também armazenar dados do usuário como cookie de sessão
    response.cookies.set('user', JSON.stringify({
      id: user.id,
      username: user.username,
      name: user.name,
      is_admin: Boolean(user.is_admin),
      isAdmin: Boolean(user.is_admin)
    }), {
      httpOnly: false, // Permitir acesso via JavaScript para o frontend
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}