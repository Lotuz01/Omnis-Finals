const mysql = require('mysql2/promise');
const fs = require('fs').promises;
require('dotenv').config({ path: './.env.local' });

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_DATABASE:', process.env.DB_NAME);

async function createMovementsTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const sql = await fs.readFile('create_movements_table.sql', 'utf8');
    await connection.execute(sql);
    console.log('SQL script executed successfully: movements table created.');
  } catch (error) {
    console.error('Error executing SQL script:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createMovementsTable();