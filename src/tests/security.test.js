const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configurações de teste de segurança
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 10000;

// Payloads de teste para vulnerabilidades
const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '\"\'>\<script\>alert(\"XSS\")\</script\>',
  'javascript:alert("XSS")',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>'
];

const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "' UNION SELECT * FROM users --",
  "1' OR '1'='1' --",
  "admin'--",
  "' OR 1=1#"
];

const COMMAND_INJECTION_PAYLOADS = [
  '; ls -la',
  '| whoami',
  '&& cat /etc/passwd',
  '; cat /etc/hosts',
  '`id`',
  '$(whoami)'
];

// Classe para testes de segurança
class SecurityTester {
  constructor() {
    this.results = [];
    this.vulnerabilities = [];
  }

  // Teste de headers de segurança
  async testSecurityHeaders() {
    console.log('🔒 Testando headers de segurança...');
    
    try {
      const response = await axios.get(`${BASE_URL}/`, { timeout: TIMEOUT });
      const headers = response.headers;
      
      const securityHeaders = {
        'x-frame-options': 'Proteção contra clickjacking',
        'x-content-type-options': 'Prevenção de MIME sniffing',
        'x-xss-protection': 'Proteção XSS básica',
        'strict-transport-security': 'Força HTTPS',
        'content-security-policy': 'Política de segurança de conteúdo',
        'referrer-policy': 'Controle de referrer'
      };
      
      const missingHeaders = [];
      const presentHeaders = [];
      
      Object.keys(securityHeaders).forEach(header => {
        if (headers[header]) {
          presentHeaders.push({ header, value: headers[header], description: securityHeaders[header] });
        } else {
          missingHeaders.push({ header, description: securityHeaders[header] });
        }
      });
      
      if (missingHeaders.length > 0) {
        this.vulnerabilities.push({
          type: 'Missing Security Headers',
          severity: 'MEDIUM',
          details: missingHeaders
        });
      }
      
      return {
        test: 'Security Headers',
        status: missingHeaders.length === 0 ? 'PASSED' : 'FAILED',
        presentHeaders,
        missingHeaders
      };
    } catch (error) {
      return {
        test: 'Security Headers',
        status: 'ERROR',
        error: error.message
      };
    }
  }

  // Teste de autenticação
  async testAuthentication() {
    console.log('🔐 Testando autenticação...');
    
    const tests = [];
    
    // Teste 1: Acesso a rotas protegidas sem autenticação
    try {
      const protectedRoutes = ['/dashboard', '/api/products', '/api/clients', '/api/movements'];
      
      for (const route of protectedRoutes) {
        try {
          const response = await axios.get(`${BASE_URL}${route}`, { 
            timeout: TIMEOUT,
            validateStatus: () => true // Não lançar erro para status HTTP
          });
          
          if (response.status === 200) {
            this.vulnerabilities.push({
              type: 'Unauthorized Access',
              severity: 'HIGH',
              details: `Rota ${route} acessível sem autenticação`
            });
            tests.push({ route, status: 'VULNERABLE', httpStatus: response.status });
          } else {
            tests.push({ route, status: 'PROTECTED', httpStatus: response.status });
          }
        } catch (error) {
          tests.push({ route, status: 'ERROR', error: error.message });
        }
      }
    } catch (error) {
      tests.push({ test: 'Protected Routes', status: 'ERROR', error: error.message });
    }
    
    // Teste 2: Brute force protection
    try {
      const attempts = [];
      for (let i = 0; i < 5; i++) {
        const response = await axios.post(`${BASE_URL}/api/auth/signin`, {
          username: 'invalid',
          password: 'invalid'
        }, { 
          timeout: TIMEOUT,
          validateStatus: () => true
        });
        
        attempts.push({ attempt: i + 1, status: response.status, time: Date.now() });
      }
      
      // Verificar se há rate limiting
      const lastAttempt = attempts[attempts.length - 1];
      if (lastAttempt.status !== 429) {
        this.vulnerabilities.push({
          type: 'No Rate Limiting',
          severity: 'MEDIUM',
          details: 'Sistema não implementa proteção contra brute force'
        });
      }
      
      tests.push({ test: 'Brute Force Protection', attempts, status: lastAttempt.status === 429 ? 'PROTECTED' : 'VULNERABLE' });
    } catch (error) {
      tests.push({ test: 'Brute Force Protection', status: 'ERROR', error: error.message });
    }
    
    return {
      test: 'Authentication',
      status: this.vulnerabilities.length === 0 ? 'PASSED' : 'FAILED',
      tests
    };
  }

