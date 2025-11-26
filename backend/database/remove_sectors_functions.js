/*
 * Script de saneamento de schema: remove setor_id, funcao_id e as tabelas setores/funcoes.
 * - Faz backup dos dados relevantes antes de alterar
 * - Migra valores para colunas texto/JSONB quando possível
 * - Opera com checagens de existência para rodar com segurança em diferentes esquemas
 */

const { query, transaction } = require('../config/database');

async function columnExists(table, column) {
  const res = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column]
  );
  return res.rows.length > 0;
}

async function tableExists(table) {
  const res = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`,
    [table]
  );
  return res.rows.length > 0;
}

async function run() {
  console.log('🔧 Iniciando remoção de setor_id/funcao_id e tabelas setores/funcoes...');

  await transaction(async (client) => {
    // Backup dos dados atuais
    console.log('🗄️ Criando backup de usuarios (setor/funcao)...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='usuarios_backup_sf') THEN
          CREATE TABLE usuarios_backup_sf AS 
            SELECT id, setor_id, setor, funcao_id, funcoes FROM usuarios;
          ALTER TABLE usuarios_backup_sf ADD COLUMN backup_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

    // Garantir colunas alvo
    const hasSetorText = await columnExists('usuarios', 'setor');
    if (!hasSetorText) {
      console.log('➕ Adicionando coluna texto usuarios.setor...');
      await client.query(`ALTER TABLE usuarios ADD COLUMN setor VARCHAR(120)`);
    }
    const hasFuncoesJson = await columnExists('usuarios', 'funcoes');
    if (!hasFuncoesJson) {
      console.log('➕ Adicionando coluna JSONB usuarios.funcoes...');
      await client.query(`ALTER TABLE usuarios ADD COLUMN funcoes JSONB DEFAULT '[]'`);
    }

    // Migrar setor_id -> setor (texto)
    const hasSetorId = await columnExists('usuarios', 'setor_id');
    if (hasSetorId) {
      const hasSetoresTable = await tableExists('setores');
      if (hasSetoresTable) {
        console.log('🔄 Migrando usuarios.setor_id -> usuarios.setor usando tabela setores...');
        await client.query(`
          UPDATE usuarios u
          SET setor = s.nome
          FROM setores s
          WHERE u.setor_id = s.id AND (u.setor IS NULL OR u.setor = '')
        `);
      } else {
        console.log('🔄 Migrando usuarios.setor_id -> usuarios.setor usando lista fixa...');
        await client.query(`
          UPDATE usuarios
          SET setor = CASE setor_id
            WHEN 1 THEN 'Comando'
            WHEN 2 THEN 'Subcomando'
            WHEN 3 THEN 'SAAD'
            WHEN 4 THEN 'SOP'
            WHEN 5 THEN 'SEC'
            WHEN 6 THEN 'SAT'
            WHEN 7 THEN 'PROEBOM'
            WHEN 8 THEN 'Operacional'
            ELSE setor
          END
          WHERE setor_id IS NOT NULL AND (setor IS NULL OR setor = '')
        `);
      }

      console.log('🗑️ Removendo coluna usuarios.setor_id...');
      await client.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS setor_id`);
    } else {
      console.log('ℹ️ Coluna usuarios.setor_id não existe — nada a fazer para setor.');
    }

    // Migrar funcao_id -> funcoes (JSONB)
    const hasFuncaoId = await columnExists('usuarios', 'funcao_id');
    if (hasFuncaoId) {
      const hasFuncoesTable = await tableExists('funcoes');
      if (hasFuncoesTable) {
        console.log('🔄 Migrando usuarios.funcao_id -> usuarios.funcoes usando tabela funcoes...');
        await client.query(`
          UPDATE usuarios u
          SET funcoes = CASE 
            WHEN (u.funcoes IS NULL OR u.funcoes::text = '[]') THEN jsonb_build_array(f.nome)
            ELSE u.funcoes
          END
          FROM funcoes f
          WHERE u.funcao_id = f.id
        `);
      } else {
        console.log('🔄 Ajustando usuarios.funcoes para [] quando vazio...');
        await client.query(`
          UPDATE usuarios SET funcoes = COALESCE(funcoes, '[]'::jsonb)
        `);
      }

      console.log('🗑️ Removendo coluna usuarios.funcao_id...');
      await client.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS funcao_id`);
    } else {
      console.log('ℹ️ Coluna usuarios.funcao_id não existe — nada a fazer para funcoes.');
    }

    // Remover tabelas auxiliares
    const hasSetores = await tableExists('setores');
    if (hasSetores) {
      console.log('🗑️ Removendo tabela setores...');
      await client.query(`DROP TABLE IF EXISTS setores CASCADE`);
    } else {
      console.log('ℹ️ Tabela setores não existe.');
    }

    const hasFuncoes = await tableExists('funcoes');
    if (hasFuncoes) {
      console.log('🗑️ Removendo tabela funcoes...');
      await client.query(`DROP TABLE IF EXISTS funcoes CASCADE`);
    } else {
      console.log('ℹ️ Tabela funcoes não existe.');
    }

    console.log('✅ Concluído com sucesso.');
  });
}

run().catch((err) => {
  console.error('❌ Falha ao remover setores/funcoes:', err);
  process.exit(1);
});