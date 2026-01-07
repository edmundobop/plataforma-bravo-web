## Problema e Causas
- Salvamento falhando por validações: backend exige `codigo`, `nome`, `marca`, `modelo` (e opcionalmente `numero_serie`, etc.). O formulário atual não envia todos os campos.
- Precisa contemplar os campos da tabela: `codigo`, `nome`, `descricao`, `marca`, `modelo`, `numero_serie`, `status`, `condicao`, `valor`, `data_aquisicao`, `setor_responsavel`, `observacoes`, `barcode`, além de fotos.

## O que vou implementar
### Frontend (Emprestimos.js)
- Expandir o diálogo “Novo Equipamento” com todos os campos acima.
- Conversão de tipos: `valor` com máscara e conversão para decimal; `data_aquisicao` para `YYYY-MM-DD`.
- Upload de fotos:
  - Componente de upload que chama `POST /upload/fotos` (campo `fotos[]`), salvando URLs retornadas.
  - Exibir miniaturas e permitir remover antes de salvar.
  - Enviar `fotos` como array de URLs no payload.
- Tratamento de erros de validação (mostrar mensagens do backend) e de duplicidade (`codigo`/`barcode`).

### Backend (emprestimos)
- Adicionar coluna `fotos JSONB` em `equipamentos`.
- Aceitar `fotos` no `POST /emprestimos/equipamentos` e `PUT /emprestimos/equipamentos/:id` (armazenar array de URLs).
- Manter validações atuais; garantir `unidade_id` é preenchido via `X-Tenant-ID`.

## Fluxo de Fotos
- Upload: `POST /upload/fotos` retorna `{ fotos: [{ url, filename, ... }] }`.
- Persistência: incluir `fotos: [{url: string}]` no payload do equipamento.
- Exibição: mostrar imagens no detalhe e na lista (thumbnail opcional).

## Testes e Verificação
- Criar equipamento com todos os campos e pelo menos 1 foto; confirmar criação e exibição.
- Validar mensagens quando faltar `marca`/`modelo` ou conflitar `codigo`/`barcode`.
- Editar equipamento adicionando/removendo fotos.

Confirme para eu aplicar as mudanças no frontend e backend conforme descrito, resolver o erro de salvamento e incluir o suporte completo a fotos.