# Sistema de Gestão - Corpo de Bombeiros Militar de Goiás

## Descrição
Sistema completo de gestão para o Corpo de Bombeiros Militar de Goiás com interface responsiva e 4 módulos principais.

## Módulos

### 1. Gestão de Frota
- Checklist de viaturas
- Controle de manutenção
- Histórico de uso

### 2. Gestão de Almoxarifado
- Controle de entrada e saída de produtos
- Gestão de estoque
- Relatórios de consumo

### 3. Gestão de Empréstimo de Equipamentos
- Cautela de equipamentos
- Controle de devolução
- Histórico de empréstimos

### 4. Gestão Operacional
- Troca de serviços
- Escalas de trabalho
- Controle de extras

## Funcionalidades Gerais
- Central de notificações integrada
- Dashboard específico para cada módulo
- Interface responsiva
- Sistema de autenticação e autorização

## Tecnologias
- **Frontend**: React.js com Material-UI
- **Backend**: Node.js com Express
- **Banco de Dados**: PostgreSQL
- **Notificações**: Socket.io
- **Autenticação**: JWT

## Estrutura do Projeto
```
├── frontend/          # Aplicação React
├── backend/           # API Node.js
├── database/          # Scripts e migrations
└── docs/             # Documentação
```