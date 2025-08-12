#!/bin/bash
# Script de backup automático para Sistema de Gestão

set -e

# Configurações
BACKUP_DIR="/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="sistema_gestao_backup_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
RETENTION_DAYS=30
LOG_FILE="/backups/backup.log"

# Função de log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Função de cleanup
cleanup() {
    log "Limpando backups antigos (mais de $RETENTION_DAYS dias)"
    find "$BACKUP_DIR" -name "sistema_gestao_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.log" -mtime +$RETENTION_DAYS -delete
}

# Função de verificação de espaço
check_disk_space() {
    AVAILABLE_SPACE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    REQUIRED_SPACE=1048576  # 1GB em KB
    
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        log "ERRO: Espaço insuficiente em disco. Disponível: ${AVAILABLE_SPACE}KB, Necessário: ${REQUIRED_SPACE}KB"
        exit 1
    fi
}

# Função principal de backup
perform_backup() {
    log "Iniciando backup do banco de dados"
    
    # Verificar se o diretório de backup existe
    mkdir -p "$BACKUP_DIR"
    
    # Verificar espaço em disco
    check_disk_space
    
    # Realizar backup
    log "Criando backup: $BACKUP_FILE"
    
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h db \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="$BACKUP_DIR/$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"; then
        
        log "Backup criado com sucesso"
        
        # Comprimir backup
        log "Comprimindo backup"
        gzip "$BACKUP_DIR/$BACKUP_FILE"
        
        # Verificar integridade
        if [ -f "$BACKUP_DIR/$COMPRESSED_FILE" ]; then
            BACKUP_SIZE=$(stat -f%z "$BACKUP_DIR/$COMPRESSED_FILE" 2>/dev/null || stat -c%s "$BACKUP_DIR/$COMPRESSED_FILE")
            log "Backup comprimido criado: $COMPRESSED_FILE (${BACKUP_SIZE} bytes)"
            
            # Testar integridade do arquivo comprimido
            if gzip -t "$BACKUP_DIR/$COMPRESSED_FILE"; then
                log "Verificação de integridade: OK"
            else
                log "ERRO: Falha na verificação de integridade"
                exit 1
            fi
        else
            log "ERRO: Arquivo de backup comprimido não encontrado"
            exit 1
        fi
        
    else
        log "ERRO: Falha ao criar backup"
        exit 1
    fi
}

# Função de backup de arquivos da aplicação
backup_app_files() {
    log "Iniciando backup dos arquivos da aplicação"
    
    APP_BACKUP_FILE="app_files_backup_${DATE}.tar.gz"
    
    # Backup de uploads e logs
    tar -czf "$BACKUP_DIR/$APP_BACKUP_FILE" \
        -C /app \
        uploads/ \
        logs/ \
        2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log "Backup de arquivos da aplicação criado: $APP_BACKUP_FILE"
    else
        log "AVISO: Falha parcial no backup de arquivos da aplicação"
    fi
}

# Função de notificação
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"Backup Sistema de Gestão - $status\",
                \"attachments\": [{
                    \"color\": \"$([ '$status' = 'SUCESSO' ] && echo 'good' || echo 'danger')\",
                    \"text\": \"$message\",
                    \"ts\": $(date +%s)
                }]
            }" 2>&1 | tee -a "$LOG_FILE"
    fi
}

# Função principal
main() {
    log "=== Iniciando processo de backup ==="
    
    # Verificar variáveis de ambiente
    if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
        log "ERRO: Variáveis de ambiente do banco de dados não configuradas"
        send_notification "ERRO" "Variáveis de ambiente não configuradas"
        exit 1
    fi
    
    # Aguardar banco de dados estar disponível
    log "Aguardando banco de dados ficar disponível"
    for i in {1..30}; do
        if PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
            log "Banco de dados disponível"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log "ERRO: Timeout aguardando banco de dados"
            send_notification "ERRO" "Banco de dados não disponível após 30 tentativas"
            exit 1
        fi
        
        sleep 2
    done
    
    # Realizar backups
    perform_backup
    backup_app_files
    cleanup
    
    log "=== Processo de backup concluído com sucesso ==="
    send_notification "SUCESSO" "Backup realizado com sucesso: $COMPRESSED_FILE"
}

# Tratamento de sinais
trap 'log "Backup interrompido"; exit 1' INT TERM

# Executar função principal
main "$@"