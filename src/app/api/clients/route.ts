import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database';
import { cookies } from 'next/headers';

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
    
    // Buscar apenas os clientes do usuário logado
    const [rows] = await connection.execute('SELECT * FROM clients WHERE user_id = ? ORDER BY company_name', [userId]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ message: 'Error fetching clients', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function POST(request: Request) {
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
    const { company_name, cnpj, email, phone, address, city, state, zip_code, contact_person } = await request.json();

    // Validações básicas
    if (!company_name || !cnpj || !email) {
      return NextResponse.json({ message: 'Company name, CNPJ and email are required' }, { status: 400 });
    }

    // Verificar se CNPJ já existe
    const [existingClient] = await connection.execute(
      'SELECT id FROM clients WHERE cnpj = ?',
      [cnpj]
    ) as [{ id: number }[], unknown];

    if (existingClient.length > 0) {
      return NextResponse.json({ message: 'CNPJ already exists' }, { status: 400 });
    }

    const [result] = await connection.execute(
      'INSERT INTO clients (company_name, cnpj, email, phone, address, city, state, zip_code, contact_person, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [company_name, cnpj, email, phone, address, city, state, zip_code, contact_person, userId]
    ) as [{ insertId: number }, unknown];

    return NextResponse.json({ message: 'Client created successfully', id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ message: 'Error creating client', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function PUT(request: Request) {
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
    const { id, company_name, cnpj, email, phone, address, city, state, zip_code, contact_person } = await request.json();

    if (!id || !company_name || !cnpj || !email) {
      return NextResponse.json({ message: 'ID, company name, CNPJ and email are required' }, { status: 400 });
    }

    // Verificar se o cliente pertence ao usuário
    const [clientRows] = await connection.execute(
      'SELECT id FROM clients WHERE id = ? AND user_id = ?',
      [id, userId]
    ) as [{ id: number }[], unknown];

    if (clientRows.length === 0) {
      return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 404 });
    }

    // Verificar se CNPJ já existe em outro cliente
    const [existingClient] = await connection.execute(
      'SELECT id FROM clients WHERE cnpj = ? AND id != ?',
      [cnpj, id]
    ) as [{ id: number }[], unknown];

    if (existingClient.length > 0) {
      return NextResponse.json({ message: 'CNPJ already exists' }, { status: 400 });
    }

    await connection.execute(
      'UPDATE clients SET company_name = ?, cnpj = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, zip_code = ?, contact_person = ? WHERE id = ? AND user_id = ?',
      [company_name, cnpj, email, phone, address, city, state, zip_code, contact_person, id, userId]
    );

    return NextResponse.json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ message: 'Error updating client', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function DELETE(request: Request) {
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
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'Client ID is required' }, { status: 400 });
    }

    // Verificar se o cliente pertence ao usuário
    const [clientRows] = await connection.execute(
      'SELECT id FROM clients WHERE id = ? AND user_id = ?',
      [id, userId]
    ) as [{ id: number }[], unknown];

    if (clientRows.length === 0) {
      return NextResponse.json({ message: 'Client not found or unauthorized' }, { status: 404 });
    }

    await connection.execute('DELETE FROM clients WHERE id = ? AND user_id = ?', [id, userId]);
    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ message: 'Error deleting client', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}