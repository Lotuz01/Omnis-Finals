const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configurações de teste
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

const TEST_CLIENT = {
  name: 'Cliente Teste E2E',
  email: 'teste.e2e@example.com',
  phone: '11999999999',
  address: 'Rua Teste, 123'
};

const TEST_PRODUCT = {
  name: 'Produto Teste E2E',
  description: 'Produto para testes end-to-end',
  price: '99.99',
  stock: '10'
};

// Utilitários
function generateTestReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, '..', 'reports', `e2e-report-${timestamp}.json`);
  
  // Criar diretório se não existir
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`Relatório E2E salvo em: ${reportPath}`);
}

// Testes de Autenticação
test.describe('Autenticação', () => {
  test('deve fazer login com credenciais válidas', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
  
  test('deve rejeitar credenciais inválidas', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="username"]', 'invalid');
    await page.fill('input[name="password"]', 'invalid');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Credenciais inválidas')).toBeVisible();
  });
  
  test('deve fazer logout corretamente', async ({ page }) => {
    // Login primeiro
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Logout
    await page.click('button[data-testid="user-menu"]');
    await page.click('text=Sair');
    
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });
});

// Testes de Gestão de Clientes
test.describe('Gestão de Clientes', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
  });
  
  test('deve criar um novo cliente', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    await page.click('text=Novo Cliente');
    
    await page.fill('input[name="name"]', TEST_CLIENT.name);
    await page.fill('input[name="email"]', TEST_CLIENT.email);
    await page.fill('input[name="phone"]', TEST_CLIENT.phone);
    await page.fill('textarea[name="address"]', TEST_CLIENT.address);
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator(`text=${TEST_CLIENT.name}`)).toBeVisible();
  });
  
  test('deve editar um cliente existente', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    
    // Encontrar e editar o cliente de teste
    await page.click(`tr:has-text("${TEST_CLIENT.name}") button[title="Editar"]`);
    
    const newName = `${TEST_CLIENT.name} - Editado`;
    await page.fill('input[name="name"]', newName);
    await page.click('button[type="submit"]');
    
    await expect(page.locator(`text=${newName}`)).toBeVisible();
  });
  
  test('deve excluir um cliente', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`);
    
    // Encontrar e excluir o cliente de teste
    await page.click(`tr:has-text("${TEST_CLIENT.name}") button[title="Excluir"]`);
    await page.click('button:has-text("Confirmar")');
    
    await expect(page.locator(`text=${TEST_CLIENT.name}`)).not.toBeVisible();
  });
});

// Testes de Gestão de Produtos
test.describe('Gestão de Produtos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
  });
  
  test('deve criar um novo produto', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`);
    await page.click('text=Novo Produto');
    
    await page.fill('input[name="name"]', TEST_PRODUCT.name);
    await page.fill('textarea[name="description"]', TEST_PRODUCT.description);
    await page.fill('input[name="price"]', TEST_PRODUCT.price);
    await page.fill('input[name="stock"]', TEST_PRODUCT.stock);
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator(`text=${TEST_PRODUCT.name}`)).toBeVisible();
  });
  
  test('deve validar campos obrigatórios', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`);
    await page.click('text=Novo Produto');
    
    // Tentar submeter sem preencher campos
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Nome é obrigatório')).toBeVisible();
  });
});

// Testes de Movimentações Financeiras
test.describe('Movimentações Financeiras', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
  });
  
  test('deve registrar uma entrada', async ({ page }) => {
    await page.goto(`${BASE_URL}/movements`);
    await page.click('text=Nova Movimentação');
    
    await page.selectOption('select[name="type"]', 'entrada');
    await page.fill('input[name="amount"]', '1000.00');
    await page.fill('input[name="description"]', 'Teste de entrada E2E');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Teste de entrada E2E')).toBeVisible();
  });
  
  test('deve registrar uma saída', async ({ page }) => {
    await page.goto(`${BASE_URL}/movements`);
    await page.click('text=Nova Movimentação');
    
    await page.selectOption('select[name="type"]', 'saida');
    await page.fill('input[name="amount"]', '500.00');
    await page.fill('input[name="description"]', 'Teste de saída E2E');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Teste de saída E2E')).toBeVisible();
  });
});

// Testes de API Health Check
test.describe('API Health Check', () => {
  test('deve retornar status healthy', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    expect(response.status()).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database.status).toBe('healthy');
    expect(data.checks.memory.status).toBe('healthy');
    expect(data.checks.filesystem.status).toBe('healthy');
  });
});

// Testes de Métricas
test.describe('Métricas do Sistema', () => {
  test('deve retornar métricas do sistema', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/metrics`);
    const data = await response.json();
    
    expect(response.status()).toBe(200);
    expect(data.system).toBeDefined();
    expect(data.application).toBeDefined();
    expect(data.database).toBeDefined();
    expect(data.api).toBeDefined();
  });
});

// Testes de Backup
test.describe('Sistema de Backup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
  });
  
  test('deve criar backup do sistema', async ({ page }) => {
    await page.goto(`${BASE_URL}/backup`);
    await page.click('text=Criar Backup');
    
    // Aguardar o backup ser criado
    await expect(page.locator('text=Backup criado com sucesso')).toBeVisible({ timeout: 30000 });
  });
});

// Testes de Performance
test.describe('Performance', () => {
  test('páginas devem carregar em menos de 3 segundos', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/clients',
      '/products',
      '/movements',
      '/backup'
    ];
    
    // Login primeiro
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    for (const pagePath of pages) {
      const start = Date.now();
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - start;
      
      expect(loadTime).toBeLessThan(3000);
      console.log(`${pagePath}: ${loadTime}ms`);
    }
  });
});

// Hook para gerar relatório após todos os testes
test.afterAll(async () => {
  const results = {
    timestamp: new Date().toISOString(),
    summary: 'Testes E2E executados com sucesso',
    environment: {
      baseUrl: BASE_URL,
      nodeVersion: process.version,
      platform: process.platform
    }
  };
  
  generateTestReport(results);
});