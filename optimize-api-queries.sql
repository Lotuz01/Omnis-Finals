-- Script de Otimização de Queries das APIs
-- Este arquivo contém queries otimizadas para substituir as atuais nas APIs

-- ========================================
-- OTIMIZAÇÕES PARA API DE PRODUCTS
-- ========================================

-- Query otimizada para listagem de produtos (GET /api/products)
-- ANTES: SELECT id, name, description, price, stock, category, created_at, updated_at FROM products WHERE user_id = ? ORDER BY updated_at DESC
-- DEPOIS: Query com índice otimizado e campos específicos
/*
SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.stock_quantity,
    p.category,
    p.is_active,
    p.updated_at
FROM products p
WHERE p.user_id = ? AND p.is_active = 1
ORDER BY p.updated_at DESC
LIMIT 100; -- Adicionar paginação
*/

-- Query otimizada para verificação de produto existente (POST /api/products)
-- ANTES: SELECT id, stock_quantity, name, description, price FROM products WHERE name = ? AND user_id = ? LIMIT 1
-- DEPOIS: Query com índice composto
/*
SELECT 
    p.id,
    p.stock_quantity,
    p.name,
    p.description,
    p.price
FROM products p
WHERE p.name = ? AND p.user_id = ? AND p.is_active = 1
LIMIT 1;
*/

-- ========================================
-- OTIMIZAÇÕES PARA API DE MOVEMENTS
-- ========================================

-- Query otimizada para contagem de movimentações (GET /api/movements)
-- ANTES: SELECT COUNT(*) as total FROM movements m WHERE ...
-- DEPOIS: Query com índice otimizado
/*
SELECT COUNT(*) as total
FROM movements m
USE INDEX (idx_movements_main)
WHERE m.user_id = ?
    AND (? IS NULL OR m.type = ?)
    AND (? IS NULL OR m.product_id = ?)
    AND (? IS NULL OR DATE(m.created_at) >= ?)
    AND (? IS NULL OR DATE(m.created_at) <= ?);
*/

-- Query otimizada para listagem de movimentações com JOIN (GET /api/movements)
-- ANTES: LEFT JOIN sem otimização
-- DEPOIS: JOIN otimizado com índices
/*
SELECT 
    m.id,
    m.type,
    m.quantity,
    m.unit_price,
    m.total_value,
    m.reason,
    m.created_at,
    m.product_id,
    p.name as product_name,
    p.sku as product_sku
FROM movements m
USE INDEX (idx_movements_main)
INNER JOIN products p ON m.product_id = p.id
WHERE m.user_id = ?
    AND (? IS NULL OR m.type = ?)
    AND (? IS NULL OR m.product_id = ?)
    AND (? IS NULL OR DATE(m.created_at) >= ?)
    AND (? IS NULL OR DATE(m.created_at) <= ?)
ORDER BY m.created_at DESC
LIMIT ? OFFSET ?;
*/

-- Query otimizada para admin (sem filtro de user_id)
/*
SELECT 
    m.id,
    m.type,
    m.quantity,
    m.unit_price,
    m.total_value,
    m.reason,
    m.created_at,
    m.product_id,
    p.name as product_name,
    u.name as user_name
FROM movements m
USE INDEX (idx_movements_admin)
INNER JOIN products p ON m.product_id = p.id
INNER JOIN users u ON m.user_id = u.id
WHERE (? IS NULL OR m.type = ?)
    AND (? IS NULL OR m.product_id = ?)
    AND (? IS NULL OR DATE(m.created_at) >= ?)
    AND (? IS NULL OR DATE(m.created_at) <= ?)
ORDER BY m.created_at DESC
LIMIT ? OFFSET ?;
*/

-- ========================================
-- OTIMIZAÇÕES PARA API DE CLIENTS
-- ========================================

-- Query otimizada para listagem de clientes (GET /api/clients)
-- ANTES: SELECT id, name, email, phone, address, created_at, updated_at FROM clients ORDER BY name ASC
-- DEPOIS: Query com filtro de ativos e paginação
/*
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.document,
    c.document_type,
    c.city,
    c.state,
    c.is_active,
    c.created_at,
    c.updated_at
FROM clients c
USE INDEX (idx_clients_active_name)
WHERE c.is_active = 1
ORDER BY c.name ASC
LIMIT 100; -- Adicionar paginação
*/

