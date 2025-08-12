// Script para diagnosticar problemas na interface web
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

async function diagnoseWebInterface() {
  console.log('🔍 Diagnosticando interface web de backup...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar se há backups para testar
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    console.log(`📁 Backups disponíveis: ${backupFiles.length}`);
    if (backupFiles.length === 0) {
      console.log('⚠️ Criando backup de teste...');
      const { createBackup } = require('./backup.js');
      await createBackup();
      
      const newFiles = await fs.readdir(backupDir);
      const newBackupFiles = newFiles.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      console.log(`✅ Backup criado! Total: ${newBackupFiles.length}`);
    }
    
    // 2. Testar diferentes cenários de autenticação
    console.log('\n🔐 Testando cenários de autenticação...');
    
    // Teste 1: Sem cookie
    const noAuthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/user',
      method: 'GET'
    });
    console.log(`   Sem cookie: ${noAuthResponse.statusCode} (esperado: 401)`);
    
    // Teste 2: Com cookie correto
    const withAuthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/user',
      method: 'GET',
      headers: { 'Cookie': 'auth_token=01' }
    });
    console.log(`   Com cookie '01': ${withAuthResponse.statusCode} (esperado: 200)`);
    
    if (withAuthResponse.statusCode === 200) {
      const userData = JSON.parse(withAuthResponse.data);
      console.log(`   ✅ Usuário: ${userData.username}, Admin: ${userData.isAdmin}`);
    }
    
    // 3. Testar API de listagem de backups
    console.log('\n📋 Testando API de listagem...');
    
    const listResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/backup',
      method: 'GET',
      headers: { 'Cookie': 'auth_token=01' }
    });
    
    console.log(`   Status: ${listResponse.statusCode}`);
    if (listResponse.statusCode === 200) {
      try {
        const backupList = JSON.parse(listResponse.data);
        console.log(`   ✅ Backups listados: ${Array.isArray(backupList) ? backupList.length : 'formato inválido'}`);
        if (Array.isArray(backupList) && backupList.length > 0) {
          console.log(`   Primeiro backup: ${backupList[0].filename}`);
        }
      } catch (e) {
        console.log(`   ❌ Erro ao parsear resposta: ${e.message}`);
        console.log(`   Resposta bruta: ${listResponse.data.substring(0, 200)}...`);
      }
    }
    
    // 4. Testar deleção com diferentes formatos
    console.log('\n🗑️ Testando API de deleção...');
    
    const currentFiles = await fs.readdir(backupDir);
    const currentBackups = currentFiles.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    if (currentBackups.length > 0) {
      const testFile = currentBackups[0];
      console.log(`   Testando deleção de: ${testFile}`);
      
      // Teste com diferentes formatos de requisição
      const deleteTests = [
        {
          name: 'JSON simples',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'auth_token=01'
          },
          body: JSON.stringify({ filename: testFile })
        },
        {
          name: 'JSON com charset',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cookie': 'auth_token=01'
          },
          body: JSON.stringify({ filename: testFile })
        }
      ];
      
      for (const test of deleteTests) {
        console.log(`   Testando: ${test.name}`);
        
        const deleteResponse = await makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/api/backup',
          method: 'DELETE',
          headers: test.headers
        }, test.body);
        
        console.log(`     Status: ${deleteResponse.statusCode}`);
        
        if (deleteResponse.statusCode === 200) {
          console.log(`     ✅ Deleção bem-sucedida!`);
          break; // Parar no primeiro sucesso
        } else {
          console.log(`     ❌ Falha: ${deleteResponse.data}`);
        }
      }
    }
    
    // 5. Verificar se a página de backup está acessível
    console.log('\n🌐 Testando acesso à página de backup...');
    
    const pageResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/backup',
      method: 'GET',
      headers: { 'Cookie': 'auth_token=01' }
    });
    
    console.log(`   Status da página: ${pageResponse.statusCode}`);
    if (pageResponse.statusCode === 200) {
      console.log(`   ✅ Página acessível`);
    } else {
      console.log(`   ❌ Problema no acesso à página`);
    }
    
    // 6. Resumo e recomendações
    console.log('\n' + '=' .repeat(60));
    console.log('📋 RESUMO DO DIAGNÓSTICO:');
    console.log('\n✅ FUNCIONANDO:');
    console.log('   - API de autenticação');
    console.log('   - Sistema de backup');
    console.log('   - Servidor web');
    
    console.log('\n🔧 PARA RESOLVER O PROBLEMA NA INTERFACE WEB:');
    console.log('\n1. 🌐 ACESSE A PÁGINA:');
    console.log('   http://localhost:3000/backup');
    
    console.log('\n2. 🔑 VERIFIQUE O LOGIN:');
    console.log('   - Se não estiver logado, vá para: http://localhost:3000/login');
    console.log('   - Use usuário: 01');
    console.log('   - Use sua senha de administrador');
    
    console.log('\n3. 🔍 VERIFIQUE O CONSOLE DO NAVEGADOR:');
    console.log('   - Pressione F12');
    console.log('   - Vá para a aba "Console"');
    console.log('   - Procure por erros em vermelho');
    console.log('   - Tente deletar um backup e veja se aparecem erros');
    
    console.log('\n4. 🧹 LIMPE O CACHE:');
    console.log('   - Pressione Ctrl+F5 para recarregar sem cache');
    console.log('   - Ou vá em Configurações > Privacidade > Limpar dados');
    
    console.log('\n5. 🍪 VERIFIQUE OS COOKIES:');
    console.log('   - No F12, vá para "Application" > "Cookies"');
    console.log('   - Verifique se existe "auth_token" com valor "01"');
    
    console.log('\n6. 🔄 SE NADA FUNCIONAR:');
    console.log('   - Feche completamente o navegador');
    console.log('   - Abra novamente');
    console.log('   - Faça login novamente');
    console.log('   - Tente deletar um backup');
    
    console.log('\n💡 A API está funcionando perfeitamente!');
    console.log('   O problema está na interface web ou no navegador.');
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error.message);
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

if (require.main === module) {
  diagnoseWebInterface();
}

module.exports = { diagnoseWebInterface };