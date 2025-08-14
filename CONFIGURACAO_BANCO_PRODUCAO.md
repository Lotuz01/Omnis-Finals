# 🗄️ Configuração de Banco de Dados para Produção

## 📋 Visão Geral

Este guia explica como configurar o banco de dados MySQL para produção do Sistema de Gestão.

## 🔧 Opções de Provedores

### 1. 🚂 Railway.app (Recomendado)

**Vantagens:**
- Setup automático
- Backups automáticos
- SSL/TLS incluído
- Escalabilidade fácil

**Configuração:**
```bash
# 1. Crie uma conta em railway.app
# 2. Crie um novo projeto
# 3. Adicione MySQL database
# 4. Copie a DATABASE_URL fornecida
```

**Variáveis no .env.production:**
```env
DATABASE_URL=mysql://root:senha@containers-us-west-xxx.railway.app:6543/railway
DB_SSL=true
DB_POOL_MAX=25
```

### 2. 🌍 PlanetScale (MySQL Serverless)

**Vantagens:**
- MySQL serverless
- Branching de banco
- Escalabilidade automática
- Sem downtime para migrations

**Configuração:**
```bash
# 1. Crie conta em planetscale.com
# 2. Crie database
# 3. Crie branch de produção
# 4. Gere connection string
```

**Variáveis no .env.production:**
```env
DATABASE_URL=mysql://username:password@aws.connect.psdb.cloud/database-name?sslaccept=strict
DB_SSL=true
```

### 3. 🏢 Servidor MySQL Dedicado

**Para DigitalOcean, AWS RDS, Google Cloud SQL:**

**Configuração:**
```env
DATABASE_URL=mysql://sistema_gestao_user:fOJvEScGR+WUYorYHnhpcLeiFVMXJbAm@seu-servidor-mysql.com:3306/sistema_gestao_prod
DB_HOST=seu-servidor-mysql.com
DB_PORT=3306
DB_NAME=sistema_gestao_prod
DB_USER=sistema_gestao_user
DB_PASSWORD=fOJvEScGR+WUYorYHnhpcLeiFVMXJbAm
DB_SSL=true
```

## 🛠️ Setup do Banco de Dados

### 1. Criar Usuário e Database

```sql
-- Conecte como root
CREATE DATABASE sistema_gestao_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar usuário específico
CREATE USER 'sistema_gestao_user'@'%' IDENTIFIED BY 'fOJvEScGR+WUYorYHnhpcLeiFVMXJbAm';

-- Conceder permissões
GRANT ALL PRIVILEGES ON sistema_gestao_prod.* TO 'sistema_gestao_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Executar Migrations

```bash
# No seu servidor de produção
cd /caminho/para/projeto

# Executar scripts de criação de tabelas
node src/create_users_table.sql
node src/create_products_table.sql
node src/create_clients_table.sql
node src/create_movements_table.sql
node src/create_accounts_table.sql
node src/create_nfe_table.sql
```

### 3. Configurar SSL/TLS

**Para conexões seguras:**
```env
DB_SSL=true
DB_SSL_CA=/path/to/ca-cert.pem
DB_SSL_CERT=/path/to/client-cert.pem
DB_SSL_KEY=/path/to/client-key.pem
```

## ⚡ Otimizações de Performance

### Configurações de Pool de Conexões

```env
# Configurações otimizadas para produção
DB_POOL_MIN=5
DB_POOL_MAX=25
DB_TIMEOUT=60000
DB_CONNECTION_LIMIT=20
DB_ACQUIRE_TIMEOUT=60000
DB_RECONNECT=true
```

### Configurações MySQL Recomendadas

```ini
# my.cnf ou my.ini
[mysqld]
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
max_connections=200
query_cache_size=64M
tmp_table_size=64M
max_heap_table_size=64M
```

## 🔒 Segurança

### 1. Firewall
```bash
# Permitir apenas IPs específicos
# No seu provedor de nuvem, configure:
# - Porta 3306 apenas para IPs do servidor da aplicação
# - Desabilitar acesso público direto
```

### 2. Backup Automático

```bash
# Script de backup (adicionar ao cron)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h seu-servidor-mysql.com -u sistema_gestao_user -p sistema_gestao_prod > backup_$DATE.sql

# Upload para S3
aws s3 cp backup_$DATE.sql s3://seu-bucket-backup/

# Limpar backups antigos (manter 30 dias)
find /backup/path -name "backup_*.sql" -mtime +30 -delete
```

### 3. Monitoramento

```env
# Configurar alertas para:
# - Conexões ativas > 80% do limite
# - Espaço em disco < 20%
# - Tempo de resposta > 1s
# - Falhas de conexão
```

## 🚀 Deploy e Verificação

### 1. Teste de Conexão

```bash
# Testar conexão
node test-mysql-connection.js
```

### 2. Verificar Tabelas

```sql
-- Verificar se todas as tabelas foram criadas
SHOW TABLES;

-- Verificar estrutura
DESCRIBE users;
DESCRIBE products;
DESCRIBE clients;
DESCRIBE movements;
DESCRIBE accounts;
DESCRIBE nfe;
```

### 3. Dados Iniciais

```sql
-- Criar usuário admin inicial
INSERT INTO users (name, email, password, is_admin, created_at, updated_at) 
VALUES ('Admin', 'admin@suaempresa.com', '$2b$10$hash_da_senha', 1, NOW(), NOW());
```

## 📊 Monitoramento Contínuo

### Métricas Importantes
- **Conexões ativas**
- **Tempo de resposta das queries**
- **Uso de CPU e memória**
- **Espaço em disco**
- **Logs de erro**

### Alertas Configurados
- Conexões > 80% do limite
- Tempo de resposta > 2s
- Espaço em disco < 15%
- Falhas de autenticação

## 🆘 Troubleshooting

### Problemas Comuns

1. **Erro de conexão:**
   - Verificar firewall
   - Confirmar credenciais
   - Testar conectividade de rede

2. **Performance lenta:**
   - Verificar índices
   - Analisar queries lentas
   - Ajustar pool de conexões

3. **Limite de conexões:**
   - Aumentar max_connections
   - Otimizar pool da aplicação
   - Verificar vazamentos de conexão

## 📞 Suporte

Para problemas específicos:
1. Verificar logs da aplicação
2. Verificar logs do MySQL
3. Executar diagnósticos de rede
4. Contatar suporte do provedor se necessário

---

**⚠️ Importante:** Sempre faça backup antes de mudanças em produção!