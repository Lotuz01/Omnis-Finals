# Script de Validacao para Producao - Sistema de Gestao
# Versao: 1.0.0

$ErrorActionPreference = "Continue"

# Contadores
$script:PASSED = 0
$script:FAILED = 0
$script:WARNINGS = 0

# Funcoes auxiliares
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] [OK] $Message" -ForegroundColor Green
    $script:PASSED++
}

function Write-Warning {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] [WARN] $Message" -ForegroundColor Yellow
    $script:WARNINGS++
}

function Write-Error {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor Red
    $script:FAILED++
}

function Test-FileExists {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    if (Test-Path $FilePath -PathType Leaf) {
        Write-Success "$Description`: $FilePath"
        return $true
    } else {
        Write-Error "$Description`: $FilePath nao encontrado"
        return $false
    }
}

function Test-DirectoryExists {
    param(
        [string]$DirectoryPath,
        [string]$Description
    )
    
    if (Test-Path $DirectoryPath -PathType Container) {
        Write-Success "$Description`: $DirectoryPath"
        return $true
    } else {
        Write-Error "$Description`: $DirectoryPath nao encontrado"
        return $false
    }
}

function Test-EnvironmentFiles {
    Write-Log "=== Validando Arquivos de Ambiente ==="
    
    Test-FileExists ".env.production" "Arquivo de producao"
    
    if (Test-Path ".env.production") {
        $requiredVars = @("DATABASE_URL", "JWT_SECRET", "REDIS_URL", "NODE_ENV")
        $lines = Get-Content ".env.production"
        
        foreach ($var in $requiredVars) {
            $found = $false
            foreach ($line in $lines) {
                if ($line -match "^$var=.+") {
                    $found = $true
                    break
                }
            }
            if ($found) {
                Write-Success "Env: Variavel $var configurada"
            } else {
                Write-Error "Env: Variavel $var nao configurada"
            }
        }
        
        $nodeEnvFound = $false
        foreach ($line in $lines) {
            if ($line -match "^NODE_ENV=production") {
                $nodeEnvFound = $true
                break
            }
        }
        if ($nodeEnvFound) {
            Write-Success "Env: NODE_ENV configurado para producao"
        } else {
            Write-Warning "Env: NODE_ENV nao esta configurado para producao"
        }
    }
}

function Test-DockerFiles {
    Write-Log "=== Validando Arquivos Docker ==="
    
    Test-FileExists "Dockerfile" "Dockerfile da aplicacao"
    Test-FileExists "docker-compose.yml" "Docker Compose"
    
    if (Test-Path "docker-compose.yml") {
        $requiredServices = @("app", "db", "redis", "prometheus", "grafana")
        $lines = Get-Content "docker-compose.yml"
        
        foreach ($service in $requiredServices) {
            $found = $false
            foreach ($line in $lines) {
                if ($line -match "^\s*$service`:") {
                    $found = $true
                    break
                }
            }
            if ($found) {
                Write-Success "Docker: Servico $service definido"
            } else {
                Write-Error "Docker: Servico $service nao definido"
            }
        }
    }
}

function Test-SecurityFiles {
    Write-Log "=== Validando Arquivos de Seguranca ==="
    
    Test-FileExists "src\middleware\security.ts" "Middleware de seguranca"
    Test-FileExists "src\tests\security.test.js" "Testes de seguranca"
    
    if (Test-Path "src\middleware.ts") {
        $content = Get-Content "src\middleware.ts" -Raw
        if ($content -match "securityMiddleware") {
            Write-Success "Security: Middleware integrado"
        } else {
            Write-Warning "Security: Middleware nao integrado"
        }
    }
}

function Test-MonitoringFiles {
    Write-Log "=== Validando Arquivos de Monitoramento ==="
    
    Test-DirectoryExists "monitoring" "Diretorio de monitoramento"
    Test-FileExists "monitoring\prometheus.yml" "Configuracao do Prometheus"
    Test-FileExists "monitoring\alert_rules.yml" "Regras de alerta"
    Test-FileExists "monitoring\alertmanager.yml" "Configuracao do Alertmanager"
    
    Test-DirectoryExists "monitoring\grafana\dashboards" "Dashboards do Grafana"
    Test-FileExists "monitoring\grafana\dashboards\sistema-gestao-dashboard.json" "Dashboard principal"
    Test-FileExists "monitoring\grafana\dashboards\security-dashboard.json" "Dashboard de seguranca"
    
    Test-DirectoryExists "monitoring\grafana\provisioning" "Provisioning do Grafana"
    Test-FileExists "monitoring\grafana\provisioning\dashboards\dashboards.yml" "Configuracao de dashboards"
    Test-FileExists "monitoring\grafana\provisioning\datasources\datasources.yml" "Configuracao de datasources"
}

function Test-Scripts {
    Write-Log "=== Validando Scripts ==="
    
    Test-DirectoryExists "scripts" "Diretorio de scripts"
    Test-FileExists "scripts\deploy.sh" "Script de deploy"
    Test-FileExists "scripts\backup.sh" "Script de backup"
    Test-FileExists "scripts\health-monitor.sh" "Script de monitoramento"
    Test-FileExists "scripts\init-db.sql" "Script de inicializacao do banco"
    Test-FileExists "scripts\generate-secrets.ps1" "Script de geracao de secrets"
    Test-FileExists "scripts\validate-production.ps1" "Script de validacao"
}

