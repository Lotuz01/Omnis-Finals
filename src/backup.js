// Sistema de Backup para PDV System
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'wendel',
  password: process.env.DB_PASSWORD || 'Gengar1509@',
  database: process.env.DB_NAME || 'pdv_system',
};

// Função para criar backup completo
async function createBackup() {
  let connection;
  try {
    console.log('🔄 Iniciando backup do banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');
    const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
    
    // Criar diretório de backup se não existir
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
      // Diretório já existe
    }
    
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
    
    // Salvar backup em arquivo JSON
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2), 'utf8');
    
    console.log(`✅ Backup criado com sucesso: ${backupFile}`);
    console.log(`📊 Total de registros salvos:`);
    for (const table of tables) {
      console.log(`   - ${table}: ${backup.data[table].length}`);
    }
    
    return backupFile;
    
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error.message);
    throw error;
  } finally {
    if (connection) connection.end();
  }
}

// Função para restaurar backup
async function restoreBackup(backupFilePath) {
  let connection;
  try {
    console.log('🔄 Iniciando restauração do backup...');
    
    // Verificar se o arquivo existe
    try {
      await fs.access(backupFilePath);
    } catch (error) {
      throw new Error(`Arquivo de backup não encontrado: ${backupFilePath}`);
    }
    
    // Ler arquivo de backup
    const backupContent = await fs.readFile(backupFilePath, 'utf8');
    const backup = JSON.parse(backupContent);
    
    console.log(`📅 Backup criado em: ${backup.timestamp}`);
    console.log(`🔢 Versão: ${backup.version}`);
    
    connection = await mysql.createConnection(dbConfig);
    
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
  try {
    const backupDir = path.join(__dirname, 'backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      
      if (backupFiles.length === 0) {
        console.log('📁 Nenhum backup encontrado.');
        return [];
      }
      
      console.log('📁 Backups disponíveis:');
      const backups = [];
      
      for (const file of backupFiles) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        const size = (stats.size / 1024).toFixed(2);
        
        console.log(`   - ${file} (${size} KB) - ${stats.mtime.toLocaleString()}`);
        backups.push({
          filename: file,
          path: filePath,
          size: `${size} KB`,
          created: stats.mtime
        });
      }
      
      return backups;
      
    } catch (error) {
      console.log('📁 Diretório de backups não existe ainda.');
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error.message);
    throw error;
  }
}

// Função para deletar backup antigo
async function deleteBackup(backupFilePath) {
  try {
    await fs.unlink(backupFilePath);
    console.log(`🗑️ Backup deletado: ${path.basename(backupFilePath)}`);
  } catch (error) {
    console.error('❌ Erro ao deletar backup:', error.message);
    throw error;
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
        await deleteBackup(backup.path);
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
            rl.question('Digite o nome do arquivo de backup: ', async (filename) => {
              const backupPath = path.join(__dirname, 'backups', filename);
              await restoreBackup(backupPath);
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
            rl.question('Digite o nome do arquivo de backup para deletar: ', async (filename) => {
              const backupPath = path.join(__dirname, 'backups', filename);
              await deleteBackup(backupPath);
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