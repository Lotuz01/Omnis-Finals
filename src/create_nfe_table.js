// Script para criar a tabela NFe no banco de dados
const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'wendel',
  password: process.env.DB_PASSWORD || 'Gengar1509@',
  database: process.env.DB_NAME || 'pdv_system',
};

async function createNFETable() {
  let connection;
  
  try {
    console.log('🔗 Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('📋 Criando tabela NFe...');
    
    // SQL para criar a tabela NFe
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS nfe (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        user_id INT NOT NULL,
        nfe_number VARCHAR(20),
        access_key VARCHAR(44),
        total_amount DECIMAL(10,2) NOT NULL,
        operation_type VARCHAR(100) NOT NULL,
        status ENUM('emitida', 'cancelada', 'erro') DEFAULT 'emitida',
        xml_url TEXT,
        pdf_url TEXT,
        items_json JSON,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_client_id (client_id),
        INDEX idx_user_id (user_id),
        INDEX idx_nfe_number (nfe_number),
        INDEX idx_access_key (access_key),
        INDEX idx_created_at (created_at)
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ Tabela NFe criada com sucesso!');
    
    // Verificar se a tabela foi criada
    console.log('\n🔍 Verificando estrutura da tabela...');
    const [tables] = await connection.execute("SHOW TABLES LIKE 'nfe'");
    
    if (tables.length > 0) {
      console.log('✅ Tabela NFe encontrada!');
      
      // Mostrar estrutura da tabela
      console.log('\n📋 Estrutura da tabela NFe:');
      const [columns] = await connection.execute('DESCRIBE nfe');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
      });
    } else {
      console.log('❌ Tabela NFe não foi encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela NFe:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco de dados encerrada');
    }
  }
}

// Executar o script
createNFETable().then(() => {
  console.log('\n🎉 Script executado com sucesso!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});