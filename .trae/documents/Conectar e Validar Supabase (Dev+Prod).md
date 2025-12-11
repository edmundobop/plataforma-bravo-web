## Resumo

* Produção: Supabase PostgreSQL com `DB_SSL=true`

* Desenvolvimento: Postgres local (padrão), com opção de dev contra Supabase via `.env.supabase`

* Resolver erro do pgAdmin (DNS) e validar conexão via `test_connection.js` e/ou `psql`

## Correção do DNS/pgAdmin

1. Validar IPv4 do host

* `nslookup -type=A db.dulzsyozjglxuegnmmjx.supabase.co`

* Esperado: retorno com endereço IPv4 além de IPv6.

1. Se só retornar IPv6

* Configurar DNS do Windows para Cloudflare/Google:

  * Painel de Controle → Rede → Propriedades do adaptador → IPv4 → DNS: `1.1.1.1` e `8.8.8.8`

  * (Opcional IPv6) `2606:4700:4700::1111`, `2001:4860:4860::8888`

* `ipconfig /flushdns`

* `netsh winsock reset`

* Reiniciar o Windows

* Repetir `nslookup -type=A ...` e tentar conectar no pgAdmin

1. Configurar pgAdmin

* Host: `db.dulzsyozjglxuegnmmjx.supabase.co`

* Port: `5432`

* Maintenance DB: `postgres`

* Username: `postgres`

* Password: `6fcD2pDUnXxTDsJH`

* SSL: aba SSL → `SSL mode: require`

1. Testar com psql (se tiver cliente instalado)

* `psql "postgresql://postgres:6fcD2pDUnXxTDsJH@db.dulzsyozjglxuegnmmjx.supabase.co:5432/postgres?sslmode=require" -c "SELECT version();"`

* Observação: o comando anterior falhou porque faltou a ferramenta `psql`; a URL isolada não é um comando.

## Ajustes no Código (após sua confirmação)

* `backend/config/database.js`:

  * Ativar SSL via `DB_SSL`:

    * `const sslEnabled = String(process.env.DB_SSL).toLowerCase() === 'true' || process.env.NODE_ENV === 'production'`

    * `ssl: sslEnabled ? { rejectUnauthorized: false } : false`

* `backend/.env.example`:

  * Documentar `DB_SSL` e exemplos de Supabase/Local

## Configuração de Ambientes

* Dev (local):

  * `DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=cbmgo_db`, `DB_USER=postgres`, `DB_PASSWORD=<senha local>`, `DB_SSL=false`

* Prod (Render):

  * `DB_HOST=db.dulzsyozjglxuegnmmjx.supabase.co`, `DB_PORT=5432`, `DB_NAME=postgres`, `DB_USER=postgres`, `DB_PASSWORD=6fcD2pDUnXxTDsJH`, `DB_SSL=true`, `NODE_ENV=production`, `JWT_SECRET`, `FRONTEND_URL`, `ALLOWED_ORIGINS`

* Dev opcional com Supabase:

  * `.env.supabase` com as variáveis de Prod e `DB_SSL=true`

## Execução e Validação

1. Validar conexão com script existente

* Temporariamente exportar `DB_*` do Supabase e `DB_SSL=true`

* `node backend/database/test_connection.js` (deve reportar versão PostgreSQL e conectado com sucesso)

1. Aplicar migrações

* `npm run migrate` (idempotente; reflete o esquema alvo no Supabase)

* Opcional: `npm run db:migrate` para incrementais

1. Seed opcional

* `node backend/scripts/create_admin.js`

1. Subir backend e checar saúde

* `npm start` e `GET http://localhost:5000/api/health`

1. Validações funcionais

* Exercitar endpoints (usuários, frota, checklists) e verificar CRUD no Supabase

## Segurança

* Não commitar senhas/chaves; manter em variáveis de ambiente

* Chaves `publishable/secret` do Supabase não são usadas para conexão PostgreSQL

## Confirmação

* Posso seguir com os ajustes no `database.js` (suporte a `DB_SSL`) e preparar exemplos de `.env`?

* Depois, aplico as validações e migrações e retorno com evidências de funcionamento.

