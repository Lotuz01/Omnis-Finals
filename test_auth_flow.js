const axios = require('axios');

async function testAuthFlow() {
  try {
    console.log('🔐 Testando fluxo de autenticação completo...');
    
    // 1. Fazer login
    console.log('\n1. Fazendo login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: '01',
      password: '123456'
    }, {
      withCredentials: true,
      validateStatus: () => true // Aceitar qualquer status
    });
    
    console.log(`Status do login: ${loginResponse.status}`);
    console.log('Headers de resposta:', loginResponse.headers);
    console.log('Cookies recebidos:', loginResponse.headers['set-cookie']);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login falhou');
      console.log('Resposta:', loginResponse.data);
      return;
    }
    
    // 2. Extrair cookies
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      console.log('❌ Nenhum cookie recebido');
      return;
    }
    
    // 3. Testar API de movimentações
    console.log('\n2. Testando API de movimentações...');
    const cookieHeader = cookies.join('; ');
    console.log('Cookie header:', cookieHeader);
    
    const movementsResponse = await axios.get('http://localhost:3000/api/movements', {
      headers: {
        'Cookie': cookieHeader
      },
      validateStatus: () => true
    });
    
    console.log(`Status da API movements: ${movementsResponse.status}`);
    
    if (movementsResponse.status === 200) {
      console.log('✅ API de movimentações funcionando!');
      console.log('Dados:', JSON.stringify(movementsResponse.data, null, 2));
    } else {
      console.log('❌ API de movimentações falhou');
      console.log('Resposta:', movementsResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testAuthFlow();