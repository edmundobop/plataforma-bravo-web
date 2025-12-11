## Como identificar uso de PostgREST
- Procurar no código:
  - `@supabase/supabase-js` em `package.json`/imports; URLs `https://<proj>.supabase.co/rest/v1/<tabela>`; parâmetros `select=`, `eq(...)`, `order=...`; cabeçalhos `apikey`, `Authorization: Bearer`, `Prefer:`.
  - Variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Verificar frontend:
  - `frontend/src/services/api.js` aponta para `/api` (backend próprio), não para `*.supabase.co`.
- Verificar backend:
  - `backend/config/database.js` usa `pg` (`Pool`) para conectar direto ao Postgres, sem PostgREST.
- Verificar em runtime:
  - DevTools Network: chamadas vão para `/api` e não `*.supabase.co/rest/v1`; Storage pode aparecer como `*.supabase.co/storage/v1` (arquivos/imagens), mas isso não é PostgREST de dados.
- Resultado atual do repositório:
  - Não há `@supabase/supabase-js`, nem `rest/v1`, nem `SUPABASE_URL/ANON_KEY`; frontend usa `/api`. Indica que PostgREST não é usado para tabelas de negócio.

## Plano de ação
1) Endurecimento rápido (se não usa PostgREST):
- Remover `public` de “Exposed schemas” nas API settings do Supabase produção.
- Reexecutar o Security Advisor para confirmar que os erros de exposição desaparecem.

2) Endurecimento com RLS (se quiser manter PostgREST para alguns casos):
- Habilitar RLS nas tabelas listadas e aplicar políticas mínimas (lookup read-only autenticado; owner-based para WebAuthn).
- Em seguida, criar políticas multi-tenant para tabelas de negócio (leitura apenas da unidade do usuário; escrita via backend/admin).

## Validação
- Rodar o Security Advisor após alterações.
- Testar com usuário autenticado que lê apenas o que deve; bloquear escrita via PostgREST para clientes comuns.

## Próximo passo
- Posso executar a verificação no dashboard e, conforme confirmado que não usa PostgREST, remover `public` dos “Exposed schemas”. Caso prefira manter PostgREST, aplico o script de RLS e avanço nas políticas multi-tenant.