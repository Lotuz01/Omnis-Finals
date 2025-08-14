const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createUser() {
  try {
    // Conectar ao banco de dados
    const connection = await mysql.createConnection({
      host: 'db',
      user: 'app_user',
      password: 'app_password',
      database: 'sistema_gestao'
    });

    // Gerar hash da senha
    const password = 'password';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Hash gerado:', hashedPassword);
    console.log('Tamanho do hash:', hashedPassword.length);

    // Inserir usuário
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, name, is_admin) VALUES (?, ?, ?, ?)',
      ['01', hashedPassword, 'Usuário 01', 1]
    );

    console.log('Usuário inserido com ID:', result.insertId);

    // Verificar se foi inserido corretamente
    const [rows] = await connection.execute(
      'SELECT id, username, password, name, is_admin FROM users WHERE username = ?',
      ['01']
    );

    if (rows.length > 0) {
      const user = rows[0];
      console.log('Usuário verificado:');
      console.log('- ID:', user.id);
      console.log('- Username:', user.username);
      console.log('- Name:', user.name);
      console.log('- Is Admin:', user.is_admin);
      console.log('- Password Hash:', user.password);
      console.log('- Hash Length:', user.password.length);
      
      // Testar a comparação
      const isValid = await bcrypt.compare(password, user.password);
      console.log('- Password Valid:', isValid);
    }

    await connection.end();
    console.log('Usuário criado com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
  }
}

createUser();