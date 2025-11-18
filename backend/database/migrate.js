const { query } = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔄 Iniciando migração do banco de dados...');

    // ==========================
    // ORGANIZAÇÃO E PERFIS
    // ==========================
    // Unidades (multi-tenant)
    await query(`
      CREATE TABLE IF NOT EXISTS unidades (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(20) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
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

    // Perfis
    await query(`
      CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) UNIQUE NOT NULL,
        descricao TEXT,
        permissoes JSONB DEFAULT '[]',
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Seed básico de perfis
    await query(`
      INSERT INTO perfis (nome, descricao, permissoes, ativo)
      VALUES 
        ('Administrador', 'Acesso total ao sistema', '[]', true),
        ('Comandante', 'Comando da unidade', '[]', true),
        ('Chefe', 'Chefe de sessão', '[]', true),
        ('Auxiliares', 'Auxiliares dos chefes', '[]', true),
        ('Operador', 'Operador de sistema', '[]', true)
      ON CONFLICT (nome) DO NOTHING
    `);

    // Setores
    await query(`
      CREATE TABLE IF NOT EXISTS setores (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(120) NOT NULL,
        sigla VARCHAR(20),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Funções
    await query(`
      CREATE TABLE IF NOT EXISTS funcoes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(120) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ==========================
    // USUÁRIOS
    // ==========================
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome_completo VARCHAR(255) NOT NULL,
        nome VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255),
        senha VARCHAR(255),
        cpf VARCHAR(20),
        telefone VARCHAR(20),
        tipo VARCHAR(20) CHECK (tipo IN ('militar','civil')) DEFAULT 'militar',
        data_nascimento DATE,
        data_incorporacao DATE,
        posto_graduacao VARCHAR(100),
        nome_guerra VARCHAR(100),
        matricula VARCHAR(50) UNIQUE,
        ativo BOOLEAN DEFAULT false,
        ultimo_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        perfil_id INTEGER REFERENCES perfis(id),
        unidade_id INTEGER REFERENCES unidades(id),
        unidade_lotacao_id INTEGER REFERENCES unidades(id),
        ala VARCHAR(20),
        setor VARCHAR(100),
        setor_id INTEGER REFERENCES setores(id),
        funcao VARCHAR(100),
        funcao_id INTEGER REFERENCES funcoes(id),
        status_solicitacao VARCHAR(20) DEFAULT 'pendente',
        observacoes TEXT,
        observacoes_aprovacao TEXT,
        aprovado_por_id INTEGER REFERENCES usuarios(id),
        aprovado_em TIMESTAMP,
        funcoes JSONB DEFAULT '[]'
      )
    `);
    // Garantir colunas opcionais se tabela já existir
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='nome_completo') THEN
          ALTER TABLE usuarios ADD COLUMN nome_completo VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='senha_hash') THEN
          ALTER TABLE usuarios ADD COLUMN senha_hash VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='cpf') THEN
          ALTER TABLE usuarios ADD COLUMN cpf VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='tipo') THEN
          ALTER TABLE usuarios ADD COLUMN tipo VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='data_nascimento') THEN
          ALTER TABLE usuarios ADD COLUMN data_nascimento DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='data_incorporacao') THEN
          ALTER TABLE usuarios ADD COLUMN data_incorporacao DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='nome_guerra') THEN
          ALTER TABLE usuarios ADD COLUMN nome_guerra VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='perfil_id') THEN
          ALTER TABLE usuarios ADD COLUMN perfil_id INTEGER REFERENCES perfis(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='unidade_lotacao_id') THEN
          ALTER TABLE usuarios ADD COLUMN unidade_lotacao_id INTEGER REFERENCES unidades(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='ala') THEN
          ALTER TABLE usuarios ADD COLUMN ala VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='setor_id') THEN
          ALTER TABLE usuarios ADD COLUMN setor_id INTEGER REFERENCES setores(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='funcao_id') THEN
          ALTER TABLE usuarios ADD COLUMN funcao_id INTEGER REFERENCES funcoes(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='status_solicitacao') THEN
          ALTER TABLE usuarios ADD COLUMN status_solicitacao VARCHAR(20) DEFAULT 'pendente';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='observacoes') THEN
          ALTER TABLE usuarios ADD COLUMN observacoes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='observacoes_aprovacao') THEN
          ALTER TABLE usuarios ADD COLUMN observacoes_aprovacao TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='aprovado_por_id') THEN
          ALTER TABLE usuarios ADD COLUMN aprovado_por_id INTEGER REFERENCES usuarios(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='aprovado_em') THEN
          ALTER TABLE usuarios ADD COLUMN aprovado_em TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='funcoes') THEN
          ALTER TABLE usuarios ADD COLUMN funcoes JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);

    // ==========================
    // FROTA
    // ==========================
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
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='viaturas' AND column_name='foto') THEN
          ALTER TABLE viaturas ADD COLUMN foto TEXT;
        END IF;
      END $$;
    `);

    // Exclusões de viaturas (auditoria)
    await query(`
      CREATE TABLE IF NOT EXISTS viaturas_exclusoes (
        id SERIAL PRIMARY KEY,
        viatura_id INTEGER REFERENCES viaturas(id) ON DELETE SET NULL,
        dados_viatura JSONB NOT NULL,
        motivo TEXT,
        usuario_id INTEGER REFERENCES usuarios(id),
        usuario_nome VARCHAR(255),
        unidade_id INTEGER REFERENCES unidades(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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

    // ==========================
    // ALMOXARIFADO
    // ==========================
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unidade_id INTEGER REFERENCES unidades(id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER REFERENCES produtos(id),
        tipo VARCHAR(20) NOT NULL,
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

    // ==========================
    // EMPRÉSTIMOS
    // ==========================
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unidade_id INTEGER REFERENCES unidades(id)
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

    // ==========================
    // OPERACIONAL
    // ==========================
    await query(`
      CREATE TABLE IF NOT EXISTS escalas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        data_inicio TIMESTAMP NOT NULL,
        data_fim TIMESTAMP NOT NULL,
        turno VARCHAR(20),
        setor VARCHAR(100),
        observacoes TEXT,
        ativa BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unidade_id INTEGER REFERENCES unidades(id)
      )
    `);
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='escalas' AND column_name='data_inicio' AND data_type='date'
        ) THEN
          ALTER TABLE escalas ALTER COLUMN data_inicio TYPE TIMESTAMP USING data_inicio::timestamp;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='escalas' AND column_name='data_fim' AND data_type='date'
        ) THEN
          ALTER TABLE escalas ALTER COLUMN data_fim TYPE TIMESTAMP USING data_fim::timestamp;
        END IF;
      END $$;
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
        observacoes TEXT,
        troca_id INTEGER REFERENCES trocas_servico(id)
      )
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escala_usuarios' AND column_name='troca_id') THEN
          ALTER TABLE escala_usuarios ADD COLUMN troca_id INTEGER REFERENCES trocas_servico(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trocas_servico' AND column_name='data_servico_compensacao') THEN
          ALTER TABLE trocas_servico ADD COLUMN data_servico_compensacao DATE;
        END IF;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS trocas_servico (
        id SERIAL PRIMARY KEY,
        usuario_solicitante_id INTEGER REFERENCES usuarios(id),
        usuario_substituto_id INTEGER REFERENCES usuarios(id),
        escala_original_id INTEGER REFERENCES escala_usuarios(id),
        data_servico_original DATE,
        data_servico_troca DATE,
        data_servico_compensacao DATE,
        motivo TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        aprovado_por INTEGER REFERENCES usuarios(id),
        data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_aprovacao TIMESTAMP,
        unidade_id INTEGER REFERENCES unidades(id)
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unidade_id INTEGER REFERENCES unidades(id)
      )
    `);

    // ==========================
    // NOTIFICAÇÕES
    // ==========================
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

    await query(`
      CREATE TABLE IF NOT EXISTS trocas_historico (
        id SERIAL PRIMARY KEY,
        troca_id INTEGER REFERENCES trocas_servico(id),
        escala_usuario_id INTEGER REFERENCES escala_usuarios(id),
        acao VARCHAR(50) NOT NULL,
        criado_por INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ==========================
    // CHECKLISTS + TEMPLATES
    // ==========================
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
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='template_itens' AND column_name='imagem_url') THEN
          ALTER TABLE template_itens ADD COLUMN imagem_url VARCHAR(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_viaturas' AND column_name='template_id') THEN
          ALTER TABLE checklist_viaturas ADD COLUMN template_id INTEGER REFERENCES checklist_templates(id);
        END IF;
      END $$;
    `);

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
        cancelamento_motivo TEXT,
        cancelado_em TIMESTAMP,
        usuario_autenticacao VARCHAR(255),
        senha_autenticacao VARCHAR(255),
        finalizado_em TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        situacao VARCHAR(20) NOT NULL DEFAULT 'Sem Alteração' CHECK (situacao IN ('Sem Alteração', 'Com Alteração'))
      )
    `);
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_viaturas' AND column_name='situacao') THEN
          ALTER TABLE checklist_viaturas ADD COLUMN situacao VARCHAR(20) NOT NULL DEFAULT 'Sem Alteração' CHECK (situacao IN ('Sem Alteração', 'Com Alteração'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_viaturas' AND column_name='cancelamento_motivo') THEN
          ALTER TABLE checklist_viaturas ADD COLUMN cancelamento_motivo TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_viaturas' AND column_name='cancelado_em') THEN
          ALTER TABLE checklist_viaturas ADD COLUMN cancelado_em TIMESTAMP;
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

    await query(`
      CREATE TABLE IF NOT EXISTS checklist_solicitacoes (
        id SERIAL PRIMARY KEY,
        unidade_id INTEGER REFERENCES unidades(id) NOT NULL,
        viatura_id INTEGER REFERENCES viaturas(id) NOT NULL,
        template_id INTEGER REFERENCES checklist_templates(id),
        tipo_checklist VARCHAR(50) NOT NULL,
        ala_servico VARCHAR(20) NOT NULL CHECK (ala_servico IN ('Alpha', 'Bravo', 'Charlie', 'Delta', 'ADM')),
        data_prevista TIMESTAMP,
        responsavel_id INTEGER REFERENCES usuarios(id),
        status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'cancelada', 'atendida')),
        checklist_id INTEGER REFERENCES checklist_viaturas(id),
        criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS checklist_automacoes (
        id SERIAL PRIMARY KEY,
        unidade_id INTEGER REFERENCES unidades(id) NOT NULL,
        nome VARCHAR(120),
        ativo BOOLEAN NOT NULL DEFAULT true,
        horario VARCHAR(8) NOT NULL,
        dias_semana JSONB NOT NULL DEFAULT '[]',
        ala_servico VARCHAR(20) NOT NULL CHECK (ala_servico IN ('Alpha', 'Bravo', 'Charlie', 'Delta', 'ADM')),
        viaturas JSONB NOT NULL DEFAULT '[]',
        template_id INTEGER REFERENCES checklist_templates(id),
        tipo_checklist VARCHAR(50) NOT NULL,
        criado_por INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ==========================
    // MULTI-TENANT AUXILIAR
    // ==========================
    await query(`
      CREATE TABLE IF NOT EXISTS membros_unidade (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        unidade_id INTEGER REFERENCES unidades(id) ON DELETE CASCADE,
        role_unidade VARCHAR(50) DEFAULT 'membro',
        ativo BOOLEAN DEFAULT true,
        data_inicio DATE DEFAULT CURRENT_DATE,
        data_fim DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id, unidade_id)
      )
    `);

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

    // ==========================
    // ÍNDICES
    // ==========================
    await query('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_usuarios_unidade ON usuarios(unidade_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_usuarios_unidade_lotacao ON usuarios(unidade_lotacao_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_unidades_codigo ON unidades(codigo)');
    await query('CREATE INDEX IF NOT EXISTS idx_unidades_ativa ON unidades(ativa)');
    await query('CREATE INDEX IF NOT EXISTS idx_membros_usuario_unidade ON membros_unidade(usuario_id, unidade_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo)');
    await query('CREATE INDEX IF NOT EXISTS idx_equipamentos_codigo ON equipamentos(codigo)');
    await query('CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_emprestimos_status ON emprestimos(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_escalas_data ON escalas(data_inicio, data_fim)');
    await query('CREATE INDEX IF NOT EXISTS idx_viaturas_prefixo ON viaturas(prefixo)');
    // Índices de checklist_solicitacoes (criar apenas se usuário atual for owner da tabela)
    await query(`
      DO $$
      BEGIN
        IF (
          (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='checklist_solicitacoes') = CURRENT_USER
        ) THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_checklist_solicitacoes_unidade ON public.checklist_solicitacoes(unidade_id)';
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_checklist_solicitacoes_status ON public.checklist_solicitacoes(status)';
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_checklist_solicitacoes_prevista ON public.checklist_solicitacoes(data_prevista)';
        END IF;
      END $$;
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_viaturas_viatura ON checklist_viaturas(viatura_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_viaturas_usuario ON checklist_viaturas(usuario_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_viaturas_data ON checklist_viaturas(data_checklist)');
    await query('CREATE INDEX IF NOT EXISTS idx_checklist_itens_checklist ON checklist_itens(checklist_id)');
    await query(`
      DO $$
      BEGIN
        IF (
          (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='checklist_automacoes') = CURRENT_USER
        ) THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_checklist_automacoes_unidade ON public.checklist_automacoes(unidade_id)';
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_checklist_automacoes_ativo ON public.checklist_automacoes(ativo)';
        END IF;
      END $$;
    `);

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
