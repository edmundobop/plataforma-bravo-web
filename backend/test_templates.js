const { query } = require('./config/database');

async function testTemplatesByViatura() {
  try {
    const viaturaId = 1;
    
    // Buscar tipo da viatura
    const viaturaResult = await query(
      'SELECT tipo FROM viaturas WHERE id = $1',
      [viaturaId]
    );
    
    if (viaturaResult.rows.length === 0) {
      console.log('Viatura não encontrada');
      return;
    }
    
    const tipoViatura = viaturaResult.rows[0].tipo;
    console.log('Tipo da viatura:', tipoViatura);
    
    // Buscar templates para este tipo
    const templatesResult = await query(
      `SELECT * FROM checklist_templates 
       WHERE tipo_viatura = $1 AND ativo = true 
       ORDER BY padrao DESC, created_at DESC`,
      [tipoViatura]
    );
    
    console.log('Templates encontrados:', templatesResult.rows.length);
    templatesResult.rows.forEach(template => {
      console.log(`- ID: ${template.id}, Nome: ${template.nome}, Padrão: ${template.padrao}`);
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

testTemplatesByViatura();