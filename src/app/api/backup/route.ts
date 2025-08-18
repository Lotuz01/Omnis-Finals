import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbPool, withTransaction } from '../../../utils/database-pool';
import { logger } from '../../../utils/logger';


// Verificar se o usuário é administrador
async function verifyAdmin(authToken: string) {
  if (!authToken) {
    return false;
  }

  // Extrair username do token (remover timestamp se presente)
  const username = authToken.includes('_') ? authToken.split('_')[0] : authToken;

  try {
    const [users] = await dbPool.execute<{ username: string; is_admin: number | boolean }[]>(
      'SELECT username, is_admin FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return false;
    }
    
    const user = users[0];
    // Compatível com colunas BOOLEAN (true/false) e TINYINT(1) (0/1)
    return Boolean(user.is_admin);
  } catch (error) {
    logger.error('Erro ao verificar admin', error);
    return false;
  }
}

// GET - Listar backups disponíveis
export async function GET() {
  const startTime = Date.now();
  
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      logger.info('Tentativa de acesso não autorizado');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(authToken);
    if (!isAdmin) {
      logger.info('Acesso negado - usuário não é admin', { 
        endpoint: '/api/backup'
      });
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const [rows] = await dbPool.execute<{ id: number; created_at: Date; version: string }[]>('SELECT id, created_at, version FROM backups ORDER BY created_at DESC');
    const backups = rows.map(row => ({
      id: row.id,
      created: row.created_at.toISOString(),
      version: row.version
    }));

    logger.info('Backup list retrieved', { count: backups.length, duration: Date.now() - startTime });
    return NextResponse.json({ backups });
    
  } catch (error) {
    logger.error('Error listing backups', error);
    return NextResponse.json({ message: 'Error listing backups', error: (error as Error).message }, { status: 500 });
  }
}

// POST - Criar novo backup
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      logger.info('Tentativa de criação de backup não autorizada', { endpoint: '/api/backup' });
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(authToken);
    if (!isAdmin) {
      logger.info('Tentativa de criação de backup por não-admin', { 
        endpoint: '/api/backup'
      });
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { action, backupId } = await request.json();

    if (action === 'create') {
      const backup: {
        timestamp: string;
        version: string;
        data: { [table: string]: any[] };
      } = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {}
      };

      const tables = ['users', 'products', 'movements', 'accounts'];

      for (const table of tables) {
        const [rows] = await dbPool.execute(`SELECT * FROM ${table}`);
        backup.data[table] = rows;
      }

      const backupJson = JSON.stringify(backup, null, 2);
      const [result] = await dbPool.execute(
        'INSERT INTO backups (version, data) VALUES (?, ?)', 
        [backup.version, backupJson]
      );

      logger.info('Backup created successfully', { id: result.insertId });
      return NextResponse.json({ message: 'Backup created successfully', id: result.insertId });

    } else if (action === 'restore' && backupId) {
      const [rows] = await dbPool.execute<{ data: string }[]>('SELECT data FROM backups WHERE id = ?', [backupId]);
      if (rows.length === 0) {
        return NextResponse.json({ message: 'Backup not found' }, { status: 404 });
      }

      const backup: {
        timestamp: string;
        version: string;
        data: { [table: string]: any[] };
      } = JSON.parse(rows[0].data);

      await withTransaction(async (connection) => {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        for (const [tableName, tableData] of Object.entries(backup.data)) {
          await connection.execute(`DELETE FROM ${tableName}`);

          if ((tableData as any[]).length > 0) {
            const columns = Object.keys((tableData as any[])[0]);
            const placeholders = columns.map(() => '?').join(', ');
            const columnNames = columns.join(', ');
            const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

            for (const row of (tableData as any[])) {
              const values = columns.map(col => row[col]);
              await connection.execute(insertQuery, values);
            }
          }
        }

        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      });

      logger.info('Backup restored successfully', { id: backupId });
      return NextResponse.json({ message: 'Backup restored successfully' });

    } else {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    logger.error('Error in backup operation', error);
    return NextResponse.json({ message: 'Error in backup operation', error: (error as Error).message }, { status: 500 });
  }
}

// DELETE - Deletar backup
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(authToken);
    if (!isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { backupId } = await request.json();

    if (!backupId) {
      return NextResponse.json({ message: 'Backup ID is required' }, { status: 400 });
    }

    await dbPool.execute('DELETE FROM backups WHERE id = ?', [backupId]);

    return NextResponse.json({ message: 'Backup deleted successfully' });
    
  } catch (error) {
    logger.error('Error deleting backup', error);
    return NextResponse.json({ message: 'Error deleting backup', error: (error as Error).message }, { status: 500 });
  }
}