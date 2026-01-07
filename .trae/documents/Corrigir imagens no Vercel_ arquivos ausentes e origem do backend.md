## Causa provável
- Os arquivos de imagem existem apenas no `localhost` (diretório `backend/uploads/fotos`). Em produção, a URL aponta para o Render (`https://plataforma-bravo-web.onrender.com/uploads/...`), mas esses arquivos não estão lá, resultando em 404 no Vercel.
- O console já não acusa mais CSP; o problema é disponibilidade dos arquivos em produção.

## Plano
### 1) Garantir origem correta do backend no Vercel
- Definir `REACT_APP_API_ORIGIN=https://plataforma-bravo-web.onrender.com` nas envs do Vercel.
- Redeploy (já disparado com o push em `main`).

### 2) Migrar uploads para Storage (evitar dependência de disco)
- Criar/usar bucket público na Supabase (`uploads` ou `checklists`).
- Atualizar `backend/routes/upload.js` para enviar arquivos ao Storage e retornar a URL pública (em vez de salvar no disco).
- Manter CSP com `https://*.supabaseusercontent.com` (já ajustado).

### 3) Backfill dos arquivos existentes
- Escrever script que:
  - Lê `backend/uploads/fotos` local e faz upload para o bucket.
  - Atualiza banco:
    - `template_categorias.imagem_url` → URL pública da Supabase.
    - `template_itens.imagem_url` → URL pública da Supabase.
    - `checklist_itens.fotos` (JSON) → regravar `url` para a URL pública.

### 4) Validação
- Testar pelo celular acessando `https://plataforma-bravo-web.vercel.app` e abrir os ícones de informação e fotos.
- Conferir que novas fotos também são salvas/servidas via Supabase Storage.

### 5) Entrega
- Ajuste de código (upload para Storage), script de migração e atualização das envs do Vercel.

Posso implementar agora: alterar upload para Storage, criar o script de backfill e preparar as envs.