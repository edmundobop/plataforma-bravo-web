const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('../config/database');

async function runMilitaresMigration() {
  try {
    console.log('🔄 Executando migração da tabela militares...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'create_militares_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar todo o SQL como um bloco único
    console.log('📋 Executando script SQL completo...');
    
    try {
      await query(sqlContent);
      console.log('✅ Script SQL executado com sucesso!');
    } catch (error) {
      // Ignorar erros de "já existe" para permitir re-execução
      if (error.message.includes('already exists') || 
          error.message.includes('já existe') ||
          error.message.includes('duplicate key') ||
          error.message.includes('relation') && error.message.includes('already exists')) {
        console.log('⚠️  Alguns elementos já existem, continuando...');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Migração da tabela militares concluída com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'militares'"
    );
    
    if (result.rows[0].count > 0) {
      console.log('✅ Tabela militares confirmada no banco de dados');
      
      // Verificar dados de exemplo
      const dataResult = await query('SELECT COUNT(*) as count FROM militares');
      console.log(`📊 Registros na tabela militares: ${dataResult.rows[0].count}`);
    } else {
      console.log('❌ Tabela militares não foi encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMilitaresMigration()
    .then(() => {
      console.log('🎉 Migração finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = runMilitaresMigration;