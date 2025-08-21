const http = require('http');

async function debugMovements500() {
  try {
    console.log('🔍 Debugando erro 500 na API de movimentações...');
    
    // Primeiro, fazer login
    console.log('\n1. Fazendo login...');
    const loginData = JSON.stringify({
      username: '01',
      password: '123456'
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginResponse = await new Promise((resolve, reject) => {
      const req = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });
    
    if (loginResponse.statusCode !== 200) {
      console.log('❌ Login falhou:', loginResponse.statusCode);
      return;
    }
    
    if (!loginResponse.headers['set-cookie']) {
      console.log('❌ Nenhum cookie recebido');
      return;
    }
    
    console.log('✅ Login bem-sucedido');
    const cookieHeader = loginResponse.headers['set-cookie'].join('; ');
    console.log('Cookies:', cookieHeader);
    
    // Agora testar a API de movimentações com diferentes parâmetros
    const testCases = [
      { name: 'Sem parâmetros', path: '/api/movements' },
      { name: 'Com paginação', path: '/api/movements?page=1&limit=10' },
      { name: 'Com tipo', path: '/api/movements?type=entrada' },
      { name: 'Parâmetros mínimos', path: '/api/movements?page=1&limit=1' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n2. Testando: ${testCase.name}`);
      console.log(`   Path: ${testCase.path}`);
      
      const movementsOptions = {
        hostname: 'localhost',
        port: 3002,
        path: testCase.path,
        method: 'GET',
        headers: {
          'Cookie': cookieHeader,
          'Accept': 'application/json'
        }
      };
      
      const movementsResponse = await new Promise((resolve, reject) => {
        const req = http.request(movementsOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data
            });
          });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        req.end();
      });
      
      console.log(`   Status: ${movementsResponse.statusCode}`);
      console.log(`   Content-Type: ${movementsResponse.headers['content-type']}`);
      
      if (movementsResponse.statusCode === 200) {
        try {
          const jsonData = JSON.parse(movementsResponse.data);
          console.log('   ✅ Sucesso! Dados:', Object.keys(jsonData));
          if (jsonData.movements) {
            console.log(`   📊 ${jsonData.movements.length} movimentações encontradas`);
          }
        } catch {
          console.log('   ❌ Resposta não é JSON válido');
          console.log('   Resposta:', movementsResponse.data.substring(0, 100));
        }
      } else if (movementsResponse.statusCode === 500) {
        console.log('   ❌ Erro 500 - Erro interno do servidor');
        console.log('   Resposta:', movementsResponse.data);
        
        // Aguardar um pouco para ver se aparecem logs no servidor
        console.log('   ⏳ Aguardando logs do servidor...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`   ❌ Erro ${movementsResponse.statusCode}`);
        console.log('   Resposta:', movementsResponse.data.substring(0, 200));
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
  }
}

debugMovements500();