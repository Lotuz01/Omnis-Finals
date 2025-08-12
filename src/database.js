// src/database.js

import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pdv_system',
};

export async function connectToDatabase() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Conectado ao banco de dados MySQL!');
    return connection;
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados. Verifique as variáveis de ambiente DB_HOST, DB_USER, DB_PASSWORD e DB_NAME:', error);
    throw error;
  }
}

// Exemplo de uso (opcional, pode ser removido depois)
// (async () => {
//   let connection;
//   try {
//     connection = await connectToDatabase();
//     // Faça suas operações de banco de dados aqui
//   } catch (error) {
//     // Lidar com o erro
//   } finally {
//     if (connection) connection.end();
//   }
// })();