# 🚀 Instruções de Configuração Automática

## ⚡ **Configuração Rápida (Recomendada)**

### 1️⃣ **Executar Script Automático**

```powershell
# No PowerShell (como Administrador)
.\setup-automation.ps1
```

**O que o script faz:**
- ✅ Instala GitHub CLI (se necessário)
- ✅ Configura proteção das branches `main` e `develop`
- ✅ Cria labels padronizadas
- ✅ Aplica configurações gerais do repositório
- ✅ Verifica instalação do Probot Settings

### 2️⃣ **Configurações Manuais Restantes**

#### **A. Instalar Probot Settings (1 minuto)**
1. Acesse: https://github.com/apps/settings
2. Clique em "Install"
3. Selecione o repositório `plataforma-bravo-web`
4. Autorize a instalação

#### **B. Adicionar Colaborador Malthus**
```bash
# Via GitHub CLI
gh repo invite malthus-username --role push

# Ou via interface web:
# Settings → Manage access → Invite a collaborator
```

#### **C. Atualizar CODEOWNERS (quando souber o username do Malthus)**
```bash
# Editar .github/CODEOWNERS
# Substituir 'malthus-username' pelo username real
```

---

## 🛠️ **Configuração Manual Completa**

### **1. Proteção de Branches**

#### **Branch `main`:**
- Settings → Branches → Add rule
- Branch name: `main`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Dismiss stale reviews
- ✅ Require review from CODEOWNERS
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Do not allow bypassing the above settings

#### **Branch `develop`:**
- Settings → Branches → Add rule
- Branch name: `develop`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1

### **2. Configurações Gerais**

**Settings → General:**
- ✅ Allow squash merging
- ❌ Allow merge commits
- ✅ Allow rebase merging
- ✅ Automatically delete head branches

**Settings → Features:**
- ✅ Issues
- ✅ Projects
- ❌ Wiki
- ✅ Discussions (opcional)

### **3. Labels Padronizadas**

**Settings → Labels → New label:**

| Nome | Cor | Descrição |
|------|-----|----------|
| 🐛 bug | `#d73a4a` | Algo não está funcionando |
| 📚 documentation | `#0075ca` | Melhorias na documentação |
| 🚀 enhancement | `#a2eeef` | Nova funcionalidade |
| ❓ question | `#d876e3` | Informações adicionais |
| ✅ ready-for-review | `#0e8a16` | PR pronto para revisão |
| 🚧 work-in-progress | `#fbca04` | Trabalho em andamento |
| 🔥 hotfix | `#b60205` | Correção urgente |

---

## ✅ **Verificação da Configuração**

### **Checklist de Validação:**

- [ ] **Branches protegidas:** `main` e `develop` têm proteção ativa
- [ ] **Labels criadas:** 7 labels com emojis estão disponíveis
- [ ] **Templates funcionando:** PR e Issues usam templates automáticos
- [ ] **CODEOWNERS ativo:** Revisões automáticas funcionando
- [ ] **CI/CD rodando:** Actions executam em push/PR
- [ ] **Probot Settings:** Configurações automáticas ativas
- [ ] **Colaborador adicionado:** Malthus tem acesso push

### **Teste Rápido:**

1. **Criar branch de teste:**
   ```bash
   git checkout develop
   git checkout -b test/configuracao
   echo "# Teste" > teste.md
   git add teste.md
   git commit -m "test: verificar configuração automática"
   git push origin test/configuracao
   ```

2. **Criar PR de teste:**
   - Ir para GitHub → Pull requests → New
   - Verificar se template aparece automaticamente
   - Verificar se labels estão disponíveis
   - Verificar se CI/CD executa

3. **Limpar teste:**
   ```bash
   git checkout develop
   git branch -D test/configuracao
   git push origin --delete test/configuracao
   ```

---

## 🎯 **Status Atual**

### ✅ **Já Configurado:**
- Templates de PR e Issues
- Arquivo CODEOWNERS
- Workflow CI/CD melhorado
- Configuração Probot Settings
- Script de automação
- Documentação completa

### 🔄 **Pendente:**
- Executar script de configuração
- Instalar Probot Settings
- Adicionar colaborador Malthus
- Testar workflow completo

---

## 🆘 **Solução de Problemas**

### **GitHub CLI não funciona:**
```powershell
# Reinstalar
winget uninstall GitHub.cli
winget install GitHub.cli

# Fazer login novamente
gh auth login
```

### **Probot Settings não aplica configurações:**
1. Verificar se `.github/settings.yml` existe
2. Verificar se app está instalado no repositório
3. Fazer push para trigger automático

### **CI/CD não executa:**
1. Verificar se `.github/workflows/ci-cd.yml` existe
2. Verificar se Actions estão habilitadas
3. Verificar logs em Actions tab

### **Proteção de branch não funciona:**
1. Verificar se você é admin do repositório
2. Verificar se branch existe
3. Aplicar configurações manualmente

---

## 📞 **Suporte**

Se encontrar problemas:
1. Verificar logs do script
2. Consultar documentação do GitHub
3. Verificar status das Actions
4. Revisar configurações manualmente

**Repositório pronto para colaboração após configuração! 🚀**