const axios = require('axios');

async function testNFeAPI() {
  try {
    console.log('🔍 Testando API de NFe...');
    
    // Primeiro, fazer login para obter cookies
    console.log('\n1. Fazendo login...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      username: '01',
      password: '123456'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (loginResponse.status !== 200) {
      console.error('❌ Falha no login:', loginResponse.status, loginResponse.data);
      return;
    }
    
    console.log('✅ Login bem-sucedido');
    const cookies = loginResponse.headers['set-cookie'];
    console.log('Cookies:', cookies?.join('; '));
    
    // Testar GET /api/nfe
    console.log('\n2. Testando GET /api/nfe...');
    try {
      const getNFeResponse = await axios.get('http://localhost:3002/api/nfe', {
        headers: {
          'Cookie': cookies?.join('; ') || ''
        },
        validateStatus: () => true
      });
      
      console.log('Status:', getNFeResponse.status);
      console.log('Content-Type:', getNFeResponse.headers['content-type']);
      
      if (getNFeResponse.status === 200) {
        console.log('✅ GET /api/nfe funcionando');
        console.log('Dados:', Array.isArray(getNFeResponse.data) ? `${getNFeResponse.data.length} NFes encontradas` : getNFeResponse.data);
      } else {
        console.log('❌ GET /api/nfe falhou');
        console.log('Response:', getNFeResponse.data);
      }
    } catch (error) {
      console.error('❌ Erro na requisição GET /api/nfe:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
    }
    
    // Testar POST /api/nfe (apenas estrutura, sem emitir realmente)
    console.log('\n3. Testando POST /api/nfe (dados de teste)...');
    try {
      const testNFeData = {
        client_id: 1, // ID de cliente que pode não existir
        items: [
          {
            description: 'Produto Teste',
            quantity: 1,
            unit_price: 10.00,
            total_price: 10.00,
            cfop: '5102',
            ncm: '12345678',
            unit: 'UN'
          }
        ],
        total_amount: 10.00,
        operation_type: 'Venda',
        notes: 'Teste de API'
      };
      
      const postNFeResponse = await axios.post('http://localhost:3002/api/nfe', testNFeData, {
        headers: {
          'Cookie': cookies?.join('; ') || '',
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      
      console.log('Status:', postNFeResponse.status);
      console.log('Content-Type:', postNFeResponse.headers['content-type']);
      
      if (postNFeResponse.status === 201) {
        console.log('✅ POST /api/nfe funcionando');
        console.log('Dados:', postNFeResponse.data);
      } else if (postNFeResponse.status === 404) {
        console.log('⚠️ POST /api/nfe retornou 404 (cliente não encontrado - esperado)');
        console.log('Response:', postNFeResponse.data);
      } else if (postNFeResponse.status === 400) {
        console.log('⚠️ POST /api/nfe retornou 400 (erro de validação - pode ser esperado)');
        console.log('Response:', postNFeResponse.data);
      } else {
        console.log('❌ POST /api/nfe falhou');
        console.log('Response:', postNFeResponse.data);
      }
    } catch (error) {
      console.error('❌ Erro na requisição POST /api/nfe:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.error('Stack:', error.stack);
  }
}

testNFeAPI();