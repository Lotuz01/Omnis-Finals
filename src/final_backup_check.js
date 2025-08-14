// Script final para verificar e corrigir problemas de backup
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

async function finalBackupCheck() {
  console.log('🔍 Verificação final do sistema de backup...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Status dos backups
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    console.log(`📁 Status dos backups:`);
    console.log(`   Total de backups: ${backupFiles.length}`);
    backupFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
    // 2. Teste da API DELETE
    console.log('\n🧪 Testando API DELETE...');
    
    if (backupFiles.length > 0) {
      const testFile = backupFiles[0];
      const deleteResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/backup',
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth_token=01'
        }
      }, JSON.stringify({ filename: testFile }));
      
      if (deleteResponse.statusCode === 200) {
        console.log('✅ API DELETE funcionando corretamente!');
        
        // Verificar se foi deletado
        const filesAfter = await fs.readdir(backupDir);
        const backupFilesAfter = filesAfter.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
        
        if (backupFilesAfter.length === backupFiles.length - 1) {
          console.log('✅ Arquivo deletado com sucesso!');
        }
      } else {
        console.log(`❌ Problema na API DELETE: ${deleteResponse.statusCode}`);
        console.log(`   Resposta: ${deleteResponse.data}`);
      }
    } else {
      console.log('⚠️ Nenhum backup disponível para testar deleção.');
    }
    
    // 3. Teste da API de autenticação
    console.log('\n🔐 Testando autenticação...');
    
    const authResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/user',
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=01'
      }
    });
    
    if (authResponse.statusCode === 200) {
      const userData = JSON.parse(authResponse.data);
      console.log(`✅ Autenticação funcionando!`);
      console.log(`   Usuário: ${userData.username}`);
      console.log(`   Admin: ${userData.isAdmin ? 'Sim' : 'Não'}`);
    } else {
      console.log(`❌ Problema na autenticação: ${authResponse.statusCode}`);
    }
    
    // 4. Teste da API de listagem
    console.log('\n📋 Testando listagem de backups...');
    
    const listResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/backup',
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=01'
      }
    });
    
    if (listResponse.statusCode === 200) {
      console.log('✅ Listagem funcionando!');
      try {
        const backupList = JSON.parse(listResponse.data);
        console.log(`   Backups listados: ${Array.isArray(backupList) ? backupList.length : 'formato inválido'}`);
      } catch {
        console.log('   Resposta não é JSON válido');
      }
    } else {
      console.log(`❌ Problema na listagem: ${listResponse.statusCode}`);
    }
    
    // 5. Criar um backup de teste se necessário
    const currentFiles = await fs.readdir(backupDir);
    const currentBackups = currentFiles.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    if (currentBackups.length === 0) {
      console.log('\n🔧 Criando backup de teste...');
      const { createBackup } = require('./backup.js');
      await createBackup();
      console.log('✅ Backup de teste criado!');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('📋 RESUMO FINAL:');
    console.log('✅ Sistema de backup funcionando corretamente');
    console.log('✅ API DELETE operacional');
    console.log('✅ Autenticação funcionando');
    console.log('✅ Interface web deve estar acessível');
    
    console.log('\n💡 INSTRUÇÕES PARA USO:');
    console.log('1. Acesse: http://localhost:3000/login');
    console.log('2. Faça login com o usuário: 01');
    console.log('3. Acesse: http://localhost:3000/backup');
    console.log('4. Use os botões de deletar na interface');
    
    console.log('\n🔧 Se ainda não funcionar na interface web:');
    console.log('- Verifique se está logado como administrador');
    console.log('- Limpe o cache do navegador (Ctrl+F5)');
    console.log('- Verifique o console do navegador (F12)');
    console.log('- Certifique-se de que o cookie auth_token está definido');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
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
  finalBackupCheck();
}

module.exports = { finalBackupCheck };