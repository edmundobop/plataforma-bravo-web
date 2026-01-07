const { query } = require('../config/database');

async function up() {
  await query(`
    ALTER TABLE emprestimos 
    ADD COLUMN IF NOT EXISTS assinatura_solicitante TEXT;
  `);
}

async function down() {
  await query(`
    ALTER TABLE emprestimos 
    DROP COLUMN IF EXISTS assinatura_solicitante;
  `);
}

module.exports = { up, down };
