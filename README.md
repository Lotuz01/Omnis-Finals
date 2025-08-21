# Omnis Finals

## 📋 Sistema Completo de Gestão Empresarial

Sistema web moderno e completo para gestão empresarial, desenvolvido com Next.js 15, TypeScript, MySQL e Tailwind CSS, com autenticação server-side, dashboard interativo e funcionalidades avançadas.

## 🚀 Funcionalidades Principais

### Core Business
- **Gestão de Clientes**: CRUD completo com validações avançadas
- **Gestão de Produtos**: Controle de estoque e categorização
- **Dashboard Analytics**: Métricas em tempo real e relatórios
- **Sistema de Autenticação**: JWT com refresh tokens
- **Upload de Arquivos**: Suporte a múltiplos formatos com validação

### Segurança
- **Rate Limiting**: Proteção contra ataques de força bruta
- **Headers de Segurança**: CSP, HSTS, X-Frame-Options, etc.
- **Detecção de Ataques**: SQL Injection, XSS, Path Traversal
- **Bloqueio de IPs**: Sistema automático de bloqueio
- **Auditoria**: Log completo de ações de segurança

## 🛠️ Tecnologias

### Frontend
- **Next.js 14**: Framework React com App Router
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Framework CSS utilitário
- **React Hook Form**: Gerenciamento de formulários
- **Zod**: Validação de schemas

### Backend
- **Next.js API Routes**: Endpoints RESTful
- **Prisma**: ORM para MySQL
- **JWT**: Autenticação stateless
- **Bcrypt**: Hash de senhas
- **Multer**: Upload de arquivos

### Banco de Dados
- **MySQL 8**: Banco principal
- **Prisma Migrations**: Controle de versão do schema

## 📦 Instalação Local

### Pré-requisitos
- Node.js 18+
- Git
- MySQL instalado localmente

### Passos para Rodar Localmente
```bash
# 1. Clone o repositório
git clone <repository-url>
cd sistema-gestao

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com configurações locais (ex: DATABASE_URL)

# 4. Rode migrações do banco
npx prisma migrate dev

# 5. Inicie o servidor de desenvolvimento
npm run dev

# 6. Acesse a aplicação
http://localhost:3000
```

## 🔧 Configuração Local

### Variáveis de Ambiente Principais
```env
# Aplicação
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# Banco de Dados
DATABASE_URL=mysql://user:password@localhost:3306/sistema_gestao



# JWT
JWT_SECRET=seu_jwt_secret_muito_seguro
JWT_REFRESH_SECRET=seu_refresh_secret_muito_seguro
```

## 🔒 Segurança

### Medidas Implementadas

1. **Rate Limiting**
   - 100 req/min geral
   - 5 tentativas de login/min
   - Bloqueio automático de IPs

2. **Headers de Segurança**
   - Content Security Policy (CSP)
   - HTTP Strict Transport Security (HSTS)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin

3. **Detecção de Ataques**
   - SQL Injection
   - Cross-Site Scripting (XSS)
   - Path Traversal
   - Command Injection

4. **Autenticação**
   - JWT com refresh tokens
   - Hash bcrypt para senhas
   - Expiração automática de sessões

### Testes de Segurança
```bash
# Executar testes de segurança
npm run test:security

# Executar testes de carga
npm run test:load
```

## 🧪 Testes

### Tipos de Teste

1. **Testes Unitários**: Componentes e funções
2. **Testes de Integração**: APIs e banco de dados
3. **Testes de Segurança**: Vulnerabilidades e ataques
4. **Testes de Carga**: Performance sob stress
5. **Testes E2E**: Fluxos completos de usuário

### Executar Testes
```bash
# Todos os testes
npm test

# Testes específicos
npm run test:unit
npm run test:integration
npm run test:security
npm run test:load
npm run test:e2e

# Com coverage
npm run test:coverage
```

## 🔄 Backup e Recuperação

### Backup Automático

- **Frequência**: Diário às 2:00 AM
- **Retenção**: 30 dias
- **Conteúdo**: Banco de dados + uploads
- **Verificação**: Integridade automática
- **Notificação**: Alertas em caso de falha

### Backup Manual

```bash
# Criar backup
./scripts/backup.sh

# Restaurar backup
./scripts/restore.sh backup_20231201_020000.tar.gz
```

## 📈 Performance

### Otimizações Implementadas

1. **Cache em Memória**: Sessões e dados frequentes
2. **Compressão Gzip**: Nginx com compressão
3. **Otimização de Imagens**: Next.js Image Optimization
4. **Bundle Splitting**: Carregamento otimizado
5. **Database Indexing**: Índices otimizados
6. **Connection Pooling**: Pool de conexões do banco

### Métricas de Performance

- **Tempo de Resposta**: <500ms (P95)
- **Throughput**: >1000 req/min
- **Disponibilidade**: >99.9%
- **TTFB**: <200ms
- **Core Web Vitals**: Todos verdes

## 🚨 Troubleshooting

### Problemas Comuns

#### Aplicação não inicia
```bash
# Verificar logs


# Verificar saúde dos serviços
./scripts/health-monitor.sh check

# Reiniciar serviços

```

#### Banco de dados não conecta
```bash
# Verificar status do MySQL


# Verificar logs do banco
- **MySQL**: `/var/log/mysql/mysql.log`

# Resetar banco (CUIDADO!)


```

#### Performance degradada
```bash
# Verificar métricas
curl http://localhost:3000/api/metrics

# Verificar recursos


# Limpar cache

```

### Logs Importantes

- **Aplicação**: `/var/log/sistema-gestao/app.log`
- **Nginx**: `/var/log/nginx/access.log`
- **MySQL**: `/var/log/mysql/mysql.log`
- **Sistema**: `/var/log/sistema-gestao/system.log`

## 🔄 Atualizações

### Deploy de Nova Versão

```bash
# 1. Backup automático
./scripts/deploy.sh backup

# 2. Deploy com rollback automático
./scripts/deploy.sh deploy

# 3. Verificar saúde
./scripts/health-monitor.sh check
```

### Rollback

```bash
# Rollback para versão anterior
./scripts/deploy.sh rollback
```

## 📞 Suporte

### Contatos
- **Desenvolvimento**: dev@empresa.com
- **Infraestrutura**: infra@empresa.com
- **Segurança**: security@empresa.com

### Documentação Adicional
- [API Documentation](./docs/api.md)
- [Security Guidelines](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)
- [Monitoring Setup](./docs/monitoring.md)

## 📄 Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Sistema de Gestão v1.0.0** - Pronto para Produção 🚀