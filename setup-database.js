#!/usr/bin/env node

/**
 * Script de configuração rápida do banco de dados
 * Execute: node setup-database.js [opção]
 * Opções: 1=local, 2=produção, 3=status, 4=parar, 5=remover
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 Configurando banco de dados MySQL...');
    
    // Usar configurações do .env.local
    require('dotenv').config({ path: './.env.local' });
    
    const configs = [
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pdv_system'
      }
    ];
    
    let connectedConfig = null;
    
    for (const config of configs) {
      try {
        console.log(`Tentando conectar com usuário: ${config.user}, senha: ${config.password || '(vazia)'}`);
        connection = await mysql.createConnection(config);
        console.log('✅ Conexão estabelecida!');
        connectedConfig = config;
        break;
      } catch (error) {
        console.log(`❌ Falha na conexão: ${error.message}`);
        if (connection) {
          await connection.end();
          connection = null;
        }
      }
    }
    
    if (!connection) {
      console.error('❌ Não foi possível conectar ao MySQL com nenhuma configuração.');
      console.log('\n📋 Soluções alternativas:');
      console.log('\n🔧 Opção 1 - Usar banco online (Recomendado):');
      console.log('1. Acesse: https://www.freemysqlhosting.net/');
      console.log('2. Crie uma conta gratuita');
      console.log('3. Anote as credenciais fornecidas');
      console.log('4. Atualize o .env.local com as credenciais');
      console.log('\n🔧 Opção 2 - Instalar XAMPP:');
      console.log('1. Baixe: https://www.apachefriends.org/');
      console.log('2. Instale e inicie Apache + MySQL');
      console.log('3. Use: DB_USER=root, DB_PASSWORD=(vazio)');
      console.log('\n🔧 Opção 3 - Resetar senha MySQL:');
      console.log('1. Abra CMD como Administrador');
      console.log('2. Execute: net stop MySQL80');
      console.log('3. Siga o guia em mysql-setup-guide.md');
      return;
    }
    
    // Criar banco de dados
    await connection.query('CREATE DATABASE IF NOT EXISTS pdv_system');
    console.log('✅ Banco de dados "pdv_system" criado/verificado');
    
    // Usar o banco de dados
    await connection.query('USE pdv_system');
    
    // Criar tabelas
    console.log('📋 Criando tabelas...');
    
    // Tabela de usuários
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela "users" criada');
    
    // Tabela de produtos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock_quantity INT DEFAULT 0,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Tabela "products" criada');
    
    // Tabela de clientes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(100) NOT NULL,
        cnpj VARCHAR(20),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(2),
        zip_code VARCHAR(10),
        contact_person VARCHAR(100),
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Tabela "clients" criada');
    
    // Tabela de contas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('pagar', 'receber') NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        due_date DATE NOT NULL,
        category VARCHAR(100),
        supplier_customer VARCHAR(100),
        notes TEXT,
        status ENUM('pendente', 'pago', 'vencido', 'parcialmente_pago') DEFAULT 'pendente',
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Tabela "accounts" criada');
    
    // Verificar se existe usuário admin
    const [adminRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      ['admin']
    );
    
    if (adminRows[0].count === 0) {
      // Criar usuário admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.execute(
        'INSERT INTO users (username, password, name, is_admin) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrador', true]
      );
      console.log('✅ Usuário admin criado (admin/admin123)');
    } else {
      console.log('ℹ️ Usuário admin já existe');
    }
    
    console.log('\n🎉 Configuração do banco de dados concluída com sucesso!');
    console.log('\n📋 Configurações para o .env.local:');
    console.log(`DB_HOST=localhost`);
    console.log(`DB_PORT=3306`);
    console.log(`DB_USER=${connectedConfig.user}`);
    console.log(`DB_PASSWORD=${connectedConfig.password}`);
    console.log(`DB_NAME=pdv_system`);
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();