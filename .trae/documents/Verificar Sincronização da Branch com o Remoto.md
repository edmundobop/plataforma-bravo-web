## Passos
- Confirmar a branch atual: `git branch --show-current`
- Ver o estado local vs remoto: `git status -uno`
- Atualizar referências remotas: `git fetch --all --prune`
- Checar se está à frente/atrás do remoto: `git status -uno` ou `git rev-list --left-right --count origin/$(git branch --show-current)...$(git branch --show-current)`
- Se houver atualizações remotas, puxar com segurança: `git pull --ff-only`
- Se estiver na `main` mas quiser sincronizar `develop`: `git checkout develop` e `git pull --ff-only`
- Se houver alterações locais não commitadas, guardar antes de puxar: `git stash -u -m "auto-sync"` e depois `git stash pop`
- Verificar resultado: `git log --oneline --decorate -n 5` e confirmar que HEAD coincide com `origin/<branch>`

## Observações
- No PowerShell, execute cada comando em linhas separadas (evite `&&`).
- Não farei mudanças; apenas verificarei e relatarei o estado. Confirme para eu executar os comandos e te devolver o diagnóstico objetivo.