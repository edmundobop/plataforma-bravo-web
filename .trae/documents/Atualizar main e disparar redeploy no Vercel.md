## Passos
- Sincronizar `develop` e `main`.
- Fazer merge de `develop` → `main` seguindo o guia.
- Push em `main` para disparar redeploy automático no Vercel.
- Confirmar que o build do Vercel usa `REACT_APP_API_ORIGIN=https://plataforma-bravo-web.onrender.com`.

## Comandos
- git fetch origin
- git checkout develop && git pull --ff-only origin develop
- git checkout main && git pull --ff-only origin main
- git merge --no-ff develop -m "release: merge develop into main"
- git push origin main

## Resultado esperado
- Vercel inicia redeploy do frontend com as correções de imagens e normalização de URLs.
- Após o deploy, imagens dos ícones de informação e fotos carregam no celular.