## Causa provável
- Overflow horizontal gerado por containers com `Grid` (margens negativas), cabeçalhos em flex sem `minWidth: 0` e rótulos longos nas `Tabs`.

## O que vou alterar
1) Layout global
- Em `frontend/src/components/Layout.js`, no `main`:
  - Adicionar `overflowX: 'hidden'`, `px: { xs: 1.5, md: 3 }` e `maxWidth: '100%'` para bloquear overflow de `Grid`.
- Em `index.css`: garantir `html, body, #root { width: 100%; max-width: 100%; overflow-x: hidden; }`.

2) Página `Checklists.js`
- Tabs: manter `variant='scrollable'` e adicionar `wrapped` em cada `Tab` para quebrar rótulos.
- Header e seções em flex: aplicar `minWidth: 0`, `flexWrap: 'wrap'` e `wordBreak: 'break-word'` no título/legendas longas.
- Accordion de filtros: além do `flexWrap`, definir `minWidth: 0` na content.
- Cards mobile: já com `flexWrap`; garantir `maxWidth: '100%'` e `minWidth: 0` nos boxes de topo.

## Validação
- Testar com viewport 360–414 px e em aparelhos físicos.
- Confirmar ausência de scroll horizontal e nenhum elemento truncado.

## Observação
- Mudanças são locais e não afetam desktop; mantêm espaçamentos responsivos.
