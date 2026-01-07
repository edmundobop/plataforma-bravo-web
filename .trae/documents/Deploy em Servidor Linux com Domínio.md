## Objetivo

Colocar o sistema para rodar em um servidor Linux, acessível pelo seu domínio, com HTTPS.

## Pré‑requisitos

* Um servidor Linux com IP público (ex.: Ubuntu).

* Acesso SSH ao servidor.

* Seu domínio gerenciado em algum provedor de DNS.

## Passos (resumo, sem jargão)

1. Preparar o servidor

* Atualizar e instalar: `Node.js`, `Nginx` e `Certbot` (para HTTPS).

* Abrir portas 80 (HTTP) e 443 (HTTPS).

1. Subir o backend (API)

* Copiar a pasta `backend` para o servidor.

* Configurar variáveis em um arquivo `.env` (acessos ao banco, URLs, chaves).

* Instalar dependências: `npm install`.

* Iniciar e manter rodando com um gerenciador simples (ex.: `pm2 start server.js`).

1. Subir o frontend (site)

* Copiar a pasta `frontend` para o servidor.

* Ajustar a variável `REACT_APP_API_ORIGIN` para apontar para seu domínio (ex.: `https://seu-dominio.com`).

* Gerar os arquivos do site: `npm install` e `npm run build`.

* Configurar o Nginx para servir essa pasta de build como site.

1. Conectar site e API

* No Nginx: enviar as requisições de `/api` para o backend (porta da API, ex.: 5000).

* O restante abre o site do `frontend`.

1. Domínio e HTTPS

* No DNS do seu domínio: criar um registro `A` apontando para o IP do servidor.

* Emitir o certificado gratuito com `Certbot` e ativar HTTPS.

* Renovação automática fica configurada pelo `Certbot`.

1. Testes rápidos

* Acessar `https://seu-dominio.com`.

* Entrar no sistema e checar se listas, uploads e imagens abrem normalmente.

## Alternativa simples (Docker)

* Pode usar `docker-compose` com três serviços: `frontend`, `backend` e `nginx`.

* A ideia é a mesma: Nginx serve o site e encaminha `/api` para a API.

## Resultado esperado

* Seu sistema abre em `https://seu-dominio.com` com segurança (HTTPS).

* O backend e o frontend rodam no mesmo servidor, estáveis e com renovação automática do certificado.

