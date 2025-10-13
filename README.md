# Plataforma BRAVO - Sistema de Gestão CBMGO

## 📋 Sobre o Projeto

A Plataforma BRAVO é um sistema completo de gestão para o Corpo de Bombeiros Militar de Goiás (CBMGO), desenvolvido para otimizar o gerenciamento de recursos, frota, almoxarifado, empréstimos e operações.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Autenticação e Autorização**: Sistema completo com JWT
- **Gestão de Usuários**: CRUD completo com diferentes níveis de acesso
- **Dashboard**: Visão geral com métricas e indicadores
- **Gestão de Frota**: Controle de veículos e manutenções
- **Almoxarifado**: Gestão de estoque e materiais
- **Empréstimos**: Sistema de empréstimo de equipamentos
- **Operacional**: Gestão de ocorrências e operações
- **Notificações**: Sistema de notificações em tempo real
- **Testes Unitários**: Cobertura de testes para backend
- **Documentação API**: Swagger/OpenAPI integrado
- **CI/CD**: Pipeline automatizado com GitHub Actions

### 🔄 Em Desenvolvimento
- Testes de integração
- Deploy automatizado
- Monitoramento e logs
- Relatórios avançados

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Bcrypt** - Criptografia de senhas
- **Socket.io** - Comunicação em tempo real
- **Jest** - Testes unitários
- **Swagger** - Documentação da API

### Frontend
- **React.js** - Biblioteca para interface
- **Material-UI** - Componentes de interface
- **Axios** - Cliente HTTP
- **React Router** - Roteamento

### DevOps
- **GitHub Actions** - CI/CD
- **Docker** - Containerização
- **ESLint** - Linting de código
- **Prettier** - Formatação de código

## 📦 Instalação e Configuração

### Pré-requisitos
- Node.js (versão 18 ou superior)
- PostgreSQL (versão 13 ou superior)
- npm ou yarn

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/plataforma-bravo-v2.git
cd plataforma-bravo-v2
```

### 2. Configuração do Backend

```bash
cd backend
npm install
```

#### Configurar variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cbmgo_db
DB_USER=postgres
DB_PASSWORD=sua_senha
JWT_SECRET=sua_chave_secreta_jwt
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### Configurar banco de dados
```bash
# Criar banco de dados
psql -U postgres -c "CREATE DATABASE cbmgo_db;"

# Executar migrações
node database/migrate.js

# Criar usuário administrador
node create_admin.js
```

### 3. Configuração do Frontend

```bash
cd frontend
npm install
```

## 🚀 Executando a Aplicação

### Desenvolvimento

#### Backend
```bash
cd backend
npm start
# ou para desenvolvimento com hot reload
npm run dev
```

#### Frontend
```bash
cd frontend
npm start
```

### Produção

#### Backend
```bash
cd backend
npm run build
npm run start:prod
```

#### Frontend
```bash
cd frontend
npm run build
npm install -g serve
serve -s build
```

## 🧪 Testes

### Executar testes
```bash
cd backend
npm test
```

### Executar testes com cobertura
```bash
cd backend
npm run test:coverage
```

### Executar testes em modo watch
```bash
cd backend
npm run test:watch
```

## 📚 Documentação da API

A documentação da API está disponível via Swagger UI:

- **Desenvolvimento**: http://localhost:5000/api-docs
- **Produção**: https://api.cbmgo.gov.br/api-docs

### Principais Endpoints

#### Autenticação
- `POST /api/auth/login` - Realizar login
- `POST /api/auth/logout` - Realizar logout
- `GET /api/auth/verify` - Verificar token
- `PUT /api/auth/change-password` - Alterar senha

#### Usuários
- `GET /api/usuarios` - Listar usuários
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Excluir usuário

#### Frota
- `GET /api/frota` - Listar veículos
- `POST /api/frota` - Cadastrar veículo
- `PUT /api/frota/:id` - Atualizar veículo
- `DELETE /api/frota/:id` - Excluir veículo

## 🔧 Scripts Disponíveis

### Backend
- `npm start` - Iniciar servidor
- `npm run dev` - Iniciar em modo desenvolvimento
- `npm test` - Executar testes
- `npm run test:watch` - Executar testes em modo watch
- `npm run test:coverage` - Executar testes com cobertura
- `npm run lint` - Verificar código com ESLint
- `npm run lint:fix` - Corrigir problemas do ESLint

### Frontend
- `npm start` - Iniciar aplicação em desenvolvimento
- `npm run build` - Gerar build de produção
- `npm test` - Executar testes
- `npm run eject` - Ejetar configuração do Create React App

## 🔄 CI/CD

O projeto utiliza GitHub Actions para CI/CD automatizado:

### Pipeline de CI
1. **Testes**: Executa testes unitários e de integração
2. **Lint**: Verifica qualidade do código
3. **Security**: Auditoria de segurança das dependências
4. **Build**: Gera builds de produção

### Pipeline de CD
1. **Deploy Staging**: Deploy automático para ambiente de teste
2. **Smoke Tests**: Testes básicos no ambiente
3. **Deploy Production**: Deploy para produção (manual)
4. **Notificações**: Notifica equipe sobre status do deploy

## 🐳 Docker

### Executar com Docker Compose
```bash
docker-compose up -d
```

### Build das imagens
```bash
docker-compose build
```

## 📊 Monitoramento

### Logs
Os logs da aplicação são armazenados em:
- Desenvolvimento: Console
- Produção: Arquivos em `/logs/`

### Métricas
- Health check: `GET /api/health`
- Métricas do sistema: Dashboard administrativo

## 🤝 Contribuição

1. Fork o projeto
2. Leia as diretrizes de versionamento e governança em `FLUXO_VERSIONAMENTO.md`
3. Para um guia rápido (especialmente para o Malthus), consulte `GUIA_CONTROLE_VERSOES.txt`

Observações importantes:
- PR para `main` é opcional; push direto permitido para autorizados (recomendado usar PR para mudanças grandes).
- `develop` aceita push direto para você e Malthus.
- A `main` possui backup automático a cada push (tags `backup/main/...`). Veja como restaurar em `FLUXO_VERSIONAMENTO.md`.
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código
- Use ESLint para manter consistência
- Escreva testes para novas funcionalidades
- Documente APIs com Swagger
- Siga os padrões de commit convencionais

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipe

- **Desenvolvimento**: Equipe de TI CBMGO
- **Manutenção**: Setor de Tecnologia da Informação
- **Contato**: dev@cbmgo.gov.br

## 🆘 Suporte

Para suporte técnico:
- **Email**: suporte@cbmgo.gov.br
- **Telefone**: (62) 3201-6500
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/plataforma-bravo-v2/issues)

## 📈 Roadmap

### Próximas Versões
- [ ] Módulo de Relatórios Avançados
- [ ] Integração com APIs Externas
- [ ] App Mobile
- [ ] Sistema de Backup Automatizado
- [ ] Dashboard Executivo
- [ ] Integração com Active Directory

---

**Plataforma BRAVO** - Desenvolvido com ❤️ para o CBMGO