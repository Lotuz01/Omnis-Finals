const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env.local' });

async function updateAccountsStatus() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const sql = "ALTER TABLE accounts MODIFY status ENUM('pendente', 'pago', 'vencido', 'parcialmente_pago') DEFAULT 'pendente'";
    await connection.execute(sql);
    console.log('Status column updated successfully: parcialmente_pago added to accounts table.');
  } catch (error) {
    console.error('Error updating accounts status:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateAccountsStatus();