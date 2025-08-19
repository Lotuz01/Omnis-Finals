# Guia de Deploy do Sistema para Produção

## Passo 1: Preparação do Código (Já Concluído)
- Dependências verificadas no `package.json`.
- Arquivo `.env.production` criado com variáveis para produção.
- Build e testes executados com sucesso via `npm run build` e `npm run test`.

## Passo 2: Configurar Hospedagem para o App Next.js no Vercel
Siga esses passos para deploy no Vercel (recomendado por ser otimizado para Next.js):

1. **Crie uma conta no Vercel**: Acesse [vercel.com](https://vercel.com) e crie uma conta gratuita usando GitHub, GitLab ou email. <mcreference link="https://nextjs.org/learn/pages-router/deploying-nextjs-app-deploy" index="1">1</mcreference> <mcreference link="https://kladds.medium.com/next-js-vercel-for-rapid-and-free-application-deployment-7a45da08ff07" index="3">3</mcreference>

2. **Instale o Vercel CLI** (opcional, mas útil para deploys locais): Execute `npm i -g vercel` no terminal.

3. **Conecte seu repositório**: No dashboard do Vercel, clique em 'New Project' e importe seu repositório Git (do GitHub, por exemplo). O Vercel detectará automaticamente que é um app Next.js e configurará as settings otimizadas. <mcreference link="https://nextjs.org/learn/pages-router/deploying-nextjs-app-deploy" index="1">1</mcreference> <mcreference link="https://kladds.medium.com/next-js-vercel-for-rapid-and-free-application-deployment-7a45da08ff07" index="3">3</mcreference>

4. **Configure variáveis de ambiente**: No projeto no Vercel, vá para Settings > Environment Variables e adicione as do seu `.env.production` (ex: DB_HOST, NEXTAUTH_SECRET). Marque como Production. <mcreference link="https://nextjs.org/learn/pages-router/deploying-nextjs-app-deploy" index="1">1</mcreference>

5. **Deploy**: Clique em Deploy. O build será automático e em minutos seu app estará online. Acesse a URL fornecida (ex: seu-projeto.vercel.app). <mcreference link="https://nextjs.org/learn/pages-router/deploying-nextjs-app-deploy" index="1">1</mcreference> <mcreference link="https://kladds.medium.com/next-js-vercel-for-rapid-and-free-application-deployment-7a45da08ff07" index="3">3</mcreference> <mcreference link="https://www.youtube.com/watch?v=2HBIzEx6IZA&pp=0gcJCdgAo7VqN5tD" index="5">5</mcreference>

Nota: O Vercel oferece tier gratuito para apps pequenos, com performance otimizada para Next.js. <mcreference link="https://kladds.medium.com/next-js-vercel-for-rapid-and-free-application-deployment-7a45da08ff07" index="3">3</mcreference> <mcreference link="https://www.reddit.com/r/nextjs/comments/1fw2k2j/confused_about_deploying_nextjs_apps_why_vercel/" index="4">4</mcreference>

Após configurar, prossiga para o próximo passo.