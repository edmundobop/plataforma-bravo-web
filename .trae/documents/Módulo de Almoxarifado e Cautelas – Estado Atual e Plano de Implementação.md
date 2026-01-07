## Estado Atual
- Backend (Almoxarifado):
  - Listagem/criação de categorias e produtos; movimentações de estoque; relatório de estoque.
  - Referências: `backend/routes/almoxarifado.js:18` (listar categorias), `:36` (criar categoria), `:68` (listar produtos), `:162` (produto por ID), `:201` (criar produto), `:241` (listar movimentações), `:295` (criar movimentação), `:392` (relatório de estoque).
- Backend (Empréstimos/Cautelas):
  - CRUD parcial de equipamentos; cadastro, listagem e devolução de empréstimos; relatório geral.
  - Referências: `backend/routes/emprestimos.js:14` (listar equipamentos), `:111` (equipamento por ID), `:149` (criar equipamento), `:190` (listar empréstimos), `:247` (empréstimo por ID), `:276` (criar empréstimo), `:365` (devolver equipamento), `:434` (relatório geral).
- Frontend:
  - Páginas de Almoxarifado e Empréstimos com filtros, tabelas e ações básicas; serviços prontos em `frontend/src/services/api.js`.

## Lacunas Identificadas
- Tenant/unidade: criação de `produtos` e `equipamentos` não persiste `unidade_id`, mas filtros/relatórios usam unidade.
- Relatórios: rotas do frontend não batem com backend (almoxarifado: `/relatorio` vs `/relatorio/estoque`; empréstimos: `/relatorio` vs `/relatorio/geral`).
- Devolução: serviço envia `{ observacoes }`, backend espera `condicao_devolucao` e `observacoes_devolucao`.
- Ausência de `PUT/DELETE` para categorias/produtos/equipamentos.
- Código de barras: não há campo/fluxo; necessário em produtos e equipamentos.

## Fase 1: Gestão de Produtos e Materiais de Consumo
- Campos e regras:
  - Adicionar `barcode` (único), `unidade_id` (do tenant), `ativo` em `produtos`.
  - Movimentações: entrada e saída com motivo/documento; notificação de estoque baixo.
- Endpoints:
  - `POST /almoxarifado/produtos`: aceitar `barcode`, setar `unidade_id`; validar duplicidade.
  - `PUT /almoxarifado/produtos/:id`: editar campos, inclusive `barcode`.
  - `DELETE /almoxarifado/produtos/:id`: desativar ou excluir conforme regra.
  - Corrigir `GET /almoxarifado/relatorio` → usar `/relatorio/estoque` no frontend.
- Frontend UX:
  - Cadastro/edição com `barcode`.
  - Retirada rápida: campo de leitura de código de barras (scanner como teclado) adiciona item e quantidade; confirma saída e registra movimentação.
  - Filtros por categoria, baixo estoque, busca por nome/código/barcode.
- Tecnologias:
  - Scanner físico “wedge” (emula teclado) funciona com `<input>` focado.
  - Para mobile/câmera: avaliar `@zxing/library` ou `QuaggaJS` para leitura de EAN/Code128.

## Fase 2: Cautelas (Empréstimo de Equipamentos)
- Carrinho de cautela:
  - Usuário adiciona múltiplos equipamentos (por busca ou leitura de `barcode`) e solicita cautela em lote.
  - Regras: equipamento deve estar `disponivel`; uma cautela ativa por equipamento.
- Assinatura e termo:
  - Captura de assinatura via canvas no frontend; geração de PDF pelo backend com `pdfkit` (já presente em deps) contendo itens, prazos, assinaturas e termos.
  - Armazenamento do PDF e link para impressão/compartilhamento (preferir Storage, e.g., Supabase Storage).
- Endpoints:
  - `POST /emprestimos/lote`: aceitar array de `equipamento_id`, `data_prevista_devolucao`, `motivo`, `condicao_emprestimo`, e anexos/assinatura; criar múltiplos empréstimos atomicos (transação), falhas parciais reportadas.
  - `PUT /emprestimos/:id/devolver`: alinhar serviço para enviar `condicao_devolucao` e `observacoes_devolucao`.
  - `GET /emprestimos/termo/:id`: gerar/download do PDF do termo.
  - `GET /emprestimos/relatorio/geral`: alinhar frontend.
