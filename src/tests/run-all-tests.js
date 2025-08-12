#!/usr/bin/env node

// Script principal para executar todos os testes do sistema
// Este script deve ser executado antes do deploy em produção

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const PerformanceTest = require('./performance.test.js');
const IntegrationTest = require('./integration.test.js');

// Configurações
const CONFIG = {
  reportDir: path.join(__dirname, '../reports'),
  timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
  maxRetries: 3,
  retryDelay: 2000
};

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logStep(message) {
  log(`🔄 ${message}`, 'cyan');
}

// Utilitários
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Classe principal para execução de testes
class TestRunner {
  constructor() {
    this.results = {
      startTime: Date.now(),
      endTime: null,
      duration: null,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      },
      tests: {
        lint: { status: 'pending', duration: 0, output: '' },
        typecheck: { status: 'pending', duration: 0, output: '' },
        build: { status: 'pending', duration: 0, output: '' },
        performance: { status: 'pending', duration: 0, results: [] },
        integration: { status: 'pending', duration: 0, results: [] },
        security: { status: 'pending', duration: 0, issues: [] }
      },
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        readyForProduction: false
      }
    };
  }

  // Executar comando com retry
  async executeCommand(command, args = [], options = {}) {
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        return await this.runCommand(command, args, options);
      } catch (error) {
        if (attempt === CONFIG.maxRetries) {
          throw error;
        }
        logWarning(`Tentativa ${attempt} falhou, tentando novamente em ${CONFIG.retryDelay}ms...`);
        await sleep(CONFIG.retryDelay);
      }
    }
  }

  // Executar comando
  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });

      child.on('error', reject);
    });
  }

  // Verificar se o servidor está rodando
  async checkServerRunning() {
    try {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get('http://localhost:3000', (res) => {
          resolve(true);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  // Teste de lint
  async runLintTest() {
    logStep('Executando verificação de lint...');
    const start = Date.now();
    
    try {
      const result = await this.executeCommand('npm', ['run', 'lint'], {
        cwd: path.join(__dirname, '..')
      });
      
      this.results.tests.lint = {
        status: 'passed',
        duration: Date.now() - start,
        output: result.stdout
      };
      
      logSuccess(`Lint passou em ${formatDuration(Date.now() - start)}`);
    } catch (error) {
      this.results.tests.lint = {
        status: 'failed',
        duration: Date.now() - start,
        output: error.message
      };
      
      logError(`Lint falhou: ${error.message}`);
    }
  }

  // Teste de type checking
  async runTypeCheckTest() {
    logStep('Executando verificação de tipos...');
    const start = Date.now();
    
    try {
      const result = await this.executeCommand('npx', ['tsc', '--noEmit'], {
        cwd: path.join(__dirname, '..')
      });
      
      this.results.tests.typecheck = {
        status: 'passed',
        duration: Date.now() - start,
        output: result.stdout
      };
      
      logSuccess(`Type check passou em ${formatDuration(Date.now() - start)}`);
    } catch (error) {
      this.results.tests.typecheck = {
        status: 'failed',
        duration: Date.now() - start,
        output: error.message
      };
      
      logError(`Type check falhou: ${error.message}`);
    }
  }

  // Teste de build
  async runBuildTest() {
    logStep('Executando build de produção...');
    const start = Date.now();
    
    try {
      const result = await this.executeCommand('npm', ['run', 'build'], {
        cwd: path.join(__dirname, '..')
      });
      
      this.results.tests.build = {
        status: 'passed',
        duration: Date.now() - start,
        output: result.stdout
      };
      
      logSuccess(`Build passou em ${formatDuration(Date.now() - start)}`);
    } catch (error) {
      this.results.tests.build = {
        status: 'failed',
        duration: Date.now() - start,
        output: error.message
      };
      
      logError(`Build falhou: ${error.message}`);
    }
  }

  // Testes de performance
  async runPerformanceTests() {
    logStep('Executando testes de performance...');
    const start = Date.now();
    
    try {
      const perfTest = new PerformanceTest();
      
      // Capturar output do console
      const originalLog = console.log;
      let output = '';
      console.log = (...args) => {
        output += args.join(' ') + '\n';
        originalLog(...args);
      };
      
      await perfTest.runAllTests();
      
      console.log = originalLog;
      
      this.results.tests.performance = {
        status: 'passed',
        duration: Date.now() - start,
        results: perfTest.results,
        output
      };
      
      logSuccess(`Testes de performance concluídos em ${formatDuration(Date.now() - start)}`);
    } catch (error) {
      this.results.tests.performance = {
        status: 'failed',
        duration: Date.now() - start,
        error: error.message
      };
      
      logError(`Testes de performance falharam: ${error.message}`);
    }
  }

  // Testes de integração
  async runIntegrationTests() {
    logStep('Executando testes de integração...');
    const start = Date.now();
    
    // Verificar se o servidor está rodando
    const serverRunning = await this.checkServerRunning();
    if (!serverRunning) {
      logWarning('Servidor não está rodando. Iniciando servidor para testes...');
      // Aqui você poderia iniciar o servidor automaticamente
      // Por enquanto, vamos apenas avisar
    }
    
    try {
      const integrationTest = new IntegrationTest();
      
      // Capturar output do console
      const originalLog = console.log;
      let output = '';
      console.log = (...args) => {
        output += args.join(' ') + '\n';
        originalLog(...args);
      };
      
      await integrationTest.runAllTests();
      
      console.log = originalLog;
      
      this.results.tests.integration = {
        status: 'passed',
        duration: Date.now() - start,
        results: integrationTest.results,
        output
      };
      
      logSuccess(`Testes de integração concluídos em ${formatDuration(Date.now() - start)}`);
    } catch (error) {
      this.results.tests.integration = {
        status: 'failed',
        duration: Date.now() - start,
        error: error.message
      };
      
      logError(`Testes de integração falharam: ${error.message}`);
    }
  }

  // Verificações de segurança
  async runSecurityChecks() {
    logStep('Executando verificações de segurança...');
    const start = Date.now();
    
    const issues = [];
    
    try {
      // Verificar dependências vulneráveis
      try {
        await this.executeCommand('npm', ['audit', '--audit-level=moderate'], {
          cwd: path.join(__dirname, '..')
        });
      } catch (error) {
        if (error.message.includes('vulnerabilities')) {
          issues.push('Vulnerabilidades encontradas nas dependências');
        }
      }
      
      // Verificar arquivos sensíveis
      const sensitiveFiles = ['.env', '.env.local', '.env.production'];
      for (const file of sensitiveFiles) {
        try {
          await fs.access(path.join(__dirname, '..', file));
          issues.push(`Arquivo sensível encontrado: ${file}`);
        } catch {
          // Arquivo não existe, ok
        }
      }
      
      // Verificar configurações de segurança
      const configFiles = ['next.config.ts', 'middleware.ts'];
      for (const file of configFiles) {
        try {
          const content = await fs.readFile(path.join(__dirname, '..', file), 'utf8');
          if (!content.includes('X-Frame-Options')) {
            issues.push(`Headers de segurança ausentes em ${file}`);
          }
        } catch {
          // Arquivo não existe
        }
      }
      
      this.results.tests.security = {
        status: issues.length === 0 ? 'passed' : 'warning',
        duration: Date.now() - start,
        issues
      };
      
      if (issues.length === 0) {
        logSuccess(`Verificações de segurança passaram em ${formatDuration(Date.now() - start)}`);
      } else {
        logWarning(`${issues.length} problemas de segurança encontrados`);
      }
    } catch (error) {
      this.results.tests.security = {
        status: 'failed',
        duration: Date.now() - start,
        error: error.message
      };
      
      logError(`Verificações de segurança falharam: ${error.message}`);
    }
  }

  // Gerar relatório
  async generateReport() {
    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;
    
    // Calcular estatísticas
    const tests = Object.values(this.results.tests);
    this.results.summary.total = tests.length;
    this.results.summary.passed = tests.filter(t => t.status === 'passed').length;
    this.results.summary.failed = tests.filter(t => t.status === 'failed').length;
    this.results.summary.warnings = tests.filter(t => t.status === 'warning').length;
    
    // Determinar se está pronto para produção
    this.results.summary.readyForProduction = 
      this.results.summary.failed === 0 && 
      this.results.summary.warnings <= 2;
    
    // Criar diretório de relatórios
    await fs.mkdir(CONFIG.reportDir, { recursive: true });
    
    // Salvar relatório JSON
    const jsonReport = path.join(CONFIG.reportDir, `test-report-${CONFIG.timestamp}.json`);
    await fs.writeFile(jsonReport, JSON.stringify(this.results, null, 2));
    
    // Gerar relatório HTML
    const htmlReport = await this.generateHTMLReport();
    const htmlPath = path.join(CONFIG.reportDir, `test-report-${CONFIG.timestamp}.html`);
    await fs.writeFile(htmlPath, htmlReport);
    
    // Exibir resumo no console
    this.displaySummary();
    
    logInfo(`Relatórios salvos em:`);
    logInfo(`  JSON: ${jsonReport}`);
    logInfo(`  HTML: ${htmlPath}`);
  }

  // Exibir resumo
  displaySummary() {
    log('\n' + '=' .repeat(60), 'bold');
    log('📊 RESUMO FINAL DOS TESTES', 'bold');
    log('=' .repeat(60), 'bold');
    
    log(`\n⏱️  Duração total: ${formatDuration(this.results.duration)}`);
    log(`📈 Total de testes: ${this.results.summary.total}`);
    logSuccess(`✅ Passou: ${this.results.summary.passed}`);
    if (this.results.summary.failed > 0) {
      logError(`❌ Falhou: ${this.results.summary.failed}`);
    }
    if (this.results.summary.warnings > 0) {
      logWarning(`⚠️  Avisos: ${this.results.summary.warnings}`);
    }
    
    log('\n📋 Status por categoria:');
    Object.entries(this.results.tests).forEach(([name, test]) => {
      const icon = test.status === 'passed' ? '✅' : 
                   test.status === 'failed' ? '❌' : '⚠️';
      const duration = formatDuration(test.duration);
      log(`  ${icon} ${name}: ${test.status} (${duration})`);
    });
    
    log('\n🚀 STATUS DE PRODUÇÃO:', 'bold');
    if (this.results.summary.readyForProduction) {
      logSuccess('✅ SISTEMA PRONTO PARA PRODUÇÃO!');
      log('   Todos os testes críticos passaram.');
    } else {
      logError('❌ SISTEMA NÃO ESTÁ PRONTO PARA PRODUÇÃO!');
      log('   Corrija os erros antes do deploy.');
    }
    
    log('\n' + '=' .repeat(60), 'bold');
  }

  // Gerar relatório HTML
  async generateHTMLReport() {
    const { summary, tests, environment, duration } = this.results;
    
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes - ${CONFIG.timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-warning { background: #fff3cd; color: #856404; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; }
        .card h3 { margin-top: 0; color: #333; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .metric strong { color: #666; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
        .production-status { text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; font-size: 18px; font-weight: bold; }
        .production-ready { background: #d4edda; color: #155724; }
        .production-not-ready { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Relatório de Testes de Produção</h1>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Duração total: ${formatDuration(duration)}</p>
        </div>
        
        <div class="content">
            <div class="production-status ${summary.readyForProduction ? 'production-ready' : 'production-not-ready'}">
                ${summary.readyForProduction ? '✅ SISTEMA PRONTO PARA PRODUÇÃO' : '❌ SISTEMA NÃO ESTÁ PRONTO PARA PRODUÇÃO'}
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3>📊 Resumo Geral</h3>
                    <div class="metric"><span>Total de Testes:</span> <strong>${summary.total}</strong></div>
                    <div class="metric"><span>Passou:</span> <strong style="color: #28a745">${summary.passed}</strong></div>
                    <div class="metric"><span>Falhou:</span> <strong style="color: #dc3545">${summary.failed}</strong></div>
                    <div class="metric"><span>Avisos:</span> <strong style="color: #ffc107">${summary.warnings}</strong></div>
                </div>
                
                <div class="card">
                    <h3>🖥️ Ambiente</h3>
                    <div class="metric"><span>Node.js:</span> <strong>${environment.node}</strong></div>
                    <div class="metric"><span>Plataforma:</span> <strong>${environment.platform}</strong></div>
                    <div class="metric"><span>Arquitetura:</span> <strong>${environment.arch}</strong></div>
                    <div class="metric"><span>Memória:</span> <strong>${Math.round(environment.memory.heapUsed / 1024 / 1024)}MB</strong></div>
                </div>
            </div>
            
            <h2>📋 Detalhes dos Testes</h2>
            ${Object.entries(tests).map(([name, test]) => `
                <div class="card">
                    <h3>${name.charAt(0).toUpperCase() + name.slice(1)} 
                        <span class="status-badge status-${test.status}">${test.status}</span>
                    </h3>
                    <div class="metric"><span>Duração:</span> <strong>${formatDuration(test.duration)}</strong></div>
                    ${test.error ? `<div style="color: #dc3545; margin: 10px 0;"><strong>Erro:</strong> ${test.error}</div>` : ''}
                    ${test.issues && test.issues.length > 0 ? `
                        <div><strong>Problemas encontrados:</strong></div>
                        <ul>${test.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
                    ` : ''}
                    ${test.output ? `<details><summary>Ver output completo</summary><pre>${test.output}</pre></details>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  // Executar todos os testes
  async runAllTests() {
    log('🚀 INICIANDO BATERIA COMPLETA DE TESTES', 'bold');
    log('=' .repeat(60), 'magenta');
    log('Este processo pode levar alguns minutos...\n', 'dim');
    
    try {
      await this.runLintTest();
      await this.runTypeCheckTest();
      await this.runBuildTest();
      await this.runSecurityChecks();
      await this.runPerformanceTests();
      await this.runIntegrationTests();
      
      await this.generateReport();
      
    } catch (error) {
      logError(`Erro crítico durante a execução dos testes: ${error.message}`);
      process.exit(1);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;