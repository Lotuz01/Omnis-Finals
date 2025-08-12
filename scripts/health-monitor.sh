#!/bin/bash

# Script de Monitoramento de Saúde - Sistema de Gestão
# Autor: Sistema de Gestão Team
# Versão: 1.0.0

set -euo pipefail

# Configurações
APP_NAME="sistema-gestao"
LOG_FILE="/var/log/${APP_NAME}/health-monitor.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"
CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-60}"
MAX_RETRIES=3
TIMEOUT=10

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Contadores de falhas
declare -A failure_counts
declare -A last_alert_time

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

send_alert() {
    local service="$1"
    local message="$2"
    local severity="${3:-warning}"
    
    if [[ -n "$ALERT_WEBHOOK" ]]; then
        local payload=$(cat <<EOF
{
    "service": "$service",
    "message": "$message",
    "severity": "$severity",
    "timestamp": "$(date -Iseconds)",
    "hostname": "$(hostname)"
}
EOF
        )
        
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            --max-time 5 || log_warning "Falha ao enviar alerta"
    fi
}

should_send_alert() {
    local service="$1"
    local current_time=$(date +%s)
    local last_alert="${last_alert_time[$service]:-0}"
    local alert_cooldown=300  # 5 minutos
    
    if (( current_time - last_alert > alert_cooldown )); then
        last_alert_time[$service]=$current_time
        return 0
    fi
    return 1
}

check_http_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    local response
    local status_code
    
    if response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        status_code="${response: -3}"
        if [[ "$status_code" == "$expected_status" ]]; then
            log_success "$name: HTTP $status_code"
            failure_counts[$name]=0
            return 0
        else
            log_error "$name: HTTP $status_code (esperado $expected_status)"
        fi
    else
        log_error "$name: Falha na conexão"
    fi
    
    failure_counts[$name]=$((${failure_counts[$name]:-0} + 1))
    
    if (( ${failure_counts[$name]} >= MAX_RETRIES )) && should_send_alert "$name"; then
        send_alert "$name" "Serviço $name falhou $MAX_RETRIES vezes consecutivas" "critical"
    fi
    
    return 1
}

check_docker_service() {
    local service="$1"
    
    if docker-compose ps "$service" | grep -q "Up"; then
        log_success "Docker: $service está rodando"
        failure_counts["docker_$service"]=0
        return 0
    else
        log_error "Docker: $service não está rodando"
        failure_counts["docker_$service"]=$((${failure_counts["docker_$service"]:-0} + 1))
        
        if (( ${failure_counts["docker_$service"]} >= MAX_RETRIES )) && should_send_alert "docker_$service"; then
            send_alert "docker_$service" "Container $service não está rodando" "critical"
        fi
        return 1
    fi
}

check_database_connection() {
    local name="postgres"
    
    if docker-compose exec -T postgres pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; then
        log_success "Database: PostgreSQL conectado"
        failure_counts[$name]=0
        
        # Verificar número de conexões
        local connections
        if connections=$(docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' '); then
            log "Database: $connections conexões ativas"
            
            # Alertar se muitas conexões
            if (( connections > 80 )); then
                log_warning "Database: Muitas conexões ativas ($connections)"
                if should_send_alert "postgres_connections"; then
                    send_alert "postgres_connections" "PostgreSQL tem $connections conexões ativas" "warning"
                fi
            fi
        fi
        
        return 0
    else
        log_error "Database: PostgreSQL não conectado"
        failure_counts[$name]=$((${failure_counts[$name]:-0} + 1))
        
        if (( ${failure_counts[$name]} >= MAX_RETRIES )) && should_send_alert "$name"; then
            send_alert "$name" "PostgreSQL não está respondendo" "critical"
        fi
        return 1
    fi
}