-- Query para busca de clientes por termo
/*
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.document
FROM clients c
WHERE c.is_active = 1
    AND (
        c.name LIKE CONCAT('%', ?, '%')
        OR c.email LIKE CONCAT('%', ?, '%')
        OR c.document LIKE CONCAT('%', ?, '%')
    )
ORDER BY c.name ASC
LIMIT 20;
*/

-- ========================================
-- OTIMIZAÇÕES PARA API DE ACCOUNTS
-- ========================================

-- Query otimizada para listagem de contas (GET /api/accounts)
-- ANTES: JOIN simples sem otimização
-- DEPOIS: Query com índices otimizados
/*
SELECT 
    a.id,
    a.type,
    a.description,
    a.amount,
    a.due_date,
    a.paid_date,
    a.status,
    a.category,
    a.payment_method,
    a.notes,
    a.created_at,
    u.name as user_name,
    c.name as client_name
FROM accounts a
USE INDEX (idx_accounts_user_due)
INNER JOIN users u ON a.user_id = u.id
LEFT JOIN clients c ON a.client_id = c.id
WHERE a.user_id = ?
    AND (? IS NULL OR a.type = ?)
    AND (? IS NULL OR a.status = ?)
ORDER BY 
    CASE WHEN a.status = 'OVERDUE' THEN 1
         WHEN a.status = 'PENDING' THEN 2
         ELSE 3 END,
    a.due_date ASC
LIMIT ? OFFSET ?;
*/

-- Query otimizada para atualização de contas vencidas (batch update)
-- ANTES: UPDATE individual
-- DEPOIS: Update em lote otimizado
/*
UPDATE accounts a
USE INDEX (idx_accounts_overdue)
SET a.status = 'OVERDUE',
    a.updated_at = NOW()
WHERE a.due_date < CURDATE()
    AND a.status = 'PENDING'
    AND a.user_id = ?;
*/

-- ========================================
-- OTIMIZAÇÕES PARA API DE NFE
-- ========================================

-- Query otimizada para listagem de NFe
/*
SELECT 
    n.id,
    n.numero,
    n.serie,
    n.chave_acesso,
    n.valor_total,
    n.data_emissao,
    n.status,
    c.name as client_name,
    c.document as client_document
FROM nfe n
USE INDEX (idx_nfe_user_date)
INNER JOIN clients c ON n.client_id = c.id
WHERE n.user_id = ?
    AND (? IS NULL OR n.status = ?)
    AND (? IS NULL OR DATE(n.data_emissao) >= ?)
    AND (? IS NULL OR DATE(n.data_emissao) <= ?)
ORDER BY n.data_emissao DESC
LIMIT ? OFFSET ?;
*/

-- ========================================
-- QUERIES DE RELATÓRIOS OTIMIZADAS
-- ========================================

-- Relatório de produtos com baixo estoque
/*
SELECT 
    p.id,
    p.name,
    p.stock_quantity,
    p.min_stock,
    p.category,
    (p.min_stock - p.stock_quantity) as deficit
FROM products p
USE INDEX (idx_products_stock)
WHERE p.is_active = 1
    AND p.stock_quantity <= p.min_stock
    AND p.user_id = ?
ORDER BY deficit DESC;
*/

-- Relatório de movimentações por período
/*
SELECT 
    DATE(m.created_at) as data,
    m.type,
    COUNT(*) as quantidade_movimentacoes,
    SUM(m.quantity) as total_quantidade,
    SUM(m.total_value) as total_valor
FROM movements m
USE INDEX (idx_movements_date_filter)
WHERE m.user_id = ?
    AND DATE(m.created_at) BETWEEN ? AND ?
GROUP BY DATE(m.created_at), m.type
ORDER BY data DESC, m.type;
*/

-- Relatório de contas por status
/*
SELECT 
    a.status,
    a.type,
    COUNT(*) as quantidade,
    SUM(a.amount) as total_valor,
    AVG(DATEDIFF(CURDATE(), a.due_date)) as media_dias_vencimento
FROM accounts a
USE INDEX (idx_accounts_type_status)
WHERE a.user_id = ?
GROUP BY a.status, a.type
ORDER BY a.type, a.status;
*/

COMMIT;