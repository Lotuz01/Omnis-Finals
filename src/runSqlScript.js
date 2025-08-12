const mysql = require('mysql2/promise');
const fs = require('fs').promises;
require('dotenv').config({ path: './.env.local' });

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_DATABASE:', process.env.DB_NAME);

async function runSqlScript(filename) {
  let connection;
  try {
    if (!filename) {
      console.error('Please provide a SQL file name as argument');
      return;
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const sql = await fs.readFile(filename, 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement.trim());
        console.log(`Executed: ${statement.trim()}`);
      }
    }
    console.log(`SQL script executed successfully: ${filename}`);
  } catch (error) {
    console.error('Error executing SQL script:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

const filename = process.argv[2];
runSqlScript(filename);