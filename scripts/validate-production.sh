#!/bin/bash

# Script de Validação para Produção - Sistema de Gestão
# Autor: Sistema de Gestão Team
# Versão: 1.0.0

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓${NC} $1"
    ((PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $1"
    ((FAILED++))
}

check_file_exists() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        log_success "$description: $file"
        return 0
    else
        log_error "$description: $file não encontrado"
        return 1
    fi
}

check_directory_exists() {
    local dir="$1"
    local description="$2"
    
    if [[ -d "$dir" ]]; then
        log_success "$description: $dir"
        return 0
    else
        log_error "$description: $dir não encontrado"
        return 1
    fi
}

check_docker_service() {
    local service="$1"
    
    if docker-compose ps "$service" 2>/dev/null | grep -q "Up"; then
        log_success "Docker: Serviço $service está rodando"
        return 0
    else
        log_error "Docker: Serviço $service não está rodando"
        return 1
    fi
}

check_http_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    local status_code
    if status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null); then
        if [[ "$status_code" == "$expected_status" ]]; then
            log_success "HTTP: $name ($url) - Status $status_code"
            return 0
        else
            log_error "HTTP: $name ($url) - Status $status_code (esperado $expected_status)"
            return 1
        fi
    else
        log_error "HTTP: $name ($url) - Falha na conexão"
        return 1
    fi
}

validate_security_headers() {
    local url="$1"
    local headers
    
    if headers=$(curl -s -I "$url" 2>/dev/null); then
        # Verificar headers de segurança
        if echo "$headers" | grep -qi "x-frame-options"; then
            log_success "Security: X-Frame-Options header presente"
        else
            log_warning "Security: X-Frame-Options header ausente"
        fi
        
        if echo "$headers" | grep -qi "x-content-type-options"; then
            log_success "Security: X-Content-Type-Options header presente"
        else
            log_warning "Security: X-Content-Type-Options header ausente"
        fi
        
        if echo "$headers" | grep -qi "strict-transport-security"; then
            log_success "Security: HSTS header presente"
        else
            log_warning "Security: HSTS header ausente (normal em HTTP)"
        fi
        
        if echo "$headers" | grep -qi "content-security-policy"; then
            log_success "Security: CSP header presente"
        else
            log_warning "Security: CSP header ausente"
        fi
    else
        log_error "Security: Não foi possível verificar headers"
    fi
}

validate_environment_files() {
    log "=== Validando Arquivos de Ambiente ==="
    
    check_file_exists ".env.production" "Arquivo de produção"
    
    if [[ -f ".env.production" ]]; then
        # Verificar variáveis críticas
        local required_vars=("DATABASE_URL" "JWT_SECRET" "REDIS_URL" "NODE_ENV")
        
        for var in "${required_vars[@]}"; do
            if grep -q "^${var}=" ".env.production"; then
                log_success "Env: Variável $var configurada"
            else
                log_error "Env: Variável $var não configurada"
            fi
        done
        
        # Verificar se NODE_ENV está como production
        if grep -q "^NODE_ENV=production" ".env.production"; then
            log_success "Env: NODE_ENV configurado para produção"
        else
            log_warning "Env: NODE_ENV não está configurado para produção"
        fi
    fi
}

validate_docker_files() {
    log "=== Validando Arquivos Docker ==="
    
    check_file_exists "Dockerfile" "Dockerfile da aplicação"
    check_file_exists "docker-compose.yml" "Docker Compose"
    
    # Verificar se o docker-compose tem os serviços necessários
    if [[ -f "docker-compose.yml" ]]; then
        local required_services=("app" "postgres" "redis" "prometheus" "grafana")
        
        for service in "${required_services[@]}"; do
            if grep -q "^  $service:" "docker-compose.yml"; then
                log_success "Docker: Serviço $service definido"
            else
                log_error "Docker: Serviço $service não definido"
            fi
        done
    fi
}

validate_security_files() {
    log "=== Validando Arquivos de Segurança ==="
    
    check_file_exists "src/middleware/security.ts" "Middleware de segurança"
    check_file_exists "src/tests/security.test.js" "Testes de segurança"
    
    # Verificar se o middleware está sendo usado
    if [[ -f "src/middleware.ts" ]]; then
        if grep -q "securityMiddleware" "src/middleware.ts"; then
            log_success "Security: Middleware integrado"
        else
            log_warning "Security: Middleware não integrado"
        fi
    fi
}

