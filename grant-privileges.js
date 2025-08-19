#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function grantPrivileges() {
  let connection;
  try {
    const baseConfig = {
      host: 'localhost',
      user: 'root',
      password: ''
    };
    connection = await mysql.createConnection(baseConfig);
    await connection.query("CREATE USER IF NOT EXISTS 'omnis'@'localhost' IDENTIFIED BY 'gengar1509';");
    await connection.query("GRANT ALL PRIVILEGES ON sistema_gestao.* TO 'omnis'@'localhost';");
    await connection.query('FLUSH PRIVILEGES;');
    console.log('Usuário criado (se necessário) e privilégios concedidos com sucesso!');
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

grantPrivileges();