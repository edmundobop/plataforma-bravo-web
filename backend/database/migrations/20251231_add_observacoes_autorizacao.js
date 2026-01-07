const { query } = require('../config/database');

async function up() {
  await query(`
    ALTER TABLE emprestimos 
    ADD COLUMN IF NOT EXISTS observacoes_autorizacao TEXT;
  `);
}

async function down() {
  await query(`
    ALTER TABLE emprestimos 
    DROP COLUMN IF EXISTS observacoes_autorizacao;
  `);
}

module.exports = { up, down };
