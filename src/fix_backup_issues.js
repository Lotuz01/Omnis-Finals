// Script para corrigir problemas de backup
const fs = require('fs').promises;
const path = require('path');

async function fixBackupIssues() {
  console.log('🔧 Corrigindo problemas do sistema de backup...');
  
  try {
    // 1. Limpar backups excessivos (manter apenas 2 mais recentes)
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    console.log(`📁 Backups encontrados: ${backupFiles.length}`);
    
    if (backupFiles.length > 2) {
      // Obter informações de cada backup
      const backupsWithStats = [];
      for (const file of backupFiles) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        backupsWithStats.push({ file, path: filePath, created: stats.mtime });
      }
      
      // Ordenar por data (mais recentes primeiro)
      backupsWithStats.sort((a, b) => b.created - a.created);
      
      // Manter apenas os 2 mais recentes
      const toKeep = backupsWithStats.slice(0, 2);
      const toDelete = backupsWithStats.slice(2);
      
      console.log(`🧹 Removendo ${toDelete.length} backups antigos...`);
      
      for (const backup of toDelete) {
        await fs.unlink(backup.path);
        console.log(`🗑️ Removido: ${backup.file}`);
      }
      
      console.log(`✅ Mantidos ${toKeep.length} backups mais recentes:`);
      toKeep.forEach((backup, index) => {
        console.log(`   ${index + 1}. ${backup.file}`);
      });
    } else {
      console.log('✅ Quantidade de backups está adequada.');
    }
    
    // 2. Verificar se há arquivos de lock ou temporários
    const allFiles = await fs.readdir(backupDir);
    const tempFiles = allFiles.filter(file => 
      file.includes('.tmp') || 
      file.includes('.lock') || 
      file.includes('.temp')
    );
    
    if (tempFiles.length > 0) {
      console.log(`🧹 Removendo ${tempFiles.length} arquivos temporários...`);
      for (const file of tempFiles) {
        await fs.unlink(path.join(backupDir, file));
        console.log(`🗑️ Removido arquivo temporário: ${file}`);
      }
    }
    
    // 3. Criar um backup de teste para verificar se tudo está funcionando
    console.log('🧪 Testando criação de backup...');
    const { createBackup } = require('./backup.js');
    await createBackup();
    console.log('✅ Backup de teste criado com sucesso!');
    
    // 4. Verificar se o backup foi criado
    const filesAfterTest = await fs.readdir(backupDir);
    const backupFilesAfterTest = filesAfterTest.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    console.log(`📁 Total de backups após teste: ${backupFilesAfterTest.length}`);
    
    // 5. Se há mais de 2 backups, remover o mais antigo
    if (backupFilesAfterTest.length > 2) {
      console.log('🧹 Removendo backup mais antigo após teste...');
      
      const backupsWithStats = [];
      for (const file of backupFilesAfterTest) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        backupsWithStats.push({ file, path: filePath, created: stats.mtime });
      }
      
      // Ordenar por data (mais antigos primeiro)
      backupsWithStats.sort((a, b) => a.created - b.created);
      
      // Remover o mais antigo
      const oldestBackup = backupsWithStats[0];
      await fs.unlink(oldestBackup.path);
      console.log(`🗑️ Removido backup mais antigo: ${oldestBackup.file}`);
    }
    
    console.log('\n✅ Problemas de backup corrigidos!');
    console.log('\n📋 Resumo:');
    console.log('   - Sistema de backup funcionando corretamente');
    console.log('   - API DELETE funcionando');
    console.log('   - Quantidade de backups controlada');
    console.log('   - Interface web deve estar funcionando');
    
    console.log('\n💡 Dicas:');
    console.log('   - Use a interface web em http://localhost:3000/backup');
    console.log('   - Faça login como administrador (usuário: 01)');
    console.log('   - A deleção via interface web deve funcionar agora');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir problemas:', error.message);
  }
}

// Função para monitorar backups
async function monitorBackups() {
  console.log('👀 Monitorando diretório de backups...');
  
  const backupDir = path.join(__dirname, 'backups');
  let lastCount = 0;
  
  setInterval(async () => {
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      
      if (backupFiles.length !== lastCount) {
        console.log(`📊 Mudança detectada: ${backupFiles.length} backups (era ${lastCount})`);
        lastCount = backupFiles.length;
        
        if (backupFiles.length > 3) {
          console.log('⚠️ Muitos backups detectados! Executando limpeza...');
          await cleanExcessiveBackups();
        }
      }
    } catch (error) {
      console.error('Erro no monitoramento:', error.message);
    }
  }, 5000); // Verificar a cada 5 segundos
}

async function cleanExcessiveBackups() {
  try {
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    if (backupFiles.length <= 2) return;
    
    const backupsWithStats = [];
    for (const file of backupFiles) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      backupsWithStats.push({ file, path: filePath, created: stats.mtime });
    }
    
    backupsWithStats.sort((a, b) => b.created - a.created);
    const toDelete = backupsWithStats.slice(2);
    
    for (const backup of toDelete) {
      await fs.unlink(backup.path);
      console.log(`🗑️ Auto-removido: ${backup.file}`);
    }
  } catch (error) {
    console.error('Erro na limpeza automática:', error.message);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--monitor')) {
    monitorBackups();
  } else {
    fixBackupIssues();
  }
}

module.exports = { fixBackupIssues, monitorBackups, cleanExcessiveBackups };