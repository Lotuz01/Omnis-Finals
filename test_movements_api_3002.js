// Usando fetch nativo do Node.js (disponível a partir da versão 18)

async function testMovementsAPI() {
  try {
    console.log('🔐 Fazendo login...');
    
    // Fazer login
    const loginResponse = await fetch('http://localhost:3002/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin123'
      })
    });

    console.log('Status do login:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      const loginError = await loginResponse.text();
      console.log('Erro no login:', loginError);
      return;
    }

    // Extrair cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login realizado com sucesso');
    console.log('Cookies recebidos:', cookies ? 'Sim' : 'Não');

    // Testar API de movimentações
    console.log('\n📊 Testando API de movimentações...');
    const movementsResponse = await fetch('http://localhost:3002/api/movements', {
      method: 'GET',
      headers: {
        'Cookie': cookies || ''
      }
    });

    console.log('Status da API de movimentações:', movementsResponse.status);
    
    const responseText = await movementsResponse.text();
    console.log('Conteúdo da resposta (primeiros 200 chars):', responseText.substring(0, 200));
    
    if (movementsResponse.status === 200) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ API de movimentações funcionando!');
        console.log('Dados retornados:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log('❌ Resposta não é JSON válido');
        console.log('Content-Type:', movementsResponse.headers.get('content-type'));
      }
    } else {
      console.log('❌ Erro na API de movimentações:', responseText.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
  }
}

testMovementsAPI();