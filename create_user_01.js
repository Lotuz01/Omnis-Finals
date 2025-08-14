const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createUser() {
  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'rootpassword',
      database: 'sistema_gestao'
    });

    console.log('Conectado ao banco de dados!');

    // Gerar hash da senha
    const password = 'Gengar1509@';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Hash gerado:', hashedPassword);

    // Inserir usuário
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, name, is_admin) VALUES (?, ?, ?, ?)',
      ['01', hashedPassword, 'Usuário 01', 1]
    );

    console.log('Usuário criado com sucesso! ID:', result.insertId);

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createUser();