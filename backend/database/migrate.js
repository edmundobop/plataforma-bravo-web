const { query } = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔄 Iniciando migração do banco de dados...');

    // Tabela de usuários
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        matricula VARCHAR(50) UNIQUE NOT NULL,
        posto_graduacao VARCHAR(100),
        setor VARCHAR(100),
        telefone VARCHAR(20),
        role VARCHAR(50) DEFAULT 'usuario',
        ativo BOOLEAN DEFAULT true,
        ultimo_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabelas do módulo FROTA
    await query(`
      CREATE TABLE IF NOT EXISTS viaturas (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ABT', 'ABTF', 'UR', 'AV', 'ASA', 'MOB')),
        prefixo VARCHAR(20) UNIQUE NOT NULL,
        modelo VARCHAR(100) NOT NULL,
        marca VARCHAR(50) NOT NULL,
        ano INTEGER,
        placa VARCHAR(10) UNIQUE NOT NULL,
        chassi VARCHAR(50),
        renavam VARCHAR(20),
        km_atual INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Ativo',
        setor_responsavel VARCHAR(100),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Adicionar colunas tipo e foto se a tabela já existir, e remover coluna nome se existir
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='viaturas' AND column_name='tipo') THEN
          ALTER TABLE viaturas ADD COLUMN tipo VARCHAR(10) CHECK (tipo IN ('ABT', 'ABTF', 'UR', 'AV', 'ASA', 'MOB'));
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='viaturas' AND column_name='nome') THEN
          ALTER TABLE viaturas DROP COLUMN nome;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='viaturas' AND column_name='foto') THEN
          ALTER TABLE viaturas ADD COLUMN foto TEXT;
        END IF;
      END $$;
    `);



    await query(`
      CREATE TABLE IF NOT EXISTS manutencoes (
        id SERIAL PRIMARY KEY,
        viatura_id INTEGER REFERENCES viaturas(id),
        tipo VARCHAR(100) NOT NULL,
        descricao TEXT NOT NULL,
        km_manutencao INTEGER,
        data_manutencao DATE,
        data_proxima_manutencao DATE,
        valor DECIMAL(10,2),
        oficina VARCHAR(255),
        status VARCHAR(50) DEFAULT 'agendada',
        usuario_id INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabelas do módulo ALMOXARIFADO
    await query(`
      CREATE TABLE IF NOT EXISTS categorias_produto (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) UNIQUE NOT NULL,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        categoria_id INTEGER REFERENCES categorias_produto(id),
        unidade_medida VARCHAR(20),
        estoque_minimo INTEGER DEFAULT 0,
        estoque_atual INTEGER DEFAULT 0,
        valor_unitario DECIMAL(10,2),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER REFERENCES produtos(id),
        tipo VARCHAR(20) NOT NULL, -- 'entrada' ou 'saida'
        quantidade INTEGER NOT NULL,
        valor_unitario DECIMAL(10,2),
        valor_total DECIMAL(10,2),
        motivo VARCHAR(255),
        documento VARCHAR(100),
        fornecedor VARCHAR(255),
        usuario_id INTEGER REFERENCES usuarios(id),
        data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabelas do módulo EMPRÉSTIMOS
    await query(`
      CREATE TABLE IF NOT EXISTS equipamentos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        marca VARCHAR(100),
        modelo VARCHAR(100),
        numero_serie VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Ativo',
        condicao VARCHAR(50) DEFAULT 'bom',
        valor DECIMAL(10,2),
        data_aquisicao DATE,
        setor_responsavel VARCHAR(100),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS emprestimos (
        id SERIAL PRIMARY KEY,
        equipamento_id INTEGER REFERENCES equipamentos(id),
        usuario_solicitante_id INTEGER REFERENCES usuarios(id),
        usuario_autorizador_id INTEGER REFERENCES usuarios(id),
        data_emprestimo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_prevista_devolucao DATE,
        data_devolucao TIMESTAMP,
        motivo TEXT,
        observacoes_emprestimo TEXT,
        observacoes_devolucao TEXT,
        status VARCHAR(50) DEFAULT 'ativo',
        condicao_emprestimo VARCHAR(50),
        condicao_devolucao VARCHAR(50)
      )
    `);

    // Tabelas do módulo OPERACIONAL
    await query(`
      CREATE TABLE IF NOT EXISTS escalas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL, -- 'diaria', 'semanal', 'mensal'
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        turno VARCHAR(20), -- 'manha', 'tarde', 'noite'
        setor VARCHAR(100),
        observacoes TEXT,
        ativa BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS escala_usuarios (
        id SERIAL PRIMARY KEY,
        escala_id INTEGER REFERENCES escalas(id),
        usuario_id INTEGER REFERENCES usuarios(id),
        data_servico DATE NOT NULL,
        turno VARCHAR(20),
        funcao VARCHAR(100),
        status VARCHAR(50) DEFAULT 'agendado',
        observacoes TEXT
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS trocas_servico (
        id SERIAL PRIMARY KEY,
        usuario_solicitante_id INTEGER REFERENCES usuarios(id),
        usuario_substituto_id INTEGER REFERENCES usuarios(id),
        escala_original_id INTEGER REFERENCES escala_usuarios(id),
        data_servico_original DATE,
        data_servico_troca DATE,
        motivo TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        aprovado_por INTEGER REFERENCES usuarios(id),
        data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_aprovacao TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS servicos_extra (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        data_servico DATE NOT NULL,
        turno VARCHAR(20),
        horas INTEGER,
        tipo VARCHAR(100),
        descricao TEXT,
        valor DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pendente',
        aprovado_por INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de NOTIFICAÇÕES
    await query(`
      CREATE TABLE IF NOT EXISTS notificacoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        titulo VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        modulo VARCHAR(50),
        referencia_id INTEGER,
        lida BOOLEAN DEFAULT false,
        data_leitura TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de CHECKLISTS DE VIATURAS
    await query(`
      CREATE TABLE IF NOT EXISTS checklist_viaturas (
        id SERIAL PRIMARY KEY,
        viatura_id INTEGER REFERENCES viaturas(id) NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id) NOT NULL,
        unidade_id INTEGER REFERENCES unidades(id) NOT NULL,
        km_inicial INTEGER NOT NULL,
        combustivel_percentual INTEGER NOT NULL CHECK (combustivel_percentual >= 0 AND combustivel_percentual <= 100),
        ala_servico VARCHAR(20) NOT NULL DEFAULT 'Alpha' CHECK (ala_servico IN ('Alpha', 'Bravo', 'Charlie', 'Delta', 'ADM')),
        tipo_checklist VARCHAR(50) NOT NULL DEFAULT 'Diário',
        data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_checklist TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'em_andamento',
        observacoes_gerais TEXT,
        usuario_autenticacao VARCHAR(255),
        senha_autenticacao VARCHAR(255),
        finalizado_em TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        situacao VARCHAR(20) NOT NULL DEFAULT 'Sem Alteração' CHECK (situacao IN ('Sem Alteração', 'Com Alteração'))
      )
    `);

    // Adicionar novos campos à tabela checklist_viaturas se ela já existir (para compatibilidade com tabelas existentes)
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_viaturas' AND column_name='situacao') THEN
          ALTER TABLE checklist_viaturas ADD COLUMN situacao VARCHAR(20) NOT NULL DEFAULT 'Sem Alteração' CHECK (situacao IN ('Sem Alteração', 'Com Alteração'));
        END IF;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS checklist_itens (
        id SERIAL PRIMARY KEY,
        checklist_id INTEGER REFERENCES checklist_viaturas(id) ON DELETE CASCADE,
        nome_item VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        status VARCHAR(20) NOT NULL CHECK (status IN ('ok', 'com_alteracao')),
        observacoes TEXT,
        fotos JSONB DEFAULT '[]',
        ordem INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices para performance
    await query('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_viaturas_prefixo ON viaturas(prefixo)');
    await query('CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo)');
    await query('CREATE INDEX IF NOT EXISTS idx_equipamentos_codigo ON equipamentos(codigo)');
    await query('CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_emprestimos_status ON emprestimos(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_escalas_data ON escalas(data_inicio, data_fim)');
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_viaturas_viatura ON checklist_viaturas(viatura_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_viaturas_usuario ON checklist_viaturas(usuario_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_viaturas_data ON checklist_viaturas(data_checklist)');
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_itens_checklist ON checklist_itens(checklist_id)');

    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
};

if (require.main === module) {
  createTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { createTables };