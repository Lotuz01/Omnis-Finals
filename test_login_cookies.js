const http = require('http');

async function testLoginCookies() {
  try {
    console.log('🔐 Testando cookies de login na porta 3002...');
    
    const loginData = JSON.stringify({
      username: '01',
      password: '123456'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(loginData);
      req.end();
    });
    
    console.log('\n📊 Resultado do login:');
    console.log('Status:', response.statusCode);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Set-Cookie:', response.headers['set-cookie']);
    
    try {
      const jsonData = JSON.parse(response.data);
      console.log('Dados JSON:', JSON.stringify(jsonData, null, 2));
    } catch {
      console.log('Resposta não é JSON válido:');
      console.log(response.data.substring(0, 200));
    }
    
    if (response.headers['set-cookie']) {
      console.log('\n✅ Cookies encontrados!');
      response.headers['set-cookie'].forEach((cookie, index) => {
        console.log(`Cookie ${index + 1}:`, cookie);
      });
      
      // Testar API de movimentações com os cookies
      console.log('\n🔄 Testando API de movimentações com cookies...');
      
      const cookieHeader = response.headers['set-cookie'].join('; ');
      
      const movementsOptions = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/movements',
        method: 'GET',
        headers: {
          'Cookie': cookieHeader
        }
      };
      
      const movementsResponse = await new Promise((resolve, reject) => {
        const req = http.request(movementsOptions, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data
            });
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.end();
      });
      
      console.log('\n📊 Resultado da API movements:');
      console.log('Status:', movementsResponse.statusCode);
      console.log('Content-Type:', movementsResponse.headers['content-type']);
      
      if (movementsResponse.statusCode === 200) {
        try {
            const movementsData = JSON.parse(movementsResponse.data);
            console.log('✅ API movements funcionando! Dados recebidos:', Object.keys(movementsData));
          } catch {
            console.log('❌ API movements retornou dados não-JSON:');
            console.log(movementsResponse.data.substring(0, 200));
          }
      } else {
        console.log('❌ API movements falhou com status:', movementsResponse.statusCode);
        console.log('Resposta:', movementsResponse.data.substring(0, 200));
      }
    } else {
      console.log('\n❌ Nenhum cookie encontrado na resposta!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testLoginCookies();