# Monitoramento da API

## Rotas Públicas de Monitoramento

Foram criadas rotas públicas para monitoramento e verificação do status da API:

### 🟢 `/api/health` - Health Check
- **Método**: GET
- **Descrição**: Verificação básica de saúde da API
- **Autenticação**: Não requerida
- **Resposta**: Status da API e conectividade com banco de dados

**Exemplo de uso**:
```bash
curl http://localhost:3000/api/health
```

**Resposta esperada**:
```json
{
  "status": "healthy",
  "message": "API está funcionando corretamente",
  "timestamp": "2025-08-12T03:52:14.048Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### 🟢 `/api/status` - Status Detalhado
- **Método**: GET
- **Descrição**: Status completo do sistema com informações sobre todas as rotas
- **Autenticação**: Não requerida
- **Resposta**: Status detalhado da API, banco de dados e rotas disponíveis

**Exemplo de uso**:
```bash
curl http://localhost:3000/api/status
```

**Resposta inclui**:
- Status do sistema
- Conectividade com banco de dados
- Lista de rotas públicas e protegidas
- Informações sobre autenticação

## Comportamento dos Erros HTTP 401

### ✅ Comportamento Esperado
Os erros **HTTP 401 (Não Autorizado)** nas rotas protegidas são **comportamento normal e esperado** quando:

1. **Requisições sem autenticação**: Tentativas de acesso a rotas protegidas sem cookie de autenticação
2. **Tokens inválidos**: Cookies de autenticação expirados ou corrompidos
3. **Credenciais incorretas**: Login com usuário/senha inválidos

### 🔒 Rotas Protegidas (Retornam 401 sem autenticação)
- `/api/users` - Gestão de usuários
- `/api/user` - Dados do usuário logado
- `/api/backup` - Backup do sistema
- `/api/certificado` - Gestão de certificados
- `/api/nfe` - Gestão de NFe
- `/api/printers` - Gestão de impressoras
- `/api/print` - Impressão de documentos

### 🌐 Rotas Públicas (Não retornam 401)
- `/login` - Página de login
- `/api/auth` - Autenticação
- `/api/health` - Health check
- `/api/status` - Status da API

## Como Testar a API

### 1. Verificar se a API está funcionando
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -UseBasicParsing

# curl
curl http://localhost:3000/api/health
```

### 2. Obter status detalhado
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/status" -Method GET -UseBasicParsing

# curl
curl http://localhost:3000/api/status
```

### 3. Testar autenticação
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/auth" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"username":"seu_usuario","password":"sua_senha"}' -UseBasicParsing
```

## Resolução dos Erros 401

### ✅ Situação Atual
- **Sistema funcionando corretamente**: ✅
- **Banco de dados conectado**: ✅
- **Rotas de monitoramento ativas**: ✅
- **Middleware de autenticação funcionando**: ✅

### 📝 Conclusão
Os erros HTTP 401 **NÃO são problemas** que precisam ser "resolvidos". Eles são:

1. **Comportamento de segurança correto**
2. **Proteção adequada das rotas sensíveis**
3. **Funcionamento normal do middleware de autenticação**

Para acessar rotas protegidas, é necessário:
1. Fazer login através de `/api/auth`
2. Usar o cookie de autenticação retornado
3. Incluir o cookie nas requisições subsequentes

## Monitoramento Contínuo

Use as rotas `/api/health` e `/api/status` para monitoramento contínuo do sistema sem necessidade de autenticação.