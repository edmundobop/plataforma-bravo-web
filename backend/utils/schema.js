const { query } = require('../config/database');

// Detecta dinamicamente qual coluna de unidade existe na tabela usuarios
// Prioridade: unidade_lotacao_id -> unidade_id -> unidades_id
async function getUsuariosUnidadeColumn() {
  try {
    const res = await query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'usuarios' 
       AND column_name IN ('unidade_id', 'unidade_lotacao_id', 'unidades_id')`
    );
    const cols = res.rows.map(r => r.column_name);
    // Preferir coluna de lotação explícita quando existir
    if (cols.includes('unidade_lotacao_id')) return 'unidade_lotacao_id';
    if (cols.includes('unidade_id')) return 'unidade_id';
    if (cols.includes('unidades_id')) return 'unidades_id';
    return null;
  } catch (err) {
    console.error('Erro ao detectar coluna de unidade em usuarios:', err.message);
    return null;
  }
}

// Verifica se uma coluna existe em uma tabela
async function columnExists(tableName, columnName) {
  try {
    const res = await query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
      [tableName, columnName]
    );
    return res.rows.length > 0;
  } catch (err) {
    console.error(`Erro ao verificar coluna ${tableName}.${columnName}:`, err.message);
    return false;
  }
}

// Verifica se uma tabela existe
async function tableExists(tableName) {
  try {
    const res = await query(
      `SELECT 1 FROM information_schema.tables 
       WHERE table_name = $1 LIMIT 1`,
      [tableName]
    );
    return res.rows.length > 0;
  } catch (err) {
    console.error(`Erro ao verificar tabela ${tableName}:`, err.message);
    return false;
  }
}

module.exports = { getUsuariosUnidadeColumn, columnExists, tableExists };