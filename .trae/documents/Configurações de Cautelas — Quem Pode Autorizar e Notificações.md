## Decisões
- Quem Pode Autorizar: adicionar sessão nas Configurações do Almoxarifado com seleção dos 5 perfis (Administrador, Comandante, Chefe, Auxiliar, Operador). Por padrão: Administrador, Chefe e Comandante selecionados.
- Intervalos padrão: quando a unidade não configurar, usar [7, 2, 1].
- Navegação: criar menu lateral geral “Configurações” com submenus por módulo (Almoxarifado, Frota, Operacional, etc.). Dentro de Almoxarifado → “Cautelas”.

## Banco de Dados
- Tabela `almox_config` (por unidade):
  - `unidade_id INTEGER`
  - `cautelas_notificacao_intervals JSONB` (ex.: [7,2,1,30])
  - `cautelas_autorizacao_roles JSONB` (ex.: ["Administrador","Chefe","Comandante"]) 
- Defaults: intervals [7,2,1], roles [Administrador, Chefe, Comandante].

## Backend
- Endpoints Config:
  - `GET /almoxarifado/config` → retorna config por `unidade_id` (do tenant); se inexistente, retorna defaults.
  - `PUT /almoxarifado/config` → atualiza `cautelas_notificacao_intervals` e `cautelas_autorizacao_roles`.
- Autorização de cautela:
  - `PUT /emprestimos/:id/autorizar` verifica se `req.user.perfil_nome` ∈ `cautelas_autorizacao_roles` da unidade.
- Criação de cautela:
  - Mantém regras: `exige_autorizacao` → status `pendente`; `exige_data_devolucao` → data obrigatória.
  - Mensagem de retorno diferenciada (pendente vs ativo).
- Scheduler de lembretes:
  - Uma vez por minuto, carrega intervalos configurados por unidade.
  - Para cada empréstimo ativo com `data_prevista_devolucao`, computa `dias_restantes` e envia notificação quando bater intervalos (dedup em `emprestimo_reminders`).

## Frontend
- Menu lateral “Configurações” (global), com submenu “Almoxarifado” → “Cautelas”.
- Tela de Cautelas (Config):
  - “Quem Pode Autorizar”: checklist dos 5 perfis (multi seleção) com defaults.
  - “Notificação de Devoluções”: seleção múltipla (7, 2, 1, 30 dias, etc.).
  - Botões “Salvar”/“Reverter”.
- Formulário de Equipamento:
  - Switch “Exige Autorização” (pré-ativado) e “Exige Data de Devolução”.
- Fluxo de Cautela:
  - Ao criar e exigir autorização: toast “Cautela pendente de autorização do Administrador”.
  - Aba Cautelas mostra status `pendente` e botão “Autorizar” apenas para perfis incluídos na configuração.

## Testes
- Config GET/PUT por unidade, persistência de roles/intervalos.
- Criação de cautela pendente → aparece em Cautelas; autorização restrita a roles configurados.
- Lembretes emitidos nos intervalos selecionados (inclui defaults quando ausência de config).

Confirme para eu implementar os endpoints, UI de Configurações, enforcement de roles e o scheduler de lembretes conforme definido.