# 🤖 Configuração Automática do Repositório

## 🎯 **Configurações que Posso Automatizar:**

### ✅ **1. Arquivo de Configuração (.github/settings.yml)**

```yaml
# .github/settings.yml
repository:
  name: plataforma-bravo-web
  description: "Sistema de Gestão Operacional - Plataforma Bravo"
  homepage: "https://plataforma-bravo.com"
  topics:
    - nodejs
    - react
    - postgresql
    - gestao-operacional
  private: false
  has_issues: true
  has_projects: true
  has_wiki: false
  has_downloads: true
  default_branch: main
  allow_squash_merge: true
  allow_merge_commit: false
  allow_rebase_merge: true
  delete_branch_on_merge: true

# Proteção de Branches
branches:
  - name: main
    protection:
      required_status_checks:
        strict: true
        contexts:
          - "continuous-integration"
          - "tests"
      enforce_admins: false
      required_pull_request_reviews:
        required_approving_review_count: 1
        dismiss_stale_reviews: true
        require_code_owner_reviews: true
        dismissal_restrictions:
          users: []
          teams: []
      restrictions:
        users: []
        teams: []
        apps: []
      allow_force_pushes: false
      allow_deletions: false

  - name: develop
    protection:
      required_status_checks:
        strict: false
        contexts: []
      enforce_admins: false
      required_pull_request_reviews:
        required_approving_review_count: 1
        dismiss_stale_reviews: false
        require_code_owner_reviews: false
      restrictions: null
      allow_force_pushes: false
      allow_deletions: false

# Colaboradores
collaborators:
  - username: malthus-username  # Substituir pelo username real
    permission: push

# Labels
labels:
  - name: "🐛 bug"
    color: "d73a4a"
    description: "Algo não está funcionando"
  - name: "📚 documentation"
    color: "0075ca"
    description: "Melhorias ou adições à documentação"
  - name: "🚀 enhancement"
    color: "a2eeef"
    description: "Nova funcionalidade ou solicitação"
  - name: "❓ question"
    color: "d876e3"
    description: "Informações adicionais são solicitadas"
  - name: "🔧 wontfix"
    color: "ffffff"
    description: "Isso não será trabalhado"
  - name: "✅ ready-for-review"
    color: "0e8a16"
    description: "PR pronto para revisão"
  - name: "🚧 work-in-progress"
    color: "fbca04"
    description: "Trabalho em andamento"
  - name: "🔥 hotfix"
    color: "b60205"
    description: "Correção urgente"
```

### ✅ **2. Arquivo CODEOWNERS**

```bash
# .github/CODEOWNERS
# Proprietários globais do código
* @edmundobop

# Arquivos específicos
/frontend/ @edmundobop @malthus-username
/backend/ @edmundobop @malthus-username
/docs/ @edmundobop
/.github/ @edmundobop

# Arquivos críticos (só você)
/package.json @edmundobop
/backend/config/ @edmundobop
/.env.example @edmundobop
/README.md @edmundobop
```

### ✅ **3. Template de Pull Request**

```markdown
<!-- .github/pull_request_template.md -->
## 📝 Descrição

Descreva brevemente as mudanças implementadas neste PR.

## 🔗 Issue Relacionada

Fixes #(número da issue)

## 🧪 Tipo de Mudança

- [ ] 🐛 Bug fix (mudança que corrige um problema)
- [ ] ✨ Nova funcionalidade (mudança que adiciona funcionalidade)
- [ ] 💥 Breaking change (correção ou funcionalidade que causaria quebra)
- [ ] 📚 Documentação (mudanças na documentação)
- [ ] 🎨 Estilo (formatação, ponto e vírgula ausente, etc.)
- [ ] ♻️ Refatoração (mudança de código que não corrige bug nem adiciona funcionalidade)
- [ ] ⚡ Performance (mudança que melhora performance)
- [ ] ✅ Testes (adição ou correção de testes)
- [ ] 🔧 Chore (mudanças no processo de build ou ferramentas auxiliares)

## ✅ Checklist

- [ ] Meu código segue as diretrizes de estilo do projeto
- [ ] Realizei uma auto-revisão do meu código
- [ ] Comentei meu código, especialmente em áreas difíceis de entender
- [ ] Fiz mudanças correspondentes na documentação
- [ ] Minhas mudanças não geram novos warnings
- [ ] Adicionei testes que provam que minha correção é eficaz ou que minha funcionalidade funciona
- [ ] Testes unitários novos e existentes passam localmente com minhas mudanças
- [ ] Quaisquer mudanças dependentes foram mergeadas e publicadas

## 🧪 Como Testar

1. Passo 1
2. Passo 2
3. Resultado esperado

## 📸 Screenshots (se aplicável)

<!-- Cole screenshots aqui -->

## 📋 Notas Adicionais

<!-- Qualquer informação adicional relevante -->
```

