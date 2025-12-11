## Dados do Pooler

* Connection string (Session Pooler):

  * `postgresql://postgres.dulzsyozjglxuegnmmjx:[YOUR-PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`

* Interpretação para variáveis:

  * `DB_HOST=aws-1-sa-east-1.pooler.supabase.com`

  * `DB_PORT=5432`

  * `DB_NAME=postgres`

  * `DB_USER=postgres.dulzsyozjglxuegnmmjx`

  * `DB_PASSWORD=[YOUR-PASSWORD]`

## Atualizar ambiente do backend (Render)

1. Abrir o serviço backend → Environment Variables → Add from .env ou editar manualmente.
2. Definir/atualizar:

   * `DB_HOST=aws-1-sa-east-1.pooler.supabase.com`

   * `DB_PORT=5432`

   * `DB_NAME=postgres`

   * `DB_USER=postgres.dulzsyozglxuegnmmjx` (substituir pelo seu, com o project ref correto)

   * `DB_PASSWORD=[YOUR-PASSWORD]`

   * `DB_SSL=true`

   * `NODE_OPTIONS=--dns-result-order=ipv4first`

   * `FRONTEND_URL=https://plataforma-bravo-web.vercel.app`

   * `ALLOWED_ORIGINS=https://plataforma-bravo-web.vercel.app,https://plataforma-bravo-web.onrender.com`
3. Redeploy do backend.

## Frontend (Vercel)

* Production env:

  * `REACT_APP_API_BASE_URL=https://plataforma-bravo-web.onrender.com/api`

  * `REACT_APP_API_ORIGIN=https://plataforma-bravo-web.onrender.com`

* Redeploy do frontend.

## Validação

* Health: `GET https://plataforma-bravo-web.onrender.com/api/health` (OK esperado).

* Login na Vercel e verificar no DevTools que as chamadas vão ao domínio do Render e retornam sem CORS.

* Logs do Render devem parar de mostrar ENETUNREACH (IPv6) e passar a logar consultas ao Postgres.

## Observações

* Não commit secrets. Use somente o painel do Render para setar `DB_PASSWORD`.

* Se algum erro persistir, enviaremos o bloco `.env` pronto para colar no Render com esses valores e revisaremos os logs imediatamente.

