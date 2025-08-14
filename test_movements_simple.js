const axios = require('axios');

async function testMovementsSimple() {
  try {
    console.log('🔍 Testando API de movimentações diretamente...');
    
    // Testar sem autenticação primeiro para ver se o erro é de autenticação ou da API
    const response = await axios.get('http://localhost:3000/api/movements', {
      validateStatus: () => true // Aceitar qualquer status
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Headers:', response.headers);
    
    if (response.status === 401) {
      console.log('✅ API retornou 401 (esperado sem autenticação)');
    } else if (response.status === 500) {
      console.log('❌ API retornou 500 (erro interno)');
      console.log('Resposta:', response.data);
    } else {
      console.log('Resposta inesperada:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testMovementsSimple();