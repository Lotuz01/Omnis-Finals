const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function testBcrypt() {
  try {
    // Conectar ao banco de dados
    const connection = await mysql.createConnection({
      host: 'db',
      user: 'app_user',
      password: 'app_password',
      database: 'sistema_gestao'
    });

    // Buscar o usuário
    const [rows] = await connection.execute(
      'SELECT id, username, password FROM users WHERE username = ?',
      ['01']
    );

    if (rows.length === 0) {
      console.log('Usuário não encontrado');
      return;
    }

    const user = rows[0];
    console.log('Usuário encontrado:', user.username);
    console.log('Hash no banco:', user.password);

    // Testar a comparação
    const testPassword = 'password';
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    console.log('Senha testada:', testPassword);
    console.log('Comparação bcrypt:', isValid);

    // Gerar novo hash para comparação
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('Novo hash gerado:', newHash);
    
    const isNewHashValid = await bcrypt.compare(testPassword, newHash);
    console.log('Novo hash válido:', isNewHashValid);

    await connection.end();
  } catch (error) {
    console.error('Erro:', error);
  }
}

testBcrypt();