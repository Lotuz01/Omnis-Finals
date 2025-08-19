const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createUser() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'omnis',
      password: 'gengar1509',
      database: 'sistema_gestao'
    });

    const password = 'Gengar1509@';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, name, is_admin) VALUES (?, ?, ?, ?)',
      ['01', hashedPassword, 'Wendel', false]
    );

    console.log('Usuário inserido com ID:', result.insertId);

    await connection.end();
    console.log('Usuário criado com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
  }
}

createUser();