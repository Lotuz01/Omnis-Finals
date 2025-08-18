const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root123',
      database: process.env.DB_NAME || 'sistema_gestao'
    });

    const hashedPassword = await bcrypt.hash('Gengar1509@', 10);
    
    await connection.execute(
      `INSERT INTO users (username, password, name, is_admin) 
       VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), is_admin = VALUES(is_admin)`,
      ['04', hashedPassword, 'Wendel', true]
    );
    
    console.log('✅ Usuário admin criado/atualizado com sucesso!');
    console.log('Usuário: 04');
    console.log('Senha: Gengar1509@');
    console.log('Nome: Wendel');
    
    await connection.end();
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('ℹ️ A tabela users não existe. Execute primeiro o script setup-database.js');
    }
  }
}

createAdminUser();