  // Teste de injeção SQL
  async testSQLInjection() {
    console.log('💉 Testando injeção SQL...');
    
    const tests = [];
    
    // Testar endpoints de API com payloads SQL
    const endpoints = [
      { url: '/api/movements', method: 'GET', param: 'type' },
      { url: '/api/movements', method: 'GET', param: 'product_id' },
      { url: '/api/movements', method: 'GET', param: 'start_date' },
      { url: '/api/movements', method: 'GET', param: 'end_date' }
    ];
    
    for (const endpoint of endpoints) {
      for (const payload of SQL_INJECTION_PAYLOADS) {
        try {
          const url = `${BASE_URL}${endpoint.url}?${endpoint.param}=${encodeURIComponent(payload)}`;
          const response = await axios.get(url, { 
            timeout: TIMEOUT,
            validateStatus: () => true
          });
          
          // Verificar sinais de injeção SQL bem-sucedida
          const responseText = JSON.stringify(response.data).toLowerCase();
          const sqlErrors = ['sql syntax', 'mysql_fetch', 'ora-', 'postgresql', 'sqlite_'];
          
          const hasSQLError = sqlErrors.some(error => responseText.includes(error));
          
          if (hasSQLError || response.status === 500) {
            this.vulnerabilities.push({
              type: 'SQL Injection',
              severity: 'HIGH',
              details: `Possível injeção SQL em ${endpoint.url} com payload: ${payload}`
            });
            
            tests.push({
              endpoint: endpoint.url,
              payload,
              status: 'VULNERABLE',
              response: response.status
            });
          } else {
            tests.push({
              endpoint: endpoint.url,
              payload,
              status: 'SAFE',
              response: response.status
            });
          }
        } catch (error) {
          tests.push({
            endpoint: endpoint.url,
            payload,
            status: 'ERROR',
            error: error.message
          });
        }
      }
    }
    
    return {
      test: 'SQL Injection',
      status: tests.some(t => t.status === 'VULNERABLE') ? 'FAILED' : 'PASSED',
      tests
    };
  }

  // Teste de XSS
  async testXSS() {
    console.log('🕷️ Testando XSS...');
    
    const tests = [];
    
    // Testar formulários com payloads XSS
    const forms = [
      { url: '/api/products', method: 'POST', fields: ['name', 'description'] },
      { url: '/api/clients', method: 'POST', fields: ['name', 'email'] }
    ];
    
    for (const form of forms) {
      for (const field of form.fields) {
        for (const payload of XSS_PAYLOADS) {
          try {
            const data = { [field]: payload };
            
            const response = await axios.post(`${BASE_URL}${form.url}`, data, {
              timeout: TIMEOUT,
              validateStatus: () => true,
              headers: { 'Content-Type': 'application/json' }
            });
            
            // Verificar se o payload foi refletido sem sanitização
            const responseText = JSON.stringify(response.data);
            
            if (responseText.includes(payload) && !responseText.includes('&lt;') && !responseText.includes('&gt;')) {
              this.vulnerabilities.push({
                type: 'XSS Vulnerability',
                severity: 'HIGH',
                details: `XSS possível em ${form.url} campo ${field} com payload: ${payload}`
              });
              
              tests.push({
                form: form.url,
                field,
                payload,
                status: 'VULNERABLE'
              });
            } else {
              tests.push({
                form: form.url,
                field,
                payload,
                status: 'SAFE'
              });
            }
          } catch (error) {
            tests.push({
              form: form.url,
              field,
              payload,
              status: 'ERROR',
              error: error.message
            });
          }
        }
      }
    }
    
    return {
      test: 'XSS',
      status: tests.some(t => t.status === 'VULNERABLE') ? 'FAILED' : 'PASSED',
      tests
    };
  }

  // Teste de exposição de informações sensíveis
  async testInformationDisclosure() {
    console.log('📄 Testando exposição de informações...');
    
    const tests = [];
    
    // Testar arquivos sensíveis
    const sensitiveFiles = [
      '/.env',
      '/.env.local',
      '/package.json',
      '/config.json',
      '/database.json',
      '/.git/config',
      '/backup.sql',
      '/admin',
      '/phpinfo.php',
      '/server-status'
    ];
    
    for (const file of sensitiveFiles) {
      try {
        const response = await axios.get(`${BASE_URL}${file}`, {
          timeout: TIMEOUT,
          validateStatus: () => true
        });
        
        if (response.status === 200) {
          this.vulnerabilities.push({
            type: 'Information Disclosure',
            severity: 'MEDIUM',
            details: `Arquivo sensível acessível: ${file}`
          });
          
          tests.push({ file, status: 'EXPOSED', httpStatus: response.status });
        } else {
          tests.push({ file, status: 'PROTECTED', httpStatus: response.status });
        }
      } catch (error) {
        tests.push({ file, status: 'PROTECTED', error: 'Connection refused' });
      }
    }
    
    return {
      test: 'Information Disclosure',
      status: tests.some(t => t.status === 'EXPOSED') ? 'FAILED' : 'PASSED',
      tests
    };
  }

