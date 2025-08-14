import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
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

    const backupDir = path.join(process.cwd(), 'src', 'backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      
      const backups = [];
      
      // Processar arquivos em paralelo para melhor performance
      const filePromises = backupFiles.map(async (file) => {
        try {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          const sizeKB = (stats.size / 1024).toFixed(2);
          
          return {
            filename: file,
            size: `${sizeKB} KB`,
            sizeFormatted: formatBytes(stats.size),
            created: stats.mtime.toISOString(),
            path: filePath
          };
        } catch (error) {
          logger.warn('Erro ao processar arquivo de backup', error);
          return null;
        }
      });

      const results = await Promise.all(filePromises);
      backups.push(...results.filter(backup => backup !== null));
      
      // Ordenar por data de criação (mais recente primeiro)
      backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      logger.info('Backup list retrieved', { count: backups.length, duration: Date.now() - startTime });
      return NextResponse.json({ backups });
      
    } catch {
      return NextResponse.json({ backups: [] });
    }
    
  } catch (error) {
    logger.error('Error listing backups', error);
    return NextResponse.json({ message: 'Error listing backups', error: (error as Error).message }, { status: 500 });
  }
}

// Função auxiliar para formatar bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    const { action, filename } = await request.json();

    if (action === 'create') {
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {} as Record<string, unknown>,
        metadata: {
          totalRecords: 0,
          tablesCount: 0
        }
      };

      // Lista de tabelas permitidas para backup com ordem de dependência
      const allowedTables = {
        'users': 'SELECT * FROM users',
        'products': 'SELECT * FROM products', 
        'movements': 'SELECT * FROM movements',
        'accounts': 'SELECT * FROM accounts'
      };
      
      const tables = Object.keys(allowedTables);
      let totalRecords = 0;
      
      // Usar transação para garantir consistência dos dados
      await withTransaction(async (connection) => {
        for (const table of tables) {
          try {
            // Usar query pré-definida para evitar SQL injection
            const query = allowedTables[table as keyof typeof allowedTables];
            const [rows] = await connection.execute(query);
            backup.data[table] = rows;
            totalRecords += (rows as Record<string, unknown>[]).length;
            
            logger.debug(`Backup da tabela ${table} concluído`, { 
              records: (rows as Record<string, unknown>[]).length 
            });
          } catch (error) {
            logger.warn(`Erro ao fazer backup da tabela ${table}`, error);
            backup.data[table] = [];
          }
        }
      });

      backup.metadata.totalRecords = totalRecords;
      backup.metadata.tablesCount = Object.keys(backup.data).length;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'src', 'backups');
      const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
      
      // Criar diretório se não existir
      try {
        await fs.mkdir(backupDir, { recursive: true });
        logger.info('Diretório de backup criado', { path: backupDir });
      } catch {
        // Diretório já existe
      }
      
      // Escrever backup de forma assíncrona e otimizada
      const backupData = JSON.stringify(backup, null, 2);
      await fs.writeFile(backupFile, backupData, { encoding: 'utf8' });
      
      const stats = await fs.stat(backupFile);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      logger.info('Backup created successfully', {
        action: 'create',
        filename: path.basename(backupFile),
        size: stats.size,
        totalRecords,
        tablesCount: backup.metadata.tablesCount,
        duration: Date.now() - startTime
      });
      
      return NextResponse.json({ 
        message: 'Backup created successfully',
        filename: path.basename(backupFile),
        size: `${sizeKB} KB`,
        sizeFormatted: formatBytes(stats.size),
        timestamp: backup.timestamp,
        totalRecords,
        tablesCount: backup.metadata.tablesCount,
        tables: Object.keys(backup.data).map(table => ({
          name: table,
          records: Array.isArray(backup.data[table]) ? backup.data[table].length : 0
        }))
      });
      
    } else if (action === 'restore' && filename) {
      // Restaurar backup
      const backupDir = path.join(process.cwd(), 'src', 'backups');
      const backupFilePath = path.join(backupDir, filename);
      
      // Verificar se arquivo existe
      try {
        await fs.access(backupFilePath);
      } catch {
        return NextResponse.json({ message: 'Backup file not found' }, { status: 404 });
      }
      
      // Ler e restaurar backup
      const backupContent = await fs.readFile(backupFilePath, 'utf8');
      const backup = JSON.parse(backupContent);
      
      let restoredRecords = 0;
      
      await withTransaction(async (connection) => {
        // Desabilitar verificações de chave estrangeira
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        const restoredTables = [];
        
        // Restaurar cada tabela
        for (const [tableName, tableData] of Object.entries(backup.data)) {
          // Limpar tabela atual
          await connection.execute(`DELETE FROM ${tableName}`);
          
          if ((tableData as Record<string, unknown>[]).length > 0) {
            // Obter colunas da primeira linha
            const columns = Object.keys((tableData as Record<string, unknown>[])[0]);
            const placeholders = columns.map(() => '?').join(', ');
            const columnNames = columns.join(', ');
            
            const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
            
            // Inserir dados
            for (const row of (tableData as Record<string, unknown>[])) {
              const values = columns.map(col => (row as Record<string, unknown>)[col]);
              await connection.execute(insertQuery, values);
            }
          }
          
          restoredRecords += (tableData as Record<string, unknown>[]).length;
          restoredTables.push({
            name: tableName,
            records: (tableData as Record<string, unknown>[]).length
          });
          
          logger.debug(`Tabela ${tableName} restaurada`, { records: (tableData as Record<string, unknown>[]).length });
        }
        
        // Reabilitar verificações de chave estrangeira
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      });
      
      logger.info('Backup restored successfully', {
        action: 'restore',
        filename,
        restoredRecords,
        duration: Date.now() - startTime
      });
      
      return NextResponse.json({ 
        message: 'Backup restored successfully',
        backupDate: backup.timestamp,
        restoredRecords
      });
      
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

    const body = await request.text();
    logger.debug('DELETE backup request body received', { body });
    let filename = '';
    try {
      filename = JSON.parse(body).filename;
    } catch (err) {
      logger.error('Error parsing JSON in DELETE backup', err);
      return NextResponse.json({ message: 'Erro ao processar JSON' }, { status: 400 });
    }
    
    if (!filename) {
      return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
    }
    
    logger.info('DELETE backup request', { filename });

    const backupDir = path.join(process.cwd(), 'src', 'backups');
    const backupFilePath = path.join(backupDir, filename);
    
    // Verificar se arquivo existe
    try {
      await fs.access(backupFilePath);
    } catch {
      return NextResponse.json({ message: 'Backup file not found' }, { status: 404 });
    }
    
    // Deletar arquivo
    await fs.unlink(backupFilePath);
    
    return NextResponse.json({ message: 'Backup deleted successfully' });
    
  } catch (error) {
    logger.error('Error deleting backup', error);
    return NextResponse.json({ message: 'Error deleting backup', error: (error as Error).message }, { status: 500 });
  }
}