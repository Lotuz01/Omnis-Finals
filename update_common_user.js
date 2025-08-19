const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function updateUser() {
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
      'UPDATE users SET password = ?, name = ?, is_admin = ? WHERE username = ?',
      [hashedPassword, 'Wendel', false, '01']
    );

    if (result.affectedRows > 0) {
      console.log('Usuário atualizado com sucesso!');
    } else {
      console.log('Usuário não encontrado.');
    }

    await connection.end();
  } catch (error) {
    console.error('Erro:', error);
  }
}

updateUser();