validate_monitoring_files() {
    log "=== Validando Arquivos de Monitoramento ==="
    
    check_directory_exists "monitoring" "Diretório de monitoramento"
    check_file_exists "monitoring/prometheus.yml" "Configuração do Prometheus"
    check_file_exists "monitoring/alert_rules.yml" "Regras de alerta"
    check_file_exists "monitoring/alertmanager.yml" "Configuração do Alertmanager"
    
    # Verificar dashboards do Grafana
    check_directory_exists "monitoring/grafana/dashboards" "Dashboards do Grafana"
    check_file_exists "monitoring/grafana/dashboards/sistema-gestao-dashboard.json" "Dashboard principal"
    check_file_exists "monitoring/grafana/dashboards/security-dashboard.json" "Dashboard de segurança"
    
    # Verificar provisioning do Grafana
    check_directory_exists "monitoring/grafana/provisioning" "Provisioning do Grafana"
    check_file_exists "monitoring/grafana/provisioning/dashboards/dashboards.yml" "Configuração de dashboards"
    check_file_exists "monitoring/grafana/provisioning/datasources/datasources.yml" "Configuração de datasources"
}

validate_scripts() {
    log "=== Validando Scripts ==="
    
    check_directory_exists "scripts" "Diretório de scripts"
    check_file_exists "scripts/deploy.sh" "Script de deploy"
    check_file_exists "scripts/backup.sh" "Script de backup"
    check_file_exists "scripts/health-monitor.sh" "Script de monitoramento"
    check_file_exists "scripts/init-db.sql" "Script de inicialização do banco"
    
    # Verificar permissões dos scripts
    local scripts=("scripts/deploy.sh" "scripts/backup.sh" "scripts/health-monitor.sh")
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script" ]]; then
            if [[ -x "$script" ]]; then
                log_success "Script: $script é executável"
            else
                log_warning "Script: $script não é executável (execute: chmod +x $script)"
            fi
        fi
    done
}

validate_nginx_config() {
    log "=== Validando Configuração do Nginx ==="
    
    check_directory_exists "nginx" "Diretório do Nginx"
    check_file_exists "nginx/nginx.conf" "Configuração do Nginx"
    
    if [[ -f "nginx/nginx.conf" ]]; then
        # Verificar configurações importantes
        if grep -q "ssl_certificate" "nginx/nginx.conf"; then
            log_success "Nginx: Configuração SSL presente"
        else
            log_warning "Nginx: Configuração SSL não encontrada"
        fi
        
        if grep -q "rate_limit" "nginx/nginx.conf"; then
            log_success "Nginx: Rate limiting configurado"
        else
            log_warning "Nginx: Rate limiting não configurado"
        fi
        
        if grep -q "gzip" "nginx/nginx.conf"; then
            log_success "Nginx: Compressão gzip configurada"
        else
            log_warning "Nginx: Compressão gzip não configurada"
        fi
    fi
}

validate_logging_system() {
    log "=== Validando Sistema de Logging ==="
    
    check_file_exists "src/utils/logger.ts" "Sistema de logging"
    
    if [[ -f "src/utils/logger.ts" ]]; then
        # Verificar funcionalidades do logger
        if grep -q "class Logger" "src/utils/logger.ts"; then
            log_success "Logger: Classe Logger implementada"
        else
            log_error "Logger: Classe Logger não encontrada"
        fi
        
        if grep -q "rotateFile" "src/utils/logger.ts"; then
            log_success "Logger: Rotação de arquivos implementada"
        else
            log_warning "Logger: Rotação de arquivos não implementada"
        fi
    fi
}

validate_tests() {
    log "=== Validando Testes ==="
    
    check_directory_exists "src/tests" "Diretório de testes"
    check_file_exists "src/tests/load.test.js" "Testes de carga"
    check_file_exists "src/tests/security.test.js" "Testes de segurança"
    
    # Verificar se os testes podem ser executados
    if command -v npm >/dev/null 2>&1; then
        if [[ -f "package.json" ]]; then
            if grep -q "test:security" "package.json"; then
                log_success "Tests: Script de teste de segurança configurado"
            else
                log_warning "Tests: Script de teste de segurança não configurado"
            fi
            
            if grep -q "test:load" "package.json"; then
                log_success "Tests: Script de teste de carga configurado"
            else
                log_warning "Tests: Script de teste de carga não configurado"
            fi
        fi
    fi
}

