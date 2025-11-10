const { query } = require('../config/database');

const createMultiTenantTables = async () => {
  try {
    console.log('🔄 Iniciando migração multi-tenant...');

    // Tabela de unidades (quartéis)
    await query(`
      CREATE TABLE IF NOT EXISTS unidades (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(20) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL, -- 'quartel', 'subgrupamento', 'comando'
        endereco TEXT,
        cidade VARCHAR(100),
        estado VARCHAR(2) DEFAULT 'GO',
        telefone VARCHAR(20),
        email VARCHAR(255),
        comandante VARCHAR(255),
        ativa BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Adicionar coluna unidade_id na tabela usuarios existente
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='unidade_lotacao_id') THEN
          ALTER TABLE usuarios ADD COLUMN unidade_lotacao_id INTEGER REFERENCES unidades(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='ala') THEN
          ALTER TABLE usuarios ADD COLUMN ala VARCHAR(20);
        END IF;
      END $$;
    `);

    // Tabela de relacionamento usuário-unidade (para usuários que têm acesso a múltiplas unidades)
    await query(`
      CREATE TABLE IF NOT EXISTS membros_unidade (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        unidade_id INTEGER REFERENCES unidades(id) ON DELETE CASCADE,
        role_unidade VARCHAR(50) DEFAULT 'membro', -- 'comandante', 'gestor', 'membro'
        ativo BOOLEAN DEFAULT true,
        data_inicio DATE DEFAULT CURRENT_DATE,
        data_fim DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id, unidade_id)
      )
    `);

    // Adicionar coluna unidade_id nas tabelas principais para filtros multi-tenant
    const tabelas_com_unidade = [
      'viaturas',
      'equipamentos', 
      'produtos',
      'escalas',
      'checklist_viaturas',
      'manutencoes'
    ];

    for (const tabela of tabelas_com_unidade) {
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${tabela}' AND column_name='unidade_id') THEN
            ALTER TABLE ${tabela} ADD COLUMN unidade_id INTEGER REFERENCES unidades(id);
          END IF;
        END $$;
      `);
    }

    // Tabela para registros de AC4 cross-unit
    await query(`
      CREATE TABLE IF NOT EXISTS ac4_registros (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        unidade_origem_id INTEGER REFERENCES unidades(id),
        unidade_destino_id INTEGER REFERENCES unidades(id),
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        tipo_servico VARCHAR(100),
        observacoes TEXT,
        status VARCHAR(50) DEFAULT 'ativo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices para performance multi-tenant
    await query('CREATE INDEX IF NOT EXISTS idx_unidades_codigo ON unidades(codigo)');
    await query('CREATE INDEX IF NOT EXISTS idx_unidades_ativa ON unidades(ativa)');
    await query('CREATE INDEX IF NOT EXISTS idx_membros_usuario_unidade ON membros_unidade(usuario_id, unidade_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_membros_unidade_ativo ON membros_unidade(unidade_id, ativo)');
    await query('CREATE INDEX IF NOT EXISTS idx_usuarios_unidade_lotacao ON usuarios(unidade_lotacao_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_viaturas_unidade ON viaturas(unidade_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_equipamentos_unidade ON equipamentos(unidade_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_produtos_unidade ON produtos(unidade_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_escalas_unidade ON escalas(unidade_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_unidade ON checklist_viaturas(unidade_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_ac4_usuario_unidade_periodo ON ac4_registros(usuario_id, unidade_destino_id, data_inicio, data_fim)');

    // Inserir unidades de exemplo
    await query(`
      INSERT INTO unidades (codigo, nome, tipo, cidade, comandante) VALUES
      ('1GBM', '1º Grupamento de Bombeiros Militar', 'quartel', 'Goiânia', 'Ten. Cel. João Silva'),
      ('2GBM', '2º Grupamento de Bombeiros Militar', 'quartel', 'Aparecida de Goiânia', 'Maj. Maria Santos'),
      ('3GBM', '3º Grupamento de Bombeiros Militar', 'quartel', 'Anápolis', 'Cap. Pedro Oliveira'),
      ('CBMGO', 'Comando Geral CBMGO', 'comando', 'Goiânia', 'Cel. Carlos Mendes')
      ON CONFLICT (codigo) DO NOTHING
    `);

    console.log('✅ Migração multi-tenant concluída com sucesso!');
    console.log('📋 Tabelas criadas:');
    console.log('   - unidades (quartéis/comandos)');
    console.log('   - membros_unidade (relacionamento usuário-unidade)');
    console.log('   - ac4_registros (serviços cross-unit)');
    console.log('   - Colunas unidade_id adicionadas nas tabelas principais');
    console.log('   - Índices de performance criados');
    console.log('   - Unidades de exemplo inseridas');

  } catch (error) {
    console.error('❌ Erro na migração multi-tenant:', error);
    throw error;
  }
};

// Executar migração se chamado diretamente
if (require.main === module) {
  createMultiTenantTables()
    .then(() => {
      console.log('🎉 Migração multi-tenant finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { createMultiTenantTables };
