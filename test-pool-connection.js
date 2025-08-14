// Teste de conexão usando pool MySQL
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function testPoolConnection() {
  let pool;
  try {
    console.log('🔄 Criando pool de conexões...');
    console.log('Configurações:');
    console.log('- Host:', process.env.DB_HOST);
    console.log('- Port:', process.env.DB_PORT);
    console.log('- User:', process.env.DB_USER);
    console.log('- Database:', process.env.DB_NAME);
    
    // Criar pool com as mesmas configurações
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pdv_system',
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    });
    
    console.log('✅ Pool criado com sucesso!');
    
    // Testar uma query simples
    const [rows] = await pool.execute('SELECT 1 as test');
    console.log('✅ Query executada com sucesso:', rows);
    
    // Testar query na tabela users
    const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
    console.log('✅ Contagem de usuários:', users);
    
    // Testar query específica que está falhando
    const [userList] = await pool.execute('SELECT id, username, name, is_admin FROM users ORDER BY username');
    console.log('✅ Lista de usuários:', userList);
    
    console.log('🎉 Teste do pool concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste do pool:', error.message);
    console.error('Código do erro:', error.code);
    console.error('Stack:', error.stack);
  } finally {
    // Fechar o pool
    if (pool) {
      try {
        await pool.end();
        console.log('✅ Pool fechado com sucesso!');
      } catch (closeError) {
        console.error('❌ Erro ao fechar pool:', closeError.message);
      }
    }
    process.exit(0);
  }
}

testPoolConnection();