validate_running_services() {
    log "=== Validando Serviços em Execução ==="
    
    # Verificar se Docker Compose está rodando
    if command -v docker-compose >/dev/null 2>&1; then
        if docker-compose ps >/dev/null 2>&1; then
            log_success "Docker: Docker Compose disponível"
            
            # Verificar serviços individuais
            local services=("app" "postgres" "redis" "prometheus" "grafana")
            
            for service in "${services[@]}"; do
                check_docker_service "$service" || true
            done
        else
            log_warning "Docker: Serviços não estão rodando (execute: docker-compose up -d)"
        fi
    else
        log_warning "Docker: Docker Compose não está instalado"
    fi
}

validate_endpoints() {
    log "=== Validando Endpoints ==="
    
    # Verificar endpoints principais
    check_http_endpoint "Aplicação" "http://localhost:3000/api/health" || true
    check_http_endpoint "Métricas" "http://localhost:3000/api/metrics" || true
    check_http_endpoint "Prometheus" "http://localhost:9090/-/healthy" || true
    check_http_endpoint "Grafana" "http://localhost:3001/api/health" || true
    
    # Validar headers de segurança
    validate_security_headers "http://localhost:3000" || true
}

validate_documentation() {
    log "=== Validando Documentação ==="
    
    check_file_exists "README.md" "Documentação principal"
    
    if [[ -f "README.md" ]]; then
        # Verificar seções importantes
        if grep -q "Monitoramento" "README.md"; then
            log_success "Docs: Seção de monitoramento presente"
        else
            log_warning "Docs: Seção de monitoramento ausente"
        fi
        
        if grep -q "Segurança" "README.md"; then
            log_success "Docs: Seção de segurança presente"
        else
            log_warning "Docs: Seção de segurança ausente"
        fi
        
        if grep -q "Deploy" "README.md"; then
            log_success "Docs: Seção de deploy presente"
        else
            log_warning "Docs: Seção de deploy ausente"
        fi
    fi
}

generate_report() {
    echo ""
    echo "====================================="
    echo "    RELATÓRIO DE VALIDAÇÃO FINAL"
    echo "====================================="
    echo ""
    echo -e "${GREEN}✓ Testes Passaram:${NC} $PASSED"
    echo -e "${YELLOW}⚠ Avisos:${NC} $WARNINGS"
    echo -e "${RED}✗ Falhas:${NC} $FAILED"
    echo ""
    
    local total=$((PASSED + WARNINGS + FAILED))
    local success_rate=$((PASSED * 100 / total))
    
    echo "Taxa de Sucesso: ${success_rate}%"
    echo ""
    
    if [[ $FAILED -eq 0 ]]; then
        echo -e "${GREEN}🎉 SISTEMA PRONTO PARA PRODUÇÃO! 🎉${NC}"
        echo ""
        echo "Todas as verificações críticas passaram."
        if [[ $WARNINGS -gt 0 ]]; then
            echo "Existem alguns avisos que podem ser endereçados opcionalmente."
        fi
    elif [[ $FAILED -le 3 ]]; then
        echo -e "${YELLOW}⚠ SISTEMA QUASE PRONTO${NC}"
        echo ""
        echo "Existem algumas falhas que devem ser corrigidas antes do deploy."
    else
        echo -e "${RED}❌ SISTEMA NÃO ESTÁ PRONTO${NC}"
        echo ""
        echo "Muitas falhas detectadas. Revise as implementações antes do deploy."
    fi
    
    echo ""
    echo "Para mais detalhes, execute os scripts individuais:"
    echo "  ./scripts/health-monitor.sh check"
    echo "  ./scripts/deploy.sh"
    echo ""
}

main() {
    echo "====================================="
    echo "  VALIDAÇÃO PARA PRODUÇÃO - v1.0.0"
    echo "====================================="
    echo ""
    
    validate_environment_files
    validate_docker_files
    validate_security_files
    validate_monitoring_files
    validate_scripts
    validate_nginx_config
    validate_logging_system
    validate_tests
    validate_documentation
    validate_running_services
    validate_endpoints
    
    generate_report
}

# Executar validação
main "$@"