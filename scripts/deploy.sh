#!/bin/bash

# Script de Deploy Automatizado - Sistema de Gestão
# Autor: Sistema de Gestão Team
# Versão: 1.0.0

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
APP_NAME="sistema-gestao"
DOCKER_COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOG_FILE="/var/log/${APP_NAME}/deploy.log"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
MAX_HEALTH_CHECKS=30
HEALTH_CHECK_INTERVAL=10

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    log "Verificando pré-requisitos..."
    
    # Verificar se Docker está instalado e rodando
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker não está rodando"
        exit 1
    fi
    
    # Verificar se Docker Compose está instalado
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose não está instalado"
        exit 1
    fi
    
    # Verificar se o arquivo docker-compose.yml existe
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        log_error "Arquivo $DOCKER_COMPOSE_FILE não encontrado"
        exit 1
    fi
    
    # Verificar se o arquivo .env.production existe
    if [[ ! -f ".env.production" ]]; then
        log_error "Arquivo .env.production não encontrado"
        exit 1
    fi
    
    log_success "Pré-requisitos verificados"
}

create_backup() {
    log "Criando backup antes do deploy..."
    
    # Criar diretório de backup se não existir
    mkdir -p "$BACKUP_DIR"
    
    # Timestamp para o backup
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="${APP_NAME}_backup_${TIMESTAMP}"
    
    # Fazer backup do banco de dados se estiver rodando
    if docker-compose ps | grep -q "postgres.*Up"; then
        log "Fazendo backup do banco de dados..."
        docker-compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "${BACKUP_DIR}/${BACKUP_NAME}_db.sql.gz"
        log_success "Backup do banco de dados criado: ${BACKUP_NAME}_db.sql.gz"
    fi
    
    # Fazer backup dos volumes
    log "Fazendo backup dos volumes..."
    docker run --rm -v "${PWD}:/backup" -v "sistema-gestao_uploads:/data" alpine tar czf "/backup/${BACKUP_DIR}/${BACKUP_NAME}_uploads.tar.gz" -C /data .
    
    log_success "Backup criado com sucesso"
}

build_and_deploy() {
    log "Iniciando build e deploy..."
    
    # Parar serviços existentes
    log "Parando serviços existentes..."
    docker-compose down --remove-orphans
    
    # Limpar imagens antigas
    log "Limpando imagens antigas..."
    docker system prune -f
    
    # Build das imagens
    log "Fazendo build das imagens..."
    docker-compose build --no-cache
    
    # Iniciar serviços
    log "Iniciando serviços..."
    docker-compose up -d
    
    log_success "Deploy realizado com sucesso"
}

wait_for_health() {
    log "Aguardando aplicação ficar saudável..."
    
    local count=0
    while [[ $count -lt $MAX_HEALTH_CHECKS ]]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "Aplicação está saudável"
            return 0
        fi
        
        count=$((count + 1))
        log "Tentativa $count/$MAX_HEALTH_CHECKS - Aguardando ${HEALTH_CHECK_INTERVAL}s..."
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    log_error "Aplicação não ficou saudável após $((MAX_HEALTH_CHECKS * HEALTH_CHECK_INTERVAL)) segundos"
    return 1
}

run_tests() {
    log "Executando testes pós-deploy..."
    
    # Teste de conectividade básica
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
        log_success "✓ Health check passou"
    else
        log_error "✗ Health check falhou"
        return 1
    fi
    
    # Teste de métricas
    if curl -f -s "http://localhost:3000/api/metrics" > /dev/null; then
        log_success "✓ Endpoint de métricas acessível"
    else
        log_warning "⚠ Endpoint de métricas não acessível"
    fi
    
    # Teste de banco de dados
    if docker-compose exec -T postgres pg_isready -U "$POSTGRES_USER" > /dev/null; then
        log_success "✓ Banco de dados conectado"
    else
        log_error "✗ Banco de dados não conectado"
        return 1
    fi
    
    # Teste de Redis
    if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "✓ Redis conectado"
    else
        log_warning "⚠ Redis não conectado"
    fi
    
    log_success "Testes pós-deploy concluídos"
}

show_status() {
    log "Status dos serviços:"
    docker-compose ps
    
    echo ""
    log "URLs de acesso:"
    echo "  • Aplicação: http://localhost:3000"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • Grafana: http://localhost:3001 (admin/admin)"
    echo "  • Health Check: http://localhost:3000/api/health"
    echo "  • Métricas: http://localhost:3000/api/metrics"
}

rollback() {
    log_warning "Iniciando rollback..."
    
    # Parar serviços atuais
    docker-compose down
    
    # Restaurar backup mais recente
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*_db.sql.gz 2>/dev/null | head -n1)
    if [[ -n "$LATEST_BACKUP" ]]; then
        log "Restaurando backup: $LATEST_BACKUP"
        # Aqui você implementaria a lógica de restore
        log_warning "Rollback implementado parcialmente - restaure manualmente se necessário"
    else
        log_warning "Nenhum backup encontrado para rollback"
    fi
}

cleanup() {
    log "Limpando recursos não utilizados..."
    docker system prune -f
    docker volume prune -f
    log_success "Limpeza concluída"
}

show_help() {
    echo "Sistema de Gestão - Script de Deploy"
    echo ""
    echo "Uso: $0 [OPÇÃO]"
    echo ""
    echo "Opções:"
    echo "  deploy     Executa deploy completo (padrão)"
    echo "  backup     Cria apenas backup"
    echo "  rollback   Executa rollback para versão anterior"
    echo "  status     Mostra status dos serviços"
    echo "  cleanup    Limpa recursos não utilizados"
    echo "  help       Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 deploy"
    echo "  $0 backup"
    echo "  $0 status"
}

# Função principal
main() {
    local action="${1:-deploy}"
    
    # Criar diretório de log se não existir
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "$action" in
        "deploy")
            log "=== Iniciando Deploy do $APP_NAME ==="
            check_prerequisites
            create_backup
            build_and_deploy
            
            if wait_for_health; then
                run_tests
                show_status
                log_success "=== Deploy concluído com sucesso ==="
            else
                log_error "=== Deploy falhou - considere fazer rollback ==="
                exit 1
            fi
            ;;
        "backup")
            log "=== Criando Backup ==="
            create_backup
            ;;
        "rollback")
            rollback
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help")
            show_help
            ;;
        *)
            log_error "Ação inválida: $action"
            show_help
            exit 1
            ;;
    esac
}

# Trap para cleanup em caso de erro
trap 'log_error "Deploy interrompido"; exit 1' INT TERM

# Executar função principal
main "$@"