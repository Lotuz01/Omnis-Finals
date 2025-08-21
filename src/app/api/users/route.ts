import { NextRequest, NextResponse } from 'next/server';
import * as db from '../../../database.js';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { logger } from '../../../utils/logger';


export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('🔄 [API USERS] Iniciando busca de usuários...');
    
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      logger.info('Tentativa de acesso não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    if (!user.is_admin && !user.isAdmin) {
      logger.info('Acesso negado - usuário não é admin', {
        userId: user.id
      });
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    console.log('🔄 [API USERS] Inicializando pool de conexões...');
    
    // Pool já é inicializado em database.js

    console.log('🔄 [API USERS] Executando query...');
    const rows = await db.executeQuery(
      'SELECT id, username, name, is_admin FROM users ORDER BY username'
    );

    console.log('✅ [API USERS] Query executada com sucesso, rows:', rows.length);

    // Mapear is_admin para isAdmin para compatibilidade com o frontend
    const users = rows.map((user: { id: number; username: string; name: string; is_admin: number }) => ({
      ...user,
      isAdmin: Boolean(user.is_admin)
    }));

    logger.info('Usuários listados com sucesso', { count: users.length, duration: Date.now() - startTime });
    return NextResponse.json(users);
    
  } catch (error) {
    const err = error as any;
    console.error('❌ [API USERS] Erro detalhado:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      stack: err.stack
    });
    logger.error('Erro ao buscar usuários', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      logger.info('Tentativa de criação de usuário não autorizada');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    if (!user.is_admin) {
      logger.info('Tentativa de criação de usuário por não-admin', { 
        userId: user.id, 
        username: user.username
      });
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { username, password, name, isAdmin } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'username, password e name são obrigatórios' }, { status: 400 });
    }
    
    const result = await (async () => {
      const connection = await db.connection().getConnection();
      try {
        await connection.beginTransaction();
        // Verificar se o usuário já existe
        const [existingUsers] = await connection.execute(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );
        
        if (existingUsers.length > 0) {
          throw new Error('Usuário já existe');
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const [insertResult] = await connection.execute(
          'INSERT INTO users (username, password, name, is_admin) VALUES (?, ?, ?, ?)',
          [username, hashedPassword, name, isAdmin || false]
        );
        
        await connection.commit();
        return insertResult.insertId;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })();

    logger.info('Usuário criado com sucesso', { 
      newUserId: result,
      createdBy: user.id,
      isAdmin: isAdmin || false,
      duration: Date.now() - startTime
    });
    
    return NextResponse.json({ 
      message: 'Usuário criado com sucesso',
      userId: result
    });
    
  } catch (error) {
    const errorMessage = (error as Error).message;
    
    if (errorMessage === 'Usuário já existe') {
      logger.warn('Tentativa de criar usuário duplicado');
      return NextResponse.json({ error: 'Usuário já existe' }, { status: 409 });
    }
    
    logger.error('Erro ao criar usuário', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const currentUsername = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const connection = await db.connection().getConnection();
    try {
      // Verificar se o usuário logado é admin
      const [userRows] = await connection.execute(
        'SELECT is_admin FROM users WHERE username = ?',
        [currentUsername]
      );

      if (userRows.length === 0) {
        connection.release();
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      const isCurrentUserAdmin = userRows[0].is_admin;

      // Apenas admins podem deletar usuários
      if (!isCurrentUserAdmin) {
        connection.end();
        return NextResponse.json({ message: 'Access denied. Admin privileges required.' }, { status: 403 });
      }

      // Verificar se o usuário a ser deletado existe
      const [targetUserRows] = await connection.execute(
        'SELECT id, username FROM users WHERE id = ?',
        [userId]
      );

      if (targetUserRows.length === 0) {
        connection.end();
        return NextResponse.json({ message: 'User to delete not found' }, { status: 404 });
      }

      // Impedir que o usuário delete a si mesmo
      if (targetUserRows[0].username === currentUsername) {
        connection.end();
        return NextResponse.json({ message: 'Cannot delete your own account' }, { status: 400 });
      }

      // Deletar o usuário
      await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );

      connection.end();
      return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'Error deleting user', error: (error as Error).message }, { status: 500 });
  }
}