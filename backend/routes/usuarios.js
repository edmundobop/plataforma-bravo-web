// =====================================================
// ROTAS UNIFICADAS DE USUÁRIOS - PLATAFORMA BRAVO
// =====================================================
//
// Este arquivo contém todas as rotas relacionadas ao gerenciamento
// de usuários (militares e civis) em uma estrutura unificada.
//
// ESTRUTURA DE PERFIS:
// - Administrador (1): Acesso total ao sistema
// - Comandante (2): Comando da unidade  
// - Chefe (3): Chefes de sessões
// - Auxiliares (4): Auxiliares dos Chefes
// - Operador (5): Operador de sistema
//
// TIPOS DE USUÁRIO:
// - militar: Usuários militares (requer posto, matrícula, etc.)
// - civil: Usuários civis (funcionários, terceirizados, etc.)
//
// =====================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { columnExists, tableExists, getUsuariosUnidadeColumn } = require('../utils/schema');
const { getUserUnits } = require('../middleware/tenant');
const { checkTenantAccess } = require('../middleware/tenant');

const router = express.Router();

// =====================================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// =====================================================

/**
 * @route GET /api/usuarios/autocomplete
 * @desc Busca usuários para autocomplete (público)
 * @access Public
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { busca = '', tipo = 'todos' } = req.query;
    
    let whereConditions = ['u.ativo = true'];
    let queryParams = [];
    let paramIndex = 1;
    
    // Filtrar por tipo se especificado
    if (tipo !== 'todos') {
      whereConditions.push(`u.tipo = $${paramIndex}`);
      queryParams.push(tipo);
      paramIndex++;
    }
    
    // Filtrar por busca se especificado
    if (busca) {
      whereConditions.push(`(
        LOWER(u.nome_completo) LIKE LOWER($${paramIndex}) OR 
        LOWER(u.nome_guerra) LIKE LOWER($${paramIndex}) OR
        u.matricula LIKE $${paramIndex}
      )`);
      queryParams.push(`%${busca}%`);
      paramIndex++;
    }
    
    const result = await query(`
      SELECT 
        u.id,
        u.nome_completo,
        u.nome_guerra,
        u.posto_graduacao,
        u.tipo,
        u.matricula,
        p.nome as perfil_nome
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY u.nome_completo
      LIMIT 50
    `, queryParams);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Erro ao buscar usuários para autocomplete:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @route POST /api/usuarios/solicitar-cadastro
 * @desc Solicitação pública de cadastro (militares)
 * @access Public
 */
