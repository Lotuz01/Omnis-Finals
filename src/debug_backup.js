// Script para debugar problemas de backup
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'wendel',
  password: process.env.DB_PASSWORD || 'Gengar1509@',
  database: process.env.DB_NAME || 'pdv_system',
};

async function debugBackupIssues() {
  console.log('🔍 Iniciando debug do sistema de backup...');
  
  try {
    // 1. Verificar backups existentes
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    console.log(`📁 Backups encontrados: ${backupFiles.length}`);
    backupFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
    // 2. Verificar usuários admin
    const connection = await mysql.createConnection(dbConfig);
    const [users] = await connection.execute('SELECT username, is_admin FROM users WHERE is_admin = 1');
    console.log('👤 Usuários admin:', users);
    
    // 3. Testar deleção de backup (se houver mais de 1)
    if (backupFiles.length > 1) {
      const fileToDelete = backupFiles[backupFiles.length - 1]; // Último backup
      console.log(`🗑️ Testando deleção do backup: ${fileToDelete}`);
      
      try {
        const filePath = path.join(backupDir, fileToDelete);
        await fs.unlink(filePath);
        console.log('✅ Backup deletado com sucesso via filesystem!');
        
        // Verificar se foi realmente deletado
        const filesAfter = await fs.readdir(backupDir);
        const backupFilesAfter = filesAfter.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
        console.log(`📁 Backups após deleção: ${backupFilesAfter.length}`);
        
      } catch (error) {
        console.error('❌ Erro ao deletar backup:', error.message);
      }
    }
    
    // 4. Verificar se há processos Node.js suspeitos
    console.log('🔍 Verificando processos Node.js...');
    const { exec } = require('child_process');
    
    exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', (error, stdout) => {
      if (error) {
        console.error('Erro ao verificar processos:', error);
        return;
      }
      
      const lines = stdout.split('\n').filter(line => line.includes('node.exe'));
      console.log(`🔄 Processos Node.js ativos: ${lines.length}`);
      
      // Verificar se algum processo está consumindo muita CPU (indicativo de loop)
      lines.forEach((line, index) => {
        if (line.includes('node.exe')) {
          console.log(`   Processo ${index + 1}: ${line}`);
        }
      });
    });
    
    connection.end();
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
  }
}

// Função para limpar backups antigos manualmente
async function cleanOldBackups(keepCount = 2) {
  try {
    console.log(`🧹 Limpando backups antigos (mantendo ${keepCount})...`);
    
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
    
    if (backupFiles.length <= keepCount) {
      console.log('✅ Não há backups antigos para remover.');
      return;
    }
    
    // Ordenar por data (mais antigos primeiro)
    const backupsWithStats = [];
    for (const file of backupFiles) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      backupsWithStats.push({ file, path: filePath, created: stats.mtime });
    }
    
    backupsWithStats.sort((a, b) => a.created - b.created);
    
    // Deletar os mais antigos
    const toDelete = backupsWithStats.slice(0, backupsWithStats.length - keepCount);
    
    for (const backup of toDelete) {
      await fs.unlink(backup.path);
      console.log(`🗑️ Removido: ${backup.file}`);
    }
    
    console.log(`✅ ${toDelete.length} backups antigos removidos.`);
    
  } catch (error) {
    console.error('❌ Erro ao limpar backups:', error.message);
  }
}

// Executar debug
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--clean')) {
    const keepCount = parseInt(args[args.indexOf('--clean') + 1]) || 2;
    cleanOldBackups(keepCount);
  } else {
    debugBackupIssues();
  }
}

module.exports = { debugBackupIssues, cleanOldBackups };