const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkClientsTable() {
  let connection;
  
  try {
    console.log('🔍 Verificando estrutura da tabela clients...');
    
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'app_password_123',
      database: process.env.DB_NAME || 'sistema_gestao'
    });
    
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar se a tabela clients existe
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'clients'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Tabela clients não encontrada');
      return;
    }
    
    console.log('✅ Tabela clients encontrada!');
    
    // Mostrar estrutura da tabela
    console.log('\n📋 Estrutura da tabela clients:');
    const [columns] = await connection.execute('DESCRIBE clients');
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `Default: ${col.Default}` : ''}`);
    });
    
    // Verificar se há dados na tabela
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM clients');
    console.log(`\n📊 Total de clientes: ${rows[0].count}`);
    
    if (rows[0].count > 0) {
      console.log('\n📋 Primeiros 3 clientes:');
      const [clients] = await connection.execute('SELECT * FROM clients LIMIT 3');
      clients.forEach((client, index) => {
        console.log(`   ${index + 1}. ID: ${client.id}, Nome: ${client.name || client.company_name || 'N/A'}`);
        console.log(`      Documento: ${client.document || client.cnpj || 'N/A'}`);
        console.log(`      Email: ${client.email || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkClientsTable();