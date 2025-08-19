# Guia para Configurar Hospedagem de Banco de Dados MySQL com PlanetScale

## Por que PlanetScale?
PlanetScale é uma plataforma de banco de dados MySQL gerenciada, escalável e compatível com Next.js. Ela oferece branches para desenvolvimento, migrações seguras e integração fácil com Prisma (se usado no projeto).

## Passos para Configuração

1. **Criar uma Conta no PlanetScale:**
   - Acesse [planetscale.com](https://planetscale.com/) e crie uma conta gratuita ou paga.
   - Verifique sua conta via e-mail.

2. **Criar um Novo Banco de Dados:**
   - No dashboard, clique em "New Database".
   - Escolha um nome, região e plano (inicialmente, o gratuito é suficiente para testes).
   - O banco será criado com branches como 'main' para produção.

3. **Gerar String de Conexão:**
   - No dashboard do banco, vá para a aba "Connect".
   - Selecione o branch 'main' e gere credenciais (usuário, senha, host).
   - A string de conexão será algo como: `mysql://user:password@host/dbname`.
   - Adicione isso à variável de ambiente `DATABASE_URL` no seu arquivo `.env.production`.

4. **Configurar no Projeto Next.js:**
   - Atualize o arquivo de configuração do banco (ex: `database.js` ou Prisma schema) para usar a nova URL.
   - Se usando Prisma, execute `npx prisma db push` para sincronizar o schema.

5. **Migração de Dados:**
   - Exporte dados do banco local usando `mysqldump` (ex: `mysqldump -u user -p dbname > dump.sql`).
   - Importe para PlanetScale via dashboard ou CLI: `pscale db dump import dbname branch dump.sql`.
   - Ative 'safe migrations' para branches de produção para evitar alterações destrutivas.

6. **Integração com Vercel:**
   - No deploy do Vercel, adicione a `DATABASE_URL` como variável de ambiente segura.
   - Teste a conexão na aplicação deployada.

## Dicas de Segurança
- Use branches separados para dev e prod.
- Monitore custos e escalabilidade.

Após configurar, teste queries e conexões para garantir tudo funcione em produção.