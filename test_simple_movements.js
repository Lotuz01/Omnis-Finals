const http = require('http');

// Teste muito simples para verificar se a API consegue pelo menos responder
async function testSimpleMovements() {
  try {
    console.log('🔍 Testando API de movimentações sem autenticação...');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/movements',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Resposta completa:', data);
        
        if (res.statusCode === 401) {
          console.log('✅ API respondeu com 401 (esperado sem autenticação)');
        } else if (res.statusCode === 500) {
          console.log('❌ API respondeu com 500 (erro interno)');
        } else {
          console.log('🤔 Status inesperado:', res.statusCode);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Erro na requisição:', err);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testSimpleMovements();