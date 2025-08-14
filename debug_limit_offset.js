const mysql = require('mysql2/promise');

async function debugLimitOffset() {
  let connection;
  try {
    console.log('🔍 Debugando problema com LIMIT e OFFSET...');
    
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'app_user',
      password: 'app_password_123',
      database: 'sistema_gestao',
      port: 3307
    });
    
    console.log('✅ Conectado ao banco de dados');
    
    const limit = 10;
    const offset = 0;
    
    console.log('\n📊 Testando diferentes formas de LIMIT/OFFSET:');
    console.log('- limit:', limit, typeof limit);
    console.log('- offset:', offset, typeof offset);
    
    // Teste 1: LIMIT e OFFSET como strings
    console.log('\n🔄 Teste 1: LIMIT e OFFSET como strings');
    try {
      const query1 = 'SELECT * FROM movements LIMIT ? OFFSET ?';
      const params1 = [String(limit), String(offset)];
      console.log('Query:', query1);
      console.log('Params:', params1, params1.map(p => typeof p));
      const [result1] = await connection.execute(query1, params1);
      console.log('✅ Sucesso com strings:', result1.length, 'rows');
    } catch (error) {
      console.log('❌ Falhou com strings:', error.message);
    }
    
    // Teste 2: LIMIT e OFFSET como números
    console.log('\n🔄 Teste 2: LIMIT e OFFSET como números');
    try {
      const query2 = 'SELECT * FROM movements LIMIT ? OFFSET ?';
      const params2 = [Number(limit), Number(offset)];
      console.log('Query:', query2);
      console.log('Params:', params2, params2.map(p => typeof p));
      const [result2] = await connection.execute(query2, params2);
      console.log('✅ Sucesso com números:', result2.length, 'rows');
    } catch (error) {
      console.log('❌ Falhou com números:', error.message);
    }
    
    // Teste 3: LIMIT e OFFSET como inteiros
    console.log('\n🔄 Teste 3: LIMIT e OFFSET como inteiros');
    try {
      const query3 = 'SELECT * FROM movements LIMIT ? OFFSET ?';
      const params3 = [parseInt(limit), parseInt(offset)];
      console.log('Query:', query3);
      console.log('Params:', params3, params3.map(p => typeof p));
      const [result3] = await connection.execute(query3, params3);
      console.log('✅ Sucesso com parseInt:', result3.length, 'rows');
    } catch (error) {
      console.log('❌ Falhou com parseInt:', error.message);
    }
    
    // Teste 4: Query sem prepared statement
    console.log('\n🔄 Teste 4: Query sem prepared statement');
    try {
      const query4 = `SELECT * FROM movements LIMIT ${limit} OFFSET ${offset}`;
      console.log('Query:', query4);
      const [result4] = await connection.query(query4);
      console.log('✅ Sucesso sem prepared statement:', result4.length, 'rows');
    } catch (error) {
      console.log('❌ Falhou sem prepared statement:', error.message);
    }
    
    // Teste 5: Apenas LIMIT
    console.log('\n🔄 Teste 5: Apenas LIMIT');
    try {
      const query5 = 'SELECT * FROM movements LIMIT ?';
      const params5 = [Number(limit)];
      console.log('Query:', query5);
      console.log('Params:', params5, params5.map(p => typeof p));
      const [result5] = await connection.execute(query5, params5);
      console.log('✅ Sucesso apenas com LIMIT:', result5.length, 'rows');
    } catch (error) {
      console.log('❌ Falhou apenas com LIMIT:', error.message);
    }
    
    // Teste 6: Testar com dados reais se existirem
    console.log('\n🔄 Teste 6: Verificar se existem dados na tabela');
    try {
      const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM movements');
      const total = countResult[0].total;
      console.log('Total de movimentações:', total);
      
      if (total === 0) {
        console.log('\n💡 Tabela movements está vazia. Vou inserir dados de teste...');
        
        // Verificar se existe produto
        const [productCount] = await connection.execute('SELECT COUNT(*) as total FROM products');
        let productId = 1;
        
        if (productCount[0].total === 0) {
          console.log('Inserindo produto de teste...');
          await connection.execute(
            'INSERT INTO products (name, price, stock_quantity) VALUES (?, ?, ?)',
            ['Produto Teste', 10.00, 100]
          );
          const [insertResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
          productId = insertResult[0].id;
        }
        
        console.log('Inserindo movimentação de teste...');
        await connection.execute(
          'INSERT INTO movements (type, quantity, reason, product_id, user_id) VALUES (?, ?, ?, ?, ?)',
          ['entrada', 10, 'Teste de debug', productId, 12]
        );
        
        console.log('✅ Dados de teste inseridos');
        
        // Testar novamente com dados
        console.log('\n🔄 Testando novamente com dados...');
        const [newResult] = await connection.execute('SELECT * FROM movements LIMIT ? OFFSET ?', [Number(limit), Number(offset)]);
        console.log('✅ Sucesso com dados:', newResult.length, 'rows');
        
      }
      
    } catch (error) {
      console.log('❌ Erro ao verificar/inserir dados:', error.message);
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

debugLimitOffset();