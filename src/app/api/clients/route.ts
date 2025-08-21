import { NextResponse } from 'next/server';
import { executeQuery } from '../../../database.js';
import { cookies } from 'next/headers';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../../lib/cache';
import { invalidateCacheByRoute } from '../../../middleware/cache';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
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

    const userRows = await executeQuery(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const rows = await executeQuery(
      'SELECT id, company_name as name, cnpj, email, phone, address, city, state, zip_code, contact_person, created_at, updated_at FROM clients ORDER BY company_name ASC LIMIT ? OFFSET ?',
      [limit.toString(), offset.toString()]
    );
    
    await cache.set(cacheKey, rows, CACHE_TTL.MEDIUM);
    
    return NextResponse.json(rows, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      }
    });
    const countRows = await executeQuery('SELECT COUNT(*) as total FROM clients');
    const total = countRows[0].total;
    const responseData = {
      clients: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
    await cache.set(cacheKey, responseData, CACHE_TTL.MEDIUM);
    return NextResponse.json(responseData, { headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=300' } });
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

    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;
    
    const userRows = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const { company_name, cnpj, email, phone, address, city, state, zip_code, contact_person } = await request.json();

    if (!company_name || !cnpj || !email) {
      return NextResponse.json({ message: 'Company name, CNPJ and email are required' }, { status: 400 });
    }

    const existingClient = await executeQuery(
      'SELECT id FROM clients WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingClient.length > 0) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
    }

    const result = await executeQuery(
      'INSERT INTO clients (company_name, cnpj, email, phone, address, city, state, zip_code, contact_person, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [company_name, cnpj, email, phone, address, city, state, zip_code, contact_person]
    );

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

    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const userRows = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const { id, name, email, phone, address } = await request.json();

    if (!id || !name || !email) {
      return NextResponse.json({ message: 'ID, name and email are required' }, { status: 400 });
    }

    const clientRows = await executeQuery(
      'SELECT id FROM clients WHERE id = ? LIMIT 1',
      [id]
    );

    if (clientRows.length === 0) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 });
    }

    const existingClient = await executeQuery(
      'SELECT id FROM clients WHERE email = ? AND id != ? LIMIT 1',
      [email, id]
    );

    if (existingClient.length > 0) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
    }

    await executeQuery(
      'UPDATE clients SET company_name = ?, email = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?',
      [name, email, phone, address, id]
    );

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

    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const userRows = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'Client ID is required' }, { status: 400 });
    }

    const clientRows = await executeQuery(
      'SELECT id FROM clients WHERE id = ? LIMIT 1',
      [id]
    );

    if (clientRows.length === 0) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 });
    }

    await executeQuery('DELETE FROM clients WHERE id = ?', [id]);
    
    await cache.del(CACHE_KEYS.CLIENTS);
    await invalidateCacheByRoute('/api/clients');
    
    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ message: 'Error deleting client', error: (error as Error).message }, { status: 500 });
  }
}