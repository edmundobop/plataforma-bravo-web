## Entendimento do aviso do Supabase
- O aviso “Function has a role mutable search_path” indica que a função `public.update_checklist_campo_fotos_updated_at` não fixa o `search_path` e, portanto, resolve objetos dependendo do `search_path` do papel (role) chamador.
- Riscos: resolução incorreta de tabelas/esquemas, comportamento diferente por role, e potencial superfície para problemas de segurança.
- Boas práticas: sempre qualificar com esquema (`public.tabela`) e/ou fixar `search_path` dentro da função ou via `ALTER FUNCTION SET search_path`.

## Relação com imagens no mobile
- Esse aviso não costuma causar falhas de exibição de imagens.
- Problemas de imagens no mobile geralmente vêm de CSP (Content Security Policy), CORS, mixed content (HTTP em página HTTPS), ou URLs assinadas expiradas.
- No nosso backend, a CSP de `helmet` permite `https://*.supabase.co` em `imgSrc`, mas os arquivos públicos da Storage hoje usam `https://*.supabaseusercontent.com`. Em mobile, isso é frequentemente bloqueado.

## Plano de ação
### 1) Ajustar a função para search_path estável
- Verificar a assinatura exata da função em `pg_proc` e aplicar:
  - `ALTER FUNCTION public.update_checklist_campo_fotos_updated_at(<assinatura>) SET search_path = public, pg_temp;`
- Garantir que dentro da função todos os objetos estejam qualificados com `public.`.
- Alternativa: incluir `SET search_path TO public, pg_temp;` no corpo da função (se linguagem suportar) e revisar referências.

### 2) Atualizar CSP para imagens da Supabase Storage
- Incluir `https://*.supabaseusercontent.com` em `imgSrc` e, se necessário, em `connectSrc`.
- Manter `https://*.supabase.co` e os domínios do frontend. Evitar permitir fontes muito amplas.
- Revisar produção: garantir que as mesmas diretivas estão ativas (Render/Vercel) via envs.

### 3) Verificações focadas em mobile
- Testar, pelo DevTools remoto do celular, o carregamento de um URL público da Storage e observar códigos (403/200) e bloqueios de CSP.
- Checar se os URLs são HTTPS (evitar mixed content) e se não estão expirados (no caso de signed URLs).
- Validar que o bucket está com política pública quando esperado, ou que o app gera e usa URLs assinadas corretamente.

### 4) Validação
- Após ajustes, abrir o formulário de checklists no celular e confirmar que os ícones de informação exibem as imagens sem prompts.
- Conferir Supabase: o aviso do `search_path` deve sumir após fix (ou ser silenciado pela regra).

## Entregáveis
- Alteração da função com `ALTER FUNCTION ... SET search_path` e revisão de qualificação de objetos.
- Atualização da CSP no backend para incluir `https://*.supabaseusercontent.com`.
- Testes em mobile com verificação de rede e CSP.

Confirma aplicar essas mudanças agora?