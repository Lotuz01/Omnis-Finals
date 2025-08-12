# Script para Gerar Secrets Seguros - Sistema de Gestão
# Autor: Sistema de Gestão Team
# Versão: 1.0.0
# PowerShell Version

param(
    [switch]$WithRedisPassword
)

# Função para gerar string aleatória
function Generate-RandomString {
    param([int]$Length = 32)
    
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    $random = New-Object System.Random
    $result = ''
    
    for ($i = 0; $i -lt $Length; $i++) {
        $result += $chars[$random.Next($chars.Length)]
    }
    
    return $result
}

# Função para gerar senha forte
function Generate-StrongPassword {
    param([int]$Length = 16)
    
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    $random = New-Object System.Random
    $result = ''
    
    for ($i = 0; $i -lt $Length; $i++) {
        $result += $chars[$random.Next($chars.Length)]
    }
    
    return $result
}

# Função para log colorido
function Write-Log {
    param([string]$Message, [string]$Type = 'Info')
    
    $timestamp = Get-Date -Format 'HH:mm:ss'
    
    switch ($Type) {
        'Success' { Write-Host "[$timestamp] [OK] $Message" -ForegroundColor Green }
        'Warning' { Write-Host "[$timestamp] [WARN] $Message" -ForegroundColor Yellow }
        'Error' { Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor Red }
        default { Write-Host "[$timestamp] $Message" -ForegroundColor Blue }
    }
}

# Verificar se o arquivo .env.production existe
if (-not (Test-Path ".env.production")) {
    Write-Log "Arquivo .env.production não encontrado!" -Type Error
    Write-Log "Execute primeiro: Copy-Item '.env.production.example' '.env.production'"
    exit 1
}

Write-Log "=== Gerando Secrets Seguros ==="
Write-Host ""

# Gerar secrets
$jwtSecret = Generate-RandomString -Length 64
$encryptionKey = Generate-RandomString -Length 32
$sessionSecret = Generate-RandomString -Length 48
$dbPassword = Generate-StrongPassword -Length 20
$redisPassword = Generate-StrongPassword -Length 16

Write-Log "Secrets gerados com sucesso!"
Write-Host ""

# Criar backup do arquivo atual
$backupName = ".env.production.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item ".env.production" $backupName
Write-Log "Backup criado: $backupName" -Type Success

# Ler conteúdo do arquivo
$content = Get-Content ".env.production" -Raw

# Substituir valores no arquivo
Write-Log "Atualizando arquivo .env.production..."

# JWT Secret
$content = $content -replace 'JWT_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS', "JWT_SECRET=$jwtSecret"
Write-Log "JWT_SECRET configurado" -Type Success

# Encryption Key
$content = $content -replace 'ENCRYPTION_KEY=CHANGE_THIS_TO_A_32_CHAR_ENCRYPTION_KEY', "ENCRYPTION_KEY=$encryptionKey"
Write-Log "ENCRYPTION_KEY configurado" -Type Success

# Session Secret
$content = $content -replace 'SESSION_SECRET=CHANGE_THIS_TO_A_SECURE_SESSION_SECRET', "SESSION_SECRET=$sessionSecret"
Write-Log "SESSION_SECRET configurado" -Type Success

# Database Password
$content = $content -replace 'DB_PASSWORD=CHANGE_PASSWORD', "DB_PASSWORD=$dbPassword"
$content = $content -replace ':CHANGE_PASSWORD@', ":$dbPassword@"
Write-Log "DB_PASSWORD configurado" -Type Success

# Redis Password (opcional)
if ($WithRedisPassword) {
    $content = $content -replace 'REDIS_PASSWORD=', "REDIS_PASSWORD=$redisPassword"
    $content = $content -replace 'redis://redis:6379', "redis://:$redisPassword@redis:6379"
    Write-Log "REDIS_PASSWORD configurado" -Type Success
}

# Salvar arquivo atualizado
$content | Set-Content ".env.production" -NoNewline

Write-Host ""
Write-Log "Todos os secrets foram configurados!" -Type Success
Write-Host ""

Write-Log "IMPORTANTE: Configurações que ainda precisam ser ajustadas manualmente:" -Type Warning
Write-Host ""
Write-Host "EMAIL/SMTP:" -ForegroundColor Cyan
Write-Host "   - SMTP_USER: seu-email@gmail.com"
Write-Host "   - SMTP_PASSWORD: sua-senha-de-app"
Write-Host "   - SMTP_FROM: Sistema de Gestao noreply@seudominio.com"
Write-Host ""
Write-Host "NOTIFICACOES:" -ForegroundColor Cyan
Write-Host "   - SLACK_WEBHOOK_URL: https://hooks.slack.com/services/SEU/SLACK/WEBHOOK"
Write-Host "   - ALERT_EMAIL: admin@seudominio.com"
Write-Host ""
Write-Host "DOMINIO:" -ForegroundColor Cyan
Write-Host "   - CORS_ORIGIN: https://seudominio.com"
Write-Host ""
Write-Host "AWS (se usar backup S3):" -ForegroundColor Cyan
Write-Host "   - BACKUP_S3_BUCKET: seu-bucket-backup"
Write-Host "   - AWS_ACCESS_KEY_ID: sua-access-key"
Write-Host "   - AWS_SECRET_ACCESS_KEY: sua-secret-key"
Write-Host ""
Write-Host "SSL (se usar HTTPS):" -ForegroundColor Cyan
Write-Host "   - SSL_CERT_PATH: /caminho/para/certificado.pem"
Write-Host "   - SSL_KEY_PATH: /caminho/para/chave-privada.pem"
Write-Host ""

Write-Log "Lembre-se de:" -Type Warning
Write-Host "1. Nunca commitar o arquivo .env.production no git"
Write-Host "2. Manter os secrets em local seguro"
Write-Host "3. Usar um gerenciador de secrets em produção"
Write-Host "4. Revisar regularmente as configurações de segurança"
Write-Host ""

Write-Log "Para visualizar as configurações atuais:"
Write-Host "   Get-Content .env.production | Select-String '^[A-Z].*=' | Select-Object -First 20"
Write-Host ""
Write-Log "Para validar a configuração:"
Write-Host "   .\scripts\validate-production.sh"
Write-Host ""

Write-Log "Secrets gerados:" -Type Success
Write-Host "   JWT_SECRET: $($jwtSecret.Substring(0,8))...(64 chars)"
Write-Host "   ENCRYPTION_KEY: $($encryptionKey.Substring(0,8))...(32 chars)"
Write-Host "   SESSION_SECRET: $($sessionSecret.Substring(0,8))...(48 chars)"
Write-Host "   DB_PASSWORD: $($dbPassword.Substring(0,4))...(20 chars)"
if ($WithRedisPassword) {
    Write-Host "   REDIS_PASSWORD: $($redisPassword.Substring(0,4))...(16 chars)"
}
Write-Host ""