const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env.local' });

async function checkMovementsTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Verificar se a tabela existe
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'movements'"
    );
    
    if (tables.length > 0) {
      console.log('✅ Tabela movements existe!');
      
      // Mostrar estrutura da tabela
      const [structure] = await connection.execute('DESCRIBE movements');
      console.log('\n📋 Estrutura da tabela movements:');
      console.table(structure);
      
      // Contar registros
      const [count] = await connection.execute('SELECT COUNT(*) as total FROM movements');
      console.log(`\n📊 Total de registros: ${count[0].total}`);
    } else {
      console.log('❌ Tabela movements não existe!');
    }
    
  } catch (error) {
    console.error('Erro ao verificar tabela:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkMovementsTable();