# Guia Final para Deploy e Testes em Produção

## Passos para Executar o Deploy

1. **Instalar Vercel CLI:**
   - Execute `npm i -g vercel` no terminal.

2. **Login no Vercel:**
   - Execute `vercel login` e siga as instruções.

3. **Deploy do Projeto:**
   - No diretório do projeto, execute `vercel` para deploy de desenvolvimento ou `vercel --prod` para produção.
   - Configure as variáveis de ambiente do `.env.production` durante o deploy.

4. **Conectar ao Banco de Dados:**
   - Use a `DATABASE_URL` do PlanetScale nas variáveis de ambiente do Vercel.

## Testes em Produção

1. **Verificar Funcionalidades Chave:**
   - Acesse a URL de produção e teste login, criação de usuários, movimentos, NFe, etc.
   - Verifique conexões com o banco, autenticação e segurança.

2. **Monitoramento:**
   - Use o dashboard do Vercel para logs e métricas.
   - Teste carga com ferramentas como autocannon.

3. **Rollback se Necessário:**
   - Se houver problemas, reverta para versão anterior no Vercel.

Após esses passos, o sistema estará pronto para o público.