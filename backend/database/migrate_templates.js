require('dotenv').config();
const { query } = require('../config/database');

const createTemplatesTables = async () => {
  try {
    console.log('🔄 Iniciando migração das tabelas de templates...');

    // Criar tabela principal de templates
    await query(`
      CREATE TABLE IF NOT EXISTS checklist_templates (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        tipo_viatura VARCHAR(10) NOT NULL CHECK (tipo_viatura IN ('ABTF', 'ABT', 'UR', 'ASA', 'MOB', 'AV')),
        criado_por INTEGER REFERENCES usuarios(id),
        tenant_id INTEGER NOT NULL,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Criar tabela de categorias dos templates
    await query(`
      CREATE TABLE IF NOT EXISTS template_categorias (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES checklist_templates(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        imagem_url VARCHAR(500),
        ordem INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Criar tabela de itens das categorias
    await query(`
      CREATE TABLE IF NOT EXISTS template_itens (
        id SERIAL PRIMARY KEY,
        categoria_id INTEGER REFERENCES template_categorias(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'checkbox' CHECK (tipo IN ('checkbox', 'text', 'number', 'photo', 'rating')),
        obrigatorio BOOLEAN DEFAULT false,
        ordem INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Adicionar coluna template_id na tabela checklist_viaturas (nome correto da tabela)
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_viaturas' AND column_name='template_id') THEN
          ALTER TABLE checklist_viaturas ADD COLUMN template_id INTEGER REFERENCES checklist_templates(id);
        END IF;
      END $$;
    `);

    // Criar índices para performance
    await query('CREATE INDEX IF NOT EXISTS idx_templates_tenant ON checklist_templates(tenant_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_templates_tipo_viatura ON checklist_templates(tipo_viatura)');
    await query('CREATE INDEX IF NOT EXISTS idx_categorias_template ON template_categorias(template_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_itens_categoria ON template_itens(categoria_id)');

    console.log('✅ Migração das tabelas de templates concluída com sucesso!');
    console.log('📋 Tabelas criadas:');
    console.log('   - checklist_templates');
    console.log('   - template_categorias');
    console.log('   - template_itens');
    console.log('   - Coluna template_id adicionada em checklists');
    console.log('   - Índices de performance criados');

  } catch (error) {
    console.error('❌ Erro na migração das tabelas de templates:', error);
    throw error;
  }
};

// Executar migração se chamado diretamente
if (require.main === module) {
  createTemplatesTables()
    .then(() => {
      console.log('🎉 Migração de templates finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { createTemplatesTables };