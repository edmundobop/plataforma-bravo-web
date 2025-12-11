## Situação atual
- Em API settings: `public` NÃO está exposto pelo PostgREST (correto para nossa primeira opção).
- Observação do painel: Tabelas no `public` ainda ficam acessíveis via GraphQL (`graphql_public`).

## Objetivo
- Remover toda superfície de acesso externo a dados de negócio (REST e GraphQL).

## Plano
1) Desativar GraphQL (pg_graphql):
- Dashboard → Database → Extensions → localizar `pg_graphql` → Disable.
- Alternativa via SQL: `drop extension if exists pg_graphql cascade;`
- Impacto: endpoints GraphQL passam a ficar indisponíveis.

2) Validar segurança:
- Reexecutar Security Advisor (Database → Security Advisor).
- Confirmar que os avisos de "RLS Disabled in Public" relacionados à exposição externa somem.

3) Endurecimento adicional (recomendado):
- Aplicar RLS mesmo com APIs externas desativadas (boas práticas de defesa em profundidade). Script já pronto em `backend/scripts/supabase_rls_enable.sql`.
- Executar no SQL Editor e revisar.

## Rollback
- Se precisar de GraphQL no futuro, reabilitar `pg_graphql` e, ANTES disso, garantir políticas RLS por tabela.

## Observações
- Supabase Storage permanece funcional (não depende de PostgREST/pg_graphql).
- Seu app usa backend próprio (`/api`), então a remoção de GraphQL não afeta funcionalidades atuais.