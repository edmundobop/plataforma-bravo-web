# Plano de Deploy: Vercel + Render + Supabase

## Visão Geral
- Frontend em Vercel (`app.plataformabravo.com`)
- Backend em Render (`api.plataformabravo.com`)
- Banco de dados PostgreSQL em Supabase
- Armazenamento de fotos opcional no Supabase Storage

## Pré-requisitos
- Domínio configurado no provedor DNS
- Conta na Vercel, Render e Supabase
- Variáveis de ambiente definidas (ver seção Ambiente)

## DNS e SSL
- `app.plataformabravo.com` → Vercel (CNAME, SSL automático)                
- `api.plataformabravo.com` → Render (CNAME/records conforme Render, SSL automático)

## Supabase
- Criar Projeto e obter credenciais do PostgreSQL:
  - `DB_HOST`, `DB_PORT` (padrão 5432), `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Backups automáticos e logs (recomendado)
- Opcional: criar bucket `fotos` no Storage (público ou com regras de acesso)

## Render (Backend)
- Serviço Web Node.js apontando para `backend/server.js`, porta `PORT` (definida pelo Render)
- Variáveis de ambiente:
  - `NODE_ENV=production`
  - `FRONTEND_URL=https://app.plataformabravo.com`
  - `ALLOWED_ORIGINS=https://app.plataformabravo.com,https://api.plataformabravo.com`
  - `DB_HOST=...`
  - `DB_PORT=5432`
  - `DB_NAME=...`
  - `DB_USER=...`
  - `DB_PASSWORD=...`
  - `JWT_SECRET=<segredo forte>`
- Health check: `GET /api/health`
- Pós-deploy: executar migrações do banco
  - `npm run migrate` (na pasta `backend`)

### Checklist Render (copiar/colar)
- Tipo: `Web Service`
- Diretório raiz: `backend`
- Start command: `npm start`
- Porta: automática via `PORT` (Render)
- Health check path: `/api/health`
- Variáveis de ambiente:
  - `NODE_ENV=production`
  - `FRONTEND_URL=https://app.plataformabravo.com`
  - `ALLOWED_ORIGINS=https://app.plataformabravo.com,https://api.plataformabravo.com`
  - `DB_HOST`, `DB_PORT=5432`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - `JWT_SECRET` e (opcional) `JWT_EXPIRES_IN=12h`
- Pós-deploy: abrir shell e rodar `npm run migrate`

## Vercel (Frontend)
- Build do `frontend` (Create React App)
- Variáveis de ambiente (Production):
  - `REACT_APP_API_BASE_URL=https://api.plataformabravo.com/api`
- Apontar domínio: `app.plataformabravo.com`

### Checklist Vercel (copiar/colar)
- Projeto: diretório `frontend`
- Build command: `npm run build`
- Install command: `npm install`
- Output dir: `build`
- Variáveis de ambiente:
  - `REACT_APP_API_BASE_URL=https://api.plataformabravo.com/api`
  - (opcional) `REACT_APP_API_ORIGIN=https://api.plataformabravo.com`

## Ambiente (Resumo de Variáveis)
- Frontend:
  - `REACT_APP_API_BASE_URL`
- Backend:
  - `NODE_ENV`, `FRONTEND_URL`, `ALLOWED_ORIGINS`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - `JWT_SECRET`

## Migrações de Banco
- Rodar migrações após configurar o serviço backend:
  - Na Render, abrir shell e executar `npm run migrate`
- Garantir que o banco esteja acessível e com permissões corretas

## Segurança (CORS/CSP)
- CORS e CSP parametrizados por ambiente no backend
- `ALLOWED_ORIGINS` aceita lista CSV de origens confiáveis
- CSP libera `imgSrc` para `data:` e `https://*.supabase.co` (Storage)

## Armazenamento de Fotos (Opcional)
- Recomenda-se utilizar Supabase Storage ou S3/R2
- Salvar apenas URLs no banco
- Benefícios: persistência estável, CDN e escalabilidade

## Testes Pós-Deploy
- Backend: `GET https://api.plataformabravo.com/api/health` deve retornar `status: OK`
- Frontend: acessar `https://app.plataformabravo.com`, realizar login e navegar em módulos

## Troubleshooting
- CORS bloqueado: confirmar `FRONTEND_URL` e `ALLOWED_ORIGINS` no backend
- API base no frontend: confirmar `REACT_APP_API_BASE_URL`
- Migrações falhando: validar credenciais e privilégios no Supabase

## Observações
- Manter tokens JWT seguros e não logar segredos
- Habilitar backups e monitoramento do banco
- Centralizar logs e alertas (Render/Vercel/Supabase)
