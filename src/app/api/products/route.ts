import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../database';
import { cookies } from 'next/headers';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../../lib/redis';
import { invalidateCacheByRoute } from '../../../middleware/cache';

export async function GET() {
  let connection;
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    // Verificar cache primeiro
    const cacheKey = `${CACHE_KEYS.PRODUCTS}:${username}`;
    const cachedProducts = await cache.get(cacheKey);
    
    if (cachedProducts) {
      return NextResponse.json(cachedProducts, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    connection = await connectToDatabase();
    
    // Buscar o usuário pelo username com prepared statement otimizado
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;
    
    // Query otimizada com índices e ordenação - usando índice idx_products_user_updated
    const [rows] = await connection.execute(
      'SELECT id, name, description, price, stock_quantity, created_at, updated_at FROM products WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    ) as [unknown[], unknown];
    
    // Cachear resultado por 5 minutos
    await cache.set(cacheKey, rows, CACHE_TTL.MEDIUM);
    
    return NextResponse.json(rows, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ message: 'Error fetching products', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function POST(request: Request) {
  let connection;
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { name, description, price, stock_quantity, category } = await request.json();

    // Validações otimizadas
    if (!name?.trim()) {
      return NextResponse.json({ message: 'Product name is required' }, { status: 400 });
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return NextResponse.json({ message: 'Product price is required and must be a positive number' }, { status: 400 });
    }
    if (stock_quantity === undefined || isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0) {
      return NextResponse.json({ message: 'Product stock is required and must be a positive number' }, { status: 400 });
    }

    connection = await connectToDatabase();
    
    // Buscar o usuário pelo username com query otimizada
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    ) as [{ id: number }[], unknown];

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userRows[0].id;
    
    // Verificar se o produto já existe com query otimizada - usando índice idx_products_name_user
    const [existingProduct] = await connection.execute(
      'SELECT id, stock_quantity, name, description, price FROM products WHERE name = ? AND user_id = ? LIMIT 1',
      [name.trim(), userId]
    ) as [{ id: number; stock_quantity: number; name: string; description: string; price: number }[], unknown];
    
    let result;
    let responseData;
    
    if (existingProduct.length > 0) {
      // Se o produto já existe, acumular o estoque
      const product = existingProduct[0];
      const newStock = product.stock_quantity + stock_quantity;
      
      // Update otimizado usando PRIMARY KEY e user_id para segurança
      await connection.execute(
        'UPDATE products SET stock_quantity = ?, description = ?, price = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [newStock, description || product.description, price, product.id, userId]
      );
      
      responseData = { 
        message: 'Product stock updated',
        id: product.id, 
        previousStock: product.stock_quantity,
        newStock: newStock,
        addedStock: stock_quantity
      };
    } else {
      // Se o produto não existe, criar um novo
      // Insert otimizado - campos ordenados para melhor performance
      const [insertResult] = await connection.execute(
        'INSERT INTO products (user_id, name, description, price, stock_quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, name.trim(), description, price, stock_quantity]
      ) as [{ insertId: number }, unknown];
      
      responseData = { 
        message: 'Product added', 
        id: insertResult.insertId,
        name: name.trim(),
        price: price,
        stock_quantity: stock_quantity
      };
    }
    
    // Invalidar cache do usuário
    const cacheKey = `${CACHE_KEYS.PRODUCTS}:${username}`;
    await cache.del(cacheKey);
    
    // Invalidar cache geral de produtos
    await invalidateCacheByRoute('/api/products');
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error adding product:', error);
    return NextResponse.json({ message: 'Error adding product', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}
export async function PUT(request: Request) {
  let connection;
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { id, name, description, price, stock_quantity } = await request.json();
    if (!id || !name || !price || stock_quantity === undefined) {
      return NextResponse.json({ message: 'Missing required fields: id, name, price, stock_quantity' }, { status: 400 });
    }
    
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
    
    // Update otimizado usando PRIMARY KEY e user_id - aproveita índice PRIMARY
    const [result] = await connection.execute(
      'UPDATE products SET name = ?, description = ?, price = ?, stock_quantity = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [name, description, price, stock_quantity, id, userId]
    ) as [{ affectedRows: number }, unknown];
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    
    // Invalidar cache do usuário
    const cacheKey = `${CACHE_KEYS.PRODUCTS}:${username}`;
    await cache.del(cacheKey);
    
    // Invalidar cache geral de produtos
    await invalidateCacheByRoute('/api/products');
    
    return NextResponse.json({ message: 'Product updated' });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ message: 'Error updating product', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function DELETE(request: Request) {
  let connection;
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ message: 'Missing required field: id' }, { status: 400 });
    }
    
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
    
    // Delete otimizado usando PRIMARY KEY e user_id - aproveita índice PRIMARY
    const [result] = await connection.execute(
      'DELETE FROM products WHERE id = ? AND user_id = ?', 
      [id, userId]
    ) as [{ affectedRows: number }, unknown];
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    
    // Invalidar cache do usuário
    const cacheKey = `${CACHE_KEYS.PRODUCTS}:${username}`;
    await cache.del(cacheKey);
    
    // Invalidar cache geral de produtos
    await invalidateCacheByRoute('/api/products');
    
    return NextResponse.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ message: 'Error deleting product', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}