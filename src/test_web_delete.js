// Script para testar deleção de backup via interface web
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

async function testWebDelete() {
  console.log('🧪 Testando deleção de backup via interface web...');
  
  try {
    // 1. Primeiro, listar backups disponíveis
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    console.log(`📁 Backups disponíveis: ${backupFiles.length}`);
    backupFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
    if (backupFiles.length === 0) {
      console.log('❌ Nenhum backup disponível para testar.');
      return;
    }
    
    // 2. Testar autenticação na API /api/user
    console.log('\n🔐 Testando autenticação...');
    
    const userResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/user',
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=01'
      }
    });
    
    console.log(`Status da autenticação: ${userResponse.statusCode}`);
    
    if (userResponse.statusCode === 200) {
      const userData = JSON.parse(userResponse.data);
      console.log(`✅ Usuário autenticado: ${userData.username} (Admin: ${userData.isAdmin})`);
      
      if (!userData.isAdmin) {
        console.log('❌ Usuário não é administrador!');
        return;
      }
    } else {
      console.log(`❌ Falha na autenticação: ${userResponse.data}`);
      return;
    }
    
    // 3. Testar deleção de backup
    const fileToDelete = backupFiles[0];
    console.log(`\n🗑️ Testando deleção do backup: ${fileToDelete}`);
    
    const requestBody = JSON.stringify({ filename: fileToDelete });
    console.log(`Enviando dados: ${requestBody}`);
    
    const deleteResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/backup',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth_token=01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }, requestBody);
    
    console.log(`Status da deleção: ${deleteResponse.statusCode}`);
    console.log(`Resposta: ${deleteResponse.data}`);
    
    if (deleteResponse.statusCode === 400) {
      console.log('🔍 Erro 400 - Verificando se o filename está sendo enviado corretamente...');
      console.log(`Filename enviado: "${fileToDelete}"`);
      console.log(`Tamanho do filename: ${fileToDelete.length}`);
    }
    
    if (deleteResponse.statusCode === 200) {
      console.log('✅ Deleção bem-sucedida via API!');
      
      // Verificar se o arquivo foi realmente deletado
      const filesAfter = await fs.readdir(backupDir);
      const backupFilesAfter = filesAfter.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      
      console.log(`📁 Backups após deleção: ${backupFilesAfter.length}`);
      
      if (backupFilesAfter.length === backupFiles.length - 1) {
        console.log('✅ Arquivo foi deletado do sistema de arquivos!');
      } else {
        console.log('⚠️ Arquivo pode não ter sido deletado do sistema de arquivos.');
      }
    } else {
      console.log(`❌ Falha na deleção: ${deleteResponse.data}`);
    }
    
    // 4. Testar listagem de backups
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
    
    console.log(`Status da listagem: ${listResponse.statusCode}`);
    
    if (listResponse.statusCode === 200) {
      const backupList = JSON.parse(listResponse.data);
      console.log(`✅ Listagem bem-sucedida: ${backupList.length} backups`);
    } else {
      console.log(`❌ Falha na listagem: ${listResponse.data}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
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
  testWebDelete();
}

module.exports = { testWebDelete };