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

### Monitoramento
- **Métricas Prometheus**: Coleta automática de métricas
- **Dashboards Grafana**: Visualização em tempo real
- **Health Checks**: Monitoramento contínuo de saúde
- **Alertas**: Notificações automáticas de problemas
- **Logging Estruturado**: Sistema avançado de logs

### Infraestrutura
- **Docker**: Containerização completa
- **Nginx**: Proxy reverso com SSL
- **Backup Automático**: Rotinas de backup do banco
- **CI/CD Ready**: Scripts de deploy automatizado

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │────│   Next.js App   │────│   PostgreSQL    │
│  (Proxy/SSL)    │    │   (Frontend +    │    │   (Database)    │
│                 │    │    Backend)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         │              │    (Cache)      │              │
         │              └─────────────────┘              │
         │                                                │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prometheus    │    │     Grafana     │    │   Backup Job    │
│ (Monitoring)    │    │ (Visualization) │    │   (Automated)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tecnologias

### Frontend
- **Next.js 14**: Framework React com App Router
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Framework CSS utilitário
- **React Hook Form**: Gerenciamento de formulários
- **Zod**: Validação de schemas

### Backend
- **Next.js API Routes**: Endpoints RESTful
- **Prisma**: ORM para PostgreSQL
- **JWT**: Autenticação stateless
- **Bcrypt**: Hash de senhas
- **Multer**: Upload de arquivos

### Banco de Dados
- **PostgreSQL 15**: Banco principal
- **Redis 7**: Cache e sessões
- **Prisma Migrations**: Controle de versão do schema

### DevOps & Monitoramento
- **Docker & Docker Compose**: Containerização
- **Nginx**: Proxy reverso e balanceamento
- **Prometheus**: Coleta de métricas
- **Grafana**: Dashboards e visualização
- **Node Exporter**: Métricas do sistema
- **cAdvisor**: Métricas de containers

## 📦 Instalação e Deploy

### Pré-requisitos
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (para desenvolvimento)
- Git

### Deploy Rápido

```bash
# 1. Clone o repositório
git clone <repository-url>
cd sistema-gestao

# 2. Configure as variáveis de ambiente
cp .env.example .env.production
# Edite .env.production com suas configurações

# 3. Execute o deploy
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Deploy Manual

```bash
# 1. Build e start dos serviços
docker-compose up -d --build

# 2. Aguarde todos os serviços ficarem saudáveis
docker-compose ps

# 3. Acesse a aplicação
# http://localhost:3000
```

## 🔧 Configuração

### Variáveis de Ambiente Principais

```env
# Aplicação
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
PORT=3000

# Banco de Dados
DATABASE_URL=postgresql://user:password@postgres:5432/sistema_gestao
POSTGRES_USER=sistema_gestao_user
POSTGRES_PASSWORD=senha_super_segura
POSTGRES_DB=sistema_gestao

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=senha_redis_segura

# JWT
JWT_SECRET=seu_jwt_secret_muito_seguro
JWT_REFRESH_SECRET=seu_refresh_secret_muito_seguro

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem

# Monitoramento
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=admin_password_seguro

# Alertas
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
SMTP_HOST=smtp.gmail.com
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
```

## 📊 Monitoramento

### Dashboards Disponíveis

1. **Dashboard Principal** (`http://localhost:3001`)
   - Status geral da aplicação
   - Métricas de performance
   - Uso de recursos
   - Requisições HTTP

2. **Dashboard de Segurança**
   - Tentativas de login
   - IPs bloqueados
   - Ataques detectados
   - Certificados SSL

### Métricas Coletadas

- **Aplicação**: Requisições, tempo de resposta, erros
- **Sistema**: CPU, memória, disco, rede
- **Banco de Dados**: Conexões, cache hit ratio, queries
- **Redis**: Memória, comandos, conexões
- **Nginx**: Requisições, status codes, tempo de resposta

### Alertas Configurados

- Aplicação indisponível
- Alto tempo de resposta (>3s)
- Taxa de erro elevada (>5%)
- Uso de recursos crítico (>85%)
- Falhas de backup
- Tentativas de ataque
- Certificado SSL próximo ao vencimento

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

1. **Cache Redis**: Sessões e dados frequentes
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
docker-compose logs app

# Verificar saúde dos serviços
./scripts/health-monitor.sh check

# Reiniciar serviços
docker-compose restart
```

#### Banco de dados não conecta
```bash
# Verificar status do PostgreSQL
docker-compose exec postgres pg_isready

# Verificar logs do banco
docker-compose logs postgres

# Resetar banco (CUIDADO!)
docker-compose down -v
docker-compose up -d
```

#### Performance degradada
```bash
# Verificar métricas
curl http://localhost:3000/api/metrics

# Verificar recursos
docker stats

# Limpar cache Redis
docker-compose exec redis redis-cli FLUSHALL
```

### Logs Importantes

- **Aplicação**: `/var/log/sistema-gestao/app.log`
- **Nginx**: `/var/log/nginx/access.log`
- **PostgreSQL**: `/var/log/postgresql/postgresql.log`
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