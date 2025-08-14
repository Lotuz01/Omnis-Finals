const mysql = require('mysql2/promise');

async function testMovementsDatabase() {
  let connection;
  
  try {
    console.log('🔍 Testando conexão com banco de dados para movements...');
    
    // Configuração do banco
    const dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT) || 3307,
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'app_password_123',
      database: process.env.DB_NAME || 'sistema_gestao'
    };
    
    console.log('📋 Configuração do banco:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    });
    
    // Conectar ao banco
    console.log('\n🔌 Conectando ao banco...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexão estabelecida');
    
    // Testar se a tabela movements existe
    console.log('\n📊 Verificando tabela movements...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'movements'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Tabela movements não existe!');
      return;
    }
    
    console.log('✅ Tabela movements existe');
    
    // Verificar estrutura da tabela
    console.log('\n🏗️ Verificando estrutura da tabela...');
    const [columns] = await connection.execute(
      "DESCRIBE movements"
    );
    
    console.log('Colunas da tabela movements:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
    // Contar registros
    console.log('\n📈 Contando registros...');
    const [countResult] = await connection.execute(
      "SELECT COUNT(*) as total FROM movements"
    );
    
    const total = countResult[0].total;
    console.log(`Total de registros: ${total}`);
    
    // Testar consulta simples (similar à da API)
    console.log('\n🔍 Testando consulta similar à da API...');
    const [movements] = await connection.execute(`
      SELECT 
        m.id,
        m.product_id,
        m.type,
        m.quantity,
        m.reason,
        m.created_at,
        p.name as product_name
      FROM movements m
      LEFT JOIN products p ON m.product_id = p.id
      ORDER BY m.created_at DESC
      LIMIT 10
    `);
    
    console.log(`✅ Consulta executada com sucesso. ${movements.length} registros retornados.`);
    
    if (movements.length > 0) {
      console.log('\n📋 Exemplo de registro:');
      console.log(JSON.stringify(movements[0], null, 2));
    }
    
    // Testar consulta com paginação (como na API)
    console.log('\n📄 Testando consulta com paginação...');
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    const [paginatedMovements] = await connection.execute(`
      SELECT 
        m.id,
        m.product_id,
        m.type,
        m.quantity,
        m.reason,
        m.created_at,
        p.name as product_name
      FROM movements m
      LEFT JOIN products p ON m.product_id = p.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    console.log(`✅ Consulta paginada executada com sucesso. ${paginatedMovements.length} registros retornados.`);
    
    console.log('\n🎉 Todos os testes de banco de dados passaram!');
    
  } catch (error) {
    console.error('❌ Erro durante teste do banco:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

testMovementsDatabase();