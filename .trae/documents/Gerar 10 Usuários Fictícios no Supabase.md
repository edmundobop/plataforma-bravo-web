## Objetivo
- Inserir 10 usuários fictícios no banco `usuarios` do Supabase, usando o SQL fornecido, com senha "Senha123!" hash via `pgcrypto`.

## Estratégia
- Habilitar a extensão `pgcrypto` (necessária para `crypt`/`gen_salt('bf')`).
- Adaptar o SQL para evitar duplicidades (emails/matrículas) usando `WHERE NOT EXISTS`.
- Executar via um script Node (`backend/scripts/seed_fake_users_supabase.js`) reutilizando a conexão `pg` do backend.
- Validar inserções (contagem e listagem dos novos emails/matrículas).

## SQL Base (com proteção contra duplicidade)
- Pré: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- Inserção (mantém sua estrutura de `unidade_ref`, `perfil_operador`):
```
WITH unidade_ref AS (
  SELECT id AS unidade_id FROM unidades WHERE ativa = true ORDER BY id LIMIT 1
),
perfil_operador AS (
  SELECT id AS perfil_id FROM perfis WHERE nome = 'Operador' LIMIT 1
)
INSERT INTO usuarios (
  nome_completo, nome, email, senha_hash, cpf, telefone, tipo, data_nascimento,
  data_incorporacao, posto_graduacao, nome_guerra, matricula, ativo, perfil_id,
  unidade_id, unidade_lotacao_id, setor, created_at, updated_at
)
SELECT
  novo.nome_completo,
  novo.nome_curto,
  novo.email,
  crypt('Senha123!', gen_salt('bf')),
  novo.cpf,
  novo.telefone,
  'militar',
  novo.data_nascimento,
  novo.data_incorporacao,
  novo.posto,
  novo.nome_guerra,
  novo.matricula,
  true,
  perfil_operador.perfil_id,
  unidade_ref.unidade_id,
  unidade_ref.unidade_id,
  novo.setor,
  NOW(), NOW()
FROM ( /* os 10 registros VALUES do seu arquivo */ ) AS novo(
  nome_completo, nome_curto, email, cpf, telefone, data_nascimento,
  data_incorporacao, posto, nome_guerra, matricula, setor
)
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios u WHERE u.email = novo.email OR u.matricula = novo.matricula
);
```

## Passos
1) Criar o script `seed_fake_users_supabase.js` que:
- Conecta via `pg` usando `DB_*` + `DB_SSL=true`.
- Executa `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
- Executa o INSERT acima com os 10 valores.
- Faz um `SELECT count(*)` dos emails/matrículas inseridos.

2) Executar o script contra o Supabase (com suas variáveis `DB_*` no terminal).

3) Validar
- Contagem dos inseridos e amostra de emails/matrículas retornados.

4) Entregáveis
- Logs de execução (extensão habilitada, inserções realizadas, contagem/listagem).
- Sem commits permanentes (apenas arquivos utilitários, se aprovado).

## Segurança
- Não incluir senhas/credenciais reais em arquivos; usar somente variáveis de ambiente.

Confirma que posso implementar e executar esses passos agora? 