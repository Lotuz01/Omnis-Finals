#!/usr/bin/env node

/**
 * Script para testar conexão com banco de dados LOCAL
 * Execute: node test-local-connection.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env.local' });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'bold');
  console.log('='.repeat(50));
}

async function testLocalConnection() {
  logHeader('🔍 TESTE DE CONEXÃO LOCAL');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pdv_system',
    connectTimeout: 10000
  };

  log('\n📋 Configurações de conexão:', 'blue');
  log(`Host: ${config.host}`, 'yellow');
  log(`Port: ${config.port}`, 'yellow');
  log(`User: ${config.user}`, 'yellow');
  log(`Database: ${config.database}`, 'yellow');
  log(`Password: ${config.password ? '***' : '(vazia)'}`, 'yellow');

  let connection;
  
  try {
    log('\n🔌 Conectando ao MySQL...', 'blue');
    connection = await mysql.createConnection(config);
    log('✅ Conexão estabelecida com sucesso!', 'green');
    
    // Teste básico
    log('\n🔍 Executando teste básico...', 'blue');
    const [rows] = await connection.query('SELECT 1 as test');
    log(`✅ Teste básico executado com sucesso!`, 'green');
    
    // Verificar versão do MySQL
    const [version] = await connection.query('SELECT VERSION() as mysql_version');
    log(`✅ Versão do MySQL: ${version[0].mysql_version}`, 'green');
    
    // Verificar tabelas
    log('\n📊 Verificando tabelas...', 'blue');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      log('⚠️  Nenhuma tabela encontrada', 'yellow');
    } else {
      log(`✅ ${tables.length} tabela(s) encontrada(s):`, 'green');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        log(`  - ${tableName}`, 'green');
      });
    }
    
    // Verificar usuários
    log('\n👥 Verificando usuários...', 'blue');
    try {
      const [users] = await connection.query('SELECT id, username, name, is_admin FROM users');
      log(`✅ ${users.length} usuário(s) encontrado(s):`, 'green');
      users.forEach(user => {
        log(`  - ${user.username} (${user.name}) ${user.is_admin ? '[ADMIN]' : ''}`, 'green');
      });
    } catch (error) {
      log('⚠️  Tabela users não encontrada ou erro ao consultar', 'yellow');
    }
    
    // Teste de performance
    log('\n⚡ Testando performance...', 'blue');
    const startTime = Date.now();
    await connection.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?', [config.database]);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (responseTime < 100) {
      log(`✅ Tempo de resposta: ${responseTime}ms (Excelente)`, 'green');
    } else if (responseTime < 500) {
      log(`✅ Tempo de resposta: ${responseTime}ms (Bom)`, 'yellow');
    } else {
      log(`⚠️  Tempo de resposta: ${responseTime}ms (Lento)`, 'red');
    }
    
    logHeader('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    log('✅ Banco de dados local está funcionando perfeitamente!', 'green');
    log('\n📝 Próximos passos:', 'blue');
    log('1. Inicie a aplicação: npm run dev', 'yellow');
    log('2. Acesse: http://localhost:3000', 'yellow');
    log('3. Faça login com: admin / admin123', 'yellow');
    
  } catch (error) {
    log('\n❌ ERRO DE CONEXÃO:', 'red');
    log(error.message, 'red');
    
    log('\n🔍 Possíveis soluções:', 'yellow');
    if (error.code === 'ENOTFOUND') {
      log('- Verifique se o MySQL está instalado e rodando', 'yellow');
      log('- Instale XAMPP: https://www.apachefriends.org/', 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      log('- Inicie o serviço MySQL', 'yellow');
      log('- No XAMPP: clique em "Start" ao lado do MySQL', 'yellow');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('- Verifique usuário e senha no .env.local', 'yellow');
      log('- Execute novamente: node setup-database.js', 'yellow');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log('\n🔌 Conexão fechada', 'blue');
    }
  }
}

// Executar teste
if (require.main === module) {
  testLocalConnection().catch(error => {
    log('\n💥 Erro inesperado:', 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { testLocalConnection };