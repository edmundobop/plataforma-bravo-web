## Problema
- Imagens de ajuda/fotos estão gravadas ou retornadas com URLs absolutas `http://localhost:5000/...`.
- Em produção (Vercel, HTTPS), isso causa Mixed Content e, no celular, `localhost` não resolve.

## Ações
### 1) Padronizar origem do backend no frontend
- Garantir que o frontend use `REACT_APP_API_ORIGIN=https://plataforma-bravo-web.onrender.com` no Vercel.
- Manter fallback já implementado que detecta `vercel.app` e usa Render.

### 2) Normalizar URLs ao renderizar
- Já ajustado: reescrever qualquer `localhost:5000` para a origem certa no `Checklists.js` e `ChecklistViatura.js`.
- Validar no build do Vercel após deploy.

### 3) Corrigir dados existentes no banco
- Rodar updates no Supabase para substituir `http://localhost:5000` por `https://plataforma-bravo-web.onrender.com`:
  - `UPDATE template_categorias SET imagem_url = REPLACE(imagem_url, 'http://localhost:5000', 'https://plataforma-bravo-web.onrender.com') WHERE imagem_url LIKE 'http://localhost:5000%';`
  - `UPDATE template_itens SET imagem_url = REPLACE(imagem_url, 'http://localhost:5000', 'https://plataforma-bravo-web.onrender.com') WHERE imagem_url LIKE 'http://localhost:5000%';`
  - `UPDATE checklist_itens SET fotos = to_jsonb(ARRAY(SELECT jsonb_set(elem, '{url}', to_jsonb(REPLACE(elem->>'url','http://localhost:5000','https://plataforma-bravo-web.onrender.com'))) FROM jsonb_array_elements(fotos))) WHERE fotos IS NOT NULL AND fotos::text LIKE '%http://localhost:5000%';`

### 4) Backend: preferir caminhos relativos
- Conferir rotas de upload (`/api/upload`) e templates para retornar apenas caminhos relativos (`/uploads/...`). Já retornam relativo; manter este padrão.

### 5) Deploy e validação
- Atualizar env no Vercel.
- Disparar redeploy do frontend.
- Testar em celular real (sem localhost) e confirmar carregamento.

## Entregáveis
- Atualização de env no Vercel.
- Execução dos updates no banco.
- Redeploy do frontend.
- Verificação de sucesso no dispositivo.

Confirmo aplicar esses passos agora?