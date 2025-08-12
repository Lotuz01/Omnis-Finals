-- Script de inicialização do banco de dados
-- Sistema de Gestão - Produção

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configurações de performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Configurações de logging
ALTER SYSTEM SET log_destination = 'stderr';
ALTER SYSTEM SET logging_collector = on;
ALTER SYSTEM SET log_directory = 'pg_log';
ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';
ALTER SYSTEM SET log_rotation_age = '1d';
ALTER SYSTEM SET log_rotation_size = '100MB';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;

-- Criar usuário de aplicação (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password';
    END IF;
END
$$;

-- Criar usuário de backup (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'backup_user') THEN
        CREATE ROLE backup_user WITH LOGIN PASSWORD 'backup_password';
    END IF;
END
$$;

-- Criar usuário de monitoramento (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'monitor_user') THEN
        CREATE ROLE monitor_user WITH LOGIN PASSWORD 'monitor_password';
    END IF;
END
$$;

-- Criar schema de auditoria
CREATE SCHEMA IF NOT EXISTS audit;

-- Função de auditoria
CREATE OR REPLACE FUNCTION audit.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            old_values,
            changed_by,
            changed_at
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(OLD),
            current_user,
            NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            old_values,
            new_values,
            changed_by,
            changed_at
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(OLD),
            row_to_json(NEW),
            current_user,
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            new_values,
            changed_by,
            changed_at
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(NEW),
            current_user,
            NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit.audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit.audit_log(changed_by);

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Índices para sessões
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

-- Tabela de logs de sistema
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    stack TEXT,
    request_id VARCHAR(50),
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    operation VARCHAR(100),
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_operation ON system_logs(operation);
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id);

-- Tabela de métricas
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type VARCHAR(20) NOT NULL, -- counter, gauge, histogram
    labels JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(metric_type);

-- Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Manter logs por 90 dias
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Manter auditoria por 1 ano
    DELETE FROM audit.audit_log WHERE changed_at < NOW() - INTERVAL '1 year';
    
    -- Manter métricas por 30 dias
    DELETE FROM metrics WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    -- Limpar sessões expiradas
    DELETE FROM sessions WHERE expires_at < NOW() OR (last_accessed < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Função para estatísticas de performance
CREATE OR REPLACE FUNCTION get_performance_stats()
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'active_connections'::TEXT,
        COUNT(*)::NUMERIC,
        'Número de conexões ativas'::TEXT
    FROM pg_stat_activity
    WHERE state = 'active'
    
    UNION ALL
    
    SELECT 
        'database_size'::TEXT,
        pg_database_size(current_database())::NUMERIC,
        'Tamanho do banco de dados em bytes'::TEXT
    
    UNION ALL
    
    SELECT 
        'cache_hit_ratio'::TEXT,
        ROUND(
            (sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit) + sum(blks_read), 0))::NUMERIC,
            2
        ),
        'Taxa de acerto do cache (%)'::TEXT
    FROM pg_stat_database
    WHERE datname = current_database()
    
    UNION ALL
    
    SELECT 
        'total_queries'::TEXT,
        sum(calls)::NUMERIC,
        'Total de queries executadas'::TEXT
    FROM pg_stat_statements
    
    UNION ALL
    
    SELECT 
        'avg_query_time'::TEXT,
        ROUND((sum(total_time) / NULLIF(sum(calls), 0))::NUMERIC, 2),
        'Tempo médio de query (ms)'::TEXT
    FROM pg_stat_statements;
END;
$$ LANGUAGE plpgsql;

-- Permissões para usuários
GRANT CONNECT ON DATABASE postgres TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

GRANT CONNECT ON DATABASE postgres TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;

GRANT CONNECT ON DATABASE postgres TO monitor_user;
GRANT USAGE ON SCHEMA public TO monitor_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor_user;
GRANT EXECUTE ON FUNCTION get_performance_stats() TO monitor_user;

-- Configurar permissões padrão para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monitor_user;

-- Comentários
COMMENT ON SCHEMA audit IS 'Schema para auditoria de mudanças nas tabelas';
COMMENT ON TABLE audit.audit_log IS 'Log de auditoria de todas as operações nas tabelas principais';
COMMENT ON TABLE sessions IS 'Sessões ativas dos usuários';
COMMENT ON TABLE system_logs IS 'Logs do sistema da aplicação';
COMMENT ON TABLE metrics IS 'Métricas de performance e uso do sistema';
COMMENT ON FUNCTION cleanup_old_logs() IS 'Função para limpeza automática de logs antigos';
COMMENT ON FUNCTION get_performance_stats() IS 'Função para obter estatísticas de performance do banco';

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE 'Inicialização do banco de dados concluída com sucesso!';
    RAISE NOTICE 'Extensões criadas: uuid-ossp, pg_stat_statements, pg_trgm';
    RAISE NOTICE 'Usuários criados: app_user, backup_user, monitor_user';
    RAISE NOTICE 'Schema de auditoria configurado';
    RAISE NOTICE 'Tabelas de sistema criadas: sessions, system_logs, metrics';
    RAISE NOTICE 'Funções utilitárias criadas';
END
$$;