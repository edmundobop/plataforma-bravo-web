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
      .custom((value, { req }) => {
        const v = (value !== undefined && String(value).trim() !== '')
          ? String(value).trim()
          : '';
        const identidade = (req.body?.identidade_militar !== undefined && String(req.body.identidade_militar).trim() !== '')
          ? String(req.body.identidade_militar).trim()
          : '';
        return v !== '' || identidade !== '';
      }).withMessage('Matrícula ou Identidade militar é obrigatória para militares'),
    
    body('cpf').notEmpty().withMessage('CPF é obrigatório'),
    body('telefone').notEmpty().withMessage('Telefone é obrigatório'),
    body('data_nascimento').isDate().withMessage('Data de nascimento deve ser válida'),
  ],
  async (req, res) => {
    // Contexto de debug para rastrear colunas detectadas e campos usados
    let debugCtx = { detectedCols: {}, fieldsUsed: [] };
    try {
      // Debug inicial do payload recebido (sanitizado)
      const debugBody = {
        nome_completo: req.body?.nome_completo,
        email: req.body?.email,
        cpf: String(req.body?.cpf || '').replace(/\D/g, '').slice(-4), // últimos 4 dígitos
        telefone: req.body?.telefone,
        tipo: req.body?.tipo,
        posto_graduacao: req.body?.posto_graduacao,
        nome_guerra: req.body?.nome_guerra,
        matricula: req.body?.matricula || req.body?.identidade_militar,
        data_nascimento: req.body?.data_nascimento,
        data_incorporacao: req.body?.data_incorporacao,
        unidade_id: req.body?.unidade_id,
      };
      console.log('📥 [Usuarios] /solicitar-cadastro - payload recebido:', debugBody);

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

      const matriculaValue = matricula || req.body.identidade_militar || null;

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
      if (tipo === 'militar' && matriculaValue) {
        const existingMatricula = await query(
          'SELECT id FROM usuarios WHERE matricula = $1',
          [matriculaValue]
        );
        
        if (existingMatricula.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Matrícula já cadastrada no sistema'
          });
        }
      }
      
      // Validar existência da unidade (se enviada) para evitar erro de FK
      let unidadeIdResolved = unidade_id ?? null;
      if (unidadeIdResolved) {
        try {
          const unitExists = await query('SELECT id FROM unidades WHERE id = $1', [unidadeIdResolved]);
          if (unitExists.rows.length === 0) {
            console.warn(`⚠️ [Usuarios] Unidade informada (${unidadeIdResolved}) não existe. Prosseguindo com unidade_id = NULL.`);
            unidadeIdResolved = null;
          }
        } catch (unitErr) {
          console.warn('⚠️ [Usuarios] Falha ao verificar unidade_id:', { unidadeIdResolved, message: unitErr?.message });
          unidadeIdResolved = null;
        }
      }

      // Inserir solicitação de cadastro (usuário inativo até aprovação)
      // Ajuste: usar coluna 'senha_hash' (compatível com schema atual) e permitir data_incorporacao opcional
      // Compatibilizar com esquemas antigos que têm coluna 'nome' obrigatória
      let result;
      const hasNomeCol = await columnExists('usuarios', 'nome');
      if (hasNomeCol) {
        // Inserir com 'nome' e 'nome_completo'
        result = await query(`
          INSERT INTO usuarios (
            nome, nome_completo, email, cpf, telefone, tipo,
            posto_graduacao, nome_guerra, matricula,
            data_nascimento, data_incorporacao, unidade_id,
            perfil_id, ativo, senha_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, $14)
          RETURNING id, nome_completo, email, tipo
        `, [
          nome_completo, nome_completo, email, cpf, telefone, tipo,
          posto_graduacao, nome_guerra, matriculaValue,
          data_nascimento, data_incorporacao || null, unidadeIdResolved,
          5, // Perfil Operador por padrão
          '$2b$10$defaulthashedpassword' // Senha temporária (hash dummy)
        ]);
      } else {
        // Esquema novo: apenas 'nome_completo'
        result = await query(`
          INSERT INTO usuarios (
            nome_completo, email, cpf, telefone, tipo,
            posto_graduacao, nome_guerra, matricula,
            data_nascimento, data_incorporacao, unidade_id,
            perfil_id, ativo, senha_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13)
          RETURNING id, nome_completo, email, tipo
        `, [
          nome_completo, email, cpf, telefone, tipo,
          posto_graduacao, nome_guerra, matriculaValue,
          data_nascimento, data_incorporacao || null, unidadeIdResolved,
          5, // Perfil Operador por padrão
          '$2b$10$defaulthashedpassword' // Senha temporária (hash dummy)
        ]);
      }

      // Opcional: marcar status_solicitacao = 'pendente' se coluna existir
      try {
        const hasStatusCol = await columnExists('usuarios', 'status_solicitacao');
        if (hasStatusCol) {
          await query('UPDATE usuarios SET status_solicitacao = $1 WHERE id = $2', ['pendente', result.rows[0].id]);
        }
      } catch (statusErr) {
        console.warn('⚠️ [Usuarios] Não foi possível atualizar status_solicitacao:', statusErr?.message);
      }

      // Criar notificação para administradores (uma por usuário) e emitir via Socket.io
      const adminsResult = await query(`
        SELECT u.id
        FROM usuarios u
        JOIN perfis p ON u.perfil_id = p.id
        WHERE p.nome = 'Administrador' AND u.ativo = true
      `);

      for (const admin of adminsResult.rows) {
        const notifResult = await query(`
          INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          admin.id,
          'Nova Solicitação de Cadastro',
          `${nome_completo} (${tipo}) solicitou cadastro no sistema.`,
          'info',
          'usuarios',
          result.rows[0].id
        ]);

        // Emitir evento em tempo real (se disponível)
        if (req.io) {
          req.io.to(`user_${admin.id}`).emit('nova_notificacao', notifResult.rows[0]);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Solicitação de cadastro enviada com sucesso. Aguarde a aprovação do administrador.',
        data: result.rows[0]
      });

    } catch (error) {
      // Log detalhado do erro para facilitar diagnóstico
      const dbInfo = {
        code: error?.code,
        detail: error?.detail,
        constraint: error?.constraint,
        table: error?.table,
        column: error?.column,
        message: error?.message,
      };
      console.error('💥 [Usuarios] Erro ao solicitar cadastro:', dbInfo, '\nStack:', error?.stack);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        details: process.env.NODE_ENV !== 'production' ? dbInfo : undefined
      });
    }
  }
);

// =====================================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// =====================================================

/**
 * @route GET /api/usuarios/postos-graduacoes
 * @desc Lista padronizada de postos/graduações (público)
 * @access Public
 */
router.get('/postos-graduacoes', async (req, res) => {
  try {
    const lista = [
      'Coronel', 'Tenente-Coronel', 'Major',
      'Capitão', '1º Tenente', '2º Tenente', 'Aspirante a Oficial',
      'Subtenente', '1º Sargento', '2º Sargento', '3º Sargento',
      'Cabo', 'Soldado'
    ];
    res.json({ success: true, data: lista });
  } catch (error) {
    console.error('Erro ao listar postos/graduações:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

/**
 * @route GET /api/usuarios/unidades-publicas
 * @desc Listar unidades ativas (público)
 * @access Public
 */
router.get('/unidades-publicas', async (req, res) => {
  try {
    const unidadesResult = await query(`
      SELECT id, nome, sigla, endereco, telefone, ativa
      FROM unidades 
      WHERE ativa = true
      ORDER BY nome ASC
    `);

    res.json({
      success: true,
      unidades: unidadesResult.rows
    });
  } catch (error) {
    console.error('Erro ao listar unidades públicas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});
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
      sort,
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
    const todos = String(req.query.todos || '').toLowerCase() === 'true';
    const userPerfilNome = req.user?.perfil_nome || '';
    const isGestor = ['Administrador', 'Comandante', 'Chefe'].includes(userPerfilNome);
    const applyTenant = tenantUnitId && !(todos && isGestor);
    if (applyTenant) {
      whereConditions.push(`u.${lotacaoCol} = $${paramIndex}`);
      queryParams.push(parseInt(tenantUnitId));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    console.log('[Usuarios][GET] filtro', { userId: req.user?.id, tenantUnitId, todos, isGestor, whereClause });

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

    const selectFuncoes = hasUsuariosFuncoes ? 'COALESCE(u.funcoes, \'[]\'::jsonb) as funcoes' : 'NULL as funcoes';

    const orderClause = (String(sort || '').toLowerCase() === 'recent') ? 'ORDER BY u.created_at DESC' : 'ORDER BY u.nome_completo';
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
        u.antiguidade,
        u.ativo,
        u.foto,
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
      ${orderClause}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const usuariosResult = await query(usuariosQuery, queryParams);
    console.log('[Usuarios][GET] resultado', { count: usuariosResult.rows.length, page, limit });

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
        data_incorporacao,
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
 * @route POST /api/usuarios/aprovar-cadastro/:id
 * @desc Aprovar ou rejeitar uma solicitação de cadastro
 * @access Administrador, Comandante
 */
router.post('/aprovar-cadastro/:id', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    const { id } = req.params;
    const { aprovado, acao, observacoes, perfil_id, role, setor_id, setor, funcao_id, funcao, funcoes } = req.body || {};

    // Verificar existência do usuário
    const usuarioSel = await query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (usuarioSel.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    const usuario = usuarioSel.rows[0];

    // Verificar se existe coluna status_solicitacao
    const hasStatusSolicitacao = await columnExists('usuarios', 'status_solicitacao');
    const hasAprovadoPor = await columnExists('usuarios', 'aprovado_por');
    const hasAprovadoEm = await columnExists('usuarios', 'aprovado_em');
    const hasObservacoesAprovacao = await columnExists('usuarios', 'observacoes_aprovacao');
    const hasSetorId = await columnExists('usuarios', 'setor_id');
    const hasFuncoes = await columnExists('usuarios', 'funcoes');

    const isAprovado = (aprovado === true) || (acao === 'aprovar');
    const novoStatus = isAprovado ? 'aprovado' : 'rejeitado';
    const ativo = !!isAprovado;

    // Montar query dinâmica de update
    const fields = ['ativo = $1'];
    const params = [ativo];
    let pIdx = 2;

    if (hasStatusSolicitacao) {
      fields.push(`status_solicitacao = $${pIdx}`);
      params.push(novoStatus);
      pIdx++;
    }
    // Resolver perfil_id a partir de 'role' se necessário
    let perfilIdToSet = perfil_id;
    if (isAprovado && !perfilIdToSet && role) {
      try {
        const pr = await query('SELECT id FROM perfis WHERE LOWER(nome) = LOWER($1) LIMIT 1', [role]);
        perfilIdToSet = pr.rows[0]?.id;
      } catch (_) { console.warn('resolve perfil_id from role failed'); }
    }
    if (isAprovado && perfilIdToSet) {
      fields.push(`perfil_id = $${pIdx}`);
      params.push(perfilIdToSet);
      pIdx++;
    }

    // Resolver setor_id a partir de 'setor' se necessário
    let setorIdToSet = setor_id;
    const hasFuncaoId = await columnExists('usuarios', 'funcao_id');
    if (isAprovado && hasSetorId && !setorIdToSet && setor) {
      try {
        const sr = await query('SELECT id FROM setores WHERE LOWER(nome) = LOWER($1) LIMIT 1', [setor]);
        setorIdToSet = sr.rows[0]?.id;
      } catch (_) { console.warn('resolve setor_id from nome failed'); }
    }
    if (isAprovado && hasSetorId && setorIdToSet) {
      fields.push(`setor_id = $${pIdx}`);
      params.push(setorIdToSet);
      pIdx++;
    }

    // Resolver funcao_id ou funcoes jsonb
    let funcaoIdToSet = funcao_id;
    if (isAprovado && hasFuncaoId && !funcaoIdToSet && funcao) {
      try {
        const fr = await query('SELECT id FROM funcoes WHERE LOWER(nome) = LOWER($1) LIMIT 1', [funcao]);
        funcaoIdToSet = fr.rows[0]?.id;
      } catch (_) { console.warn('resolve funcao_id from nome failed'); }
    }
    if (isAprovado && hasFuncaoId && funcaoIdToSet) {
      fields.push(`funcao_id = $${pIdx}`);
      params.push(funcaoIdToSet);
      pIdx++;
    } else if (isAprovado && hasFuncoes && funcoes) {
      fields.push(`funcoes = $${pIdx}::jsonb`);
      params.push(Array.isArray(funcoes) ? JSON.stringify(funcoes) : funcoes);
      pIdx++;
    }
    if (hasAprovadoPor) {
      fields.push(`aprovado_por = $${pIdx}`);
      params.push(req.user.id);
      pIdx++;
    }
    if (hasAprovadoEm) {
      fields.push('aprovado_em = CURRENT_TIMESTAMP');
    }
    if (hasObservacoesAprovacao && observacoes) {
      fields.push(`observacoes_aprovacao = $${pIdx}`);
      params.push(observacoes);
      pIdx++;
    }

    params.push(id);
    const updateSql = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${pIdx} RETURNING *`;
    const upd = await query(updateSql, params);
    const usuarioAtualizado = upd.rows[0];

    // Se aprovado, garantir relação em membros_unidade com unidade de lotação
    if (isAprovado) {
      try {
        const lotacaoCol = (await getUsuariosUnidadeColumn()) || 'unidade_id';
        const unidadeLotacaoId = usuarioAtualizado[lotacaoCol] || usuario[lotacaoCol];
        const hasMembrosUnidade = await tableExists('membros_unidade');
        if (hasMembrosUnidade && unidadeLotacaoId) {
          const existeRel = await query(
            'SELECT id FROM membros_unidade WHERE usuario_id = $1 AND unidade_id = $2',
            [usuarioAtualizado.id, unidadeLotacaoId]
          );
          if (existeRel.rows.length === 0) {
            await query(
              'INSERT INTO membros_unidade (usuario_id, unidade_id, ativo) VALUES ($1, $2, true)',
              [usuarioAtualizado.id, unidadeLotacaoId]
            );
          } else {
            await query(
              'UPDATE membros_unidade SET ativo = true WHERE usuario_id = $1 AND unidade_id = $2',
              [usuarioAtualizado.id, unidadeLotacaoId]
            );
          }
        }
      } catch (e) {
        // Não bloquear aprovação por falhas em relação de membros; logar somente
        console.error('Aviso: falha ao ajustar membros_unidade na aprovação:', e?.message);
      }

      // Definir senha temporária e marcar troca obrigatória no primeiro login
      try {
        const hasSenhaHashCol = await columnExists('usuarios', 'senha_hash');
        const hasPrecisaTrocarCol = await columnExists('usuarios', 'precisa_trocar_senha');
        if (hasSenhaHashCol) {
          const senhaTemporaria = (typeof req.body.senha_temporaria === 'string' && req.body.senha_temporaria.length >= 6)
            ? req.body.senha_temporaria
            : 'senha123';
          const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
          const hashTemp = await bcrypt.hash(senhaTemporaria, rounds);
          const sql = hasPrecisaTrocarCol
            ? 'UPDATE usuarios SET senha_hash = $1, precisa_trocar_senha = true WHERE id = $2'
            : 'UPDATE usuarios SET senha_hash = $1 WHERE id = $2';
          await query(sql, [hashTemp, usuarioAtualizado.id]);
        }
      } catch (e) {
        console.warn('Falha ao definir senha temporária na aprovação:', e?.message);
      }
    }

    // Notificar via socket se disponível
    try {
      const message = isAprovado
        ? `Cadastro de ${usuarioAtualizado.nome_completo || usuario.nome_completo} aprovado.`
        : `Cadastro de ${usuarioAtualizado.nome_completo || usuario.nome_completo} rejeitado.`;
      req.io?.emit('usuarios:aprovacao', {
        usuario_id: usuarioAtualizado.id,
        aprovado: isAprovado,
        message,
      });
    } catch (_) { console.warn('socket notify failed'); }

    return res.json({
      success: true,
      message: isAprovado ? 'Solicitação aprovada com sucesso' : 'Solicitação rejeitada com sucesso',
      data: usuarioAtualizado,
    });
  } catch (error) {
    console.error('Erro ao aprovar/rejeitar solicitação:', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
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
    const funcoesCampo = hasUsuariosFuncoes ? 'COALESCE(u.funcoes, \'[]\'::jsonb) as funcoes' : 'NULL as funcoes';

    const hasCategoriaCnh = await columnExists('usuarios', 'categoria_cnh');
    const selectCategoriaCnh = hasCategoriaCnh ? 'u.categoria_cnh' : 'NULL as categoria_cnh';

    // Seleções dinâmicas para colunas opcionais em perfis
    const hasPerfilDescricao = await columnExists('perfis', 'descricao');
    const selectPerfilDescricao = hasPerfilDescricao ? 'p.descricao as perfil_descricao' : 'NULL as perfil_descricao';
    const selectPerfilNivel = (await columnExists('perfis', 'nivel_hierarquia')) ? 'p.nivel_hierarquia' : 'NULL as nivel_hierarquia';

    // Detecção dinâmica de setor/funcao
    const hasUsuariosSetorId = await columnExists('usuarios', 'setor_id');
    const hasUsuariosSetorText = await columnExists('usuarios', 'setor');
    const hasSetorSigla = await columnExists('setores', 'sigla');
    const setorJoin = hasUsuariosSetorId ? 'LEFT JOIN setores s ON u.setor_id = s.id' : '';
    let selectSetorNome;
    if (hasUsuariosSetorId) {
      if (hasUsuariosSetorText) {
        selectSetorNome = 'COALESCE(NULLIF(u.setor, \'\'), s.nome) as setor_nome';
      } else {
        selectSetorNome = 's.nome as setor_nome';
      }
    } else {
      if (hasUsuariosSetorText) {
        selectSetorNome = 'u.setor as setor_nome';
      } else {
        selectSetorNome = 'NULL as setor_nome';
      }
    }
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
        u.antiguidade,
        u.data_nascimento,
        u.data_incorporacao,
        u.ativo,
        u.foto,
        u.ultimo_login,
        u.created_at,
        u.updated_at,
        u.perfil_id,
        u.${lotacaoCol} as unidade_lotacao_id,
        ${selectCategoriaCnh},
        
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
        ,
        ${funcoesCampo}
        
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

    // Detecta dinamicamente a coluna de lotação para compatibilidade
    // Comentário: a tabela pode ter `unidade_id`, `unidade_lotacao_id` ou `unidades_id`.
    const lotacaoCol = await getUsuariosUnidadeColumn() || 'unidade_id';

    console.log('📝 [Usuarios] PUT /:id - Payload received:', {
      id,
      bodyKeys: Object.keys(req.body),
      foto: req.body.foto ? 'PRESENT (length ' + req.body.foto.length + ')' : 'MISSING/EMPTY',
      userPerfil,
      isAdmin,
      isSelf
    });

    // Campos permitidos (base), substituindo a coluna de lotação detectada
    const allowedFields = isAdmin
      ? [
        'nome_completo',
        'email',
        'cpf',
        'telefone',
        'tipo',
        'posto_graduacao',
        'nome_guerra',
        'categoria_cnh',
        'matricula',
        'data_nascimento',
        'data_incorporacao',
        'antiguidade',
        lotacaoCol,
        'setor_id',
        'setor',
        'perfil_id',
        'ativo',
        'foto'
      ]
      : ['nome_completo', 'email', 'telefone', 'data_nascimento', 'posto_graduacao', 'nome_guerra', 'matricula', 'foto'];

    // Normalizações leves no corpo (tipos e datas) para evitar erros de tipo
    // Comentário: conversões defensivas antes de montar o SQL.
    const normalizeDate = (value) => {
      if (!value) return value;
      const s = String(value);
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // dd/mm/yyyy
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      return s.includes('-') ? s.substring(0, 10) : s; // yyyy-mm-dd
    };
    if (req.body.data_nascimento) req.body.data_nascimento = normalizeDate(req.body.data_nascimento);
    if (req.body.data_incorporacao) req.body.data_incorporacao = normalizeDate(req.body.data_incorporacao);
    if (req.body.ativo !== undefined) req.body.ativo = !!req.body.ativo;

    // Mapear unidade de lotação do payload para a coluna correta
    if (req.body.unidade_lotacao_id && req.body[lotacaoCol] === undefined) {
      req.body[lotacaoCol] = req.body.unidade_lotacao_id;
    } else if (req.body.unidade_id && req.body[lotacaoCol] === undefined) {
      req.body[lotacaoCol] = req.body.unidade_id;
    }

    // Sanitize: converter strings vazias em null para evitar erros de tipo no banco
    const numericFields = new Set(['perfil_id', 'setor_id', 'antiguidade', lotacaoCol]);
    const dateFields = new Set(['data_nascimento', 'data_incorporacao']);
    for (const key of Object.keys(req.body)) {
      if (req.body[key] === '') {
        if (numericFields.has(key) || dateFields.has(key)) {
          req.body[key] = null;
        }
      }
    }

    // Converter IDs numéricos para inteiros
    ['perfil_id', 'setor_id', lotacaoCol, 'antiguidade'].forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
        const v = parseInt(String(req.body[field]), 10);
        if (!isNaN(v) && v > 0) {
          req.body[field] = v;
        }
      }
    });

    const updates = [];
    const params = [];
    let idx = 1;

    // Apenas atualiza campos que existem na tabela
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Verifica se a coluna existe antes de tentar atualizar
        // eslint-disable-next-line no-await-in-loop
        const hasColumn = await columnExists('usuarios', field);
        
        if (field === 'foto') {
          console.log(`📸 [Usuarios] Processing 'foto' field. Value: ${req.body[field] ? 'PRESENT' : 'EMPTY'}. Column exists: ${hasColumn}`);
        }

        if (hasColumn) {
          updates.push(`${field} = $${idx}`);
          params.push(req.body[field]);
          idx++;
        }
      }
    }

    // Regras de unicidade básicas antes do UPDATE
    // Evitar conflito de matrícula ao usuário alterar própria matrícula
    if (req.body.matricula !== undefined && req.body.matricula !== null && String(req.body.matricula).trim() !== '') {
      const matVal = String(req.body.matricula).trim();
      try {
        const dupe = await query('SELECT id FROM usuarios WHERE matricula = $1 AND id <> $2', [matVal, id]);
        if (dupe.rows.length > 0) {
          return res.status(400).json({ success: false, message: 'Matrícula já está em uso' });
        }
      } catch (_) { /* ignore */ }
    }

    // Atualizar Setor quando não existe coluna setor_id (fallback para coluna texto 'setor')
    const hasSetorIdCol = await columnExists('usuarios', 'setor_id');
    const hasSetorTextCol = await columnExists('usuarios', 'setor');
    if (!hasSetorIdCol && hasSetorTextCol && req.body.setor_id !== undefined && req.body.setor === undefined) {
      const setoresFixos = [
        'Comando',
        'Subcomando',
        'SAAD',
        'SOP',
        'SEC',
        'SAT',
        'PROEBOM',
        'Operacional',
      ];
      const sid = parseInt(String(req.body.setor_id), 10);
      const setorNome = (!isNaN(sid) && sid >= 1 && sid <= setoresFixos.length)
        ? setoresFixos[sid - 1]
        : null;
      if (setorNome !== null) {
        updates.push(`setor = $${idx}`);
        params.push(setorNome);
        idx++;
      }
    }

    // Atualizar setor_id a partir de `setor` (texto) quando não existe coluna de texto `setor`
    // Isso garante compatibilidade com bancos não migrados que ainda possuem apenas `setor_id`.
    if (hasSetorIdCol && !hasSetorTextCol && req.body.setor !== undefined) {
      const setoresFixos = [
        'Comando',
        'Subcomando',
        'SAAD',
        'SOP',
        'SEC',
        'SAT',
        'PROEBOM',
        'Operacional',
      ];
      const setorNome = String(req.body.setor).trim();
      const idxNome = setoresFixos.findIndex((n) => n.toLowerCase() === setorNome.toLowerCase());
      const setorId = idxNome >= 0 ? (idxNome + 1) : null;
      if (setorId !== null) {
        updates.push(`setor_id = $${idx}`);
        params.push(setorId);
        idx++;
      }
    }

    // Atualizar funcao_id (FK) se existir coluna e for possível resolver ID a partir de funcoes
    const hasFuncaoIdCol = await columnExists('usuarios', 'funcao_id');
    if (isAdmin && hasFuncaoIdCol) {
      let funcaoIdToSet = null;
      if (req.body.funcao_id !== undefined && req.body.funcao_id !== '') {
        const v = parseInt(String(req.body.funcao_id), 10);
        funcaoIdToSet = !isNaN(v) && v > 0 ? v : null;
      } else if (req.body.funcoes !== undefined) {
        const primaryNome = Array.isArray(req.body.funcoes) ? req.body.funcoes[0] : req.body.funcoes;
        if (typeof primaryNome === 'string' && primaryNome.trim()) {
          try {
            const hasFuncoesTable = await tableExists('funcoes');
            if (hasFuncoesTable) {
              const sel = await query('SELECT id FROM funcoes WHERE LOWER(nome) = LOWER($1) LIMIT 1', [primaryNome.trim()]);
              if (sel.rows.length > 0) {
                funcaoIdToSet = sel.rows[0].id;
              }
            }
          } catch (e) {
            // Se não conseguir resolver, ignora silenciosamente
          }
        }
      }
      if (funcaoIdToSet !== null) {
        updates.push(`funcao_id = $${idx}`);
        params.push(funcaoIdToSet);
        idx++;
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

    // Atualizar updated_at apenas se a coluna existir
    const hasUpdatedAt = await columnExists('usuarios', 'updated_at');
    if (hasUpdatedAt) {
      updates.push('updated_at = NOW()');
    }

    const queryText = `
      UPDATE usuarios
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, nome_completo, email, COALESCE(funcoes, '[]'::jsonb) as funcoes
    `;

    params.push(id);

    const result = await query(queryText, params);
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      usuario: result.rows[0]
    });
  } catch (error) {
    // Log detalhado para facilitar diagnóstico em produção/desenvolvimento
    const dbInfo = {
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      table: error?.table,
      column: error?.column,
      message: error?.message,
    };
    console.error('💥 [Usuarios] Erro ao atualizar usuário:', dbInfo, '\nStack:', error?.stack);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/usuarios
 * @desc Criar novo usuário
 * @access Administrador, Comandante
 */
router.post('/', 
  authorizeRoles(['Administrador', 'Comandante']),
  [
    body('nome_completo').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('tipo').isIn(['militar', 'civil']).withMessage('Tipo deve ser militar ou civil'),
    body('perfil_id').isInt({ min: 1 }).withMessage('Perfil é obrigatório'),
    // Antiguidade é opcional, quando presente deve ser inteiro >= 1
    body('antiguidade').optional().isInt({ min: 1 }).withMessage('Antiguidade deve ser inteiro >= 1'),
    
    // Validações condicionais para militares
    body('posto_graduacao').if(body('tipo').equals('militar'))
      .notEmpty().withMessage('Posto/graduação é obrigatório para militares'),
    body('matricula').if(body('tipo').equals('militar'))
      .notEmpty().withMessage('Matrícula é obrigatória para militares'),
    
    body('cpf').optional().isLength({ min: 11, max: 14 }).withMessage('CPF inválido'),
    body('telefone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido')
  ],
  async (req, res) => {
    // Contexto de debug para rastrear colunas detectadas e campos usados
    let debugCtx = { detectedCols: {}, fieldsUsed: [] };
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
        nome_completo, email, cpf, telefone, tipo,
        posto_graduacao, nome_guerra, matricula,
        data_nascimento, data_incorporacao,
        unidade_id, unidade_lotacao_id, _unidades_ids, setor_id, funcao_id, perfil_id,
        antiguidade,
        senha = 'senha123'
      } = req.body;

      // Verificar se email já existe
      const emailExists = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (emailExists.rows.length > 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Email já está em uso' 
        });
      }

      // Se for militar, verificar se matrícula já existe
      if (tipo === 'militar' && matricula) {
        const matriculaExists = await query('SELECT id FROM usuarios WHERE matricula = $1', [matricula]);
        if (matriculaExists.rows.length > 0) {
          return res.status(400).json({ 
            success: false,
            error: 'Matrícula já está em uso' 
          });
        }
      }

      // Hash da senha
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(senha, saltRounds);

      // Inserir usuário
      // Suporte dinâmico a funcao_id (FK) ou funcoes (JSONB)
      const hasFuncaoId = await columnExists('usuarios', 'funcao_id');
      const hasFuncoes = await columnExists('usuarios', 'funcoes');
      const hasSetorId = await columnExists('usuarios', 'setor_id');
      const hasSetorText = await columnExists('usuarios', 'setor');
      const hasCreatedBy = await columnExists('usuarios', 'created_by');
      const hasSenhaHash = await columnExists('usuarios', 'senha_hash');
      const hasSenhaCol = await columnExists('usuarios', 'senha');
      const hasCategoriaCnh = await columnExists('usuarios', 'categoria_cnh');
      const hasFoto = await columnExists('usuarios', 'foto');

      let fields = [];
      let placeholders = [];
      let params = [];
      let idx = 1;
      const add = (name, value, cast = '') => {
        fields.push(name);
        placeholders.push(`$${idx}${cast}`);
        params.push(value);
        idx++;
      };

      const hasNomeCol = await columnExists('usuarios', 'nome');
      if (hasNomeCol) {
        add('nome', nome_completo);
      }
      add('nome_completo', nome_completo);
      add('email', email);
      add('cpf', cpf);
      add('telefone', telefone);
      add('tipo', tipo);
      add('posto_graduacao', posto_graduacao);
      add('nome_guerra', nome_guerra);
      add('matricula', matricula);
      add('data_nascimento', data_nascimento);
      add('data_incorporacao', data_incorporacao);
      if (hasFoto && req.body.foto) {
        add('foto', req.body.foto);
      }
      // Persistir ANTIGUIDADE (inteiro opcional) se a coluna existir
      const hasAntiguidade = await columnExists('usuarios', 'antiguidade');
      if (hasAntiguidade) {
        const antiguidadeValue = antiguidade ? parseInt(antiguidade, 10) : null;
        add('antiguidade', antiguidadeValue, '::int');
      }
      // Persistir LOTAÇÃO usando coluna preferencial `unidade_lotacao_id` se existir; caso contrário, usa `unidade_id`.
      const hasUnidadeLotacaoId = await columnExists('usuarios', 'unidade_lotacao_id');
      const hasUnidadeId = await columnExists('usuarios', 'unidade_id');
      const lotacaoValue = unidade_lotacao_id ?? unidade_id ?? null;
      if (hasUnidadeLotacaoId) {
        add('unidade_lotacao_id', lotacaoValue);
      }
      if (hasUnidadeId) {
        add('unidade_id', lotacaoValue);
      }
      // Atualizar contexto de colunas detectadas para debug
      debugCtx.detectedCols = {
        funcao_id: hasFuncaoId,
        funcoes: hasFuncoes,
        setor_id: hasSetorId,
        setor: hasSetorText,
        antiguidade: hasAntiguidade,
        unidade_lotacao_id: hasUnidadeLotacaoId,
        unidade_id: hasUnidadeId,
        created_by: hasCreatedBy,
        senha_hash: hasSenhaHash,
        senha: hasSenhaCol,
        nome: hasNomeCol,
        categoria_cnh: hasCategoriaCnh,
      };
      // Persistir setor priorizando texto quando disponível
      if (hasSetorText) {
        const setorNome = typeof req.body.setor === 'string' ? req.body.setor.trim() : '';
        if (setorNome) add('setor', setorNome);
      }
      if (hasSetorId) {
        const setorIdValue = (setor_id !== undefined && setor_id !== '')
          ? parseInt(String(setor_id), 10)
          : null;
        if (!isNaN(setorIdValue) && setorIdValue > 0) add('setor_id', setorIdValue);
      }
      if (hasFuncaoId) {
        add('funcao_id', funcao_id || null);
      }
      if (hasFuncoes) {
        const funcoesArray = Array.isArray(req.body.funcoes)
          ? req.body.funcoes
          : (req.body.funcoes ? [req.body.funcoes] : []);
        add('funcoes', JSON.stringify(funcoesArray), '::jsonb');
      }
      if (hasCategoriaCnh) {
        const cnh = typeof req.body.categoria_cnh === 'string' ? req.body.categoria_cnh.trim() : '';
        if (cnh) add('categoria_cnh', cnh);
      }
      add('perfil_id', perfil_id);
      // Armazenar senha na coluna disponível
      if (hasSenhaHash) {
        add('senha_hash', hashedPassword);
      } else if (hasSenhaCol) {
        add('senha', hashedPassword);
      }
      // Salvar campos usados para debug
      debugCtx.fieldsUsed = [...fields];

      // Montar INSERT dinamicamente, incluindo created_by apenas se existir
      const insertFields = [...fields, 'ativo'];
      const insertPlaceholders = [...placeholders, 'true'];
      const insertParams = [...params];
      if (hasCreatedBy) {
        insertFields.push('created_by');
        insertPlaceholders.push(`$${idx}`);
        insertParams.push(req.user.id);
        idx++;
      }
      const insertSql = `
        INSERT INTO usuarios (${insertFields.join(', ')})
        VALUES (${insertPlaceholders.join(', ')})
        RETURNING id, nome_completo, email, tipo, ativo, created_at
      `;

      const result = await query(insertSql, insertParams);

      const novoUsuario = result.rows[0];

      // Criar notificação de boas-vindas
      await query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        novoUsuario.id,
        'Bem-vindo ao Sistema',
        `Olá ${nome_completo}, sua conta foi criada com sucesso. Acesse o sistema com suas credenciais.`,
        'info',
        'sistema'
      ]);

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        usuario: novoUsuario
      });
    } catch (error) {
      const dbInfo = {
        code: error?.code,
        detail: error?.detail,
        constraint: error?.constraint,
        table: error?.table,
        column: error?.column,
        message: error?.message,
      };
      console.error('💥 [Usuarios] Erro ao criar usuário:', dbInfo, '\nDetectado:', debugCtx, '\nStack:', error?.stack);
      res.status(500).json({ 
        success: false,
        error: dbInfo?.message || 'Erro interno do servidor',
        code: dbInfo?.code,
        constraint: dbInfo?.constraint
      });
    }
  }
);

