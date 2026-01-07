## Fase 1: Almoxarifado (Finalizações)
- Completar UI de Produto: botão editar/excluir, exibir `barcode` na tabela, máscara de moeda em `valor_unitario` e validações (≥0).
- Movimentações: adicionar campos `documento` e `fornecedor`; filtros dinâmicos por categoria/status/baixo estoque; exportar CSV.
- Regras de perfil: manter Operador sem “Entrada” e sem CRUD; garantir no backend todas as rotas de estoque respeitam perfis.
- Relatórios: conectar frontend à rota `/almoxarifado/relatorio/estoque` com filtros e resumo; card de “baixo estoque” com navegação.
- Persistência de tenant: revisar criação/edição para sempre gravar `unidade_id`; cobrir com testes.
- Testes: unitários de regras de estoque (saída sem saldo, alerta), integração dos serviços e uma suíte e2e básica.

## Fase 2: Cautelas (Implementar Termo e Assinatura)
- Assinatura: componente de canvas para solicitante/autor (salvar como imagem em base64).
- PDF do Termo: backend com `pdfkit` em `/emprestimos/termo/:id` usando dados da cautela, itens do carrinho, assinaturas e metadados.
- Armazenamento: subir PDFs/assinaturas para Storage (ex.: Supabase Storage) e persistir URL; habilitar download/compartilhamento.
- UX do Carrinho: permitir remoção/observações por item e revisão antes de confirmar; feedback detalhado de falhas parciais.
- Alertas: destacar vencidos e enviar notificação programática diária (cron do servidor) por unidade.

## Segurança e Governança
- Sanitização de inputs e limites mínimos/máximos (quantidade, preços).
- Auditoria: registrar usuário e timestamps em movimentações e cautelas; trilhas acessíveis em UI.
- Perfis: validar no backend endpoints sensíveis (CRUD, entradas) por `authorizeRoles`/perfil.

## Documentação e Onboarding
- Guia de uso: retirada rápida, movimentações manuais, filtros, relatórios.
- Guia de cautela: carrinho, assinatura, termo e devolução com condição.
- Checklist de configuração: `REACT_APP_API_BASE_URL`, Storage, variáveis de PDF.

## Entregáveis Imediatos
- UI de movimentação com `documento/fornecedor` e filtros dinâmicos.
- Tabela de produtos com `barcode` e “Limpar Filtros” já ativo.
- Endpoint `/emprestimos/termo/:id` e componente de assinatura.

Aprovo iniciar pelas finalizações da Fase 1 (UI, filtros, validações) e em seguida implementar assinatura+PDF do termo na Fase 2.