router.post('/solicitar-cadastro', 
  [
    body('nome_completo').notEmpty().withMessage('Nome completo é obrigatório'),
    body('email').isEmail().withMessage('Email válido é obrigatório'),
    body('tipo').isIn(['militar', 'civil']).withMessage('Tipo deve ser militar ou civil'),
    
    // Validações condicionais para militares
    body('posto_graduacao').if(body('tipo').equals('militar'))
      .notEmpty().withMessage('Posto/graduação é obrigatório para militares'),
    body('nome_guerra').if(body('tipo').equals('militar'))
      .notEmpty().withMessage('Nome de guerra é obrigatório para militares'),
    body('matricula').if(body('tipo').equals('militar'))
      .notEmpty().withMessage('Matrícula é obrigatória para militares'),
    
    body('cpf').notEmpty().withMessage('CPF é obrigatório'),
    body('telefone').notEmpty().withMessage('Telefone é obrigatório'),
    body('data_nascimento').isDate().withMessage('Data de nascimento deve ser válida'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: 'Dados inválidos',
          errors: errors.array() 
        });
      }

      const {
        nome_completo,
        email,
        cpf,
        telefone,
        tipo,
        posto_graduacao,
        nome_guerra,
        matricula,
        data_nascimento,
        data_incorporacao,
        unidade_id,
        observacoes
      } = req.body;

      // Verificar se email ou CPF já existem
      const existingUser = await query(
        'SELECT id FROM usuarios WHERE email = $1 OR cpf = $2',
        [email, cpf]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email ou CPF já cadastrados no sistema'
        });
      }

      // Se for militar, verificar se matrícula já existe
      if (tipo === 'militar' && matricula) {
        const existingMatricula = await query(
          'SELECT id FROM usuarios WHERE matricula = $1',
          [matricula]
        );
        
        if (existingMatricula.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Matrícula já cadastrada no sistema'
          });
        }
      }
      
      // Inserir solicitação de cadastro (usuário inativo até aprovação)
      const result = await query(`
        INSERT INTO usuarios (
          nome_completo, email, cpf, telefone, tipo,
          posto_graduacao, nome_guerra, matricula, data_nascimento, data_incorporacao,
          unidade_lotacao_id, unidade_id, setor_id, funcao_id, funcoes,
          perfil_id, senha_hash, ativo, created_by
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15::jsonb,
          $16, $17, true, $18
        )
        RETURNING id, nome_completo, email, tipo, ativo, created_at
      `, [
        nome_completo,
        email,
        cpf,
        telefone,
        tipo,
        posto_graduacao,
        nome_guerra,
        matricula,
        data_nascimento,
        data_incorporacao,
        unidade_lotacao_id,
        unidade_id,
        setor_id,
        funcao_id,
        funcoesJson,
        perfil_id,
        senhaHash,
        created_by
      ]);

      // Criar notificação para administradores
      await query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo)
        SELECT u.id, $1, $2, 'info', 'sistema'
        FROM usuarios u 
        JOIN perfis p ON u.perfil_id = p.id
        WHERE p.nome = 'Administrador' AND u.ativo = true
      `, [
        'Nova Solicitação de Cadastro',
        `${nome_completo} (${tipo}) solicitou cadastro no sistema.`
      ]);

      res.status(201).json({
        success: true,
        message: 'Solicitação de cadastro enviada com sucesso. Aguarde a aprovação do administrador.',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Erro ao solicitar cadastro:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// =====================================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// =====================================================

/**
 * @route GET /api/usuarios/perfis
 * @desc Lista todos os perfis disponíveis
 * @access Public
 */
router.get('/perfis', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id,
        nome,
        descricao,
        permissoes,
        ativo
      FROM perfis 
      WHERE ativo = true
      ORDER BY nome
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar perfis:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// =====================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// =====================================================
// Aplicar autenticação em todas as rotas abaixo
router.use(authenticateToken);

// =====================================================
// ROTAS DE CONSULTA
// =====================================================

/**
 * @route GET /api/usuarios
 * @desc Listar usuários com filtros e paginação
 * @access Administrador, Comandante, Chefe
 */
router.get('/', authorizeRoles(['Administrador', 'Comandante', 'Chefe']), checkTenantAccess, async (req, res) => {
  try {
    const { 
      ativo, 
      tipo,
      perfil, 
      unidade_id,
      setor_id,
      busca, 
      page = 1, 
      limit = 20 
    } = req.query;

    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Detectar coluna de lotação dinamicamente
    const lotacaoCol = await getUsuariosUnidadeColumn() || 'unidade_id';

    // Filtros
    if (ativo !== undefined) {
      whereConditions.push(`u.ativo = $${paramIndex}`);
      queryParams.push(ativo === 'true');
      paramIndex++;
    }

    if (tipo) {
      whereConditions.push(`u.tipo = $${paramIndex}`);
      queryParams.push(tipo);
      paramIndex++;
    }

    if (perfil) {
      whereConditions.push(`p.nome = $${paramIndex}`);
      queryParams.push(perfil);
      paramIndex++;
    }

    // Se não houver tenant ativo, permitir filtro explícito por unidade_id.
    if (!req.unidade?.id && !req.headers['x-tenant-id'] && unidade_id) {
      whereConditions.push(`u.${lotacaoCol} = $${paramIndex}`);
      queryParams.push(unidade_id);
      paramIndex++;
    }

    // Aplicar filtro de setor apenas se a coluna existir
    const hasUsuariosSetorId = await columnExists('usuarios', 'setor_id');
    if (setor_id && hasUsuariosSetorId) {
      whereConditions.push(`u.setor_id = $${paramIndex}`);
      queryParams.push(setor_id);
      paramIndex++;
    }

    if (busca) {
      whereConditions.push(`(
        LOWER(u.nome_completo) LIKE LOWER($${paramIndex}) OR 
        LOWER(u.email) LIKE LOWER($${paramIndex}) OR 
        LOWER(u.nome_guerra) LIKE LOWER($${paramIndex}) OR
        u.matricula LIKE $${paramIndex}
      )`);
      queryParams.push(`%${busca}%`);
      paramIndex++;
    }

    // Tenancy/Lotação: se `req.unidade` (middleware) ou `X-Tenant-ID` estiverem definidos,
    // o endpoint força o filtro por lotação: `u.unidade_id = <tenantUnitId>`.
    // Isso garante que SOMENTE usuários lotados (coluna `u.unidade_id`) na unidade ativa
    // sejam retornados, independentemente de vínculos em membros_unidade.
    const tenantUnitId = req.unidade?.id || req.headers['x-tenant-id'] || null;
    if (tenantUnitId) {
      whereConditions.push(`u.${lotacaoCol} = $${paramIndex}`);
      queryParams.push(parseInt(tenantUnitId));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Paginação
    const offset = (page - 1) * limit;
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    queryParams.push(limit, offset);

    // Compatibilidade dinâmica de colunas
    const hasPerfilNivelHierarquia = await columnExists('perfis', 'nivel_hierarquia');
    const hasUnSigla = await columnExists('unidades', 'sigla');
    const hasSetorSigla = await columnExists('setores', 'sigla');
    const hasUsuariosFuncaoId = await columnExists('usuarios', 'funcao_id');
    const hasUsuariosFuncoes = await columnExists('usuarios', 'funcoes');

    const selectNivel = hasPerfilNivelHierarquia ? 'p.nivel_hierarquia' : 'NULL as nivel_hierarquia';
    const selectUnSigla = hasUnSigla ? 'un.sigla as unidade_sigla' : 'NULL as unidade_sigla';

    const setorJoin = hasUsuariosSetorId ? 'LEFT JOIN setores s ON u.setor_id = s.id' : '';
    const selectSetorNome = hasUsuariosSetorId ? 's.nome as setor_nome' : 'u.setor as setor_nome';
    const selectSetorSigla = (hasUsuariosSetorId && hasSetorSigla) ? 's.sigla as setor_sigla' : 'NULL as setor_sigla';

    const funcaoJoin = hasUsuariosFuncaoId ? 'LEFT JOIN funcoes f ON u.funcao_id = f.id' : '';
    const selectFuncaoNome = hasUsuariosFuncaoId ? 'f.nome as funcao_nome' : 'NULL as funcao_nome';

    const selectFuncoes = hasUsuariosFuncoes ? "COALESCE(u.funcoes, '[]'::jsonb) as funcoes" : 'NULL as funcoes';

    const usuariosQuery = `
      SELECT 
        u.id,
        u.nome_completo,
        u.email,
        u.cpf,
        u.telefone,
        u.tipo,
        u.data_nascimento,
        u.data_incorporacao,
        u.posto_graduacao,
        u.nome_guerra,
        u.matricula,
        u.ativo,
        u.ultimo_login,
        u.created_at,
        u.perfil_id,
        
        -- Perfil
        p.nome as perfil_nome,
        ${selectNivel},
        
        -- Unidade
        un.nome as unidade_nome,
        ${selectUnSigla},
        
        -- Setor
        ${selectSetorNome},
        ${selectSetorSigla},
        
        -- Função
        ${selectFuncaoNome},
        
        -- Funções (JSONB)
        ${selectFuncoes}
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      LEFT JOIN unidades un ON u.unidade_id = un.id
      ${setorJoin}
      ${funcaoJoin}
      ${whereClause}
      ORDER BY u.nome_completo
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const usuariosResult = await query(usuariosQuery, queryParams);

    res.json({
      success: true,
      usuarios: usuariosResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * @route GET /api/usuarios/pendentes
 * @desc Listar solicitações de cadastro pendentes
 * @access Administrador, Comandante
 */
router.get('/pendentes', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id,
        u.nome_completo,
        u.email,
        u.cpf,
        u.telefone,
        u.tipo,
        u.posto_graduacao,
        u.nome_guerra,
        u.matricula,
        u.data_nascimento,
        u.created_at,
        un.nome as unidade_nome
      FROM usuarios u
      LEFT JOIN unidades un ON u.unidade_id = un.id
      WHERE u.ativo = false
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      solicitacoes: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar solicitações pendentes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * @route GET /api/usuarios/solicitacoes-pendentes
 * @desc Lista solicitações de cadastro pendentes
 * @access Private (Administrador, Comandante)
 */
router.get('/solicitacoes-pendentes', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await query(`
      SELECT 
        id,
        nome_completo,
        email,
        tipo,
        posto_graduacao,
        nome_guerra,
        matricula,
        cpf,
        telefone,
        data_nascimento,
        unidade_id,
        created_at,
        status_solicitacao
      FROM usuarios 
      WHERE status_solicitacao = 'pendente'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM usuarios 
      WHERE status_solicitacao = 'pendente'
    `);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar solicitações pendentes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * @route GET /api/usuarios/:id
 * @desc Buscar usuário por ID
 * @access Próprio usuário, Administrador, Comandante, Chefe
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userPerfil = req.user.perfil_nome;

    // Verificar se o usuário pode acessar este perfil
    if (id !== userId.toString() && !['Administrador', 'Comandante', 'Chefe'].includes(userPerfil)) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado' 
      });
    }

    // Include funcoes (JSONB) if column exists
    const hasUsuariosFuncoes = await columnExists('usuarios', 'funcoes');
    const funcoesCampo = hasUsuariosFuncoes ? "COALESCE(u.funcoes, '[]'::jsonb) as funcoes" : 'NULL as funcoes';

    // Seleções dinâmicas para colunas opcionais em perfis
    const hasPerfilDescricao = await columnExists('perfis', 'descricao');
    const selectPerfilDescricao = hasPerfilDescricao ? 'p.descricao as perfil_descricao' : 'NULL as perfil_descricao';
    const selectPerfilNivel = (await columnExists('perfis', 'nivel_hierarquia')) ? 'p.nivel_hierarquia' : 'NULL as nivel_hierarquia';

    // Detecção dinâmica de setor/funcao
    const hasUsuariosSetorId = await columnExists('usuarios', 'setor_id');
    const hasSetorSigla = await columnExists('setores', 'sigla');
    const setorJoin = hasUsuariosSetorId ? 'LEFT JOIN setores s ON u.setor_id = s.id' : '';
    const selectSetorNome = hasUsuariosSetorId ? 's.nome as setor_nome' : 'u.setor as setor_nome';
    const selectSetorSigla = (hasUsuariosSetorId && hasSetorSigla) ? 's.sigla as setor_sigla' : 'NULL as setor_sigla';

    const hasUsuariosFuncaoId = await columnExists('usuarios', 'funcao_id');
    const funcaoJoin = hasUsuariosFuncaoId ? 'LEFT JOIN funcoes f ON u.funcao_id = f.id' : '';
    const selectFuncaoNome = hasUsuariosFuncaoId ? 'f.nome as funcao_nome' : 'NULL as funcao_nome';

    // Coluna de lotação dinâmica
    const lotacaoCol = await getUsuariosUnidadeColumn() || 'unidade_id';

    const usuarioResult = await query(`
      SELECT 
        u.id,
        u.nome_completo,
        u.email,
        u.cpf,
        u.telefone,
        u.tipo,
        u.posto_graduacao,
        u.nome_guerra,
        u.matricula,
        u.data_nascimento,
        u.data_incorporacao,
        u.ativo,
        u.ultimo_login,
        u.created_at,
        u.updated_at,
        u.perfil_id,
        u.${lotacaoCol} as unidade_lotacao_id,
        
        -- Informações do perfil
        p.nome as perfil_nome,
        ${selectPerfilDescricao},
        ${selectPerfilNivel},
        
        -- Informações da unidade
        un.nome as unidade_nome,
        un.sigla as unidade_sigla,
        
        -- Informações do setor
        ${selectSetorNome},
        ${selectSetorSigla},
        
        -- Informações da função
        ${selectFuncaoNome}
        
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      LEFT JOIN unidades un ON u.${lotacaoCol} = un.id
      ${setorJoin}
      ${funcaoJoin}
      WHERE u.id = $1
    `, [id]);

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuário não encontrado' 
      });
    }

    const usuario = usuarioResult.rows[0];

    // Unidades CBMGO (lotação + membros_unidade)
    try {
      const membros = await query(
        'SELECT unidade_id FROM membros_unidade WHERE usuario_id = $1 AND ativo = true',
        [id]
      );
      const membrosIds = membros.rows.map(r => r.unidade_id).filter(v => v != null);
      const lotacaoId = usuario.unidade_lotacao_id;
      const setIds = new Set([lotacaoId, ...membrosIds].filter(v => v != null));
      usuario.unidades_ids = Array.from(setIds);
    } catch (e) {
      // Em caso de erro ao buscar membros, pelo menos mantém a lotação
      usuario.unidades_ids = usuario.unidade_lotacao_id ? [usuario.unidade_lotacao_id] : [];
    }

    // Se for o próprio usuário ou admin/comandante/chefe, incluir estatísticas
    if (id === userId.toString() || ['Administrador', 'Comandante', 'Chefe'].includes(userPerfil)) {
      // Estatísticas de atividade do usuário
      const estatisticas = await query(`
        SELECT 
          (SELECT COUNT(*) FROM movimentacoes_estoque WHERE usuario_id = $1) as total_movimentacoes,
          (SELECT COUNT(*) FROM emprestimos WHERE usuario_solicitante_id = $1) as total_emprestimos,
          (SELECT COUNT(*) FROM servicos_extra WHERE usuario_id = $1 AND status = 'aprovado') as total_extras,
          (SELECT COUNT(*) FROM notificacoes WHERE usuario_id = $1 AND lida = false) as notificacoes_nao_lidas
      `, [id]);

      usuario.estatisticas = estatisticas.rows[0];
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// =====================================================
// ROTAS DE CRIAÇÃO E EDIÇÃO
// =====================================================

/**
 * @route PUT /api/usuarios/:id
 * @desc Atualizar usuário existente
 * @access Usuário (próprio) ou Administrador/Comandante
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userPerfil = req.user.perfil_nome;

    const isAdmin = ['Administrador', 'Comandante'].includes(userPerfil);
    const isSelf = parseInt(id) === parseInt(userId);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    // Campos permitidos (base)
    const allowedFields = isAdmin
      ? [
          'nome_completo',
          'email',
          'cpf',
          'telefone',
          'tipo',
          'posto_graduacao',
          'nome_guerra',
          'matricula',
          'data_nascimento',
          'data_incorporacao',
          'unidade_id',
          'setor_id',
          'perfil_id',
          'ativo'
        ]
      : ['nome_completo', 'email', 'telefone'];

    const updates = [];
    const params = [];
    let idx = 1;

    // Apenas atualiza campos que existem na tabela
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Verifica se a coluna existe antes de tentar atualizar
        // eslint-disable-next-line no-await-in-loop
        const hasColumn = await columnExists('usuarios', field);
        if (hasColumn) {
          updates.push(`${field} = $${idx}`);
          params.push(req.body[field]);
          idx++;
        }
      }
    }

    // Atualizar funcoes (JSONB) se existir coluna e usuário for admin
    const hasUsuariosFuncoesUpdate = await columnExists('usuarios', 'funcoes');
    if (isAdmin && hasUsuariosFuncoesUpdate && req.body.funcoes !== undefined) {
      const funcoesArray = Array.isArray(req.body.funcoes)
        ? req.body.funcoes
        : (req.body.funcoes ? [req.body.funcoes] : []);
      updates.push(`funcoes = $${idx}::jsonb`);
      params.push(JSON.stringify(funcoesArray));
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo válido para atualizar'
      });
    }

    updates.push(`updated_at = NOW()`);

    const queryText = `
      UPDATE usuarios
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, nome_completo, email, COALESCE(funcoes, '[]'::jsonb) as funcoes
    `;

    params.push(id);

    const result = await query(queryText, params);

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * @route DELETE /api/usuarios/:id
 * @desc Remover usuário (soft delete)
 * @access Administrador, Comandante
 */
router.delete('/:id', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário existe
    const userCheck = await query(
      'SELECT id, nome_completo, email FROM usuarios WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Remover (ativar campo `ativo` para false)
    await query(
      'UPDATE usuarios SET ativo = false WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Usuário removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover usuário:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;
