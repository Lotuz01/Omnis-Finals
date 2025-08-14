import { NextResponse } from 'next/server';
import { dbPool } from '../../../../utils/database-pool';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { logger } from '../../../../utils/logger';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      logger.info('Tentativa de atualização de usuário não autorizada');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    if (!user.is_admin && !user.isAdmin) {
      logger.info('Acesso negado - usuário não é admin', {
        userId: user.id
      });
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const { username: newUsername, name, isAdmin, password } = await request.json();
    
    let query = 'UPDATE users SET username = ?, name = ?, is_admin = ? WHERE id = ?';
    let values = [newUsername, name, isAdmin, id];
    
    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET username = ?, name = ?, is_admin = ?, password = ? WHERE id = ?';
      values = [newUsername, name, isAdmin, hashedPassword, id];
    }
    
    const [result] = await dbPool.execute(query, values) as [{ affectedRows: number }, unknown];
    
    if (result.affectedRows === 0) {
      logger.info('Usuário não encontrado para atualização', { id });
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    logger.info('Usuário atualizado com sucesso', {
      id,
      updatedBy: user.id,
      duration: Date.now() - startTime
    });
    
    return NextResponse.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    logger.error('Erro ao atualizar usuário', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      duration: Date.now() - startTime
    });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      logger.info('Tentativa de exclusão de usuário não autorizada');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = JSON.parse(userCookie.value);
    
    if (!user.is_admin && !user.isAdmin) {
      logger.info('Acesso negado - usuário não é admin', {
        userId: user.id
      });
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    
    const [result] = await dbPool.execute('DELETE FROM users WHERE id = ?', [id]);
    
    if ((result as {affectedRows: number}).affectedRows === 0) {
      logger.info('Usuário não encontrado para exclusão', { id });
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    logger.info('Usuário excluído com sucesso', {
      id,
      deletedBy: user.id,
      duration: Date.now() - startTime
    });
    
    return NextResponse.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    logger.error('Erro ao excluir usuário', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      duration: Date.now() - startTime
    });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
