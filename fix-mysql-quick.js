const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env.local' });

async function quickFixMySQL() {
  console.log('🔧 Tentativa rápida de configurar MySQL...');
  
  try {
    // Tentar conectar sem especificar banco de dados
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '' // Sem senha
    });
    
    console.log('✅ Conectado ao MySQL!');
    
    // Criar banco de dados se não existir
    await connection.execute('CREATE DATABASE IF NOT EXISTS pdv_system');
    console.log('✅ Banco de dados "pdv_system" criado/verificado!');
    
    // Usar o banco
    await connection.execute('USE pdv_system');
    
    // Criar tabela de usuários
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela "users" criada!');
    
    // Verificar se já existe usuário admin
    const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE username = "admin"');
    
    if (existingUsers[0].count === 0) {
      // Criar usuário admin padrão
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.execute(
        'INSERT INTO users (username, email, password, name, is_admin) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'admin@sistema.com', hashedPassword, 'Administrador', true]
      );
      console.log('✅ Usuário admin criado! (username: admin, password: admin123)');
    } else {
      console.log('ℹ️ Usuário admin já existe.');
    }
    
    await connection.end();
    
    console.log('\n🎉 MySQL configurado com sucesso!');
    console.log('📝 Configurações atuais do .env.local estão corretas:');
    console.log('   DB_HOST=localhost');
    console.log('   DB_PORT=3306');
    console.log('   DB_USER=root');
    console.log('   DB_PASSWORD=(vazio)');
    console.log('   DB_NAME=pdv_system');
    console.log('\n🚀 Agora você pode fazer login com:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 O MySQL está rejeitando a conexão.');
      console.log('\n🔧 Soluções:');
      console.log('1. Instale XAMPP: https://www.apachefriends.org/');
      console.log('2. Use um banco online: https://planetscale.com/');
      console.log('3. Configure a senha do MySQL root');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL não está rodando.');
      console.log('\n🔧 Soluções:');
      console.log('1. Inicie o serviço MySQL');
      console.log('2. Instale XAMPP e inicie MySQL');
      console.log('3. Use um banco online');
    }
  }
}

quickFixMySQL();