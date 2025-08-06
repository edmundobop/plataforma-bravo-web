# 🤖 Script de Configuração Automática - Plataforma Bravo
# Execute este script para configurar automaticamente o repositório

Write-Host "🚀 Iniciando configuração automática do repositório..." -ForegroundColor Green

# Verificar se o GitHub CLI está instalado
if (!(Get-Command "gh" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI não encontrado. Instalando..." -ForegroundColor Yellow
    winget install GitHub.cli
    Write-Host "✅ GitHub CLI instalado!" -ForegroundColor Green
}

# Verificar se está logado no GitHub CLI
$ghStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔐 Fazendo login no GitHub CLI..." -ForegroundColor Yellow
    gh auth login
}

# Obter informações do repositório
$repoInfo = gh repo view --json owner,name | ConvertFrom-Json
$owner = $repoInfo.owner.login
$repo = $repoInfo.name

Write-Host "📋 Configurando repositório: $owner/$repo" -ForegroundColor Cyan

# 1. Configurar proteção da branch main
Write-Host "🔒 Configurando proteção da branch main..." -ForegroundColor Yellow
try {
    $protectionConfig = @{
        required_status_checks = @{
            strict = $true
            contexts = @("🧪 Tests", "🔍 Code Quality", "🔒 Security Audit")
        }
        enforce_admins = $false
        required_pull_request_reviews = @{
            required_approving_review_count = 1
            dismiss_stale_reviews = $true
            require_code_owner_reviews = $true
        }
        restrictions = $null
        allow_force_pushes = $false
        allow_deletions = $false
    }
    
    $protectionJson = $protectionConfig | ConvertTo-Json -Depth 10
    gh api repos/$owner/$repo/branches/main/protection --method PUT --input - <<< $protectionJson
    Write-Host "✅ Proteção da branch main configurada!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Erro ao configurar proteção da main: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Configurar proteção da branch develop
Write-Host "🔒 Configurando proteção da branch develop..." -ForegroundColor Yellow
try {
    $developProtection = @{
        required_status_checks = @{
            strict = $false
            contexts = @()
        }
        enforce_admins = $false
        required_pull_request_reviews = @{
            required_approving_review_count = 1
            dismiss_stale_reviews = $false
            require_code_owner_reviews = $false
        }
        restrictions = $null
        allow_force_pushes = $false
        allow_deletions = $false
    }
    
    $developJson = $developProtection | ConvertTo-Json -Depth 10
    gh api repos/$owner/$repo/branches/develop/protection --method PUT --input - <<< $developJson
    Write-Host "✅ Proteção da branch develop configurada!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Erro ao configurar proteção da develop: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Configurar labels padronizadas
Write-Host "🏷️ Configurando labels padronizadas..." -ForegroundColor Yellow
$labels = @(
    @{ name = "🐛 bug"; color = "d73a4a"; description = "Algo não está funcionando" },
    @{ name = "📚 documentation"; color = "0075ca"; description = "Melhorias ou adições à documentação" },
    @{ name = "🚀 enhancement"; color = "a2eeef"; description = "Nova funcionalidade ou solicitação" },
    @{ name = "❓ question"; color = "d876e3"; description = "Informações adicionais são solicitadas" },
    @{ name = "🔧 wontfix"; color = "ffffff"; description = "Isso não será trabalhado" },
    @{ name = "✅ ready-for-review"; color = "0e8a16"; description = "PR pronto para revisão" },
    @{ name = "🚧 work-in-progress"; color = "fbca04"; description = "Trabalho em andamento" },
    @{ name = "🔥 hotfix"; color = "b60205"; description = "Correção urgente" }
)

foreach ($label in $labels) {
    try {
        $labelJson = $label | ConvertTo-Json
        gh api repos/$owner/$repo/labels --method POST --input - <<< $labelJson
        Write-Host "  ✅ Label '$($label.name)' criada" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠️ Label '$($label.name)' já existe ou erro: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 4. Configurar configurações gerais do repositório
Write-Host "⚙️ Configurando configurações gerais..." -ForegroundColor Yellow
try {
    $repoSettings = @{
        allow_squash_merge = $true
        allow_merge_commit = $false
        allow_rebase_merge = $true
        delete_branch_on_merge = $true
        has_issues = $true
        has_projects = $true
        has_wiki = $false
    }
    
    $settingsJson = $repoSettings | ConvertTo-Json
    gh api repos/$owner/$repo --method PATCH --input - <<< $settingsJson
    Write-Host "✅ Configurações gerais aplicadas!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Erro ao configurar settings: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Verificar se Probot Settings está instalado
Write-Host "🤖 Verificando Probot Settings..." -ForegroundColor Yellow
try {
    $apps = gh api repos/$owner/$repo/installation | ConvertFrom-Json
    $probotInstalled = $apps | Where-Object { $_.app_slug -eq "settings" }
    
    if ($probotInstalled) {
        Write-Host "✅ Probot Settings já está instalado!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Probot Settings não encontrado. Instale manualmente em:" -ForegroundColor Yellow
        Write-Host "   https://github.com/apps/settings" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "⚠️ Não foi possível verificar Probot Settings" -ForegroundColor Yellow
}

# 6. Commit e push das configurações
Write-Host "📤 Fazendo commit das configurações..." -ForegroundColor Yellow
try {
    git add .
    git commit -m "feat: configurar automação completa do repositório

- Adicionar templates de PR e Issues
- Configurar CODEOWNERS
- Melhorar workflow CI/CD
- Adicionar configuração Probot Settings
- Criar script de configuração automática"
    git push origin develop
    Write-Host "✅ Configurações commitadas e enviadas!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Erro no commit: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Resumo final
Write-Host "
🎉 CONFIGURAÇÃO AUTOMÁTICA CONCLUÍDA!" -ForegroundColor Green
Write-Host "" 
Write-Host "📋 O que foi configurado:" -ForegroundColor Cyan
Write-Host "  ✅ Proteção das branches main e develop" -ForegroundColor White
Write-Host "  ✅ Labels padronizadas" -ForegroundColor White
Write-Host "  ✅ Templates de PR e Issues" -ForegroundColor White
Write-Host "  ✅ Arquivo CODEOWNERS" -ForegroundColor White
Write-Host "  ✅ Workflow CI/CD melhorado" -ForegroundColor White
Write-Host "  ✅ Configurações gerais do repositório" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Instalar Probot Settings (se não instalado)" -ForegroundColor White
Write-Host "  2. Adicionar colaborador Malthus" -ForegroundColor White
Write-Host ""
Write-Host "🤝 Adicionando colaborador Malthus..." -ForegroundColor Yellow
try {
    gh api repos/$owner/$repo/collaborators/malthusrs --method PUT --field permission=push
    Write-Host "✅ Colaborador malthusrs adicionado com sucesso!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Erro ao adicionar colaborador: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host "  3. Testar workflow com um PR" -ForegroundColor White
Write-Host "  4. Começar desenvolvimento nas branches de feature" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Links úteis:" -ForegroundColor Cyan
Write-Host "  • Probot Settings: https://github.com/apps/settings" -ForegroundColor White
Write-Host "  • Repositório: https://github.com/$owner/$repo" -ForegroundColor White
Write-Host "  • Actions: https://github.com/$owner/$repo/actions" -ForegroundColor White

Write-Host "
🚀 Repositório pronto para colaboração!" -ForegroundColor Green