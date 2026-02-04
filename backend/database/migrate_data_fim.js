const { query } = require('../config/database');

async function migrate() {
  try {
    console.log('Iniciando migração de data_fim para manutencoes...');
    
    // Verificar se a coluna já existe
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'manutencoes' AND column_name = 'data_fim'
    `;
    
    const result = await query(checkQuery);
    
    if (result.rows.length === 0) {
      console.log('Adicionando coluna data_fim...');
      await query('ALTER TABLE manutencoes ADD COLUMN data_fim TIMESTAMP');
      console.log('Coluna data_fim adicionada com sucesso!');
    } else {
      console.log('Coluna data_fim já existe.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrate();
