# Guia de Deploy para Produção

## Pré-requisitos

### Ambiente de Produção
- Node.js 18+ 
- PostgreSQL 14+
- SSL/TLS configurado
- Domínio próprio
- Certificado SSL válido

### Variáveis de Ambiente Obrigatórias

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=https://yourdomain.com

# Certificado Digital
CERTIFICADO_PATH=/path/to/certificate.p12
CERTIFICADO_PASSWORD=certificate-password

# Email (opcional)
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Logs
LOG_LEVEL=info
LOG_FILE=/var/log/app/application.log

# Monitoring
MONITORING_ENABLED=true
METRICS_PORT=9090
```

## Configuração de Produção

### 1. Build de Produção
```bash
npm run build
npm run start
```

### 2. Configuração do Banco de Dados
```sql
-- Criar usuário específico para produção
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;

-- Configurar conexões
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
```

### 3. Configuração do Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
}
```

### 4. PM2 Configuration
```json
{
  "name": "financial-system",
  "script": "npm",
  "args": "start",
  "cwd": "/path/to/app",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  },
  "log_file": "/var/log/pm2/app.log",
  "error_file": "/var/log/pm2/app-error.log",
  "out_file": "/var/log/pm2/app-out.log",
  "merge_logs": true,
  "time": true
}
```

## Monitoramento

### 1. Health Checks
- Endpoint: `/api/health`
- Verificações: Database, File System, Memory
- Intervalo: 30 segundos

### 2. Logs
- Aplicação: `/var/log/app/`
- Nginx: `/var/log/nginx/`
- Sistema: `/var/log/syslog`

### 3. Métricas
- CPU e Memória
- Tempo de resposta
- Taxa de erro
- Conexões de banco

## Backup e Recuperação

### Backup Automático
```bash
#!/bin/bash
# Script de backup diário
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup do banco
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# Backup de arquivos
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /path/to/uploads

# Limpeza (manter últimos 30 dias)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

## Segurança

### 1. Firewall
```bash
# Permitir apenas portas necessárias
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 2. Fail2Ban
```ini
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
```

### 3. SSL/TLS
- Usar certificados Let's Encrypt
- Configurar HSTS
- Desabilitar protocolos inseguros

## Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados migrado
- [ ] SSL/TLS configurado
- [ ] Nginx configurado
- [ ] PM2 configurado
- [ ] Monitoramento ativo
- [ ] Backup configurado
- [ ] Firewall configurado
- [ ] Logs configurados
- [ ] Testes de carga executados
- [ ] Documentação atualizada

## Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verificar variáveis de ambiente
   - Testar conectividade
   - Verificar logs do PostgreSQL

2. **Certificado digital não funciona**
   - Verificar permissões do arquivo
   - Validar senha do certificado
   - Verificar formato do arquivo

3. **Performance lenta**
   - Verificar índices do banco
   - Analisar queries lentas
   - Verificar uso de memória

### Comandos Úteis
```bash
# Verificar status da aplicação
pm2 status

# Ver logs em tempo real
pm2 logs --lines 100

# Reiniciar aplicação
pm2 restart financial-system

# Verificar uso de recursos
htop
iotop
```