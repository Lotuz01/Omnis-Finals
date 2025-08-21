// src/database.js

const mysql = require('mysql2/promise');

// Configurações do banco de dados MySQL
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT || 3306;

// Configuração MySQL
const mysqlConfig = {
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

// Função para conectar ao banco de dados MySQL
async function connectToDatabase() {
  try {
    console.log('🔄 Conectando ao MySQL...');
    pool = await mysql.createPool(mysqlConfig);
    console.log('✅ Conectado ao MySQL com sucesso!');
    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MySQL:', error.message);
    console.error('💡 Verifique se o MySQL está rodando e as credenciais estão corretas.');
    throw error;
  }
}

// Função para executar queries MySQL
async function executeQuery(query, params = []) {
  try {
    if (!pool) {
      await connectToDatabase();
    }
    
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('❌ Erro ao executar query MySQL:', error.message);
    throw error;
  }
}

// Função para fechar conexão
async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Conexão com MySQL fechada');
  }
}

module.exports = {
  connectToDatabase,
  executeQuery,
  closeConnection,
  connection: () => pool
};