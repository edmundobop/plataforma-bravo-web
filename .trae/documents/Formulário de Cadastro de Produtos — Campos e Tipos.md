## Campos e Tipos (Banco → Form)
- `codigo` (varchar[50]): texto obrigatório
- `nome` (varchar[255]): texto obrigatório
- `descricao` (text): texto opcional (multilinha)
- `categoria_id` (integer): seleção obrigatória a partir de categorias existentes
- `unidade_medida` (varchar[20]): texto/seleção (ex.: un, kg, L, m, cx)
- `estoque_minimo` (integer): número inteiro ≥ 0
- `valor_unitario` (decimal[10,2]): número com 2 casas decimais
- `barcode` (varchar[64]): texto opcional (único)
- `ativo` (boolean): alternância (padrão true)
- `estoque_atual` (integer): opcional; ver implementação abaixo
- Não são de formulário: `id` (auto), `created_at`, `updated_at`, `unidade_id` (vem do tenant via `X-Tenant-ID`)

## Fontes de Dados
- Categorias: `GET /almoxarifado/categorias` → preencher `Select` de categorias.
- Unidade atual (tenant): já aplicada via header; não pedir no form.

## Implementação (Frontend)
- Atualizar `frontend/src/pages/Almoxarifado.js` no diálogo de produto:
  - Adicionar campos: `codigo`, `nome`, `descricao`, `categoria_id` (Select), `unidade_medida`, `estoque_minimo` (number), `valor_unitario` (currency), `barcode` (texto), `ativo` (Switch).
  - Preencher `Select` de categorias com estado `categorias` (carregado em `loadCategorias`).
  - Converter tipos antes do submit: `categoria_id` e `estoque_minimo` para inteiro; `valor_unitario` para número (normalizar vírgula); `ativo` para boolean.
  - Submeter com `almoxarifadoService.createProduto(formDataConvertido)`.

## Estoque Inicial
- Opção A (sem alterar backend): manter `estoque_atual` padrão 0 e, se o usuário informar estoque inicial, criar uma movimentação de `entrada` logo após o cadastro (`POST /almoxarifado/movimentacoes`).
- Opção B (alterar backend): permitir `estoque_atual` no `POST /almoxarifado/produtos`. Se preferir, implemento depois de sua confirmação.

## Validações
- Obrigatórios: `codigo`, `nome`, `categoria_id`, `unidade_medida`.
- Numéricos: `estoque_minimo` inteiro ≥ 0; `valor_unitario` decimal ≥ 0.
- Unicidade: mensagens amigáveis para 23505 de `codigo` e `barcode`.

## UX
- Categoria como lista: `Select` com todas as categorias; incluir opção “Nova Categoria” via FAB existente.
- `valor_unitario`: campo com máscara simples (ex.: 0,00) e normalização para decimal.
- Feedback de sucesso/erro com `Alert` e limpeza do formulário após criar.

## Testes
- Criar produto com todos os campos e categoria selecionada → aparece em lista e com status “Ativo”.
- Validar erro de duplicidade (`codigo`/`barcode`).
- (Opção A) Estoque inicial: verificar movimentação de entrada criada e `estoque_atual` atualizado.

Confirme para eu implementar os campos e o `Select` de categorias no formulário, incluindo a conversão de tipos e (Opção A) a criação automática da movimentação de entrada quando informado estoque inicial.