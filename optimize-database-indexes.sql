-- Script de Otimização de Índices do Banco de Dados
-- Este script adiciona índices compostos otimizados baseados nos padrões de consulta das APIs

USE sistema_gestao;

-- ========================================
-- ÍNDICES PARA TABELA USERS
-- ========================================

-- Índice composto para autenticação com admin (username já tem índice único)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'users' AND index_name = 'idx_users_auth') > 0,
    'SELECT "Index idx_users_auth already exists"',
    'CREATE INDEX idx_users_auth ON users(username, is_admin)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- ÍNDICES PARA TABELA PRODUCTS
-- ========================================

-- Índice composto para listagem de produtos por usuário ordenado por data
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'products' AND index_name = 'idx_products_user_updated') > 0,
    'SELECT "Index idx_products_user_updated already exists"',
    'CREATE INDEX idx_products_user_updated ON products(user_id, updated_at DESC)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice composto para busca por nome e usuário (verificação de duplicatas)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'products' AND index_name = 'idx_products_name_user') > 0,
    'SELECT "Index idx_products_name_user already exists"',
    'CREATE INDEX idx_products_name_user ON products(name, user_id)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice para controle de estoque
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'products' AND index_name = 'idx_products_stock') > 0,
    'SELECT "Index idx_products_stock already exists"',
    'CREATE INDEX idx_products_stock ON products(stock_quantity)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- ÍNDICES PARA TABELA MOVEMENTS
-- ========================================

-- Índice composto principal para movimentações (usado no LEFT JOIN)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'movements' AND index_name = 'idx_movements_main') > 0,
    'SELECT "Index idx_movements_main already exists"',
    'CREATE INDEX idx_movements_main ON movements(user_id, created_at DESC, type, product_id)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice composto para filtros de data
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'movements' AND index_name = 'idx_movements_date_filter') > 0,
    'SELECT "Index idx_movements_date_filter already exists"',
    'CREATE INDEX idx_movements_date_filter ON movements(created_at, type, product_id)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice para movimentações por tipo
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'movements' AND index_name = 'idx_movements_type_date') > 0,
    'SELECT "Index idx_movements_type_date already exists"',
    'CREATE INDEX idx_movements_type_date ON movements(type, created_at DESC)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- ÍNDICES PARA TABELA CLIENTS
-- ========================================

-- Índice para ordenação por nome
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'clients' AND index_name = 'idx_clients_name_sorted') > 0,
    'SELECT "Index idx_clients_name_sorted already exists"',
    'CREATE INDEX idx_clients_name_sorted ON clients(company_name ASC)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice para busca por email
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = 'sistema_gestao' AND table_name = 'clients' AND index_name = 'idx_clients_email') > 0,
    'SELECT "Index idx_clients_email already exists"',
    'CREATE INDEX idx_clients_email ON clients(email)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- OTIMIZAÇÕES ADICIONAIS
-- ========================================

-- Analisar tabelas para otimizar estatísticas
ANALYZE TABLE users, products, movements, clients;

-- Mostrar informações sobre os índices criados
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    CARDINALITY
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'sistema_gestao'
    AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

COMMIT;