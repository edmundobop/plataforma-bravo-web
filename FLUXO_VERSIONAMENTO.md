# 🔄 Fluxo de Versionamento - Plataforma Bravo

## 📋 Visão Geral do Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE VERSIONAMENTO                      │
└─────────────────────────────────────────────────────────────────┘

    MAIN (Produção)     DEVELOP (Integração)    FEATURE (Desenvolvimento)
         │                      │                         │
         │                      │                         │
    ┌────▼────┐            ┌────▼────┐               ┌────▼────┐
    │ v1.0.0  │            │ Latest  │               │ Nova    │
    │ Stable  │            │ Changes │               │ Feature │
    └─────────┘            └─────────┘               └─────────┘
         ▲                      ▲                         │
         │                      │                         │
         │                      │◄────────────────────────┘
         │                      │     (Pull Request)
         │◄─────────────────────┘
              (Release)
```

## 🔐 Governança de Aprovação

- `main`: PR é opcional. Push direto permitido para quem tem permissão (você e Malthus). PRs são recomendados para mudanças maiores; quando houver PR, você mesmo aprova.
- `develop`: push direto permitido para você e Malthus; PRs opcionais para revisões pontuais.
- Hotfix: pode ser direto na `main` em urgência; preferir PR quando possível. Backup automático da `main` ativo a cada push.

## 🌳 Estrutura de Branches

### 1. **MAIN** (Produção)
- ✅ Código estável e testado
- 🚀 Versões em produção
- 🔒 **PROTEGIDA (flexível)** - Push direto permitido para autorizados; PR opcional

### 2. **DEVELOP** (Integração)
- 🔄 Integração de todas as features
- 🧪 Testes de integração
- 📦 Preparação para releases

### 3. **FEATURE** (Desenvolvimento)
- 🛠️ Desenvolvimento de novas funcionalidades
- 👤 Trabalho individual
- 🔀 Merge para develop via PR

## 👥 Workflow para Você e Malthus

### 🎯 **CENÁRIO 1: Nova Feature**

```bash
# 1. Atualizar develop
git checkout develop
git pull origin develop

# 2. Criar branch da feature
git checkout -b feature/nome-da-feature

# 3. Desenvolver e commitar
git add .
git commit -m "feat: implementar nova funcionalidade"

# 4. Push da feature
git push origin feature/nome-da-feature

# 5. Criar Pull Request no GitHub
# feature/nome-da-feature → develop
```

### 🔄 **CENÁRIO 2: Colaboração Simultânea**

```
VOCÊ                           MALTHUS
│                              │
├─ feature/usuarios            ├─ feature/operacional-malthus
│  (Gestão de usuários)        │  (Módulo operacional)
│                              │
└─► develop ◄──────────────────┘
    (Integração)
```

### 🚨 **CENÁRIO 3: Hotfix Urgente**

```bash
# 1. Criar hotfix direto da main
git checkout main
git checkout -b hotfix/correcao-critica

# 2. Corrigir e commitar
git commit -m "fix: corrigir bug crítico"

# 3. Merge para main E develop
git checkout main
git merge hotfix/correcao-critica
git checkout develop
git merge hotfix/correcao-critica
```

## 📝 Convenções de Commit

### Formato:
```
tipo(escopo): descrição

[corpo opcional]

[rodapé opcional]
```

### Tipos:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Manutenção

### Exemplos:
```bash
feat(operacional): adicionar submenu de usuários
fix(auth): corrigir validação de token
docs(readme): atualizar instruções de setup
refactor(api): melhorar estrutura de rotas
```

## 🔄 Processo de Pull Request

### 📋 **Template de PR**
```markdown
## 📝 Descrição
Descreva as mudanças implementadas

## ✅ Checklist
- [ ] Código testado localmente
- [ ] Documentação atualizada
- [ ] Sem conflitos com develop
- [ ] Commits seguem convenção

## 🧪 Como testar
1. Passo 1
2. Passo 2
3. Resultado esperado

