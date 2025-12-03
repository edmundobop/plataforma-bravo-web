# Guia de Versionamento Unificado — Plataforma Bravo

## Branches
- `main`: produção, código estável. Push direto permitido para autorizados; PR recomendado para mudanças grandes. Backup automático a cada push.
- `develop`: integração contínua. Push direto permitido para você e Malthus.
- `feature/*`: desenvolvimento de funcionalidades. Integração via PR em `develop`.
- `hotfix/*`: correções urgentes a partir de `main`, depois merge também em `develop`.

## Regras Essenciais
- Sempre sincronize antes de trabalhar: `git checkout develop && git pull origin develop`.
- Commits frequentes e descritivos seguindo a convenção.
- Rebase/merge frequente da `develop` nas features para evitar conflitos.
- Evite reescrever histórico da `main`; use PR de restauração com backup quando necessário.

## Fluxos Rápidos
### Nova Feature
```bash
git checkout develop && git pull origin develop
git checkout -b feature/nome-da-feature
# trabalhar, commitar
git push origin feature/nome-da-feature
# abrir PR: feature/nome-da-feature → develop
```

### Hotfix Urgente
```bash
git checkout main
git checkout -b hotfix/correcao-critica
# corrigir e commitar
git checkout main && git merge hotfix/correcao-critica
git checkout develop && git merge hotfix/correcao-critica
```

### Release
```bash
git checkout develop
git checkout -b release/vX.Y.Z
# ajustes finais e testes
git checkout main && git merge release/vX.Y.Z && git tag vX.Y.Z
git checkout develop && git merge release/vX.Y.Z
```

## Convenção de Commits
Formato: `tipo(escopo): descrição`
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`, `style`, `refactor`, `test`, `chore`
Exemplos:
```bash
feat(operacional): adicionar submenu de usuários
fix(auth): corrigir validação de token
```

## Pull Requests
- Template simples: descrição, checklist de testes, como testar, screenshots se aplicável.
- Review cruzado entre você e Malthus quando houver PR.
- Após merge, limpar a branch quando concluído.

## Backup e Restauração da `main`
- A cada push na `main`, é criada tag anotada: `backup/main/<YYYYMMDD-HHMMSS>-<sha7>` (mantém últimas 20).
```bash
git fetch --tags
git tag -l 'backup/main/*' --sort=-creatordate | head -n 10
```
- Restaurar via PR:
```bash
git checkout -b restore/main-<timestamp> <tag-de-backup>
# validar, abrir PR "restore: voltar main para <tag>"
```

## Comandos Essenciais
```bash
git status            # estado atual
git diff              # diferenças
git log --oneline     # histórico
git fetch --prune     # sincronizar e limpar refs
git stash / stash pop # trabalho temporário
git reset --soft HEAD~1 # desfazer último commit
```

## Conflitos e Rebase
```bash
git checkout develop && git pull origin develop
git checkout feature/sua-branch
git rebase develop
# resolver conflitos
git rebase --continue
git push --force-with-lease origin feature/sua-branch
```

## Rotina Diária Sugerida
- Início: atualizar `develop` e rebase na sua feature.
- Durante: commits frequentes e push diário.
- Fim: abrir PRs quando pronto para integrar.

