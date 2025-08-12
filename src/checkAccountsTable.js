const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env.local' });

async function checkAccountsTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Connected to database successfully.');

    // Check if accounts table exists and show its structure
    const [tableInfo] = await connection.execute(
      "DESCRIBE accounts"
    );
    
    console.log('\nAccounts table structure:');
    console.table(tableInfo);

    // Count records in accounts table
    const [countResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM accounts"
    );
    
    console.log(`\nNumber of records in accounts table: ${countResult[0].count}`);

    // Show sample data if any exists
    if (countResult[0].count > 0) {
      const [sampleData] = await connection.execute(
        "SELECT * FROM accounts LIMIT 5"
      );
      console.log('\nSample data from accounts table:');
      console.table(sampleData);
    }

  } catch (error) {
    console.error('Error checking accounts table:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAccountsTable();