const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createTestClient() {
  let connection;
  
  try {
    console.log('🔍 Criando cliente de teste...');
    
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'app_password_123',
      database: process.env.DB_NAME || 'sistema_gestao'
    });
    
    console.log('✅ Conectado ao banco de dados');
    
    // Verificar se já existe um cliente
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM clients');
    
    if (existing[0].count > 0) {
      console.log('⚠️ Já existem clientes na tabela');
      const [clients] = await connection.execute('SELECT id, name, email FROM clients LIMIT 1');
      console.log('Cliente existente:', clients[0]);
      return;
    }
    
    // Criar cliente de teste
    const [result] = await connection.execute(`
      INSERT INTO clients (name, email, phone, address) 
      VALUES (?, ?, ?, ?)
    `, [
      'Cliente Teste NFe',
      'cliente.teste@email.com',
      '11999999999',
      'Rua Teste, 123 - Centro'
    ]);
    
    console.log('✅ Cliente de teste criado com sucesso!');
    console.log('ID do cliente:', result.insertId);
    
    // Verificar o cliente criado
    const [newClient] = await connection.execute(
      'SELECT * FROM clients WHERE id = ?',
      [result.insertId]
    );
    
    console.log('\n📋 Dados do cliente criado:');
    console.log('   ID:', newClient[0].id);
    console.log('   Nome:', newClient[0].name);
    console.log('   Email:', newClient[0].email);
    console.log('   Telefone:', newClient[0].phone);
    console.log('   Endereço:', newClient[0].address);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestClient();