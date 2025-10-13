# Script de Configuracao Automatica - Plataforma Bravo
# Execute este script para configurar automaticamente o repositorio

Write-Host "=== CONFIGURACAO AUTOMATICA DO REPOSITORIO ===" -ForegroundColor Green
Write-Host ""

# Verificar se o GitHub CLI esta instalado
if (!(Get-Command "gh" -ErrorAction SilentlyContinue)) {
    Write-Host "ATENCAO: GitHub CLI nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para continuar, voce precisa instalar o GitHub CLI:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://cli.github.com/" -ForegroundColor Cyan
    Write-Host "2. Baixe e instale o GitHub CLI para Windows" -ForegroundColor Cyan
    Write-Host "3. Reinicie o PowerShell" -ForegroundColor Cyan
    Write-Host "4. Execute este script novamente" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pressione qualquer tecla para abrir o site do GitHub CLI..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Start-Process "https://cli.github.com/"
    exit 1
}

Write-Host "GitHub CLI encontrado! Continuando..." -ForegroundColor Green
Write-Host ""

# Verificar se esta logado no GitHub CLI
$ghStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Fazendo login no GitHub CLI..." -ForegroundColor Yellow
    gh auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro no login. Execute 'gh auth login' manualmente." -ForegroundColor Red
        exit 1
    }
}

# Obter informacoes do repositorio
try {
    $repoInfo = gh repo view --json owner,name | ConvertFrom-Json
    $owner = $repoInfo.owner.login
    $repo = $repoInfo.name
    Write-Host "Configurando repositorio: $owner/$repo" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "Erro: Nao foi possivel obter informacoes do repositorio." -ForegroundColor Red
    Write-Host "Certifique-se de estar em um repositorio Git com remote configurado." -ForegroundColor Yellow
    exit 1
}

# 1. Criar labels padronizadas
Write-Host "[1/4] Configurando labels padronizadas..." -ForegroundColor Yellow
$labels = @(
    @{ name = "bug"; color = "d73a4a"; description = "Algo nao esta funcionando" },
    @{ name = "documentation"; color = "0075ca"; description = "Melhorias ou adicoes a documentacao" },
    @{ name = "enhancement"; color = "a2eeef"; description = "Nova funcionalidade ou solicitacao" },
    @{ name = "question"; color = "d876e3"; description = "Informacoes adicionais sao solicitadas" },
    @{ name = "wontfix"; color = "ffffff"; description = "Isso nao sera trabalhado" },
    @{ name = "ready-for-review"; color = "0e8a16"; description = "PR pronto para revisao" },
    @{ name = "work-in-progress"; color = "fbca04"; description = "Trabalho em andamento" },
    @{ name = "hotfix"; color = "b60205"; description = "Correcao urgente" }
)

$labelsCreated = 0
foreach ($label in $labels) {
    try {
        $labelJson = $label | ConvertTo-Json
        $labelJson | gh api repos/$owner/$repo/labels --method POST --input -
        Write-Host "  Label '$($label.name)' criada" -ForegroundColor Green
        $labelsCreated++
    } catch {
        Write-Host "  Label '$($label.name)' ja existe" -ForegroundColor Gray
    }
}
Write-Host "Labels configuradas: $labelsCreated novas, $($labels.Count - $labelsCreated) existentes" -ForegroundColor Green
Write-Host ""

# 2. Configurar configuracoes gerais do repositorio
Write-Host "[2/4] Aplicando configuracoes gerais..." -ForegroundColor Yellow
try {
    $repoSettings = @{
        allow_squash_merge = $true
        allow_merge_commit = $false
        allow_rebase_merge = $true
        delete_branch_on_merge = $true
        has_issues = $true
        has_projects = $true
        has_wiki = $true
    }
    
    $settingsJson = $repoSettings | ConvertTo-Json
    $settingsJson | gh api repos/$owner/$repo --method PATCH --input -
    Write-Host "  Configuracoes gerais aplicadas!" -ForegroundColor Green
} catch {
    Write-Host "  Erro nas configuracoes gerais: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Adicionar colaborador malthusrs
Write-Host "[3/4] Adicionando colaborador malthusrs..." -ForegroundColor Yellow
try {
    gh api repos/$owner/$repo/collaborators/malthusrs --method PUT --field permission=push
    Write-Host "  Colaborador malthusrs adicionado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "  Erro ao adicionar colaborador: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    (Pode ser que ja seja colaborador ou nao tenha permissao)" -ForegroundColor Gray
}
Write-Host ""

# 4. Verificar Probot Settings
Write-Host "[4/4] Verificando Probot Settings..." -ForegroundColor Yellow
try {
    $apps = gh api repos/$owner/$repo/installations | ConvertFrom-Json
    $probotInstalled = $apps | Where-Object { $_.app_slug -eq "settings" }
    if ($probotInstalled) {
        Write-Host "  Probot Settings ja esta instalado!" -ForegroundColor Green
    } else {
        Write-Host "  Probot Settings nao encontrado" -ForegroundColor Yellow
        Write-Host "    Instale em: https://github.com/apps/settings" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  Nao foi possivel verificar Probot Settings" -ForegroundColor Yellow
    Write-Host "    Instale manualmente em: https://github.com/apps/settings" -ForegroundColor Cyan
}
Write-Host ""

# Resumo final
Write-Host "=== CONFIGURACAO BASICA CONCLUIDA ===" -ForegroundColor Green
Write-Host ""
Write-Host "O que foi configurado:" -ForegroundColor Green
Write-Host "  - Labels padronizadas" -ForegroundColor White
Write-Host "  - Configuracoes gerais do repositorio" -ForegroundColor White
Write-Host "  - Colaborador malthusrs adicionado" -ForegroundColor White
Write-Host ""
Write-Host "Configuracoes manuais pendentes:" -ForegroundColor Yellow
Write-Host "  1. Protecao de branches (requer permissoes de admin)" -ForegroundColor White
Write-Host "  2. Instalar Probot Settings: https://github.com/apps/settings" -ForegroundColor White
Write-Host "  3. Verificar se malthusrs aceitou o convite" -ForegroundColor White
Write-Host ""
Write-Host "Para configurar protecao de branches manualmente:" -ForegroundColor Cyan
Write-Host "  1. Va em Settings > Branches no GitHub" -ForegroundColor White
Write-Host "  2. Adicione regra para 'main': Require PR reviews (1)" -ForegroundColor White
Write-Host "  3. Adicione regra para 'develop': Require PR reviews (1)" -ForegroundColor White
Write-Host ""
Write-Host "Repositorio configurado com sucesso!" -ForegroundColor Green