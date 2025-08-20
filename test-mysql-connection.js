const { Pool } = require('pg');
require('dotenv').config({ path: './.env.production' });

async function testPostgreSQLConnection() {
  console.log('🔍 Testando conexão PostgreSQL de PRODUÇÃO...');
  
  // Configuração de produção
  const config = {
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000
  };

  console.log(`Connection String: ${config.connectionString}`);
  console.log(`SSL: Habilitado`);

  if (!config.connectionString) {
    console.error('❌ ERRO: Configurações de banco incompletas!');
    console.error('Verifique DB_URL no .env.production');
    process.exit(1);
  }

  try {
    const pool = new Pool(config);
    const client = await pool.connect();
    
    console.log('✅ Conexão bem-sucedida!');
    
    // Testar comandos básicos
    const { rows } = await client.query('SELECT version()');
    console.log(`📊 Versão PostgreSQL: ${rows[0].version}`);
    
    // Listar bancos de dados
    const { rows: databases } = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
    console.log(`📁 Bancos disponíveis: ${databases.map(db => db.datname).join(', ')}`);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Configuração PostgreSQL funcionando!');
    console.log('📝 Use DB_URL no .env.local');
    
    return config;
    
  } catch (error) {
    console.log(`❌ Falha: ${error.message}`);
  }
  
  console.log('\n❌ Configuração PostgreSQL não funcionou.');
  console.log('\n💡 Soluções recomendadas:');
  console.log('\n1️⃣ Verifique DB_URL no .env');
  console.log('\n2️⃣ Confirme credenciais no Supabase');
  console.log('\n3️⃣ Teste conexão direta com psql');
  
  return null;
}

testPostgreSQLConnection().catch(console.error);