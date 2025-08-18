#!/usr/bin/env node

/**
 * Script para gerar chaves seguras para produção
 * Execute: node scripts/generate-production-secrets.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

function generateSecrets() {
  const secrets = {
    NEXTAUTH_SECRET: generateSecureKey(32),
    JWT_SECRET: generateSecureKey(32),
    
    GRAFANA_ADMIN_PASSWORD: generateSecureKey(16),
    MYSQL_ROOT_PASSWORD: generateSecureKey(24),
    MYSQL_PASSWORD: generateSecureKey(24)
  };

  console.log('🔐 Chaves seguras geradas para produção:\n');
  
  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });

  console.log('\n📋 Instruções:');
  console.log('1. Copie estas chaves para seu arquivo .env.production');
  console.log('2. Configure as variáveis no seu provedor de hospedagem');
  console.log('3. NUNCA commite estas chaves no repositório');
  console.log('4. Mantenha um backup seguro das chaves');

  // Salvar em arquivo temporário
  const secretsFile = path.join(__dirname, '..', 'production-secrets.txt');
  const content = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(secretsFile, content);
  console.log(`\n💾 Chaves salvas em: ${secretsFile}`);
  console.log('⚠️  IMPORTANTE: Delete este arquivo após usar as chaves!');

  return secrets;
}

if (require.main === module) {
  generateSecrets();
}

module.exports = { generateSecrets, generateSecureKey };