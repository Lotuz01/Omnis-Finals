const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function createPrinterTables() {
  let connection;
  
  try {
    console.log('🖨️ Criando tabelas do sistema de impressoras...');
    
    // Configuração da conexão com o banco de dados
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'wendel',
      password: process.env.DB_PASSWORD || 'Gengar1509@',
      database: process.env.DB_NAME || 'pdv_system'
    };
    
    // Conectar ao banco de dados
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // SQL para criar as tabelas
    const createTablesSQL = `
      -- Tabela para configurações de impressoras
      CREATE TABLE IF NOT EXISTS printers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('termica', 'matricial', 'laser', 'jato_tinta') NOT NULL,
        connection_type ENUM('usb', 'rede', 'serial', 'bluetooth') NOT NULL,
        ip_address VARCHAR(45) NULL,
        port INT NULL,
        device_path VARCHAR(255) NULL,
        paper_width INT NOT NULL DEFAULT 80,
        paper_height INT NULL,
        characters_per_line INT NULL DEFAULT 48,
        font_size INT NULL DEFAULT 12,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        settings JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- Tabela para logs de impressão
      CREATE TABLE IF NOT EXISTS print_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        printer_id INT NULL,
        document_type ENUM('cupom', 'nfe', 'relatorio', 'etiqueta', 'custom') NOT NULL,
        content_preview TEXT NULL,
        status ENUM('success', 'error', 'pending') NOT NULL DEFAULT 'pending',
        error_message TEXT NULL,
        copies INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL
      );
      
      -- Tabela para templates de impressão
      CREATE TABLE IF NOT EXISTS print_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        document_type ENUM('cupom', 'nfe', 'relatorio', 'etiqueta', 'custom') NOT NULL,
        template_content TEXT NOT NULL,
        variables JSON NULL,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;
    
    // Executar comandos SQL separadamente
    const sqlCommands = createTablesSQL.split(';').filter(cmd => cmd.trim());
    
    for (const command of sqlCommands) {
      if (command.trim()) {
        await connection.execute(command);
        console.log('✅ Comando SQL executado com sucesso');
      }
    }
    
    // Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...');
    
    const [printerTables] = await connection.execute(
      "SHOW TABLES LIKE 'printers'"
    );
    
    const [logTables] = await connection.execute(
      "SHOW TABLES LIKE 'print_logs'"
    );
    
    const [templateTables] = await connection.execute(
      "SHOW TABLES LIKE 'print_templates'"
    );
    
    if (printerTables.length > 0) {
      console.log('✅ Tabela "printers" criada com sucesso');
      
      // Mostrar estrutura da tabela printers
      const [printerStructure] = await connection.execute('DESCRIBE printers');
      console.log('📋 Estrutura da tabela printers:');
      printerStructure.forEach((field) => {
        console.log(`   - ${field.Field}: ${field.Type}`);
      });
    } else {
      console.log('❌ Tabela "printers" não foi criada');
    }
    
    if (logTables.length > 0) {
      console.log('✅ Tabela "print_logs" criada com sucesso');
    } else {
      console.log('❌ Tabela "print_logs" não foi criada');
    }
    
    if (templateTables.length > 0) {
      console.log('✅ Tabela "print_templates" criada com sucesso');
    } else {
      console.log('❌ Tabela "print_templates" não foi criada');
    }
    
    // Inserir dados padrão
    console.log('\n📝 Inserindo configurações padrão...');
    
    // Verificar se já existem impressoras
    const [existingPrinters] = await connection.execute(
      'SELECT COUNT(*) as count FROM printers WHERE user_id = 2'
    );
    
    if (existingPrinters[0].count === 0) {
      // Inserir impressora térmica padrão
      await connection.execute(`
        INSERT INTO printers (user_id, name, type, connection_type, paper_width, characters_per_line, is_default, settings) 
        VALUES (2, 'Impressora Térmica Padrão', 'termica', 'usb', 80, 48, TRUE, ?)
      `, [JSON.stringify({
        cut_paper: true,
        open_drawer: false,
        print_logo: false,
        header_text: 'SISTEMA DE GESTÃO',
        footer_text: 'Obrigado pela preferência!',
        encoding: 'utf8'
      })]);
      
      // Inserir impressora laser
      await connection.execute(`
        INSERT INTO printers (user_id, name, type, connection_type, paper_width, characters_per_line, is_default, settings) 
        VALUES (2, 'Impressora Laser A4', 'laser', 'rede', 210, 80, FALSE, ?)
      `, [JSON.stringify({
        print_logo: true,
        header_text: 'RELATÓRIO DO SISTEMA',
        footer_text: 'Documento gerado automaticamente'
      })]);
      
      console.log('✅ Impressoras padrão inseridas');
    } else {
      console.log('ℹ️ Impressoras já existem, pulando inserção');
    }
    
    // Verificar se já existem templates
    const [existingTemplates] = await connection.execute(
      'SELECT COUNT(*) as count FROM print_templates WHERE user_id = 2'
    );
    
    if (existingTemplates[0].count === 0) {
      // Inserir template de cupom
      const cupomTemplate = `================================
           CUPOM FISCAL          
================================

{{company.name}}
CNPJ: {{company.cnpj}}
{{company.address}}
Tel: {{company.phone}}

{{#customer}}
Cliente: {{name}}
{{#cpf}}CPF: {{cpf}}{{/cpf}}
{{/customer}}

ITEM  DESCRICAO         QTD  VL.UNIT  VL.TOTAL
----------------------------------------
{{#items}}
{{index}}   {{description}} {{quantity}} {{price}} {{total}}
{{/items}}
----------------------------------------
TOTAL: R$ {{total}}

Pagamento: {{payment.method}}
{{#payment.change}}Troco: R$ {{payment.change}}{{/payment.change}}

================================
Data: {{date}}
Obrigado pela preferencia!
================================`;
      
      await connection.execute(`
        INSERT INTO print_templates (user_id, name, document_type, template_content, is_default) 
        VALUES (2, 'Cupom Fiscal Padrão', 'cupom', ?, TRUE)
      `, [cupomTemplate]);
      
      // Inserir template de etiqueta
      const etiquetaTemplate = `{{product.name}}
Código: {{product.code}}
Preço: R$ {{product.price}}
{{#product.barcode}}
{{product.barcode}}
{{/product.barcode}}`;
      
      await connection.execute(`
        INSERT INTO print_templates (user_id, name, document_type, template_content, is_default) 
        VALUES (2, 'Etiqueta de Produto', 'etiqueta', ?, TRUE)
      `, [etiquetaTemplate]);
      
      console.log('✅ Templates padrão inseridos');
    } else {
      console.log('ℹ️ Templates já existem, pulando inserção');
    }
    
    console.log('\n🎉 Sistema de impressoras configurado com sucesso!');
    console.log('\n📋 Resumo:');
    console.log('   - Tabela "printers" para configurações de impressoras');
    console.log('   - Tabela "print_logs" para logs de impressão');
    console.log('   - Tabela "print_templates" para templates de documentos');
    console.log('   - Configurações padrão inseridas');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com o banco de dados encerrada');
    }
  }
}

// Executar a função
createPrinterTables();