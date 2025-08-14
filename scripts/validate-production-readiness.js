#!/usr/bin/env node

/**
 * Script para validar se o sistema está pronto para produção
 * Execute: node scripts/validate-production-readiness.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(type, message) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'error': '❌',
      'warning': '⚠️ ',
      'success': '✅',
      'info': 'ℹ️ '
    }[type] || 'ℹ️ ';
    
    console.log(`${prefix} ${message}`);
    
    if (type === 'error') this.errors.push(message);
    if (type === 'warning') this.warnings.push(message);
    if (type === 'success') this.passed.push(message);
  }

  checkEnvironmentFiles() {
    this.log('info', 'Verificando arquivos de ambiente...');
    
    const requiredFiles = [
      '.env.production.secure',
      '.env.example'
    ];
    
    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.log('success', `Arquivo ${file} encontrado`);
      } else {
        this.log('error', `Arquivo ${file} não encontrado`);
      }
    });

    // Verificar se .env.local não tem credenciais expostas
    if (fs.existsSync('.env.local')) {
      const content = fs.readFileSync('.env.local', 'utf8');
      if (content.includes('wendel') || content.includes('Gengar1509@')) {
        this.log('error', 'Credenciais expostas encontradas em .env.local');
      } else {
        this.log('success', 'Arquivo .env.local não contém credenciais expostas');
      }
    }
  }

  checkDependencies() {
    this.log('info', 'Verificando dependências...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      const requiredDeps = [
        'next',
        'react',
        'typescript',
        'sonner',
        'date-fns'
      ];
      
      requiredDeps.forEach(dep => {
        if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
          this.log('success', `Dependência ${dep} encontrada`);
        } else {
          this.log('error', `Dependência ${dep} não encontrada`);
        }
      });
    } catch (error) {
      this.log('error', 'Erro ao ler package.json');
    }
  }

  checkTypeScript() {
    this.log('info', 'Verificando TypeScript...');
    
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      this.log('success', 'TypeScript: Sem erros de tipagem');
    } catch (error) {
      this.log('error', 'TypeScript: Erros de tipagem encontrados');
    }
  }

  checkSecurityHeaders() {
    this.log('info', 'Verificando configurações de segurança...');
    
    const middlewarePath = 'src/middleware.ts';
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf8');
      
      const securityChecks = [
        { check: 'X-Frame-Options', pattern: /X-Frame-Options/ },
        { check: 'Content-Security-Policy', pattern: /Content-Security-Policy/ },
        { check: 'X-Content-Type-Options', pattern: /X-Content-Type-Options/ },
        { check: 'Rate Limiting', pattern: /rateLimitMap/ }
      ];
      
      securityChecks.forEach(({ check, pattern }) => {
        if (pattern.test(content)) {
          this.log('success', `Segurança: ${check} configurado`);
        } else {
          this.log('warning', `Segurança: ${check} não encontrado`);
        }
      });
    } else {
      this.log('error', 'Arquivo middleware.ts não encontrado');
    }
  }

  checkNotificationSystem() {
    this.log('info', 'Verificando sistema de notificações...');
    
    const notificationFiles = [
      'src/contexts/notifications-context.tsx',
      'src/components/notifications-dropdown.tsx',
      'src/hooks/use-notifications.ts'
    ];
    
    notificationFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.log('success', `Sistema de notificações: ${path.basename(file)} encontrado`);
      } else {
        this.log('error', `Sistema de notificações: ${path.basename(file)} não encontrado`);
      }
    });
  }

  checkBuildConfiguration() {
    this.log('info', 'Verificando configuração de build...');
    
    const configFiles = [
      'next.config.ts',
      'tsconfig.json',
      'tailwind.config.ts'
    ];
    
    configFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.log('success', `Configuração: ${file} encontrado`);
      } else {
        this.log('warning', `Configuração: ${file} não encontrado`);
      }
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE VALIDAÇÃO DE PRODUÇÃO');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Verificações Aprovadas: ${this.passed.length}`);
    console.log(`⚠️  Avisos: ${this.warnings.length}`);
    console.log(`❌ Erros Críticos: ${this.errors.length}`);
    
    if (this.errors.length === 0 && this.warnings.length <= 2) {
      console.log('\n🎉 STATUS: PRONTO PARA PRODUÇÃO!');
      console.log('✅ O sistema atende aos requisitos mínimos de produção.');
    } else if (this.errors.length === 0) {
      console.log('\n🟡 STATUS: QUASE PRONTO');
      console.log('⚠️  Alguns avisos foram encontrados, mas não são críticos.');
    } else {
      console.log('\n🔴 STATUS: NÃO ESTÁ PRONTO');
      console.log('❌ Erros críticos devem ser corrigidos antes do deploy.');
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERROS CRÍTICOS:');
      this.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  AVISOS:');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Corrija todos os erros críticos');
    console.log('2. Configure banco de dados de produção');
    console.log('3. Gere chaves seguras: node scripts/generate-production-secrets.js');
    console.log('4. Execute build de produção: npm run build');
    console.log('5. Configure monitoramento e logs');
  }

  async validate() {
    console.log('🔍 Iniciando validação de produção...\n');
    
    this.checkEnvironmentFiles();
    this.checkDependencies();
    this.checkTypeScript();
    this.checkSecurityHeaders();
    this.checkNotificationSystem();
    this.checkBuildConfiguration();
    
    this.generateReport();
    
    return {
      ready: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      passed: this.passed
    };
  }
}

if (require.main === module) {
  const validator = new ProductionValidator();
  validator.validate().then(result => {
    process.exit(result.ready ? 0 : 1);
  });
}

module.exports = ProductionValidator;