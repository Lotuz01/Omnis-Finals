# 🚀 Guia Completo de Deploy para Produção

## 📋 Checklist Pré-Deploy

### ✅ Arquivos Configurados
- [x] `.env.production` - Configurações de produção
- [x] `production-secrets.txt` - Chaves de segurança
- [x] `docker-compose.mysql.yml` - Banco local para testes
- [x] `CONFIGURACAO_BANCO_PRODUCAO.md` - Guia de banco
- [x] `test-mysql-connection.js` - Teste de conexão
- [x] Scripts de validação executados

### ✅ Validações Concluídas
- [x] TypeScript sem erros
- [x] ESLint configurado
- [x] Testes de segurança aprovados
- [x] Build de produção testado
- [x] Chaves de segurança geradas

## 🗄️ Configuração do Banco de Dados

### Opção 1: Railway.app (Recomendado)

1. **Criar conta e projeto:**
   ```bash
   # 1. Acesse railway.app
   # 2. Crie novo projeto
   # 3. Adicione MySQL database
   # 4. Copie a DATABASE_URL
   ```

2. **Configurar variáveis:**
   ```env
   # No .env.production, substitua:
   DATABASE_URL=mysql://root:senha@containers-us-west-xxx.railway.app:6543/railway
   DB_SSL=true
   ```

3. **Testar conexão:**
   ```bash
   node test-mysql-connection.js
   ```

### Opção 2: Banco Local com Docker

1. **Iniciar containers:**
   ```bash
   node setup-database.js 1
   # ou
   docker-compose -f docker-compose.mysql.yml up -d
   ```

2. **Acessos:**
   - **MySQL:** localhost:3306
   - **phpMyAdmin:** http://localhost:8080
   - **Grafana:** http://localhost:3001
   - **Redis:** localhost:6379

## 🌐 Deploy em Diferentes Plataformas

### 🚂 Vercel (Recomendado)

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Configurar projeto:**
   ```bash
   vercel
   # Seguir instruções do CLI
   ```

3. **Configurar variáveis de ambiente:**
   ```bash
   # Copiar todas as variáveis do .env.production
   vercel env add NEXTAUTH_SECRET
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   # ... todas as outras variáveis
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

### 🐳 Docker + VPS

1. **Criar Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

2. **Build e deploy:**
   ```bash
   docker build -t sistema-gestao .
   docker run -p 3000:3000 --env-file .env.production sistema-gestao
   ```

### ☁️ AWS/DigitalOcean/Google Cloud

1. **Preparar servidor:**
   ```bash
   # Instalar Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Instalar PM2
   npm install -g pm2
   ```

2. **Deploy da aplicação:**
   ```bash
   # Clonar repositório
   git clone seu-repositorio
   cd sistema-gestao
   
   # Instalar dependências
   npm ci --only=production
   
   # Copiar arquivo de produção
   cp .env.production .env.local
   
   # Build
   npm run build
   
   # Iniciar com PM2
   pm2 start npm --name "sistema-gestao" -- start
   pm2 save
   pm2 startup
   ```

## 🔒 Configurações de Segurança

### 1. Firewall
```bash
# Ubuntu/Debian
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # App (temporário)
sudo ufw enable
```

### 2. SSL/TLS com Let's Encrypt
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d seu-dominio.com
```

### 3. Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/sistema-gestao
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
    
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
}
```

## 📊 Monitoramento

### 1. Logs da Aplicação
```bash
# Ver logs em tempo real
pm2 logs sistema-gestao

# Logs de erro
pm2 logs sistema-gestao --err
```

### 2. Métricas do Sistema
```bash
# Status dos processos
pm2 status

# Monitoramento em tempo real
pm2 monit
```

### 3. Grafana Dashboard
- Acesse: `http://seu-dominio.com:3001`
- User: `admin`
- Password: `FMiog/gRKTrJnLUkl9HqDA==`

## 🔄 Backup e Recuperação

### 1. Backup do Banco
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h seu-host -u usuario -p banco > backup_$DATE.sql

# Upload para S3 (opcional)
aws s3 cp backup_$DATE.sql s3://seu-bucket/backups/

# Limpar backups antigos
find /backup/path -name "backup_*.sql" -mtime +30 -delete
```

### 2. Cron Job para Backup Automático
```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diário às 2h)
0 2 * * * /path/to/backup-db.sh
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco:**
   ```bash
   # Testar conexão
   node test-mysql-connection.js
   
   # Verificar logs
   pm2 logs sistema-gestao --err
   ```

2. **Build falha:**
   ```bash
   # Limpar cache
   rm -rf .next node_modules
   npm install
   npm run build
   ```

3. **Erro de permissões:**
   ```bash
   # Ajustar permissões
   sudo chown -R $USER:$USER /path/to/app
   chmod +x scripts/*.sh
   ```

4. **Memória insuficiente:**
   ```bash
   # Aumentar limite do Node.js
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

## 📞 Suporte e Manutenção

### Comandos Úteis
```bash
# Reiniciar aplicação
pm2 restart sistema-gestao

# Atualizar aplicação
git pull origin main
npm install
npm run build
pm2 restart sistema-gestao

# Ver uso de recursos
htop
df -h
free -h

# Verificar portas em uso
sudo netstat -tulpn | grep :3000
```

### Contatos de Emergência
- **Logs de erro:** `pm2 logs --err`
- **Status do sistema:** `pm2 status`
- **Monitoramento:** Grafana Dashboard

## 🎯 Próximos Passos

1. **Configurar domínio personalizado**
2. **Implementar CDN (Cloudflare)**
3. **Configurar alertas de monitoramento**
4. **Implementar CI/CD com GitHub Actions**
5. **Configurar backup automático**
6. **Implementar testes automatizados**

---

**🎉 Parabéns! Seu sistema está pronto para produção!**

**⚠️ Lembrete importante:**
- Mantenha as chaves de segurança em local seguro
- Delete o arquivo `production-secrets.txt` após configurar
- Nunca faça commit das chaves no repositório
- Configure backups regulares
- Monitore logs e métricas regularmente