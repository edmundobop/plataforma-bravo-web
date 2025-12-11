## Estratégia
- Camada dupla: prevenir no frontend e garantir idempotência no backend.

## Frontend (React/MUI)
1) Hook genérico de pending/lock
- Criar `frontend/src/hooks/usePendingAction.js` com API:
  - `const { pending, run } = usePendingAction();`
  - `await run(async () => { /* ação de salvar/enviar */ })`
  - Bloqueia reentradas enquanto `pending` for true.
- Usar em botões críticos (Finalizar checklist, Criar solicitação, Salvar automação).
- Ajustar botões para `disabled={pending}` e exibir spinner (`CircularProgress size={20}`) no lugar do ícone.

2) Throttle opcional
- Criar `useClickThrottle(ms=1200)` para ignorar cliques repetidos em curto intervalo.
- Aplicar onde há handlers síncronos rápidos (ex.: abrir diálogos).

3) Idempotency-Key no cliente
- Em `frontend/src/services/api.js`, anexar cabeçalho `X-Idempotency-Key` em requisições **POST/PUT/DELETE** (ex.: `crypto.randomUUID()` + timestamp).
- Permite o backend deduplicar.

## Backend (Express/Postgres)
1) Middleware de idempotência
- Criar `backend/middleware/idempotency.js` (Map in-memory com TTL ~60s).
- Verifica `X-Idempotency-Key`:
  - Se já visto para a mesma rota/método, retorna 409 ou 200 com corpo vazio.
  - Caso novo, passa adiante e marca como usado.
- Aplicar em rotas de criação/ação:
  - `POST /api/checklist/solicitacoes`
  - `POST /api/checklist/solicitacoes/:id/iniciar`
  - `POST /api/checklist/solicitacoes/:id/finalizar` (se criar registro ao finalizar)
  - Outras ações “salvar/enviar” sensíveis.

2) (Opcional) Hardening no banco
- Adicionar coluna `client_token` em entidades criadas via POST e índice único.
- Usar `ON CONFLICT DO NOTHING` nas inserções -> evita duplicatas mesmo sem middleware.

## Validação
- Teste e2e: disparar dois cliques simultâneos (ou duas requisições) e confirmar que apenas um checklist/solicitação é criado.
- Verificar UX: botão desabilita com loading e reabilita ao término/erro.

## Observações
- O middleware em memória cobre bursts; para tolerância a processos/restarts, evoluímos para tabela `idempotency_keys` com TTL.
- Começamos pelos pontos de checklist (seções mais críticas) e depois expandimos para demais páginas conforme necessário.