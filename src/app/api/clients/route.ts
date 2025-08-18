import { NextResponse } from 'next/server';
import { dbPool } from '../../../utils/database-pool';
import { cookies } from 'next/headers';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../../lib/cache';
import { invalidateCacheByRoute } from '../../../middleware/cache';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const cacheKey = CACHE_KEYS.CLIENTS;
    const cachedClients = await cache.get(cacheKey);
    
    if (cachedClients) {
      return NextResponse.json(cachedClients, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    const [userRows] = await dbPool.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const [rows] = await dbPool.execute(
      'SELECT id, company_name as name, cnpj, email, phone, address, city, state, zip_code, contact_person, created_at, updated_at FROM clients ORDER BY company_name ASC'
    );
    
    await cache.set(cacheKey, rows, CACHE_TTL.MEDIUM);
    
    return NextResponse.json(rows, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ message: 'Error fetching clients', error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    
    // Buscar o usuário pelo username
    const [userRows] = await dbPool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const { company_name, cnpj, email, phone, address, city, state, zip_code, contact_person } = await request.json();

    // Validações básicas
    if (!company_name || !cnpj || !email) {
      return NextResponse.json({ message: 'Company name, CNPJ and email are required' }, { status: 400 });
    }

    // Verificar se email já existe - usando índice idx_clients_email
    const [existingClient] = await dbPool.execute(
      'SELECT id FROM clients WHERE email = ? LIMIT 1',
      [email]
    ) as [{ id: number }[], unknown];

    if (existingClient.length > 0) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
    }

    // Insert otimizado - usando campos da estrutura real da tabela
    const [result] = await dbPool.execute(
      'INSERT INTO clients (company_name, cnpj, email, phone, address, city, state, zip_code, contact_person, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [company_name, cnpj, email, phone, address, city, state, zip_code, contact_person]
    ) as [{ insertId: number }, unknown];

    // Invalidar cache após criação
    await cache.del(CACHE_KEYS.CLIENTS);
    await invalidateCacheByRoute('/api/clients');

    return NextResponse.json({ message: 'Client created successfully', id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ message: 'Error creating client', error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    
    // Buscar o usuário pelo username
    const [userRows] = await dbPool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const { id, name, email, phone, address } = await request.json();

    if (!id || !name || !email) {
      return NextResponse.json({ message: 'ID, name and email are required' }, { status: 400 });
    }

    // Verificar se o cliente existe - usando PRIMARY KEY
    const [clientRows] = await dbPool.execute(
      'SELECT id FROM clients WHERE id = ? LIMIT 1',
      [id]
    ) as [{ id: number }[], unknown];

    if (clientRows.length === 0) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 });
    }

    // Verificar se email já existe em outro cliente - usando índice idx_clients_email
    const [existingClient] = await dbPool.execute(
      'SELECT id FROM clients WHERE email = ? AND id != ? LIMIT 1',
      [email, id]
    ) as [{ id: number }[], unknown];

    if (existingClient.length > 0) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
    }

    // Update otimizado usando PRIMARY KEY
    await dbPool.execute(
      'UPDATE clients SET company_name = ?, email = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?',
      [name, email, phone, address, id]
    );

    // Invalidar cache após atualização
    await cache.del(CACHE_KEYS.CLIENTS);
    await invalidateCacheByRoute('/api/clients');

    return NextResponse.json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ message: 'Error updating client', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    
    // Buscar o usuário pelo username
    const [userRows] = await dbPool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'Client ID is required' }, { status: 400 });
    }

    // Verificar se o cliente existe - usando PRIMARY KEY
    const [clientRows] = await dbPool.execute(
      'SELECT id FROM clients WHERE id = ? LIMIT 1',
      [id]
    ) as [{ id: number }[], unknown];

    if (clientRows.length === 0) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 });
    }

    // Delete otimizado usando PRIMARY KEY
    await dbPool.execute('DELETE FROM clients WHERE id = ?', [id]);
    
    // Invalidar cache após exclusão
    await cache.del(CACHE_KEYS.CLIENTS);
    await invalidateCacheByRoute('/api/clients');
    
    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ message: 'Error deleting client', error: (error as Error).message }, { status: 500 });
  }
}