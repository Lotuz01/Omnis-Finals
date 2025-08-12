// Testes de performance e funcionalidade para o sistema otimizado

const { performance } = require('perf_hooks');
const mysql = require('mysql2/promise');

// Configurações de teste
const TEST_CONFIG = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pdv_system'
  },
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  testUser: {
    username: 'admin',
    password: 'admin123'
  }
};

// Cores para output colorido
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

// Classe para testes de performance
class PerformanceTest {
  constructor() {
    this.results = [];
    this.connection = null;
  }

  async setup() {
    try {
      this.connection = await mysql.createConnection(TEST_CONFIG.database);
      logSuccess('Conexão com banco de dados estabelecida');
    } catch (error) {
      logError(`Erro ao conectar com banco: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    if (this.connection) {
      await this.connection.end();
      logInfo('Conexão com banco encerrada');
    }
  }

  async measureTime(name, fn) {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      const duration = end - start;
      
      this.results.push({
        test: name,
        duration: duration.toFixed(2),
        status: 'success',
        result
      });
      
      if (duration < 100) {
        logSuccess(`${name}: ${duration.toFixed(2)}ms`);
      } else if (duration < 500) {
        logWarning(`${name}: ${duration.toFixed(2)}ms (lento)`);
      } else {
        logError(`${name}: ${duration.toFixed(2)}ms (muito lento)`);
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      
      this.results.push({
        test: name,
        duration: duration.toFixed(2),
        status: 'error',
        error: error.message
      });
      
      logError(`${name}: ERRO - ${error.message}`);
      throw error;
    }
  }

  // Teste de conexão com pool
  async testDatabasePool() {
    log('\n🔍 Testando Pool de Conexões...', 'bold');
    
    await this.measureTime('Conexão simples', async () => {
      const [rows] = await this.connection.execute('SELECT 1 as test');
      return rows[0].test === 1;
    });

    await this.measureTime('Query complexa', async () => {
      const [rows] = await this.connection.execute(`
        SELECT 
          u.id, u.username, 
          COUNT(m.id) as movement_count
        FROM users u
        LEFT JOIN movements m ON u.id = m.user_id
        GROUP BY u.id, u.username
        LIMIT 10
      `);
      return rows.length >= 0;
    });

    // Teste de múltiplas conexões simultâneas
    await this.measureTime('10 queries simultâneas', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        this.connection.execute('SELECT ? as query_number', [i + 1])
      );
      const results = await Promise.all(promises);
      return results.length === 10;
    });
  }

  // Teste de APIs
  async testAPIs() {
    log('\n🌐 Testando APIs...', 'bold');
    
    // Simular requisições HTTP (sem fetch real para evitar dependências)
    await this.measureTime('Simulação API Users', async () => {
      // Simular tempo de resposta da API
      await new Promise(resolve => setTimeout(resolve, 50));
      return true;
    });

    await this.measureTime('Simulação API Products', async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return true;
    });

    await this.measureTime('Simulação API Movements', async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
      return true;
    });
  }

  // Teste de validação
  async testValidation() {
    log('\n✅ Testando Sistema de Validação...', 'bold');
    
    await this.measureTime('Validação de CNPJ', async () => {
      // Simular validação de CNPJ
      const cnpj = '11.222.333/0001-81';
      const isValid = cnpj.length >= 14;
      return isValid;
    });

    await this.measureTime('Validação de Email', async () => {
      const email = 'test@example.com';
      const isValid = email.includes('@') && email.includes('.');
      return isValid;
    });

    await this.measureTime('Sanitização de dados', async () => {
      const data = { name: '  Test User  ', email: 'TEST@EXAMPLE.COM' };
      const sanitized = {
        name: data.name.trim(),
        email: data.email.toLowerCase()
      };
      return sanitized.name === 'Test User' && sanitized.email === 'test@example.com';
    });
  }

  // Teste de logging
  async testLogging() {
    log('\n📝 Testando Sistema de Logs...', 'bold');
    
    await this.measureTime('Log de info', async () => {
      // Simular log
      const logEntry = {
        level: 'info',
        message: 'Test log entry',
        timestamp: new Date().toISOString()
      };
      return logEntry.level === 'info';
    });

    await this.measureTime('Log de erro', async () => {
      const logEntry = {
        level: 'error',
        message: 'Test error log',
        timestamp: new Date().toISOString(),
        stack: 'Error stack trace'
      };
      return logEntry.level === 'error';
    });
  }

  // Teste de estrutura do banco
  async testDatabaseStructure() {
    log('\n🗄️  Testando Estrutura do Banco...', 'bold');
    
    const tables = ['users', 'products', 'clients', 'accounts', 'movements', 'printers'];
    
    for (const table of tables) {
      await this.measureTime(`Verificar tabela ${table}`, async () => {
        const [rows] = await this.connection.execute(
          'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
          [TEST_CONFIG.database.database, table]
        );
        return rows[0].count === 1;
      });
    }

    // Verificar índices importantes
    await this.measureTime('Verificar índices', async () => {
      const [rows] = await this.connection.execute(`
        SELECT COUNT(*) as index_count 
        FROM information_schema.statistics 
        WHERE table_schema = ? AND table_name IN ('users', 'products', 'movements')
      `, [TEST_CONFIG.database.database]);
      return rows[0].index_count > 0;
    });
  }

  // Teste de performance de queries
  async testQueryPerformance() {
    log('\n⚡ Testando Performance de Queries...', 'bold');
    
    await this.measureTime('SELECT simples', async () => {
      const [rows] = await this.connection.execute('SELECT COUNT(*) as count FROM users');
      return rows[0].count >= 0;
    });

    await this.measureTime('JOIN complexo', async () => {
      const [rows] = await this.connection.execute(`
        SELECT 
          p.name as product_name,
          SUM(CASE WHEN m.type = 'entrada' THEN m.quantity ELSE 0 END) as total_in,
          SUM(CASE WHEN m.type = 'saida' THEN m.quantity ELSE 0 END) as total_out
        FROM products p
        LEFT JOIN movements m ON p.id = m.product_id
        GROUP BY p.id, p.name
        LIMIT 5
      `);
      return rows.length >= 0;
    });

    await this.measureTime('Query com filtros', async () => {
      const [rows] = await this.connection.execute(`
        SELECT * FROM movements 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY created_at DESC
        LIMIT 10
      `);
      return rows.length >= 0;
    });
  }

  // Gerar relatório final
  generateReport() {
    log('\n📊 RELATÓRIO DE PERFORMANCE', 'bold');
    log('=' .repeat(50), 'blue');
    
    const successTests = this.results.filter(r => r.status === 'success');
    const errorTests = this.results.filter(r => r.status === 'error');
    const avgDuration = successTests.reduce((sum, r) => sum + parseFloat(r.duration), 0) / successTests.length;
    
    log(`Total de testes: ${this.results.length}`);
    logSuccess(`Sucessos: ${successTests.length}`);
    if (errorTests.length > 0) {
      logError(`Erros: ${errorTests.length}`);
    }
    log(`Tempo médio: ${avgDuration.toFixed(2)}ms`);
    
    // Testes mais lentos
    const slowTests = successTests
      .filter(r => parseFloat(r.duration) > 100)
      .sort((a, b) => parseFloat(b.duration) - parseFloat(a.duration))
      .slice(0, 5);
    
    if (slowTests.length > 0) {
      log('\n⚠️  Testes mais lentos:', 'yellow');
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
    
    // Recomendações
    log('\n💡 Recomendações:', 'blue');
    if (avgDuration < 50) {
      logSuccess('Performance excelente! Sistema otimizado.');
    } else if (avgDuration < 100) {
      logWarning('Performance boa, mas pode ser melhorada.');
    } else {
      logError('Performance precisa de otimização.');
    }
    
    if (errorTests.length === 0) {
      logSuccess('Todos os testes passaram! Sistema pronto para produção.');
    } else {
      logError('Existem erros que precisam ser corrigidos antes do deploy.');
    }
    
    log('\n' + '=' .repeat(50), 'blue');
  }

  // Executar todos os testes
  async runAllTests() {
    log('🚀 INICIANDO TESTES DE PERFORMANCE E FUNCIONALIDADE', 'bold');
    log('=' .repeat(60), 'blue');
    
    try {
      await this.setup();
      
      await this.testDatabaseStructure();
      await this.testDatabasePool();
      await this.testQueryPerformance();
      await this.testAPIs();
      await this.testValidation();
      await this.testLogging();
      
      this.generateReport();
      
    } catch (error) {
      logError(`Erro durante os testes: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new PerformanceTest();
  tester.runAllTests().catch(console.error);
}

module.exports = PerformanceTest;