// Testes de integração para APIs do sistema

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configurações de teste
const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  testUser: {
    username: 'admin',
    password: 'admin123'
  }
};

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
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

// Cliente HTTP simples
class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  async request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      // Adicionar cookies
      const cookieHeader = Array.from(this.cookies.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      
      if (cookieHeader) {
        headers.Cookie = cookieHeader;
      }
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Integration-Test/1.0',
          ...headers
        },
        timeout: TEST_CONFIG.timeout
      };
      
      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }
      
      const req = client.request(options, (res) => {
        let body = '';
        
        // Capturar cookies da resposta
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
          setCookies.forEach(cookie => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            if (name && value) {
              this.cookies.set(name.trim(), value.trim());
            }
          });
        }
        
        res.on('data', chunk => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = {
              status: res.statusCode,
              headers: res.headers,
              data: body ? JSON.parse(body) : null
            };
            resolve(result);
          } catch (error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: body
            });
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async get(path, headers = {}) {
    return this.request('GET', path, null, headers);
  }

  async post(path, data, headers = {}) {
    return this.request('POST', path, data, headers);
  }

  async put(path, data, headers = {}) {
    return this.request('PUT', path, data, headers);
  }

  async delete(path, headers = {}) {
    return this.request('DELETE', path, null, headers);
  }
}

// Classe principal de testes
class IntegrationTest {
  constructor() {
    this.client = new HttpClient(TEST_CONFIG.baseUrl);
    this.results = [];
    this.authToken = null;
  }

  async measureTime(name, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      this.results.push({
        test: name,
        duration,
        status: 'success',
        result
      });
      
      if (duration < 200) {
        logSuccess(`${name}: ${duration}ms`);
      } else if (duration < 1000) {
        logWarning(`${name}: ${duration}ms (lento)`);
      } else {
        logError(`${name}: ${duration}ms (muito lento)`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      this.results.push({
        test: name,
        duration,
        status: 'error',
        error: error.message
      });
      
      logError(`${name}: ERRO - ${error.message}`);
      throw error;
    }
  }

  // Teste de conectividade
  async testConnectivity() {
    log('\n🌐 Testando Conectividade...', 'bold');
    
    await this.measureTime('Servidor respondendo', async () => {
      const response = await this.client.get('/');
      if (response.status !== 200 && response.status !== 302) {
        throw new Error(`Status inesperado: ${response.status}`);
      }
      return true;
    });
  }

  // Teste de autenticação
  async testAuthentication() {
    log('\n🔐 Testando Autenticação...', 'bold');
    
    // Teste de login
    await this.measureTime('Login com credenciais válidas', async () => {
      const response = await this.client.post('/api/auth/login', {
        username: TEST_CONFIG.testUser.username,
        password: TEST_CONFIG.testUser.password
      });
      
      if (response.status !== 200) {
        throw new Error(`Login falhou: ${response.status}`);
      }
      
      if (response.data && response.data.token) {
        this.authToken = response.data.token;
      }
      
      return true;
    });

    // Teste de acesso sem autenticação
    await this.measureTime('Acesso negado sem token', async () => {
      const tempClient = new HttpClient(TEST_CONFIG.baseUrl);
      const response = await tempClient.get('/api/users');
      
      if (response.status !== 401 && response.status !== 302) {
        throw new Error(`Deveria negar acesso, mas retornou: ${response.status}`);
      }
      
      return true;
    });
  }

  // Teste de APIs de usuários
  async testUsersAPI() {
    log('\n👥 Testando API de Usuários...', 'bold');
    
    await this.measureTime('Listar usuários', async () => {
      const response = await this.client.get('/api/users');
      
      if (response.status !== 200) {
        throw new Error(`Erro ao listar usuários: ${response.status}`);
      }
      
      return Array.isArray(response.data);
    });

    // Teste de criação de usuário (se permitido)
    try {
      await this.measureTime('Criar usuário de teste', async () => {
        const testUser = {
          username: `test_${Date.now()}`,
          password: 'test123',
          name: 'Test User',
          email: `test_${Date.now()}@example.com`,
          role: 'user'
        };
        
        const response = await this.client.post('/api/users', testUser);
        
        if (response.status !== 201 && response.status !== 200) {
          throw new Error(`Erro ao criar usuário: ${response.status}`);
        }
        
        return true;
      });
    } catch (error) {
      logWarning('Criação de usuário pode estar desabilitada');
    }
  }

  // Teste de APIs de produtos
  async testProductsAPI() {
    log('\n📦 Testando API de Produtos...', 'bold');
    
    await this.measureTime('Listar produtos', async () => {
      const response = await this.client.get('/api/products');
      
      if (response.status !== 200) {
        throw new Error(`Erro ao listar produtos: ${response.status}`);
      }
      
      return true;
    });

    // Teste com filtros
    await this.measureTime('Buscar produtos com filtro', async () => {
      const response = await this.client.get('/api/products?search=test');
      
      if (response.status !== 200) {
        throw new Error(`Erro na busca: ${response.status}`);
      }
      
      return true;
    });
  }

  // Teste de APIs de movimentações
  async testMovementsAPI() {
    log('\n📊 Testando API de Movimentações...', 'bold');
    
    await this.measureTime('Listar movimentações', async () => {
      const response = await this.client.get('/api/movements');
      
      if (response.status !== 200) {
        throw new Error(`Erro ao listar movimentações: ${response.status}`);
      }
      
      return true;
    });

    // Teste com paginação
    await this.measureTime('Paginação de movimentações', async () => {
      const response = await this.client.get('/api/movements?page=1&limit=10');
      
      if (response.status !== 200) {
        throw new Error(`Erro na paginação: ${response.status}`);
      }
      
      return true;
    });
  }

  // Teste de APIs de clientes
  async testClientsAPI() {
    log('\n👤 Testando API de Clientes...', 'bold');
    
    await this.measureTime('Listar clientes', async () => {
      const response = await this.client.get('/api/clients');
      
      if (response.status !== 200) {
        throw new Error(`Erro ao listar clientes: ${response.status}`);
      }
      
      return true;
    });
  }

  // Teste de backup
  async testBackupAPI() {
    log('\n💾 Testando API de Backup...', 'bold');
    
    await this.measureTime('Verificar status do backup', async () => {
      const response = await this.client.get('/api/backup');
      
      // Backup pode retornar 200 (dados) ou 404 (sem backup)
      if (response.status !== 200 && response.status !== 404) {
        throw new Error(`Erro inesperado no backup: ${response.status}`);
      }
      
      return true;
    });
  }

  // Teste de rate limiting
  async testRateLimiting() {
    log('\n🚦 Testando Rate Limiting...', 'bold');
    
    await this.measureTime('Múltiplas requisições rápidas', async () => {
      const promises = [];
      
      // Fazer 20 requisições rápidas
      for (let i = 0; i < 20; i++) {
        promises.push(
          this.client.get('/api/users').catch(err => ({ error: err.message }))
        );
      }
      
      const results = await Promise.all(promises);
      const rateLimited = results.some(r => r.status === 429);
      
      if (rateLimited) {
        logInfo('Rate limiting funcionando corretamente');
      } else {
        logWarning('Rate limiting pode não estar ativo');
      }
      
      return true;
    });
  }

  // Teste de headers de segurança
  async testSecurityHeaders() {
    log('\n🔒 Testando Headers de Segurança...', 'bold');
    
    await this.measureTime('Verificar headers de segurança', async () => {
      const response = await this.client.get('/');
      
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'referrer-policy'
      ];
      
      const missingHeaders = securityHeaders.filter(
        header => !response.headers[header]
      );
      
      if (missingHeaders.length > 0) {
        logWarning(`Headers ausentes: ${missingHeaders.join(', ')}`);
      } else {
        logSuccess('Todos os headers de segurança presentes');
      }
      
      return true;
    });
  }

