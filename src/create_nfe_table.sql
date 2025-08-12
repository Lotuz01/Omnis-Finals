-- Criação da tabela para armazenar Notas Fiscais Eletrônicas
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
);

-- Comentários para documentação
ALTER TABLE nfe COMMENT = 'Tabela para armazenar informações das Notas Fiscais Eletrônicas emitidas';
ALTER TABLE nfe MODIFY COLUMN client_id INT NOT NULL COMMENT 'ID do cliente destinatário da NFe';
ALTER TABLE nfe MODIFY COLUMN user_id INT NOT NULL COMMENT 'ID do usuário que emitiu a NFe';
ALTER TABLE nfe MODIFY COLUMN nfe_number VARCHAR(20) COMMENT 'Número da NFe gerado pela SEFAZ';
ALTER TABLE nfe MODIFY COLUMN access_key VARCHAR(44) COMMENT 'Chave de acesso da NFe (44 dígitos)';
ALTER TABLE nfe MODIFY COLUMN total_amount DECIMAL(10,2) NOT NULL COMMENT 'Valor total da NFe';
ALTER TABLE nfe MODIFY COLUMN operation_type VARCHAR(100) NOT NULL COMMENT 'Tipo de operação (ex: Venda, Remessa, etc.)';
ALTER TABLE nfe MODIFY COLUMN status ENUM('emitida', 'cancelada', 'erro') DEFAULT 'emitida' COMMENT 'Status da NFe';
ALTER TABLE nfe MODIFY COLUMN xml_url TEXT COMMENT 'URL para download do XML da NFe';
ALTER TABLE nfe MODIFY COLUMN pdf_url TEXT COMMENT 'URL para download do PDF (DANFE) da NFe';
ALTER TABLE nfe MODIFY COLUMN items_json JSON COMMENT 'Itens da NFe em formato JSON';
ALTER TABLE nfe MODIFY COLUMN notes TEXT COMMENT 'Observações adicionais da NFe';