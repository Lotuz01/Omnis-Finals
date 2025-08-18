// Sistema de Backup para PDV System
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'wendel',
  password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : undefined,
  database: process.env.DB_NAME || 'pdv_system',
};

// Função para criar backup completo
async function createBackup() {
  let connection;
  try {
    console.log('🔄 Iniciando backup do banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    // Criar tabela de backups se não existir
    await connection.execute(
      'CREATE TABLE IF NOT EXISTS backups (' +
      'id INT AUTO_INCREMENT PRIMARY KEY, ' +
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
      'version VARCHAR(50), ' +
      'data LONGTEXT)'
    );
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {}
    };
    
    // Backup das tabelas principais
    const tables = ['users', 'products', 'movements', 'accounts'];
    
    for (const table of tables) {
      console.log(`📋 Fazendo backup da tabela: ${table}`);
      const [rows] = await connection.execute(`SELECT * FROM ${table}`);
      backup.data[table] = rows;
      console.log(`✅ ${table}: ${rows.length} registros`);
    }
    
    // Salvar backup no banco de dados
    const backupJson = JSON.stringify(backup, null, 2);
    const [result] = await connection.execute(
      'INSERT INTO backups (version, data) VALUES (?, ?)', 
      [backup.version, backupJson]
    );
    
    console.log(`✅ Backup criado com sucesso no banco de dados (ID: ${result.insertId})`);
    console.log(`📊 Total de registros salvos:`);
    for (const table of tables) {
      console.log(`   - ${table}: ${backup.data[table].length}`);
    }
    
    return result.insertId;
    
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error.message);
    throw error;
  } finally {
    if (connection) connection.end();
  }
}

// Função para restaurar backup
async function restoreBackup(backupId) {
  let connection;
  try {
    console.log('🔄 Iniciando restauração do backup...');
    
    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute('SELECT data, version, created_at FROM backups WHERE id = ?', [backupId]);
    if (rows.length === 0) {
      throw new Error(`Backup não encontrado com ID: ${backupId}`);
    }
    
    const backup = JSON.parse(rows[0].data);
    
    console.log(`📅 Backup criado em: ${rows[0].created_at}`);
    console.log(`🔢 Versão: ${rows[0].version}`);
    
    // Desabilitar verificações de chave estrangeira temporariamente
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Restaurar cada tabela
    for (const [tableName, tableData] of Object.entries(backup.data)) {
      console.log(`🔄 Restaurando tabela: ${tableName}`);
      
      // Limpar tabela atual
      await connection.execute(`DELETE FROM ${tableName}`);
      
      if (tableData.length > 0) {
        // Obter colunas da primeira linha
        const columns = Object.keys(tableData[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const columnNames = columns.join(', ');
        
        const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
        
        // Inserir dados
        for (const row of tableData) {
          const values = columns.map(col => row[col]);
          await connection.execute(insertQuery, values);
        }
      }
      
      console.log(`✅ ${tableName}: ${tableData.length} registros restaurados`);
    }
    
    // Reabilitar verificações de chave estrangeira
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Backup restaurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error.message);
    throw error;
  } finally {
    if (connection) connection.end();
  }
}

// Função para listar backups disponíveis
async function listBackups() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute('SELECT id, created_at, version FROM backups ORDER BY created_at DESC');
    
    if (rows.length === 0) {
        console.log('📁 Nenhum backup encontrado.');
        return [];
      }
      
      console.log('📁 Backups disponíveis:');
      const backups = [];
      
      for (const row of rows) {
        console.log(`   - ID: ${row.id} - Versão: ${row.version} - Criado: ${row.created_at.toLocaleString()}`);
        backups.push({
          id: row.id,
          created: row.created_at,
          version: row.version
        });
      }
      
      return backups;
    
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error.message);
    throw error;
  } finally {
    if (connection) connection.end();
  }
}

// Função para deletar backup antigo
async function deleteBackup(backupId) {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute('DELETE FROM backups WHERE id = ?', [backupId]);
    console.log(`🗑️ Backup deletado: ID ${backupId}`);
  } catch (error) {
    console.error('❌ Erro ao deletar backup:', error.message);
    throw error;
  } finally {
    if (connection) connection.end();
  }
}

// Função para backup automático (manter apenas os últimos N backups)
async function autoBackup(keepCount = 5) {
  try {
    console.log('🤖 Iniciando backup automático...');
    
    // Criar novo backup
    await createBackup();
    
    // Listar backups existentes
    const backups = await listBackups();
    
    // Se temos mais backups que o limite, deletar os mais antigos
    if (backups.length > keepCount) {
      const backupsToDelete = backups
        .sort((a, b) => a.created - b.created)
        .slice(0, backups.length - keepCount);
      
      for (const backup of backupsToDelete) {
        await deleteBackup(backup.id);
      }
      
      console.log(`🧹 ${backupsToDelete.length} backups antigos removidos.`);
    }
    
    console.log('✅ Backup automático concluído!');
    
  } catch (error) {
    console.error('❌ Erro no backup automático:', error.message);
    throw error;
  }
}

// Exportar funções
module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  autoBackup
};

// Se executado diretamente, mostrar menu
if (require.main === module) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  function showMenu() {
    console.log('\n🔧 Sistema de Backup PDV');
    console.log('========================');
    console.log('1. Criar backup');
    console.log('2. Restaurar backup');
    console.log('3. Listar backups');
    console.log('4. Backup automático');
    console.log('5. Deletar backup');
    console.log('0. Sair');
    console.log('========================');
  }
  
  async function handleMenu() {
    showMenu();
    
    rl.question('Escolha uma opção: ', async (answer) => {
      try {
        switch (answer) {
          case '1':
            await createBackup();
            break;
            
          case '2':
            const backups = await listBackups();
            if (backups.length === 0) {
              console.log('❌ Nenhum backup disponível para restaurar.');
              break;
            }
            rl.question('Digite o ID do backup: ', async (id) => {
              await restoreBackup(parseInt(id));
              handleMenu();
            });
            return;
            
          case '3':
            await listBackups();
            break;
            
          case '4':
            await autoBackup();
            break;
            
          case '5':
            const availableBackups = await listBackups();
            if (availableBackups.length === 0) {
              console.log('❌ Nenhum backup disponível para deletar.');
              break;
            }
            rl.question('Digite o ID do backup para deletar: ', async (id) => {
              await deleteBackup(parseInt(id));
              handleMenu();
            });
            return;
            
          case '0':
            console.log('👋 Saindo...');
            rl.close();
            return;
            
          default:
            console.log('❌ Opção inválida!');
        }
        
        handleMenu();
        
      } catch (error) {
        console.error('❌ Erro:', error.message);
        handleMenu();
      }
    });
  }
  
  handleMenu();
}

// Se executado diretamente, criar backup automaticamente
if (require.main === module) {
  createBackup()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}