/**
 * @route PUT /api/usuarios/:id/senha
 * @desc Alterar senha do usuário (autoatendimento ou por admin)
 * @access Próprio usuário ou Administrador/Comandante
 */
router.put('/:id/senha', async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterPerfil = req.user?.perfil_nome;

    const isAdmin = ['Administrador', 'Comandante'].includes(requesterPerfil);
    const isSelf = parseInt(id, 10) === parseInt(requesterId, 10);

    const { senha_atual, nova_senha } = req.body;

    if (!nova_senha || String(nova_senha).length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    // Buscar senha atual do usuário alvo
    const result = await query('SELECT id, senha_hash FROM usuarios WHERE id = $1 AND ativo = true', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const usuarioAlvo = result.rows[0];

    // Se não for admin, validar senha atual obrigatória
    if (!isAdmin) {
      if (!senha_atual) {
        return res.status(400).json({ success: false, error: 'Senha atual é obrigatória' });
      }
      const ok = await bcrypt.compare(senha_atual, usuarioAlvo.senha_hash);
      if (!ok) {
        return res.status(400).json({ success: false, error: 'Senha atual incorreta' });
      }
    } else {
      // Se admin forneceu senha_atual, validar por segurança opcional
      if (senha_atual) {
        const ok = await bcrypt.compare(senha_atual, usuarioAlvo.senha_hash);
        if (!ok) {
          return res.status(400).json({ success: false, error: 'Senha atual incorreta' });
        }
      }
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    const hashed = await bcrypt.hash(nova_senha, saltRounds);

    const hasFlag = await columnExists('usuarios', 'precisa_trocar_senha');
    const sql = hasFlag
      ? 'UPDATE usuarios SET senha_hash = $1, precisa_trocar_senha = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2'
      : 'UPDATE usuarios SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await query(sql, [hashed, id]);

    return res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha do usuário:', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// =====================================================
// ROTAS AUXILIARES DE DADOS
// =====================================================

/**
 * @route GET /api/usuarios/data/unidades
 * @desc Listar unidades disponíveis
 * @access Administrador, Comandante
 */
router.get('/data/unidades', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    const unidadesResult = await query(`
      SELECT id, nome, sigla, endereco, telefone, ativa
      FROM unidades 
      WHERE ativa = true
      ORDER BY nome ASC
    `);

    res.json({
      success: true,
      unidades: unidadesResult.rows
    });
  } catch (error) {
    console.error('Erro ao listar unidades:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * @route GET /api/usuarios/data/setores
 * @desc Listar setores disponíveis
 * @access Administrador, Comandante
 */
router.get('/data/setores', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    // ATENÇÃO: Lista fixa de setores do Corpo de Bombeiros/organização.
    // Não buscar do banco de dados. Mantida aqui por padronização e
    // previsibilidade no frontend. Se precisar atualizar, altere esta
    // lista e mantenha sincronizada com o endpoint /config/setores.
    const setores = [
      'Comando',
      'Subcomando', 
      'SAAD',
      'SOP',
      'SEC',
      'SAT',
      'PROEBOM',
      'Operacional',
    ];

    res.json({
      success: true,
      setores: setores
    });
  } catch (error) {
    console.error('Erro ao listar setores:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * @route GET /api/usuarios/data/funcoes
 * @desc Listar funções disponíveis
 * @access Administrador, Comandante
 */
router.get('/data/funcoes', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    // ATENÇÃO: Lista fixa de funções/papéis na organização.
    // Não dinamizar via banco. Se alterar, sincronize com o frontend
    // e documentação para evitar inconsistência.
    const funcoes = [
      'Comandante',
      'Subcomandante',
      'Administrativo',
      'Chefe de Seção',
      'Auxiliar de Seção',
      'Adjunto',
      'Socorrista/Combatente',
      'Motorista',
      'Motorista D',
      'Vistoriador',
      'Instrutor',
      'CIPA',
      'Síndico Dengueiro',
    ];

    res.json({
      success: true,
      funcoes: funcoes
    });
  } catch (error) {
    console.error('Erro ao listar funções:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// =====================================================
// ROTAS DE PERFIL DO USUÁRIO
// =====================================================

/**
 * @route GET /api/usuarios/me/perfil
 * @desc Obter perfil do usuário logado
 * @access Usuário autenticado
 */
router.get('/me/perfil', async (req, res) => {
  try {
    const userId = req.user.id;

    const selectPerfilNivel = (await columnExists('perfis', 'nivel_hierarquia')) ? 'p.nivel_hierarquia' : 'NULL as nivel_hierarquia';

    const hasUsuariosSetorId = await columnExists('usuarios', 'setor_id');
    const hasUsuariosSetorText = await columnExists('usuarios', 'setor');
    const hasSetorSigla = await columnExists('setores', 'sigla');
    const setorJoin = hasUsuariosSetorId ? 'LEFT JOIN setores s ON u.setor_id = s.id' : '';
    let selectSetorNome;
    if (hasUsuariosSetorId) {
      if (hasUsuariosSetorText) {
        selectSetorNome = 'COALESCE(NULLIF(u.setor, \'\'), s.nome) as setor_nome';
      } else {
        selectSetorNome = 's.nome as setor_nome';
      }
    } else {
      if (hasUsuariosSetorText) {
        selectSetorNome = 'u.setor as setor_nome';
      } else {
        selectSetorNome = 'NULL as setor_nome';
      }
    }
    const selectSetorSigla = (hasUsuariosSetorId && hasSetorSigla) ? 's.sigla as setor_sigla' : 'NULL as setor_sigla';

    const hasUsuariosFuncaoId = await columnExists('usuarios', 'funcao_id');
    const funcaoJoin = hasUsuariosFuncaoId ? 'LEFT JOIN funcoes f ON u.funcao_id = f.id' : '';
    const selectFuncaoNome = hasUsuariosFuncaoId ? 'f.nome as funcao_nome' : 'NULL as funcao_nome';

    const lotacaoCol = await getUsuariosUnidadeColumn() || 'unidade_id';

    const usuarioResult = await query(`
      SELECT 
        u.id,
        u.nome_completo as nome,
        u.nome_guerra,
        u.email,
        u.matricula,
        u.telefone,
        u.tipo,
        u.posto_graduacao,
        u.ativo,
        u.created_at as data_criacao,
        u.ultimo_login,
        
        p.nome as perfil_nome,
        ${selectPerfilNivel},
        p.permissoes,
        
        un.nome as unidade_nome,
        un.sigla as unidade_sigla,
        
        ${selectSetorNome},
        ${selectSetorSigla},
        
        ${selectFuncaoNome}
        
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      LEFT JOIN unidades un ON u.${lotacaoCol} = un.id
      ${setorJoin}
      ${funcaoJoin}
      WHERE u.id = $1
    `, [userId]);

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const usuarioRaw = usuarioResult.rows[0];
    const usuario = {
      ...usuarioRaw,
      papel: usuarioRaw.perfil_nome,
      setor: usuarioRaw.setor_nome,
      unidade: usuarioRaw.unidade_nome,
      funcao: usuarioRaw.funcao_nome,
    };

    const estatisticas = await query(`
      SELECT 
        (SELECT COUNT(*) FROM movimentacoes_estoque WHERE usuario_id = $1) as total_movimentacoes,
        (SELECT COUNT(*) FROM emprestimos WHERE usuario_solicitante_id = $1) as total_emprestimos,
        (SELECT COUNT(*) FROM servicos_extra WHERE usuario_id = $1 AND status = 'aprovado') as total_extras,
        (SELECT COUNT(*) FROM notificacoes WHERE usuario_id = $1 AND lida = false) as notificacoes_nao_lidas
    `, [userId]);

    usuario.estatisticas = estatisticas.rows[0];

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @route GET /api/usuarios/config/setores
 * @desc Listar setores disponíveis para configuração
 * @access Usuário autenticado
 */
router.get('/config/setores', async (req, res) => {
  try {
    // ATENÇÃO: Endpoint de configuração usando a MESMA lista fixa de setores.
    // Mantido acessível para qualquer usuário autenticado (sem restrição de
    // perfil), diferente do /data/setores que exige Administrador/Comandante.
    // A duplicidade existe por controle de acesso e formato de resposta.
    const setores = [
      'Comando',
      'Subcomando', 
      'SAAD',
      'SOP',
      'SEC',
      'SAT',
      'PROEBOM',
      'Operacional',
    ];

    res.json({ setores });
  } catch (error) {
    console.error('Erro ao listar setores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @route GET /api/usuarios/config/unidades
 * @desc Listar unidades disponíveis para configuração, filtradas por acesso do usuário
 * @access Usuário autenticado
 *
 * RELACIONAMENTOS/REGRA:
 * - Tabela `usuarios` possui coluna de lotação (pode ser `unidade_id`, `unidade_lotacao_id` ou `unidades_id`).
 * - Tabela `membros_unidade` relaciona acessos adicionais: (`usuario_id`, `unidade_id`, `ativo`, `role_unidade`).
 * - Tabela `unidades` lista todas as unidades e seu status (`ativa`).
 *
 * SELEÇÃO:
 * - Administrador: vê todas as unidades ativas.
 * - Demais perfis: vê a unidade de lotação e as unidades onde é membro ativo.
 *
 * IMPLEMENTAÇÃO:
 * - Reutiliza o middleware centralizado de tenant `getUserUnits` que monta
 *   `req.user.unidades_disponiveis` com base nas regras acima.
 */
router.get('/config/unidades', getUserUnits, async (req, res) => {
  try {
    const unidadesDisponiveis = req.user.unidades_disponiveis || [];

    // Mapear para o formato esperado pelo frontend (compatibilidade)
    const unidades = unidadesDisponiveis.map(u => ({
      id: u.id,
      nome: u.nome,
      sigla: u.sigla || null,
      // Campos mantidos por compatibilidade; não usados no dropdown atual
      endereco: u.endereco || null,
      telefone: u.telefone || null,
      ativo: true,
      // Metadados úteis para UI (seleção, badges, etc.)
      role_unidade: u.role_unidade || null,
      eh_lotacao: !!u.eh_lotacao,
    }));

    res.json({
      success: true,
      unidades,
    });
  } catch (error) {
    console.error('Erro ao listar unidades (filtradas por usuário):', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// =====================================================
// ROTAS ADICIONAIS PARA FRONTEND
// =====================================================

module.exports = router;

// =====================================================