## 📸 Screenshots (se aplicável)
```

### 🔍 **Processo de Review**
1. **Autor** cria PR
2. **Reviewer** analisa código
3. **Discussão** se necessário
4. **Aprovação** e merge
5. **Limpeza** da branch

## 🚀 Processo de Release

### 📦 **Preparação**
```bash
# 1. Criar branch de release
git checkout develop
git checkout -b release/v1.1.0

# 2. Ajustes finais e testes
# 3. Merge para main
git checkout main
git merge release/v1.1.0
git tag v1.1.0

# 4. Merge de volta para develop
git checkout develop
git merge release/v1.1.0
```

## 🛡️ Regras de Proteção

### 🔒 Branch MAIN (flexível, sem PR obrigatório)
- ✅ Push direto permitido para quem tem permissão
- 🔁 PRs recomendados para mudanças maiores (você aprova quando houver PR)
- 🚫 Force-push bloqueado; deleção da branch bloqueada
- 🏷️ Backup automático a cada push (tags `backup/main/...`)

### 🔄 Branch DEVELOP
- ✅ Push direto permitido para você e Malthus
- 🔍 PRs opcionais para revisões pontuais
- 🧹 Rebase/merge frequente para manter integridade

## 📊 Monitoramento

### 🎯 **Métricas Importantes**
- 📈 Frequência de commits
- 🔄 Tempo de review de PRs
- 🐛 Taxa de bugs em produção
- 🚀 Tempo de deploy

### 🔍 **Comandos Úteis**
```bash
# Ver histórico de commits
git log --oneline --graph

# Ver branches remotas
git branch -r

# Limpar branches locais
git branch -d feature/branch-name

# Sincronizar com remoto
git fetch --prune
```

## 🧯 Backup e Restauração da Main

### 📦 Como o backup funciona
- A cada push na `main`, é criada automaticamente uma tag anotada no commit anterior com o padrão: `backup/main/<YYYYMMDD-HHMMSS>-<sha7>`.
- Mantemos apenas as últimas 20 tags de backup (limpeza automática).

### 🔎 Localizar backups recentes
```bash
git fetch --tags
git tag -l 'backup/main/*' --sort=-creatordate | head -n 10    # Git Bash/macOS
# ou no PowerShell
# git tag -l 'backup/main/*' --sort=-creatordate | Select-Object -First 10
```

### ♻️ Restaurar com segurança (via PR)
```bash
# 1) Crie uma branch a partir da tag de backup escolhida
git fetch --tags
git checkout -b restore/main-<timestamp> <tag-de-backup>

# 2) Teste localmente e valide

# 3) Abra um PR de restore para main
#    Título: "restore: voltar main para <tag>"
#    Após o merge, a main volta para o estado do backup, sem reescrever histórico
```

Obs.: Evite resetar a `main` (rewrite); prefira PR de restauração. Em emergência extrema, coordene antes e garanta que o backup existe.

## 🆘 Resolução de Conflitos

### ⚡ **Passo a Passo**
```bash
# 1. Atualizar develop
git checkout develop
git pull origin develop

# 2. Fazer rebase da feature
git checkout feature/sua-branch
git rebase develop

# 3. Resolver conflitos manualmente
# 4. Continuar rebase
git rebase --continue

# 5. Force push (cuidado!)
git push --force-with-lease origin feature/sua-branch
```

## 🎯 Resumo para Malthus

### 🚀 **Setup Inicial**
1. Clone o repositório
2. Configure Git Flow
3. Crie sua branch de feature
4. Desenvolva seguindo convenções
5. Faça PRs para develop

### 📋 **Workflow Diário**
```bash
# Manhã - Sincronizar
git checkout develop
git pull origin develop
git checkout feature/operacional-malthus
git rebase develop

# Durante o dia - Desenvolver
git add .
git commit -m "feat: implementar funcionalidade X"

# Final do dia - Enviar
git push origin feature/operacional-malthus
```

---

## 📞 **Contato para Dúvidas**
- 💬 WhatsApp: Para questões urgentes
- 📧 GitHub Issues: Para discussões técnicas
- 🔄 Pull Requests: Para review de código

**Lembre-se**: Sempre sincronize antes de começar a trabalhar! 🔄