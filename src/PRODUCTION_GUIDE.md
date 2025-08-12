# 🚀 Guia de Produção - Sistema PDV

## 📋 Checklist de Produção

Este documento contém todas as informações necessárias para preparar e lançar o sistema em produção.

### ✅ Otimizações Implementadas

#### 🔧 **Performance**
- ✅ Pool de conexões MySQL otimizado
- ✅ Cache em memória para requisições
- ✅ Debounce em hooks customizados
- ✅ Componentes React otimizados com memo/useCallback
- ✅ Configuração Next.js para produção
- ✅ TypeScript com build incremental
- ✅ Middleware de performance com rate limiting

#### 🔒 **Segurança**
- ✅ Headers de segurança implementados
- ✅ Validação robusta de dados
- ✅ Sanitização de inputs
- ✅ Hash de senhas com bcrypt (12 rounds)
- ✅ Rate limiting por IP
- ✅ Proteção contra XSS e CSRF

#### 📊 **Monitoramento**
- ✅ Sistema de logs estruturado
- ✅ Métricas de performance
- ✅ Health checks automáticos
- ✅ Relatórios de erro detalhados

#### 🧪 **Testes**
- ✅ Testes de performance automatizados
- ✅ Testes de integração de APIs
- ✅ Verificações de segurança
- ✅ Relatórios HTML detalhados

---

## 🛠️ Como Executar os Testes

### 1. **Teste Completo (Recomendado antes do deploy)**
```bash
npm run prepare:production
```
Este comando executa:
- Lint do código
- Verificação de tipos TypeScript
- Todos os testes automatizados
- Build de produção

### 2. **Testes Individuais**

#### Testes de Performance
```bash
npm run test:performance
```
Testa:
- Pool de conexões do banco
- Performance de queries
- Sistema de validação
- Sistema de logs

#### Testes de Integração
```bash
npm run test:integration
```
Testa:
- Todas as APIs
- Autenticação
- Rate limiting
- Headers de segurança

#### Verificação de Tipos
```bash
npm run typecheck
```

#### Auditoria de Segurança
```bash
npm run audit:security
```

### 3. **Executar Servidor de Desenvolvimento**
```bash
npm run dev
```

### 4. **Build de Produção**
```bash
npm run build
npm run start
```

---

## 📊 Interpretando os Resultados

### 🟢 **Status: PRONTO PARA PRODUÇÃO**
- Todos os testes passaram
- Performance dentro dos limites aceitáveis
- Sem vulnerabilidades críticas
- Build de produção bem-sucedido

### 🟡 **Status: ATENÇÃO**
- Alguns avisos encontrados
- Performance pode ser melhorada
- Vulnerabilidades menores detectadas
- **Ação:** Revisar avisos antes do deploy

### 🔴 **Status: NÃO ESTÁ PRONTO**
- Testes falharam
- Problemas críticos de performance
- Vulnerabilidades de segurança
- **Ação:** Corrigir erros antes de prosseguir

---

## 🔧 Configuração de Produção

### 1. **Variáveis de Ambiente**
Crie um arquivo `.env.production` com:

```env
# Banco de Dados
DB_HOST=seu_host_producao
DB_USER=seu_usuario
DB_PASSWORD=sua_senha_segura
DB_NAME=pdv_system

# Aplicação
NEXT_PUBLIC_BASE_URL=https://seu-dominio.com
NODE_ENV=production

# Segurança
JWT_SECRET=sua_chave_jwt_super_segura_256_bits
ENCRYPTION_KEY=sua_chave_encriptacao_32_chars

# Logs (opcional)
LOG_LEVEL=warn
LOG_FILE_PATH=/var/log/pdv-system
```

### 2. **Configuração do Servidor**

#### **Nginx (Recomendado)**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    
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
    
    # Cache para arquivos estáticos
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### **PM2 (Gerenciador de Processos)**
```json
{
  "name": "pdv-system",
  "script": "npm",
  "args": "start",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  },
  "error_file": "/var/log/pdv-system/err.log",
  "out_file": "/var/log/pdv-system/out.log",
  "log_file": "/var/log/pdv-system/combined.log",
  "time": true
}
```

### 3. **Banco de Dados**

#### **Otimizações MySQL**
```sql
-- Índices importantes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_movements_date ON movements(created_at);
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_user ON movements(user_id);

-- Configurações recomendadas (my.cnf)
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
max_connections = 200
query_cache_size = 64M
query_cache_type = 1
```

---

## 📈 Monitoramento em Produção

### 1. **Métricas Importantes**
- **Response Time:** < 200ms para APIs simples
- **Database Connections:** < 80% do pool
- **Memory Usage:** < 80% da RAM disponível
- **CPU Usage:** < 70% em média
- **Error Rate:** < 1% das requisições

### 2. **Logs a Monitorar**
- Erros de autenticação
- Falhas de conexão com banco
- Rate limiting ativado
- Queries lentas (> 1s)
- Erros 5xx

### 3. **Health Checks**
```bash
# Verificar se a aplicação está respondendo
curl -f http://localhost:3000/api/health || exit 1

# Verificar conexão com banco
curl -f http://localhost:3000/api/health/database || exit 1
```

---

## 🚨 Troubleshooting

### **Problema: Performance Lenta**
1. Verificar logs de queries lentas
2. Analisar uso de memória
3. Verificar conexões do banco
4. Revisar índices do banco

### **Problema: Erros de Conexão**
1. Verificar configurações do banco
2. Testar conectividade de rede
3. Verificar limites de conexão
4. Analisar logs do MySQL

### **Problema: Rate Limiting Excessivo**
1. Ajustar limites no middleware
2. Implementar whitelist para IPs confiáveis
3. Usar Redis para rate limiting distribuído

### **Problema: Erros de Memória**
1. Aumentar limite de memória do Node.js
2. Verificar vazamentos de memória
3. Otimizar queries do banco
4. Implementar paginação

---

## 📞 Suporte

Para problemas em produção:

1. **Verificar logs:** `/var/log/pdv-system/`
2. **Executar health check:** `npm run test:integration`
3. **Verificar métricas:** Painel de monitoramento
4. **Backup de emergência:** `npm run backup`

---

## 🔄 Processo de Deploy

### **Deploy Seguro (Blue-Green)**

1. **Preparação**
   ```bash
   npm run prepare:production
   ```

2. **Deploy em ambiente de staging**
   ```bash
   npm run build
   npm run test:integration
   ```

3. **Backup do banco de produção**
   ```bash
   mysqldump -u user -p pdv_system > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

4. **Deploy em produção**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

5. **Verificação pós-deploy**
   ```bash
   npm run test:integration
   ```

---

**✅ Sistema otimizado e pronto para produção!**

*Última atualização: $(date)*