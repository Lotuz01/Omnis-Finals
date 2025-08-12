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
    
    // Buscar apenas os produtos do usuário logado
    const [rows] = await connection.execute('SELECT * FROM products WHERE user_id = ?', [userId]) as [unknown[], unknown];
    return NextResponse.json(rows);
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
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { name, description, price, stock } = await request.json();

    if (!name) {
      return NextResponse.json({ message: 'Product name is required' }, { status: 400 });
    }
    if (price === undefined || isNaN(Number(price))) {
      return NextResponse.json({ message: 'Product price is required and must be a number' }, { status: 400 });
    }
    if (stock === undefined || isNaN(Number(stock))) {
      return NextResponse.json({ message: 'Product stock is required and must be a number' }, { status: 400 });
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
    
    // Verificar se o produto já existe pelo nome para este usuário
    const [existingProduct] = await connection.execute(
      'SELECT * FROM products WHERE name = ? AND user_id = ?',
      [name, userId]
    ) as [{ id: number; stock: number; name: string; description: string; price: number }[], unknown];
    
    if (existingProduct.length > 0) {
      // Se o produto já existe, acumular o estoque
      const product = existingProduct[0];
      const newStock = product.stock + stock;
      
      await connection.execute(
        'UPDATE products SET stock = ?, description = ?, price = ? WHERE id = ? AND user_id = ?',
        [newStock, description, price, product.id, userId]
      );
      
      return NextResponse.json({ 
        message: 'Product stock updated', 
        id: product.id, 
        previousStock: product.stock,
        newStock: newStock,
        addedStock: stock
      });
    } else {
      // Se o produto não existe, criar um novo
      const [result] = await connection.execute(
        'INSERT INTO products (name, description, price, stock, user_id) VALUES (?, ?, ?, ?, ?)',
        [name, description, price, stock, userId]
      ) as [{ insertId: number }, unknown];
      return NextResponse.json({ message: 'Product added', id: result.insertId });
    }
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
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extrair username do token (remover timestamp se presente)
    const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

    const { id, name, description, price, stock } = await request.json();
    if (!id || !name || !price || stock === undefined) {
      return NextResponse.json({ message: 'Missing required fields: id, name, price, stock' }, { status: 400 });
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
    
    const [result] = await connection.execute(
      'UPDATE products SET name = ?, description = ?, price = ?, stock = ? WHERE id = ? AND user_id = ?',
      [name, description, price, stock, id, userId]
    ) as [{ affectedRows: number }, unknown];
    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
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
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth_token')?.value;

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
    
    const [result] = await connection.execute('DELETE FROM products WHERE id = ? AND user_id = ?', [id, userId]) as [{ affectedRows: number }, unknown];
    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ message: 'Error deleting product', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}