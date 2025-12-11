## Objetivo
- Usar Supabase como banco de produção e habilitar testes locais contra Supabase quando necessário.
- Implementar suporte a `DB_SSL` no backend, validar conexão, aplicar migrações e comprovar funcionamento da API.

## Alterações de Código
- `backend/config/database.js`: habilitar SSL por variável de ambiente (`DB_SSL=true` → `ssl: { rejectUnauthorized: false }`).
- `backend/database/test_connection.js`: adicionar suporte a SSL (`DB_SSL`) para testar conexão ao Supabase diretamente.

## Ambiente
- Manter seu `backend/.env` atual (Postgres local) intacto.
- Para conectar ao Supabase, usar variáveis de ambiente no terminal (sem editar `.env`), definindo `DB_HOST`, `DB_PORT=5432`, `DB_NAME=postgres`, `DB_USER=postgres`, `DB_PASSWORD`, `DB_SSL=true`.

## Execução
1) Editar os dois arquivos acima para suportar `DB_SSL`.
2) Validar conexão ao Supabase:
   - Exportar `DB_*` e `DB_SSL=true` no terminal.
   - Rodar `node backend/database/test_connection.js` e verificar versão do PostgreSQL e sucesso de conexão.
3) Aplicar migrações idempotentes:
   - Com as mesmas variáveis exportadas, executar `npm run migrate` na pasta `backend`.
4) Seed opcional:
   - Executar `node backend/scripts/create_admin.js` para garantir um usuário Administrador.
5) Subir backend e validar saúde:
   - `npm start` na pasta `backend`.
   - Checar `GET http://localhost:5000/api/health`.
6) Verificar endpoints principais:
   - Consultas de usuários, frota e checklists para confirmar CRUD funcionando contra o Supabase.

## Entregáveis
- Logs da conexão (test_connection) e versão do PostgreSQL.
- Resultado das migrações sem erros.
- Saúde da API OK.
- Endpoints testados com respostas.

## Produção (Render)
- Configurar `DB_*` do Supabase, `DB_SSL=true`, `NODE_ENV=production`, `JWT_SECRET`, `FRONTEND_URL`, `ALLOWED_ORIGINS`.
- Executar `npm run migrate` pós-deploy.

## Segurança
- Não commitar senhas/chaves; usar apenas variáveis de ambiente.

Se aprovar, executo os passos, aplico as mudanças de código, valido a conexão, rodo as migrações e te retorno com evidências.