  // Executar todos os testes
  async runAllTests() {
    console.log('🛡️ Iniciando testes de segurança...');
    console.log(`Base URL: ${BASE_URL}`);
    
    const results = [];
    
    try {
      results.push(await this.testSecurityHeaders());
      results.push(await this.testAuthentication());
      results.push(await this.testSQLInjection());
      results.push(await this.testXSS());
      results.push(await this.testInformationDisclosure());
    } catch (error) {
      console.error('Erro durante os testes:', error);
    }
    
    this.results = results;
    return this.generateReport();
  }

  // Gerar relatório
  generateReport() {
    const timestamp = new Date().toISOString();
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    
    const report = {
      timestamp,
      summary: {
        total: this.results.length,
        passed,
        failed,
        errors,
        vulnerabilities: this.vulnerabilities.length
      },
      vulnerabilities: this.vulnerabilities,
      results: this.results,
      recommendations: this.generateRecommendations()
    };
    
    // Salvar relatório
    const reportPath = path.join(__dirname, '..', 'reports', `security-report-${timestamp.replace(/[:.]/g, '-')}.json`);
    
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório de segurança salvo em: ${reportPath}`);
    
    return report;
  }

  // Gerar recomendações
  generateRecommendations() {
    const recommendations = [];
    
    if (this.vulnerabilities.some(v => v.type === 'Missing Security Headers')) {
      recommendations.push('Implementar headers de segurança obrigatórios');
      recommendations.push('Configurar Content Security Policy (CSP)');
    }
    
    if (this.vulnerabilities.some(v => v.type === 'Unauthorized Access')) {
      recommendations.push('Implementar middleware de autenticação em todas as rotas protegidas');
      recommendations.push('Verificar configuração de sessões e tokens');
    }
    
    if (this.vulnerabilities.some(v => v.type === 'SQL Injection')) {
      recommendations.push('Usar prepared statements em todas as queries');
      recommendations.push('Implementar validação rigorosa de entrada');
      recommendations.push('Usar ORM com proteção contra SQL injection');
    }
    
    if (this.vulnerabilities.some(v => v.type === 'XSS Vulnerability')) {
      recommendations.push('Sanitizar todas as entradas do usuário');
      recommendations.push('Implementar Content Security Policy');
      recommendations.push('Usar bibliotecas de sanitização como DOMPurify');
    }
    
    if (this.vulnerabilities.some(v => v.type === 'No Rate Limiting')) {
      recommendations.push('Implementar rate limiting para APIs');
      recommendations.push('Usar ferramentas como express-rate-limit');
    }
    
    if (this.vulnerabilities.some(v => v.type === 'Information Disclosure')) {
      recommendations.push('Configurar servidor web para bloquear arquivos sensíveis');
      recommendations.push('Remover arquivos desnecessários do ambiente de produção');
    }
    
    return recommendations;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const tester = new SecurityTester();
  
  tester.runAllTests()
    .then(report => {
      console.log('\n🎯 Resumo dos Testes de Segurança:');
      console.log(`✅ Passou: ${report.summary.passed}`);
      console.log(`❌ Falhou: ${report.summary.failed}`);
      console.log(`⚠️ Erros: ${report.summary.errors}`);
      console.log(`🚨 Vulnerabilidades: ${report.summary.vulnerabilities}`);
      
      if (report.vulnerabilities.length > 0) {
        console.log('\n🚨 Vulnerabilidades Encontradas:');
        report.vulnerabilities.forEach(vuln => {
          console.log(`- [${vuln.severity}] ${vuln.type}: ${vuln.details}`);
        });
      }
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 Recomendações:');
        report.recommendations.forEach(rec => {
          console.log(`- ${rec}`);
        });
      }
      
      console.log('\n✨ Testes de segurança concluídos!');
      process.exit(report.vulnerabilities.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Erro nos testes de segurança:', error);
      process.exit(1);
    });
}

module.exports = SecurityTester;