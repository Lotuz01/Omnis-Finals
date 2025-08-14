const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env.production' });

async function testMySQLConnection() {
  console.log('🔍 Testando conexão MySQL de PRODUÇÃO...');
  
  // Configuração de produção
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000
  };

  // Se DATABASE_URL estiver definida, usar ela
  if (process.env.DATABASE_URL) {
    console.log('✅ DATABASE_URL encontrada');
    const url = new URL(process.env.DATABASE_URL);
    config.host = url.hostname;
    config.port = parseInt(url.port) || 3306;
    config.user = url.username;
    config.password = url.password;
    config.database = url.pathname.slice(1);
    
    // SSL para URLs que contêm ssl ou são de provedores conhecidos
    if (url.searchParams.get('ssl') || 
        url.hostname.includes('railway') || 
        url.hostname.includes('planetscale') ||
        url.hostname.includes('amazonaws.com')) {
      config.ssl = { rejectUnauthorized: false };
    }
  }

  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`User: ${config.user}`);
  console.log(`Database: ${config.database}`);
  console.log(`SSL: ${config.ssl ? 'Habilitado' : 'Desabilitado'}`);

  if (!config.host || !config.user || !config.password || !config.database) {
    console.error('❌ ERRO: Configurações de banco incompletas!');
    console.error('Verifique as seguintes variáveis no .env.production:');
    console.error('- DB_HOST ou DATABASE_URL');
    console.error('- DB_USER');
    console.error('- DB_PASSWORD');
    console.error('- DB_NAME');
    process.exit(1);
  }

  const testConfigs = [config];

  for (let i = 0; i < testConfigs.length; i++) {
    const config = testConfigs[i];
    console.log(`\n📡 Teste ${i + 1}: ${config.host}:${config.port} - usuário: ${config.user}`);
    
    try {
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        connectTimeout: 5000,
        acquireTimeout: 5000,
        timeout: 5000
      });
      
      console.log('✅ Conexão bem-sucedida!');
      
      // Testar comandos básicos
      const [rows] = await connection.execute('SELECT VERSION() as version');
      console.log(`📊 Versão MySQL: ${rows[0].version}`);
      
      // Listar bancos de dados
      const [databases] = await connection.execute('SHOW DATABASES');
      console.log(`📁 Bancos disponíveis: ${databases.map(db => db.Database).join(', ')}`);
      
      await connection.end();
      
      console.log('\n🎉 Configuração MySQL funcionando!');
      console.log('📝 Use estas configurações no .env.local:');
      console.log(`DB_HOST=${config.host}`);
      console.log(`DB_PORT=${config.port}`);
      console.log(`DB_USER=${config.user}`);
      console.log(`DB_PASSWORD=${config.password}`);
      console.log(`DB_NAME=sistema_gestao`);
      
      return config;
      
    } catch (error) {
      console.log(`❌ Falha: ${error.message}`);
    }
  }
  
  console.log('\n❌ Nenhuma configuração MySQL funcionou.');
  console.log('\n💡 Soluções recomendadas:');
  console.log('\n1️⃣ Instalar XAMPP (Mais fácil):');
  console.log('   • Baixe: https://www.apachefriends.org/');
  console.log('   • Instale e inicie MySQL');
  console.log('   • Use: root (sem senha)');
  
  console.log('\n2️⃣ Usar banco online gratuito:');
  console.log('   • PlanetScale: https://planetscale.com/');
  console.log('   • Aiven: https://aiven.io/');
  console.log('   • FreeMySQLHosting: https://www.freemysqlhosting.net/');
  
  console.log('\n3️⃣ Configurar MySQL existente:');
  console.log('   • Abra MySQL Workbench');
  console.log('   • Conecte como root');
  console.log('   • Crie usuário: CREATE USER \'app_user\'@\'localhost\' IDENTIFIED BY \'senha123\';');
  console.log('   • Dê privilégios: GRANT ALL PRIVILEGES ON *.* TO \'app_user\'@\'localhost\';');
  
  return null;
}

testMySQLConnection().catch(console.error);