import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/database';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { id } = await params;
    const { username: newUsername, name, isAdmin, password } = await request.json();
    const connection = await connectToDatabase();
    
    // Verificar se o usuário logado é admin
    const [userRows] = await connection.execute(
      'SELECT isAdmin FROM users WHERE username = ?',
      [username]
    ) as [{ isAdmin: number }[], unknown];

    if (userRows.length === 0) {
      connection.end();
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isCurrentUserAdmin = userRows[0].isAdmin;

    // Apenas admins podem modificar usuários
    if (!isCurrentUserAdmin) {
      connection.end();
      return NextResponse.json({ message: 'Access denied. Admin privileges required.' }, { status: 403 });
    }
    
    let query = 'UPDATE users SET username = ?, name = ?, isAdmin = ? WHERE id = ?';
    let values = [newUsername, name, isAdmin, id];
    
    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET username = ?, name = ?, isAdmin = ?, password = ? WHERE id = ?';
      values = [newUsername, name, isAdmin, hashedPassword, id];
    }
    
    const [result] = await connection.execute(query, values) as [{ affectedRows: number }, unknown];
    connection.end();
    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Error updating user', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { id } = await params;
    const connection = await connectToDatabase();
    
    // Verificar se o usuário logado é admin
    const [userRows] = await connection.execute(
      'SELECT isAdmin FROM users WHERE username = ?',
      [username]
    ) as [{ isAdmin: number }[], unknown];

    if (userRows.length === 0) {
      connection.end();
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isCurrentUserAdmin = userRows[0].isAdmin;

    // Apenas admins podem deletar usuários
    if (!isCurrentUserAdmin) {
      connection.end();
      return NextResponse.json({ message: 'Access denied. Admin privileges required.' }, { status: 403 });
    }
    const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    connection.end();
    if ((result as {affectedRows: number}).affectedRows === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'Error deleting user', error: (error as Error).message }, { status: 500 });
  }
}