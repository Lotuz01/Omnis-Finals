#!/bin/bash

# Script para Gerar Secrets Seguros - Sistema de Gestão
# Autor: Sistema de Gestão Team
# Versão: 1.0.0

set -euo pipefail

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Função para gerar string aleatória
generate_random_string() {
    local length=${1:-32}
    openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-${length}
}

# Função para gerar senha forte
generate_strong_password() {
    local length=${1:-16}
    openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-${length}
}

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $1"
}

# Verificar se o arquivo .env.production existe
if [[ ! -f ".env.production" ]]; then
    log_error "Arquivo .env.production não encontrado!"
    log "Execute primeiro: cp .env.production.example .env.production"
    exit 1
fi

log "=== Gerando Secrets Seguros ==="
echo ""

# Gerar secrets
JWT_SECRET=$(generate_random_string 64)
ENCRYPTION_KEY=$(generate_random_string 32)
SESSION_SECRET=$(generate_random_string 48)
DB_PASSWORD=$(generate_strong_password 20)


log "Secrets gerados com sucesso!"
echo ""

# Criar backup do arquivo atual
cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
log_success "Backup criado: .env.production.backup.$(date +%Y%m%d_%H%M%S)"

# Substituir valores no arquivo
log "Atualizando arquivo .env.production..."

# JWT Secret
sed -i "s/JWT_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS/JWT_SECRET=${JWT_SECRET}/g" .env.production
log_success "JWT_SECRET configurado"

# Encryption Key
sed -i "s/ENCRYPTION_KEY=CHANGE_THIS_TO_A_32_CHAR_ENCRYPTION_KEY/ENCRYPTION_KEY=${ENCRYPTION_KEY}/g" .env.production
log_success "ENCRYPTION_KEY configurado"

# Session Secret
sed -i "s/SESSION_SECRET=CHANGE_THIS_TO_A_SECURE_SESSION_SECRET/SESSION_SECRET=${SESSION_SECRET}/g" .env.production
log_success "SESSION_SECRET configurado"

# Database Password
sed -i "s/DB_PASSWORD=CHANGE_PASSWORD/DB_PASSWORD=${DB_PASSWORD}/g" .env.production
sed -i "s/:CHANGE_PASSWORD@/:${DB_PASSWORD}@/g" .env.production
log_success "DB_PASSWORD configurado"



echo ""
log_success "Todos os secrets foram configurados!"
echo ""

log_warning "IMPORTANTE: Configurações que ainda precisam ser ajustadas manualmente:"
echo ""
echo "📧 EMAIL/SMTP:"
echo "   - SMTP_USER: seu-email@gmail.com"
echo "   - SMTP_PASSWORD: sua-senha-de-app"
echo "   - SMTP_FROM: Sistema de Gestão <noreply@seudominio.com>"
echo ""
echo "🔔 NOTIFICAÇÕES:"
echo "   - SLACK_WEBHOOK_URL: https://hooks.slack.com/services/SEU/SLACK/WEBHOOK"
echo "   - ALERT_EMAIL: admin@seudominio.com"
echo ""
echo "🌐 DOMÍNIO:"
echo "   - CORS_ORIGIN: https://seudominio.com"
echo ""
echo "☁️ AWS (se usar backup S3):"
echo "   - BACKUP_S3_BUCKET: seu-bucket-backup"
echo "   - AWS_ACCESS_KEY_ID: sua-access-key"
echo "   - AWS_SECRET_ACCESS_KEY: sua-secret-key"
echo ""
echo "🔒 SSL (se usar HTTPS):"
echo "   - SSL_CERT_PATH: /caminho/para/certificado.pem"
echo "   - SSL_KEY_PATH: /caminho/para/chave-privada.pem"
echo ""

log_warning "Lembre-se de:"
echo "1. Nunca commitar o arquivo .env.production no git"
echo "2. Manter os secrets em local seguro"
echo "3. Usar um gerenciador de secrets em produção"
echo "4. Revisar regularmente as configurações de segurança"
echo ""

log "Para visualizar as configurações atuais:"
echo "   cat .env.production | grep -E '^[A-Z].*=' | head -20"
echo ""
log "Para validar a configuração:"
echo "   ./scripts/validate-production.sh"
echo ""