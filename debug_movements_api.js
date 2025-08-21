const http = require('http');

// Função para fazer requisição HTTP
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testMovementsAPI() {
  try {
    console.log('🔍 Testando API de movimentações diretamente...');
    
    // 1. Fazer login primeiro
    console.log('\n1. Fazendo login...');
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginData = JSON.stringify({
      username: '01',
      password: '123456'
    });
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('Status do login:', loginResponse.statusCode);
    
    if (loginResponse.statusCode !== 200) {
      console.log('❌ Falha no login');
      console.log('Resposta:', loginResponse.body);
      return;
    }
    
    // Extrair cookies
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      console.log('❌ Nenhum cookie recebido');
      return;
    }
    
    const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    console.log('✅ Login bem-sucedido');
    console.log('Cookies:', cookieHeader);
    
    // 2. Testar API de movimentações
    console.log('\n2. Testando API de movimentações...');
    const movementsOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/movements',
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      }
    };
    
    const movementsResponse = await makeRequest(movementsOptions);
    console.log('Status da API movements:', movementsResponse.statusCode);
    console.log('Headers da resposta:', JSON.stringify(movementsResponse.headers, null, 2));
    
    if (movementsResponse.statusCode === 200) {
      console.log('✅ API de movimentações funcionando!');
      const data = JSON.parse(movementsResponse.body);
      console.log('Dados recebidos:', data);
    } else {
      console.log('❌ API de movimentações falhou');
      console.log('Resposta completa:', movementsResponse.body);
      
      // Tentar parsear como JSON para ver se há uma mensagem de erro
      try {
        const errorData = JSON.parse(movementsResponse.body);
        console.log('Erro JSON:', errorData);
      } catch {
        console.log('Resposta não é JSON válido');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testMovementsAPI();