  // Gerar relatório
  generateReport() {
    log('\n📊 RELATÓRIO DE INTEGRAÇÃO', 'bold');
    log('=' .repeat(50), 'blue');
    
    const successTests = this.results.filter(r => r.status === 'success');
    const errorTests = this.results.filter(r => r.status === 'error');
    const avgDuration = successTests.reduce((sum, r) => sum + r.duration, 0) / successTests.length;
    
    log(`Total de testes: ${this.results.length}`);
    logSuccess(`Sucessos: ${successTests.length}`);
    if (errorTests.length > 0) {
      logError(`Erros: ${errorTests.length}`);
    }
    log(`Tempo médio de resposta: ${avgDuration.toFixed(0)}ms`);
    
    // APIs mais lentas
    const slowTests = successTests
      .filter(r => r.duration > 500)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    if (slowTests.length > 0) {
      log('\n⚠️  APIs mais lentas:', 'yellow');
      slowTests.forEach(test => {
        log(`  ${test.test}: ${test.duration}ms`, 'yellow');
      });
    }
    
    // Erros encontrados
    if (errorTests.length > 0) {
      log('\n❌ Erros encontrados:', 'red');
      errorTests.forEach(test => {
        log(`  ${test.test}: ${test.error}`, 'red');
      });
    }
    
    // Status final
    if (errorTests.length === 0) {
      logSuccess('Todas as APIs estão funcionando! Sistema pronto para produção.');
    } else if (errorTests.length < 3) {
      logWarning('Alguns problemas encontrados, mas sistema pode funcionar.');
    } else {
      logError('Muitos erros encontrados. Sistema precisa de correções.');
    }
    
    log('\n' + '=' .repeat(50), 'blue');
  }

  // Executar todos os testes
  async runAllTests() {
    log('🚀 INICIANDO TESTES DE INTEGRAÇÃO', 'bold');
    log('=' .repeat(50), 'blue');
    
    try {
      await this.testConnectivity();
      await this.testAuthentication();
      await this.testUsersAPI();
      await this.testProductsAPI();
      await this.testMovementsAPI();
      await this.testClientsAPI();
      await this.testBackupAPI();
      await this.testRateLimiting();
      await this.testSecurityHeaders();
      
      this.generateReport();
      
    } catch (error) {
      logError(`Erro crítico durante os testes: ${error.message}`);
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new IntegrationTest();
  tester.runAllTests().catch(console.error);
}

module.exports = IntegrationTest;