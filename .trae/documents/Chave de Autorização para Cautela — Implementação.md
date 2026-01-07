## Ajustes de Regras de Cautela
- Renomear/introduzir flags por equipamento:
  - Exige Autorização (`exige_autorizacao BOOLEAN DEFAULT TRUE`)
  - Exige Data de Devolução (`exige_data_devolucao BOOLEAN DEFAULT FALSE`)
- Criação de cautela (`POST /emprestimos`):
  - Se `exige_autorizacao = true` → criar empréstimo com `status = 'pendente'`, não alterar status do equipamento; `usuario_autorizador_id = null`.
  - Se `exige_autorizacao = false` → fluxo atual (`status = 'ativo'`, equipamento `emprestado`).
  - Se `exige_data_devolucao = true` → validar `data_prevista_devolucao` obrigatória.
- Autorização de cautela: `PUT /emprestimos/:id/autorizar` (Admin/Chefe) altera `pendente → ativo` e equipamento para `emprestado`.

## Mensagens ao Usuário
- Ao cautelar equipamento com `exige_autorizacao`:
  - Mostrar aviso: “Cautela pendente de autorização do Administrador”.
  - Empréstimo aparece na aba “Cautelas” com status `pendente`.
- Ao cautelar equipamento com `exige_data_devolucao` sem data → bloqueio com mensagem “Este equipamento exige data de devolução”.

## Banco de Dados
- Equipamentos: adicionar colunas `exige_autorizacao` e `exige_data_devolucao`.
- Preferências de Almoxarifado (por unidade):
  - Criar tabela `almox_config` com chave `unidade_id` e campo `cautelas_notificacao_intervals JSONB` (ex.: `[7,2,1,30]`).
- (Opcional) Deduplicação de avisos: `emprestimo_reminders(emprestimo_id, interval_days, sent_at)`.

## Backend
- Equipamentos (`POST/PUT /emprestimos/equipamentos`): aceitar e persistir `exige_autorizacao`, `exige_data_devolucao` (default `true` e `false` respectivamente).
- Empréstimos (`POST /emprestimos`): aplicar regras acima e responder com mensagens amigáveis.
- Autorização (`PUT /emprestimos/:id/autorizar`): apenas perfis permitidos.
- Preferências (`GET/PUT /almoxarifado/config`): salvar/ler intervalos de notificação por unidade.
- Scheduler de notificações:
  - Em horário configurável (ex.: `ALERT_HOUR`), verificar empréstimos `ativos` com `data_prevista_devolucao` e enviar avisos quando `dias_restantes` ∈ intervalos configurados.
  - Registrar em `emprestimo_reminders` para não repetir no mesmo intervalo.

## Frontend
- Formulário de Equipamento (Emprestimos → Equipamentos):
  - Adicionar `Switch` “Exige Autorização” (pré-ativado) e `Switch` “Exige Data de Devolução”.
- Fluxo de Cautela:
  - Mensagens de sucesso/pendência conforme flags.
  - Exibir status `pendente` na aba Cautelas e botão “Autorizar” apenas para Admin/Chefe.
- Nova aba “Configurações” (Almoxarifado):
  - Sessão “Cautelas” → “Notificação de Devoluções” com seleção múltipla de intervalos (7, 2, 1, 30 dias, etc.).
  - Salvar/ler preferências por unidade.

## Testes
- Cautelar com `exige_autorizacao` → `pendente` + aviso.
- Autorizar pendente → `ativo` + atualização do equipamento.
- `exige_data_devolucao` sem data → bloqueio e mensagem.
- Configurar intervalos e validar envio de notificações nos dias selecionados.

Confirme para eu implementar as mudanças no banco, backend, frontend e scheduler, incluindo UI de Configurações/Preferências e mensagens ao usuário.