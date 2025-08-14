const mysql = require('mysql2/promise');

async function debugSqlParams() {
  let connection;
  try {
    console.log('🔍 Debugando parâmetros SQL da API de movimentações...');
    
    // Conectar ao banco usando as mesmas configurações do .env.local
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'app_user',
      password: 'app_password_123',
      database: 'sistema_gestao',
      port: 3307
    });
    
    console.log('✅ Conectado ao banco de dados');
    
    // Simular os parâmetros que seriam gerados para um usuário admin
    const user = { id: 12, is_admin: true };
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    console.log('\n📊 Parâmetros de teste:');
    console.log('- user.id:', user.id);
    console.log('- user.is_admin:', user.is_admin);
    console.log('- page:', page);
    console.log('- limit:', limit);
    console.log('- offset:', offset);
    
    // Construir query como na API original
    const whereConditions = [];
    const queryParams = [];
    
    // Para usuário admin, não adiciona filtro de user_id
    if (!user.is_admin) {
      whereConditions.push('m.user_id = ?');
      queryParams.push(Number(user.id));
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    console.log('\n🔍 Query construída:');
    console.log('- whereConditions:', whereConditions);
    console.log('- queryParams:', queryParams);
    console.log('- whereClause:', whereClause);
    
    // Queries
    const countQuery = `SELECT COUNT(*) as total FROM movements m ${whereClause}`;
    const mainQuery = `
      SELECT 
        m.id,
        m.type,
        m.quantity,
        m.reason,
        m.created_at,
        m.product_id,
        p.name as product_name
      FROM movements m
      LEFT JOIN products p ON m.product_id = p.id
      ${whereClause}
      ORDER BY m.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const countParams = [...queryParams];
    const mainParams = [...queryParams, limit, offset];
    
    console.log('\n📝 Queries finais:');
    console.log('Count Query:', countQuery);
    console.log('Count Params:', countParams);
    console.log('Main Query:', mainQuery.replace(/\s+/g, ' ').trim());
    console.log('Main Params:', mainParams);
    console.log('Main Params types:', mainParams.map(p => `${p} (${typeof p})`));
    
    // Testar count query primeiro
    console.log('\n🔄 Testando count query...');
    try {
      const [countResult] = await connection.execute(countQuery, countParams);
      console.log('✅ Count query executada com sucesso');
      console.log('Count result:', countResult);
      const total = countResult[0].total;
      console.log('Total movimentações:', total);
      
      // Testar main query
      console.log('\n🔄 Testando main query...');
      console.log('Query:', mainQuery.replace(/\s+/g, ' ').trim());
      console.log('Params:', mainParams);
      
      const [rows] = await connection.execute(mainQuery, mainParams);
      console.log('✅ Main query executada com sucesso');
      console.log('Rows encontradas:', rows.length);
      
      if (rows.length > 0) {
        console.log('Primeira row:', JSON.stringify(rows[0], null, 2));
      }
      
    } catch (error) {
      console.error('❌ Erro na execução da query:', error.message);
      console.error('Error code:', error.code);
      console.error('SQL State:', error.sqlState);
      
      // Tentar queries mais simples para debug
      console.log('\n🔄 Testando query simples...');
      try {
        const [simpleResult] = await connection.execute('SELECT COUNT(*) as total FROM movements');
        console.log('✅ Query simples funcionou:', simpleResult);
        
        // Testar query com LIMIT sem WHERE
        console.log('\n🔄 Testando query com LIMIT...');
        const [limitResult] = await connection.execute('SELECT * FROM movements LIMIT ? OFFSET ?', [limit, offset]);
        console.log('✅ Query com LIMIT funcionou, rows:', limitResult.length);
        
      } catch (simpleError) {
        console.error('❌ Query simples também falhou:', simpleError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

debugSqlParams();