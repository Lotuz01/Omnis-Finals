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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_default (user_id, is_default),
  INDEX idx_user_active (user_id, is_active)
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
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL,
  INDEX idx_user_date (user_id, created_at),
  INDEX idx_status (status),
  INDEX idx_document_type (document_type)
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_id, document_type),
  INDEX idx_user_default (user_id, is_default)
);

-- Inserir algumas configurações padrão de impressora
INSERT IGNORE INTO printers (user_id, name, type, connection_type, paper_width, characters_per_line, is_default, settings) VALUES
(1, 'Impressora Térmica Padrão', 'termica', 'usb', 80, 48, TRUE, JSON_OBJECT(
  'cut_paper', true,
  'open_drawer', false,
  'print_logo', false,
  'header_text', 'SISTEMA DE GESTÃO',
  'footer_text', 'Obrigado pela preferência!',
  'encoding', 'utf8'
)),
(1, 'Impressora Laser A4', 'laser', 'rede', 210, 80, FALSE, JSON_OBJECT(
  'print_logo', true,
  'header_text', 'RELATÓRIO DO SISTEMA',
  'footer_text', 'Documento gerado automaticamente'
));

-- Inserir alguns templates padrão
INSERT IGNORE INTO print_templates (user_id, name, document_type, template_content, is_default) VALUES
(1, 'Cupom Fiscal Padrão', 'cupom', 
'================================
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
================================', 
TRUE),

(1, 'Etiqueta de Produto', 'etiqueta',
'{{product.name}}
Código: {{product.code}}
Preço: R$ {{product.price}}
{{#product.barcode}}
{{product.barcode}}
{{/product.barcode}}',
TRUE);