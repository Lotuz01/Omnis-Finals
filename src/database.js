// src/database.js

const mysql = require('mysql2/promise');

// Configurações do banco de dados MySQL
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'pdv_system';

// Configuração MySQL
const mysqlConfig = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
};

let connection = null;

// Função para conectar ao banco de dados MySQL
async function connectToDatabase() {
  try {
    console.log('🔄 Conectando ao MySQL...');
    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado ao MySQL com sucesso!');
    return connection;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MySQL:', error.message);
    console.error('💡 Verifique se o MySQL está rodando e as credenciais estão corretas.');
    console.error('💡 Consulte o arquivo SOLUCAO_MYSQL.md para instruções de configuração.');
    throw error;
  }
}

// Função para executar queries MySQL
async function executeQuery(query, params = []) {
  try {
    if (!connection) {
      await connectToDatabase();
    }
    
    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    console.error('❌ Erro ao executar query MySQL:', error.message);
    throw error;
  }
}

// Função para fechar conexão
async function closeConnection() {
  if (connection) {
    await connection.end();
    connection = null;
    console.log('✅ Conexão com MySQL fechada');
  }
}

module.exports = {
  connectToDatabase,
  executeQuery,
  closeConnection,
  connection: () => connection
};