check_redis_connection() {
    local name="redis"
    
    if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_success "Cache: Redis conectado"
        failure_counts[$name]=0
        
        # Verificar uso de memória
        local memory_usage
        if memory_usage=$(docker-compose exec -T redis redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r'); then
            log "Cache: Redis usando $memory_usage de memória"
        fi
        
        return 0
    else
        log_error "Cache: Redis não conectado"
        failure_counts[$name]=$((${failure_counts[$name]:-0} + 1))
        
        if (( ${failure_counts[$name]} >= MAX_RETRIES )) && should_send_alert "$name"; then
            send_alert "$name" "Redis não está respondendo" "critical"
        fi
        return 1
    fi
}

check_disk_space() {
    local threshold=85
    local usage
    
    usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if (( usage < threshold )); then
        log_success "Disk: ${usage}% usado"
        failure_counts["disk"]=0
    else
        log_warning "Disk: ${usage}% usado (limite: ${threshold}%)"
        if should_send_alert "disk"; then
            send_alert "disk" "Uso de disco alto: ${usage}%" "warning"
        fi
    fi
}

check_memory_usage() {
    local threshold=85
    local usage
    
    usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if (( usage < threshold )); then
        log_success "Memory: ${usage}% usado"
        failure_counts["memory"]=0
    else
        log_warning "Memory: ${usage}% usado (limite: ${threshold}%)"
        if should_send_alert "memory"; then
            send_alert "memory" "Uso de memória alto: ${usage}%" "warning"
        fi
    fi
}

check_cpu_usage() {
    local threshold=80
    local usage
    
    usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    usage=${usage%.*}  # Remove decimal
    
    if (( usage < threshold )); then
        log_success "CPU: ${usage}% usado"
        failure_counts["cpu"]=0
    else
        log_warning "CPU: ${usage}% usado (limite: ${threshold}%)"
        if should_send_alert "cpu"; then
            send_alert "cpu" "Uso de CPU alto: ${usage}%" "warning"
        fi
    fi
}

check_ssl_certificate() {
    local domain="${SSL_DOMAIN:-localhost}"
    local port="${SSL_PORT:-443}"
    
    if command -v openssl >/dev/null 2>&1; then
        local expiry_date
        if expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:$port" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2); then
            local expiry_timestamp=$(date -d "$expiry_date" +%s)
            local current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if (( days_until_expiry > 30 )); then
                log_success "SSL: Certificado válido por $days_until_expiry dias"
            elif (( days_until_expiry > 7 )); then
                log_warning "SSL: Certificado expira em $days_until_expiry dias"
                if should_send_alert "ssl"; then
                    send_alert "ssl" "Certificado SSL expira em $days_until_expiry dias" "warning"
                fi
            else
                log_error "SSL: Certificado expira em $days_until_expiry dias!"
                if should_send_alert "ssl"; then
                    send_alert "ssl" "Certificado SSL expira em $days_until_expiry dias!" "critical"
                fi
            fi
        else
            log_warning "SSL: Não foi possível verificar certificado"
        fi
    fi
}

generate_health_report() {
    local report_file="/tmp/health-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "hostname": "$(hostname)",
    "services": {
        "application": $(check_http_endpoint "app" "http://localhost:3000/api/health" && echo "true" || echo "false"),
        "database": $(check_database_connection && echo "true" || echo "false"),
        "cache": $(check_redis_connection && echo "true" || echo "false"),
        "prometheus": $(check_http_endpoint "prometheus" "http://localhost:9090/-/healthy" && echo "true" || echo "false"),
        "grafana": $(check_http_endpoint "grafana" "http://localhost:3001/api/health" && echo "true" || echo "false")
    },
    "resources": {
        "disk_usage_percent": $(df / | awk 'NR==2 {print $5}' | sed 's/%//'),
        "memory_usage_percent": $(free | awk 'NR==2{printf "%.0f", $3*100/$2}'),
        "cpu_usage_percent": $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d. -f1)
    },
    "failure_counts": $(printf '%s\n' "${failure_counts[@]}" | jq -R -s 'split("\n")[:-1] | map(split("=")) | map({(.[0]): (.[1] | tonumber)}) | add // {}')
}
EOF
    
    log "Relatório de saúde gerado: $report_file"
}

run_health_checks() {
    log "=== Iniciando verificações de saúde ==="
    
    # Verificar serviços HTTP
    check_http_endpoint "app" "http://localhost:3000/api/health"
    check_http_endpoint "metrics" "http://localhost:3000/api/metrics"
    check_http_endpoint "prometheus" "http://localhost:9090/-/healthy"
    check_http_endpoint "grafana" "http://localhost:3001/api/health"
    
    # Verificar containers Docker
    check_docker_service "app"
    check_docker_service "postgres"
    check_docker_service "redis"
    check_docker_service "prometheus"
    check_docker_service "grafana"
    
    # Verificar conexões de banco
    check_database_connection
    check_redis_connection
    
    # Verificar recursos do sistema
    check_disk_space
    check_memory_usage
    check_cpu_usage
    
    # Verificar SSL (se configurado)
    check_ssl_certificate
    
    log "=== Verificações de saúde concluídas ==="
}

show_help() {
    echo "Sistema de Gestão - Monitor de Saúde"
    echo ""
    echo "Uso: $0 [OPÇÃO]"
    echo ""
    echo "Opções:"
    echo "  monitor    Executa monitoramento contínuo (padrão)"
    echo "  check      Executa verificação única"
    echo "  report     Gera relatório de saúde"
    echo "  help       Mostra esta ajuda"
    echo ""
    echo "Variáveis de ambiente:"
    echo "  HEALTH_CHECK_INTERVAL  Intervalo entre verificações (padrão: 60s)"
    echo "  ALERT_WEBHOOK_URL      URL para envio de alertas"
    echo "  SSL_DOMAIN            Domínio para verificação SSL"
    echo "  SSL_PORT              Porta SSL (padrão: 443)"
}

main() {
    local action="${1:-monitor}"
    
    # Criar diretório de log se não existir
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "$action" in
        "monitor")
            log "Iniciando monitoramento contínuo (intervalo: ${CHECK_INTERVAL}s)"
            while true; do
                run_health_checks
                sleep "$CHECK_INTERVAL"
            done
            ;;
        "check")
            run_health_checks
            ;;
        "report")
            generate_health_report
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

# Trap para cleanup
trap 'log "Monitor interrompido"; exit 0' INT TERM

# Executar função principal
main "$@"