## Visão Geral
O módulo de Almoxarifado e Cautelas gerencia produtos, materiais de consumo e equipamentos em unidades do CBMGO, com controle de estoque, movimentações (entrada/saída), empréstimos (cautelas), assinaturas e geração de termos em PDF. O acesso respeita perfis de usuário e o contexto da unidade (tenant).

## Estado Atual
- Backend (Almoxarifado):
  - Listar/criar categorias: backend/routes/almoxarifado.js:18, :36
  - Listar produtos e buscar por ID: backend/routes/almoxarifado.js:68, :162
  - Criar produto: backend/routes/almoxarifado.js:201
  - Listar/criar movimentações: backend/routes/almoxarifado.js:241, :295
  - Relatório de estoque: backend/routes/almoxarifado.js:392
- Backend (Empréstimos/Cautelas):
  - Listar/criar equipamentos: backend/routes/emprestimos.js:14, :149
  - Equipamento por ID: backend/routes/emprestimos.js:111
  - Listar/criar/devolver empréstimos: backend/routes/emprestimos.js:190, :276, :365
  - Relatório geral: backend/routes/emprestimos.js:434
- Frontend:
  - Páginas de Almoxarifado e Empréstimos com filtros, tabelas e ações básicas.
  - Serviços em frontend/src/services/api.js para consumir as rotas acima.

## Lacunas
- Persistência de `unidade_id` ausente na criação de produtos/equipamentos, mas relatórios/filtros usam unidade.
- Rotas de relatório divergentes entre frontend e backend (almoxarifado: `/relatorio` vs `/relatorio/estoque`; empréstimos: `/relatorio` vs `/relatorio/geral`).
- Serviço de devolução envia `{ observacoes }`, backend espera `{ condicao_devolucao, observacoes_devolucao }`.
- Falta `PUT/DELETE` para categorias, produtos e equipamentos.
- Campo e fluxo de código de barras inexistentes.

## Objetivos
- Fase 1: Gestão de produtos e materiais de consumo com cadastro, edição, exclusão (perfis >1), movimentações (entrada/saída), alertas de estoque baixo e leitura por código de barras.
- Fase 2: Cautelas (empréstimos) com carrinho, assinatura e termo em PDF, controle individual e coletivo, alertas de vencimento.

## Modelo de Dados (Proposto)
- produtos: id, codigo, barcode (unique), nome, descricao, categoria_id, unidade_medida, estoque_minimo, valor_unitario, estoque_atual, unidade_id, ativo, created_at, updated_at
- movimentacoes_estoque: id, produto_id, tipo (entrada|saida), quantidade, valor_unitario, valor_total, motivo, documento, fornecedor, usuario_id, data_movimentacao
- equipamentos: id, codigo, barcode (unique), nome, descricao, marca, modelo, numero_serie, setor_responsavel, condicao, status (disponivel|emprestado|manutencao), unidade_id, created_at, updated_at
- emprestimos: id, equipamento_id, usuario_solicitante_id, usuario_autorizador_id, data_emprestimo, data_prevista_devolucao, data_devolucao, motivo, observacoes_emprestimo, condicao_emprestimo, condicao_devolucao, observacoes_devolucao, status (ativo|devolvido), created_at, updated_at
- termos_cautela: id, emprestimo_id, url_pdf, assinatura_solicitante, assinatura_autorizador, created_at

## Endpoints (Ajustes e Novos)
- Almoxarifado:
  - POST /almoxarifado/produtos: aceitar `barcode`, persistir `unidade_id` do tenant.
  - PUT /almoxarifado/produtos/:id: edição de campos incluindo `barcode`.
  - DELETE /almoxarifado/produtos/:id: exclusão (ou desativação).
  - Corrigir serviço para usar GET /almoxarifado/relatorio/estoque.
- Empréstimos:
  - POST /emprestimos/lote: criar empréstimos para múltiplos equipamentos em transação.
  - PUT /emprestimos/:id/devolver: enviar `condicao_devolucao`, `observacoes_devolucao`.
  - GET /emprestimos/termo/:id: gerar/download de PDF do termo.
  - Corrigir serviço para GET /emprestimos/relatorio/geral.
- Equipamentos:
  - POST /emprestimos/equipamentos: persistir `unidade_id` (tenant); permitir `barcode`.
  - PUT /emprestimos/equipamentos/:id e DELETE /emprestimos/equipamentos/:id.

## UX e Fluxos
- Retirada de consumo:
  - Campo de leitura (scanner como teclado) para `barcode` adiciona item e quantidade, confirma e registra saída.
  - Filtros por categoria, baixo estoque; busca por nome/código/barcode.
- Cautelas:
  - Carrinho com múltiplos equipamentos; leitura por `barcode`; valida disponibilidade; resumo e confirmação.
  - Assinatura via canvas; geração do termo em PDF; link para imprimir/compartilhar.
  - Histórico por usuário e por equipamento; alertas de empréstimos vencidos.

## Tecnologias e Boas Práticas
- Scanner “wedge” (emula teclado) com campo focado; para mobile/câmera, considerar ZXing ou QuaggaJS.
- PDF com `pdfkit` no backend; armazenamento em Storage (Supabase Storage), evitando disco local.
- Idempotência em mutações (X-Idempotency-Key) já aplicada.
- Tenant: persistir sempre `unidade_id` nos registros criados.
- Auditoria: registrar usuário e timestamps nas movimentações e cautelas.

## Permissões
- CRUD de categorias/produtos/equipamentos: Administrador, Chefe.
- Retirada de consumo: todos autenticados.
- Cautelas: solicitar (todos), autorizar/devolver (perfis acima de 1).

## Entregas por Fase
- Fase 1:
  - CRUD de produtos com `barcode` e `unidade_id`; correção de relatório; UX de retirada por leitura; alertas de estoque baixo.
- Fase 2:
  - Carrinho de cautelas; empréstimo em lote; PDF do termo com assinatura; devolução com condição; relatórios e alertas.

## Validação
- Testes de regras de estoque (saída sem estoque, alertas).
- Testes de cautela (disponibilidade, uma cautela ativa por equipamento).
- Testes de integração dos serviços frontend alinhados às rotas.

## Próximos Passos
- Ajustar serviços do frontend às rotas corretas.
- Adicionar campos `barcode` e `unidade_id` nas migrações.
- Implementar endpoints `PUT/DELETE`.
- Construir UX de leitura por `barcode` e carrinho de cautela.
