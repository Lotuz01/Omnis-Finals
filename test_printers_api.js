// Usando fetch nativo do Node.js 18+

// Configuração da API
const API_BASE_URL = 'http://localhost:3002';

// Função para fazer login e obter token
async function login() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: '01',
        password: '123456'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login realizado com sucesso');
      console.log('Dados do usuário:', data);
      
      // Extrair cookies da resposta
      const cookies = response.headers.get('set-cookie');
      console.log('Cookies recebidos:', cookies);
      
      return cookies;
    } else {
      console.log('❌ Falha no login:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    return null;
  }
}

// Função para testar GET /api/printers
async function testGetPrinters(cookies) {
  try {
    console.log('\n--- Testando GET /api/printers ---');
    
    const response = await fetch(`${API_BASE_URL}/api/printers`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || ''
      }
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Resposta:', data);
    
    if (response.ok) {
      console.log('✅ GET /api/printers funcionando');
      console.log(`Encontradas ${Array.isArray(data) ? data.length : 0} impressoras`);
    } else {
      console.log('❌ Erro na API GET /api/printers');
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao testar GET /api/printers:', error.message);
    return false;
  }
}

// Função para testar POST /api/printers
async function testPostPrinters(cookies) {
  try {
    console.log('\n--- Testando POST /api/printers ---');
    
    const printerData = {
      name: 'Impressora Teste',
      type: 'termica',
      connection_type: 'usb',
      device_path: '/dev/usb/lp0',
      paper_width: 80,
      paper_height: 297,
      characters_per_line: 48,
      font_size: 12,
      is_default: true,
      is_active: true,
      settings: {
        cut_paper: true,
        open_drawer: false,
        print_logo: false,
        header_text: 'EMPRESA TESTE',
        footer_text: 'Obrigado pela preferência!',
        encoding: 'utf8'
      }
    };
    
    const response = await fetch(`${API_BASE_URL}/api/printers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(printerData)
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Resposta:', data);
    
    if (response.ok) {
      console.log('✅ POST /api/printers funcionando');
      return data.id;
    } else {
      console.log('❌ Erro na API POST /api/printers');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao testar POST /api/printers:', error.message);
    return null;
  }
}

// Função principal
async function testPrintersAPI() {
  console.log('🔧 Testando API de Impressoras');
  console.log('================================\n');
  
  // 1. Fazer login
  const cookies = await login();
  
  if (!cookies) {
    console.log('❌ Não foi possível fazer login. Abortando testes.');
    return;
  }
  
  // 2. Testar GET /api/printers
  await testGetPrinters(cookies);
  
  // 3. Testar POST /api/printers
  const printerId = await testPostPrinters(cookies);
  
  // 4. Testar GET novamente para ver a impressora criada
  if (printerId) {
    console.log('\n--- Verificando impressora criada ---');
    await testGetPrinters(cookies);
  }
  
  console.log('\n🏁 Teste da API de Impressoras concluído');
}

// Executar teste
testPrintersAPI().catch(console.error);