const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Configurações de teste de carga
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DURATION = 60; // segundos
const CONNECTIONS = 10;
const PIPELINE = 1;

// Cenários de teste
const scenarios = [
  {
    name: 'Health Check',
    url: `${BASE_URL}/api/health`,
    method: 'GET',
    connections: 50,
    duration: 30
  },
  {
    name: 'Métricas',
    url: `${BASE_URL}/api/metrics`,
    method: 'GET',
    connections: 20,
    duration: 30
  },
  {
    name: 'Login Page',
    url: `${BASE_URL}/login`,
    method: 'GET',
    connections: 30,
    duration: 30
  },
  {
    name: 'API Produtos (GET)',
    url: `${BASE_URL}/api/products`,
    method: 'GET',
    connections: 25,
    duration: 45,
    headers: {
      'Authorization': 'Bearer test-token' // Em produção, usar token válido
    }
  },
  {
    name: 'API Clientes (GET)',
    url: `${BASE_URL}/api/clients`,
    method: 'GET',
    connections: 25,
    duration: 45,
    headers: {
      'Authorization': 'Bearer test-token'
    }
  }
];

// Função para executar teste de carga
async function runLoadTest(scenario) {
  console.log(`\n🚀 Iniciando teste de carga: ${scenario.name}`);
  console.log(`URL: ${scenario.url}`);
  console.log(`Conexões: ${scenario.connections}`);
  console.log(`Duração: ${scenario.duration}s`);
  
  const options = {
    url: scenario.url,
    method: scenario.method || 'GET',
    connections: scenario.connections || CONNECTIONS,
    duration: scenario.duration || DURATION,
    pipelining: PIPELINE,
    headers: scenario.headers || {},
    timeout: 30000 // 30 segundos timeout
  };
  
  if (scenario.body) {
    options.body = JSON.stringify(scenario.body);
    options.headers['Content-Type'] = 'application/json';
  }
  
  try {
    const result = await autocannon(options);
    
    // Análise dos resultados
    const analysis = analyzeResults(result, scenario.name);
    
    console.log(`\n📊 Resultados para ${scenario.name}:`);
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Latência média: ${result.latency.average}ms`);
    console.log(`Latência p99: ${result.latency.p99}ms`);
    console.log(`Total de requests: ${result.requests.total}`);
    console.log(`Erros: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);
    console.log(`Status: ${analysis.status}`);
    
    return {
      scenario: scenario.name,
      ...result,
      analysis
    };
  } catch (error) {
    console.error(`❌ Erro no teste ${scenario.name}:`, error.message);
    return {
      scenario: scenario.name,
      error: error.message,
      analysis: { status: 'FAILED', issues: ['Test execution failed'] }
    };
  }
}

// Função para analisar resultados
function analyzeResults(result, scenarioName) {
  const issues = [];
  let status = 'PASSED';
  
  // Critérios de performance
  const thresholds = {
    'Health Check': { maxLatency: 100, minRps: 100 },
    'Métricas': { maxLatency: 200, minRps: 50 },
    'Login Page': { maxLatency: 500, minRps: 20 },
    'API Produtos (GET)': { maxLatency: 300, minRps: 30 },
    'API Clientes (GET)': { maxLatency: 300, minRps: 30 }
  };
  
  const threshold = thresholds[scenarioName] || { maxLatency: 1000, minRps: 10 };
  
  // Verificar latência
  if (result.latency.average > threshold.maxLatency) {
    issues.push(`Latência média muito alta: ${result.latency.average}ms (máximo: ${threshold.maxLatency}ms)`);
    status = 'WARNING';
  }
  
  // Verificar throughput
  if (result.requests.average < threshold.minRps) {
    issues.push(`Throughput muito baixo: ${result.requests.average} req/s (mínimo: ${threshold.minRps} req/s)`);
    status = 'WARNING';
  }
  
  // Verificar erros
  if (result.errors > 0) {
    issues.push(`${result.errors} erros detectados`);
    status = 'FAILED';
  }
  
  // Verificar timeouts
  if (result.timeouts > 0) {
    issues.push(`${result.timeouts} timeouts detectados`);
    status = 'FAILED';
  }
  
  // Verificar latência p99
  if (result.latency.p99 > threshold.maxLatency * 3) {
    issues.push(`Latência p99 muito alta: ${result.latency.p99}ms`);
    if (status === 'PASSED') status = 'WARNING';
  }
  
  return {
    status,
    issues,
    thresholds: threshold,
    recommendations: generateRecommendations(result, issues)
  };
}

// Função para gerar recomendações
function generateRecommendations(result, issues) {
  const recommendations = [];
  
  if (result.latency.average > 500) {
    recommendations.push('Considere otimizar queries do banco de dados');
    recommendations.push('Implemente cache para reduzir latência');
  }
  
  if (result.requests.average < 50) {
    recommendations.push('Considere usar clustering (PM2) para melhor throughput');
    recommendations.push('Otimize o pool de conexões do banco');
  }
  
  if (result.errors > 0) {
    recommendations.push('Investigue e corrija erros de aplicação');
    recommendations.push('Implemente circuit breaker para falhas');
  }
  
  if (result.timeouts > 0) {
    recommendations.push('Aumente timeout de conexão');
    recommendations.push('Otimize operações lentas');
  }
  
  return recommendations;
}

// Função para salvar relatório
function saveReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, '..', 'reports', `load-test-${timestamp}.json`);
  
  // Criar diretório se não existir
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalScenarios: results.length,
      passed: results.filter(r => r.analysis?.status === 'PASSED').length,
      warnings: results.filter(r => r.analysis?.status === 'WARNING').length,
      failed: results.filter(r => r.analysis?.status === 'FAILED').length
    },
    environment: {
      baseUrl: BASE_URL,
      nodeVersion: process.version,
      platform: process.platform,
      cpus: require('os').cpus().length,
      memory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + 'GB'
    },
    results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Relatório salvo em: ${reportPath}`);
  
  return report;
}

// Função principal
async function runAllLoadTests() {
  console.log('🔥 Iniciando testes de carga...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total de cenários: ${scenarios.length}`);
  
  const results = [];
  
  for (const scenario of scenarios) {
    const result = await runLoadTest(scenario);
    results.push(result);
    
    // Pausa entre testes para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Gerar relatório final
  const report = saveReport(results);
  
  console.log('\n🎯 Resumo dos Testes de Carga:');
  console.log(`✅ Passou: ${report.summary.passed}`);
  console.log(`⚠️  Avisos: ${report.summary.warnings}`);
  console.log(`❌ Falhou: ${report.summary.failed}`);
  
  // Recomendações gerais
  console.log('\n💡 Recomendações Gerais:');
  const allRecommendations = new Set();
  results.forEach(r => {
    if (r.analysis?.recommendations) {
      r.analysis.recommendations.forEach(rec => allRecommendations.add(rec));
    }
  });
  
  Array.from(allRecommendations).forEach(rec => {
    console.log(`- ${rec}`);
  });
  
  return report;
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllLoadTests()
    .then(() => {
      console.log('\n✨ Testes de carga concluídos!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro nos testes de carga:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllLoadTests,
  runLoadTest,
  scenarios
};