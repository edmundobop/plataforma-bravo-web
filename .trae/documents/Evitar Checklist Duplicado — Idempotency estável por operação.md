## Problema
- O cabeçalho `X-Idempotency-Key` é diferente em cada clique (gerado no interceptor), então o backend não suprime duplicatas.

## Solução
1) API cliente
- Alterar `checklistService.createChecklist` e `finalizarChecklist` para aceitar `opts` (config axios) e enviar cabeçalhos customizados.

2) Componente
- Em `ChecklistViatura`, criar uma chave única por operação (`operationKeyRef` via `crypto.randomUUID()`), gerada no primeiro clique e reutilizada em todas as tentativas.
- Passar `{ headers: { 'X-Idempotency-Key': operationKeyRef.current } }` para `createChecklist` e `finalizarChecklist`.
- Manter o lock `usePendingAction` para desabilitar o botão durante processamento.

## Backend (já ok)
- Middleware de idempotência já aplicado nas rotas POST relevantes.

## Validação
- Disparar dois cliques rápidos: primeira requisição cria, a segunda retorna 202 “Duplicate suppressed” e não cria novo checklist.

## Entrega
- Implementar alteração no serviço e integração no componente; nada muda em UX além do botão desabilitado durante envio.