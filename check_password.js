const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkPassword() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'app_user',
    password: 'app_password',
    database: 'sistema_gestao'
  });

  try {
    console.log('🔍 Verificando senha do usuário 01...');
    const [rows] = await connection.execute('SELECT username, password FROM users WHERE username = ?', ['01']);
    
    if (rows.length > 0) {
      const user = rows[0];
      console.log(`👤 Usuário: ${user.username}`);
      console.log(`🔐 Hash da senha: ${user.password}`);
      
      // Testar senhas comuns
      const testPasswords = ['admin123', '123456', 'password', '01', 'admin', 'wendel'];
      
      for (const testPassword of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log(`✅ Senha correta encontrada: ${testPassword}`);
            return;
          }
        } catch (error) {
          console.log(`❌ Erro ao testar senha '${testPassword}': ${error.message}`);
        }
      }
      
      console.log('❌ Nenhuma das senhas testadas funcionou');
    } else {
      console.log('❌ Usuário 01 não encontrado!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar senha:', error.message);
  } finally {
    await connection.end();
  }
}

checkPassword();