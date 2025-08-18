const mysql = require('mysql2/promise');

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'sistema_gestao'
  });

  try {
    console.log('🔍 Verificando usuários na tabela users...');
    const [rows] = await connection.execute('SELECT id, username, name, is_admin FROM users');
    
    console.log('👥 Usuários encontrados:');
    rows.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Nome: ${user.name}, Admin: ${user.is_admin}`);
    });
    
    if (rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado na tabela!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsers();