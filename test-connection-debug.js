const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('🔧 Testando conexão com MySQL...');
  console.log('🔧 Host:', '127.0.0.1');
  console.log('🔧 Port:', 3307);
  console.log('🔧 User:', 'app_user');
  console.log('🔧 Database:', 'sistema_gestao');
  
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'app_user',
      password: 'app_password',
      database: 'sistema_gestao'
    });
    
    console.log('✅ Conexão estabelecida com sucesso!');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query executada:', rows);
    
    await connection.end();
    console.log('✅ Conexão fechada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('❌ Código do erro:', error.code);
    console.error('❌ Erro completo:', error);
  }
}

testConnection();