### ✅ **4. Template de Issue**

```markdown
<!-- .github/ISSUE_TEMPLATE/bug_report.md -->
---
name: 🐛 Bug Report
about: Criar um relatório para nos ajudar a melhorar
title: '[BUG] '
labels: '🐛 bug'
assignees: ''
---

## 🐛 Descrição do Bug

Uma descrição clara e concisa do que é o bug.

## 🔄 Para Reproduzir

Passos para reproduzir o comportamento:
1. Vá para '...'
2. Clique em '....'
3. Role para baixo até '....'
4. Veja o erro

## ✅ Comportamento Esperado

Uma descrição clara e concisa do que você esperava que acontecesse.

## 📸 Screenshots

Se aplicável, adicione screenshots para ajudar a explicar seu problema.

## 🖥️ Ambiente

- OS: [ex: Windows 10]
- Browser: [ex: Chrome, Safari]
- Versão: [ex: 22]

## 📋 Contexto Adicional

Adicione qualquer outro contexto sobre o problema aqui.
```

### ✅ **5. Workflow de CI/CD Melhorado**

```yaml
# .github/workflows/ci-cd-enhanced.yml
name: 🚀 CI/CD Enhanced

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    name: 🧪 Tests
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x]
    
    steps:
    - name: 📥 Checkout
      uses: actions/checkout@v3
    
    - name: 🟢 Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: 📦 Install Backend Dependencies
      run: |
        cd backend
        npm ci
    
    - name: 📦 Install Frontend Dependencies
      run: |
        cd frontend
        npm ci
    
    - name: 🧪 Run Backend Tests
      run: |
        cd backend
        npm test
    
    - name: 🧪 Run Frontend Tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: 📊 Upload Coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./frontend/coverage/lcov.info
        flags: frontend
        name: frontend-coverage
    
  lint:
    name: 🔍 Lint
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 Checkout
      uses: actions/checkout@v3
    
    - name: 🟢 Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
        cache: 'npm'
    
    - name: 📦 Install Dependencies
      run: |
        cd frontend
        npm ci
    
    - name: 🔍 Run ESLint
      run: |
        cd frontend
        npm run lint
    
  security:
    name: 🔒 Security Audit
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 Checkout
      uses: actions/checkout@v3
    
    - name: 🟢 Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    
    - name: 🔒 Run Security Audit
      run: |
        cd backend && npm audit --audit-level=high
        cd ../frontend && npm audit --audit-level=high
    
  deploy:
    name: 🚀 Deploy
    needs: [test, lint, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: 📥 Checkout
      uses: actions/checkout@v3
    
    - name: 🚀 Deploy to Production
      run: |
        echo "🚀 Deploying to production..."
        # Adicionar comandos de deploy aqui
```

## 🛠️ **Como Aplicar as Configurações:**

### 📋 **Método 1: Manual (Recomendado)**

1. **Criar os arquivos:**
   ```bash
   mkdir -p .github/ISSUE_TEMPLATE
   # Copiar conteúdos dos templates acima
   ```

2. **Configurar no GitHub:**
   - Settings → Branches → Add rule
   - Settings → Manage access → Invite collaborator
   - Settings → General → Features

### 📋 **Método 2: GitHub CLI (Automático)**

```bash
# Instalar GitHub CLI
winget install GitHub.cli

# Configurar proteção da main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["tests"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null

# Adicionar colaborador
gh api repos/:owner/:repo/collaborators/malthus-username \
  --method PUT \
  --field permission=push
```

### 📋 **Método 3: Probot Settings (Mais Avançado)**

1. **Instalar Probot Settings App:**
   - https://github.com/apps/settings
   - Autorizar no repositório

2. **Criar .github/settings.yml** (conteúdo acima)

3. **Push automático aplicará configurações**

## ✅ **Configurações que Ficam Automáticas:**

- 🔒 **Proteção de branches**
- 👥 **Gerenciamento de colaboradores**
- 🏷️ **Labels padronizadas**
- 📝 **Templates de PR e Issues**
- 🧪 **CI/CD com testes automáticos**
- 🔍 **Code review obrigatório**
- 🚀 **Deploy automático**
- 📊 **Relatórios de cobertura**
- 🔒 **Auditoria de segurança**

## 🎯 **Próximos Passos:**

1. **Escolher método** (recomendo Manual + GitHub CLI)
2. **Criar arquivos** de template
3. **Configurar proteções** no GitHub
4. **Testar workflow** com PR de teste
5. **Documentar** para o Malthus

**Resultado:** Repositório 100% automatizado e protegido! 🛡️