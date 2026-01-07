## Itens a Implementar
- Endpoint de autorização: `PUT /emprestimos/:id/autorizar` com checagem contra `cautelas_autorizacao_roles` da unidade.
- Endpoints de Configurações: `GET/PUT /almoxarifado/config` para salvar/ler `cautelas_notificacao_intervals` e `cautelas_autorizacao_roles` (defaults [7,2,1] e [Administrador, Chefe, Comandante]).
- Menu lateral “Configurações” (global) com submenu “Almoxarifado” → “Cautelas”.
- Tela de Configurações/Cautelas:
  - "Quem Pode Autorizar": checklist dos 5 perfis com seleção múltipla.
  - "Notificação de Devoluções": seleção múltipla (7, 2, 1, 30, etc.).
- Formulário de Equipamento: switches “Exige Autorização” (pré-ativado) e “Exige Data de Devolução”.
- Fluxo de Cautela (UI):
  - Mensagem de “Cautela pendente de autorização” quando exigir autorização.
  - Bloqueio com mensagem quando exigir data e ela não for informada.
- Scheduler: ler intervalos por unidade e enviar lembretes nos dias configurados; registrar em `emprestimo_reminders` para evitar duplicidade.

## Observações
- Perfis com autorização configuráveis; incluirei Comandante por padrão junto com Administrador e Chefe.
- Defaults de intervalos quando não houver configuração: [7, 2, 1].

Confirma para eu implementar estes pontos agora? 