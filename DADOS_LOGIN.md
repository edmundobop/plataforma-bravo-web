# 📋 Dados de Login - Plataforma Bravo CBMGO

## ⚠️ Status Atual do Sistema

Atualmente, **não há usuários cadastrados** no sistema porque o banco de dados PostgreSQL não está configurado ou em execução.

## 🔧 Configuração Necessária

### 1. Instalar e Configurar PostgreSQL

1. **Instalar PostgreSQL**:
   - Baixe e instale o PostgreSQL em: https://www.postgresql.org/download/
   - Durante a instalação, defina uma senha para o usuário `postgres`
   - Anote a porta (padrão: 5432)

2. **Criar o Banco de Dados**:
   ```sql
   CREATE DATABASE cbmgo_db;
   ```

3. **Atualizar as credenciais no arquivo `.env`**:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=cbmgo_db
   DB_USER=postgres
   DB_PASSWORD=SUA_SENHA_AQUI
   ```

### 2. Executar Migrações e Criar Usuário Admin

1. **Executar migrações** (criar tabelas):
   ```bash
   cd backend
   node database/migrate.js
   ```

2. **Criar usuário administrador**:
   ```bash
   node create_admin.js
   ```

## 🔑 Dados de Login Padrão (Após Configuração)

Após executar o script `create_admin.js`, será criado um usuário administrador com os seguintes dados:

### 👤 **Administrador do Sistema**
```
📧 Email: admin@cbmgo.gov.br
🔒 Senha: admin123
🆔 Matrícula: ADMIN001
👤 Nome: Administrador do Sistema
🎖️ Posto: Coronel
🏢 Setor: Administração
📱 Telefone: (62) 99999-9999
🔐 Role: admin
```

## 🚨 Importante

- **ALTERE A SENHA** após o primeiro login!
- O usuário administrador pode criar outros usuários através da interface
- Apenas administradores podem registrar novos usuários

## 📝 Tipos de Usuário

### 🔴 **Admin (Administrador)**
- Acesso total ao sistema
- Pode criar, editar e excluir usuários
- Pode alterar roles de outros usuários
- Acesso a todos os módulos

### 🟡 **Gestor**
- Pode visualizar e gerenciar usuários (limitado)
- Acesso a relatórios e estatísticas
- Pode aprovar solicitações
- Acesso a todos os módulos operacionais

### 🟢 **Operador**
- Acesso aos módulos operacionais
- Pode criar e editar registros
- Não pode gerenciar usuários
- Acesso limitado a relatórios

## 🔄 Como Criar Novos Usuários

1. **Faça login como administrador**
2. **Acesse o módulo "Usuários"** no menu lateral
3. **Clique em "+" (Adicionar Usuário)**
4. **Preencha os dados obrigatórios**:
   - Nome completo
   - Email (será usado para login)
   - Matrícula
   - Senha (mínimo 6 caracteres)
   - Papel (admin/gestor/operador)
   - Setor
   - Telefone (opcional)

## 🌐 URLs de Acesso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Documentação da API**: http://localhost:5000/api/docs (se configurado)

## 🛠️ Comandos Úteis

```bash
# Iniciar backend
cd backend
npm start

# Iniciar frontend
cd frontend
npm start

# Executar migrações
cd backend
node database/migrate.js

# Criar usuário admin
cd backend
node create_admin.js

# Verificar usuários existentes
cd backend
node check_users.js
```

## 📞 Suporte

Em caso de problemas:
1. Verifique se o PostgreSQL está rodando
2. Confirme as credenciais no arquivo `.env`
3. Execute as migrações novamente
4. Verifique os logs do backend para erros específicos

---

**Desenvolvido para o Corpo de Bombeiros Militar de Goiás (CBMGO)**