function Test-NginxConfig {
    Write-Log "=== Validando Configuracao do Nginx ==="
    
    Test-DirectoryExists "nginx" "Diretorio do Nginx"
    Test-FileExists "nginx\nginx.conf" "Configuracao do Nginx"
    
    if (Test-Path "nginx\nginx.conf") {
        $content = Get-Content "nginx\nginx.conf" -Raw
        
        if ($content -match "ssl_certificate") {
            Write-Success "Nginx: Configuracao SSL presente"
        } else {
            Write-Warning "Nginx: Configuracao SSL nao encontrada"
        }
        
        if ($content -match "limit_req_zone") {
            Write-Success "Nginx: Rate limiting configurado"
        } else {
            Write-Warning "Nginx: Rate limiting nao configurado"
        }
        
        if ($content -match "gzip") {
            Write-Success "Nginx: Compressao gzip configurada"
        } else {
            Write-Warning "Nginx: Compressao gzip nao configurada"
        }
    }
}

function Test-LoggingSystem {
    Write-Log "=== Validando Sistema de Logging ==="
    
    Test-FileExists "src\utils\logger.ts" "Sistema de logging"
    
    if (Test-Path "src\utils\logger.ts") {
        $content = Get-Content "src\utils\logger.ts" -Raw
        
        if ($content -match "class Logger") {
            Write-Success "Logger: Classe Logger implementada"
        } else {
            Write-Error "Logger: Classe Logger nao encontrada"
        }
        
        if ($content -match "rotateLogFile") {
            Write-Success "Logger: Rotacao de arquivos implementada"
        } else {
            Write-Warning "Logger: Rotacao de arquivos nao implementada"
        }
    }
}

function Test-Tests {
    Write-Log "=== Validando Testes ==="
    
    Test-DirectoryExists "src\tests" "Diretorio de testes"
    Test-FileExists "src\tests\load.test.js" "Testes de carga"
    Test-FileExists "src\tests\security.test.js" "Testes de seguranca"
    
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        if (Test-Path "package.json") {
            $content = Get-Content "package.json" -Raw
            
            if ($content -match "test:security") {
                Write-Success "Tests: Script de teste de seguranca configurado"
            } else {
                Write-Warning "Tests: Script de teste de seguranca nao configurado"
            }
            
            if ($content -match "test:load") {
                Write-Success "Tests: Script de teste de carga configurado"
            } else {
                Write-Warning "Tests: Script de teste de carga nao configurado"
            }
        }
    }
}

function Test-Documentation {
    Write-Log "=== Validando Documentacao ==="
    
    Test-FileExists "README.md" "Documentacao principal"
    Test-FileExists "PRODUCTION_CHECKLIST.md" "Checklist de producao"
    Test-FileExists "CONFIGURACAO_MANUAL.md" "Guia de configuracao"
    
    if (Test-Path "README.md") {
        $content = Get-Content "README.md" -Raw
        
        if ($content -match "Monitoramento") {
            Write-Success "Docs: Secao de monitoramento presente"
        } else {
            Write-Warning "Docs: Secao de monitoramento ausente"
        }
        
        if ($content -match "Seguranca" -or $content -match "Segurança") {
            Write-Success "Docs: Secao de seguranca presente"
        } else {
            Write-Warning "Docs: Secao de seguranca ausente"
        }
        
        if ($content -match "Deploy") {
            Write-Success "Docs: Secao de deploy presente"
        } else {
            Write-Warning "Docs: Secao de deploy ausente"
        }
    }
}

function Show-Report {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "    RELATORIO DE VALIDACAO FINAL" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[OK] Testes Passaram: $script:PASSED" -ForegroundColor Green
    Write-Host "[WARN] Avisos: $script:WARNINGS" -ForegroundColor Yellow
    Write-Host "[ERROR] Falhas: $script:FAILED" -ForegroundColor Red
    Write-Host ""
    
    $total = $script:PASSED + $script:WARNINGS + $script:FAILED
    if ($total -gt 0) {
        $successRate = [math]::Round(($script:PASSED * 100 / $total), 1)
        Write-Host "Taxa de Sucesso: $successRate%"
    } else {
        Write-Host "Taxa de Sucesso: 0%"
    }
    Write-Host ""
    
    if ($script:FAILED -eq 0) {
        Write-Host "[SUCCESS] SISTEMA PRONTO PARA PRODUCAO!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Todas as verificacoes criticas passaram."
        if ($script:WARNINGS -gt 0) {
            Write-Host "Existem alguns avisos que podem ser enderecados opcionalmente."
        }
    } elseif ($script:FAILED -le 3) {
        Write-Host "[WARNING] SISTEMA QUASE PRONTO" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Existem algumas falhas que devem ser corrigidas antes do deploy."
    } else {
        Write-Host "[ERROR] SISTEMA NAO ESTA PRONTO" -ForegroundColor Red
        Write-Host ""
        Write-Host "Muitas falhas detectadas. Revise as implementacoes antes do deploy."
    }
    
    Write-Host ""
    Write-Host "Para mais detalhes, execute os scripts individuais:"
    Write-Host "  .\scripts\health-monitor.sh check"
    Write-Host "  .\scripts\deploy.sh"
    Write-Host ""
}

function Main {
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "  VALIDACAO PARA PRODUCAO - v1.0.0" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    Test-EnvironmentFiles
    Test-DockerFiles
    Test-SecurityFiles
    Test-MonitoringFiles
    Test-Scripts
    Test-NginxConfig
    Test-LoggingSystem
    Test-Tests
    Test-Documentation
    
    Show-Report
}

# Executar validacao
Main