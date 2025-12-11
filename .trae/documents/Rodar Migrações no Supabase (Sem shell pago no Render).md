## Contexto
- O projeto usa migrações customizadas via Node: `backend/database/migrate.js` e `npm run migrate` (backend/package.json).
- Não há botão “migrate” na UI do Supabase; você precisa executar o script apontando para o Postgres do Supabase.

## Opção A — Shell do Render
- Se o serviço backend no Render está com as variáveis `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (Pooler IPv4) e `DB_SSL=true`:
  - Abra Shell no serviço backend
  - Rode: `npm run migrate`
  - Opcional: `node backend/database/run_militares_migration.js` para a migração específica de militares

## Opção B — Local apontando ao Supabase (recomendada)
- No seu PC (Windows):
  1) No diretório `backend`, crie um `.env.local` com as credenciais do Session Pooler:
     - `DB_HOST=aws-1-sa-east-1.pooler.supabase.com`
     - `DB_PORT=5432`
     - `DB_NAME=postgres`
     - `DB_USER=postgres.<seu-project-ref>`
     - `DB_PASSWORD=<sua-senha>`
     - `DB_SSL=true`
  2) Rode:
     - `npm install` (se necessário)
     - `npm run migrate`
     - (se precisar) `node database/run_militares_migration.js`
  3) Verifique saídas: deve logar criação/alterações de tabelas e concluir sem erros.

## Opção C — SQL Editor do Supabase
- Abra o `backend/database/create_militares_table.sql` (se aplicável) e cole no SQL Editor do Supabase; execute. Para o `migrate.js` (que tem vários blocos), prefira executar via Node.

## Pós-migração
- Testar no backend: `GET /api/health` deve estar OK.
- Verificar uma tabela criada (ex.: `usuarios`, `checklist_viaturas`) pelo Supabase Table Editor.

## Observações
- Use sempre o host/usuário do Session Pooler (IPv4) e mantenha `DB_SSL=true`.
- Não exponha segredos no repositório; rode scripts via ambiente.
- Se migração falhar por duplicatas, o `migrate.js` já possui blocos defensivos (CREATE IF NOT EXISTS, ALTER IF NOT EXISTS).