- Frontend UX:
  - Página de cautela com carrinho, leitura por `barcode`, validação de disponibilidade, resumo, captura de assinatura e confirmação.
  - Histórico por usuário e por equipamento; alertas de vencidos.

## Modelo de Dados (Propostas)
- `produtos`: `id`, `codigo`, `barcode` (unique), `nome`, `descricao`, `categoria_id`, `unidade_medida`, `estoque_minimo`, `valor_unitario`, `estoque_atual`, `unidade_id`, `ativo`, timestamps.
- `movimentacoes_estoque`: já ok; garantir `usuario_id`, `valor_total`, timestamps.
- `equipamentos`: `id`, `codigo`, `barcode` (unique), `nome`, `descricao`, `marca`, `modelo`, `numero_serie`, `setor_responsavel`, `condicao`, `status` (`disponivel|emprestado|manutencao`), `unidade_id`, timestamps.
- `emprestimos`: `id`, `equipamento_id`, `usuario_solicitante_id`, `usuario_autorizador_id`, `data_emprestimo`, `data_prevista_devolucao`, `data_devolucao`, `motivo`, `observacoes_emprestimo`, `condicao_emprestimo`, `condicao_devolucao`, `observacoes_devolucao`, `status`, timestamps.
- `termos_cautela`: `emprestimo_id`, `url_pdf`, `assinatura_solicitante`, `assinatura_autorizador`, timestamps.

## Permissões
- CRUD de categorias/produtos/equipamentos: perfis `Administrador`, `Chefe` (já aplicado via `authorizeRoles`).
- Saída de consumo: todos os perfis autenticados.
- Cautelas: solicitar (todos os perfis), autorizar/devolver (perfis acima de 1, configurar por regra).

## Integrações e Melhores Práticas
- Idempotência já aplicada em mutações (chave `X-Idempotency-Key`).
- Tenant: sempre persistir `unidade_id` ao criar registros.
- Assinaturas/PDF: usar `pdfkit` no backend; armazenar em Storage (evitar disco local em produção).
- Código de barras: normalizar formato (Code128/EAN-13), validar e indexar.
- Logs e Auditoria: registrar usuário e horário em movimentações e cautelas.

## Ajustes Pontuais
- Alinhar serviços do frontend:
  - Almoxarifado: `getRelatorioEstoque` → `/almoxarifado/relatorio/estoque`.
  - Empréstimos: `getRelatorioEmprestimos` → `/emprestimos/relatorio/geral`; `devolverEmprestimo` enviar `{ condicao_devolucao, observacoes_devolucao }`.
- Persistir `unidade_id` em `POST /almoxarifado/produtos` e `POST /emprestimos/equipamentos`.

## Inspiração de Mercado
- ERPs/Inventário (Odoo, ERPNext, Zoho Inventory):
  - Movimentações com motivo/documento; estoque mínimo e alertas; categorias hierárquicas.
  - Empréstimos (Fleet/Assets): termos de responsabilidade, prazos e controle de devolução.
- Tecnologias atuais:
  - Leitura de código de barras por scanner (teclado) e câmera (ZXing/QuaggaJS).
  - Geração de PDFs com `pdfkit`; assinatura via canvas e upload.

## Entregáveis por Fase
- Fase 1:
  - Endpoints CRUD de produto; correção de relatório; persistência de `unidade_id`; campo `barcode` e buscas; UX de retirada rápida por leitura.
- Fase 2:
  - Carrinho de cautelas; empréstimo em lote; geração e armazenamento de termo (PDF) com assinatura; devolução com condição; relatórios e alertas de vencidos.

## Validação
- Testes unitários de regras de estoque (saída sem estoque, alertas), e regras de cautela (equipamento disponível, uma cautela ativa por equipamento).
- Testes de integração dos serviços frontend.

Confirme para eu avançar implementando ajustes nos serviços, rotas e migrações necessárias (incluindo campos `barcode` e `unidade_id`) e criar a documentação do módulo conforme este plano.