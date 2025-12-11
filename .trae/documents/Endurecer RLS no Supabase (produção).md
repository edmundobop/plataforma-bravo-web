## Contexto
- O Security Advisor do Supabase sinalizou ERRO crítico: tabelas no esquema `public` expostas via PostgREST sem Row Level Security (RLS).
- Isso permite CRUD por qualquer cliente com URL do projeto nas tabelas listadas, o que é inseguro.

## Objetivo
- Habilitar RLS nas tabelas indicadas e criar políticas mínimas seguras para leitura/escrita conforme uso da aplicação.
- Alternativa: remover `public` de “Exposed schemas” nas APIs do Supabase se você NÃO usa PostgREST/Supabase JS para essas tabelas (usa apenas seu backend Node). 

## Decisão de Arquitetura
- Escolher uma destas abordagens:
1) Não usar PostgREST para dados de negócio: remover `public` de Exposed Schemas (bloqueia acesso via APIs Supabase); continuar acessando via backend (service role/credenciais privadas). 
2) Usar PostgREST de forma controlada: habilitar RLS e definir políticas por tabela/tenant/perfil.

## Estratégia Recomendada
- Curto prazo (rápido e seguro):
  - Se não dependemos do PostgREST nessas tabelas, remover `public` de Exposed Schemas na API do Supabase.
- Médio prazo (caso PostgREST seja necessário):
  - Habilitar RLS em todas as tabelas sinalizadas.
  - Conceder apenas `SELECT` a `authenticated` quando for tabela de catálogo/lookup.
  - Restringir `INSERT/UPDATE/DELETE` ao `service_role` ou perfis administrativos via políticas.
  - Em tabelas multi-tenant, usar políticas baseadas em unidade (`membros_unidade`) e usuário autenticado (`auth.uid()`).

## Tabelas e Política Base
- Lookup (leitura pública autenticada): `funcoes`, `setores`, `perfis`, `categorias_produto`, `template_categorias`, `template_itens`, `checklist_itens`.
  - Habilitar RLS
  - Política: `SELECT` para `authenticated` com `USING (true)`; sem `INSERT/UPDATE/DELETE` para clientes.
- Catálogo organizacional: `unidades`.
  - Habilitar RLS
  - Política: `SELECT` para `authenticated` com `USING (ativa = true)`; escrita apenas via backend (service role).
- Usuários e acesso: `usuarios`, `membros_unidade`, `notificacoes`.
  - Habilitar RLS
  - Políticas:
    - `usuarios`: `SELECT` permitido se o solicitante pertence à mesma unidade (`EXISTS` em `membros_unidade`). Escrita apenas via backend/admin.
    - `membros_unidade`: leitura restrita ao próprio usuário ou administradores; escrita só backend/admin.
    - `notificacoes`: leitura por destinatário (`destinatario_id = auth.uid()` ou mapeamento) e escrita via backend.
- Operacional (multi-tenant): `viaturas`, `viaturas_exclusoes`, `equipamentos`, `emprestimos`, `movimentacoes_estoque`, `escalas`, `escala_usuarios`, `trocas_servico`, `trocas_historico`, `ac4_registros`, `checklist_automacoes`, `checklist_templates`, `checklist_viaturas`, `checklist_solicitacoes`.
  - Habilitar RLS
  - Políticas: `SELECT` apenas se o registro pertence à unidade do usuário (`EXISTS` em `membros_unidade` com `unidade_id` correspondente). Escrita somente por backend/admin.
- WebAuthn: `webauthn_challenges`, `webauthn_credentials`.
  - Habilitar RLS
  - Políticas de proprietário: `SELECT/INSERT/UPDATE/DELETE` somente quando `user_id = auth.uid()`; operações de challenge podem ser mediadas pelo backend.

## Blocos SQL de Referência
- Habilitar RLS (exemplo):
```
alter table public.funcoes enable row level security;
create policy funcoes_read on public.funcoes for select to authenticated using (true);
```
- Restringir escrita a service role (não criar políticas de write para `authenticated`).
- Multi-tenant (exemplo para `usuarios`):
```
alter table public.usuarios enable row level security;
create policy usuarios_read_same_unit on public.usuarios
  for select to authenticated
  using (
    exists (
      select 1 from public.membros_unidade mu
      where mu.usuario_id = auth.uid()
        and mu.unidade_id = usuarios.unidade_id
    )
  );
```
- WebAuthn (exemplo):
```
alter table public.webauthn_credentials enable row level security;
create policy webauthn_own_read on public.webauthn_credentials for select to authenticated using (user_id = auth.uid());
create policy webauthn_own_write on public.webauthn_credentials for insert to authenticated with check (user_id = auth.uid());
create policy webauthn_own_update on public.webauthn_credentials for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy webauthn_own_delete on public.webauthn_credentials for delete to authenticated using (user_id = auth.uid());
```

## Considerações Técnicas
- Com RLS ativo, privilégios GRANT continuam válidos; preferir controlar acesso via políticas e evitar GRANT amplo a `anon`.
- Políticas baseadas em `auth.uid()` exigem mapeamento consistente entre usuários da tabela de negócio e `auth.users` (UUID). Se hoje usamos IDs numéricos, considerar coluna `auth_user_id uuid` ou tabela de mapeamento.
- Se qualquer cliente usa o Supabase JS/REST nos dados de negócio, garantir que use sessão autenticada (não `anon`).

## Validação
- Rodar Security Advisor após mudanças.
- Testar leitura autenticada nas tabelas de lookup.
- Verificar bloqueio de escrita via PostgREST para usuários comuns.
- Testar consulta multi-tenant comprovando que usuários só veem dados da sua unidade.

## Riscos e Rollback
- Habilitar RLS sem políticas pode bloquear o app; por isso aplicar políticas de leitura antes de ativar em tabelas críticas.
- Rollback: `alter table <schema>.<table> disable row level security;` (apenas para emergências).

## Próximo Passo
- Confirme se usa PostgREST/Supabase JS nessas tabelas. Se não, seguiremos com remoção de `public` dos Exposed Schemas. Caso sim, aplicamos os blocos SQL por grupos acima e ajustamos políticas multi-tenant com base em `membros_unidade` e perfis.
