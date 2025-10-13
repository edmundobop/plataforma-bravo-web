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
const { optionalTenant } = require('../middleware/tenant');

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
        LOWER(u.nome) LIKE LOWER($${paramIndex}) OR 
        LOWER(u.nome_guerra) LIKE LOWER($${paramIndex}) OR
        u.matricula LIKE $${paramIndex}
      )`);
      queryParams.push(`%${busca}%`);
      paramIndex++;
    }
    
    const result = await query(`
      SELECT 
        u.id,
        u.nome,
        u.nome_guerra,
        u.posto_graduacao,
        u.tipo,
        u.matricula,
        p.nome as perfil_nome
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY u.nome
      LIMIT 50
    `, queryParams);

    res.json({ 
      success: true,
      usuarios: result.rows 
    });
  } catch (error) {
    console.error('Erro ao buscar usuários para autocomplete:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * @route POST /api/usuarios/solicitar-cadastro
 * @desc Solicitação pública de cadastro (militares)
 * @access Public
 */
router.post('/solicitar-cadastro', 
  [
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
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
        nome,
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

      // Normalizações e compatibilidade com versões antigas do frontend
      let finalMatricula = matricula;
      // Aceitar identidade_militar como matrícula se não vier preenchida
      if (!finalMatricula && req.body.identidade_militar) {
        finalMatricula = req.body.identidade_militar;
      }

      // Tratar unidade por nome se o frontend enviar `unidade` em vez de `unidade_id`
      let finalUnidadeId = req.body.unidade_lotacao_id || unidade_id;
      if (!finalUnidadeId && req.body.unidade && typeof req.body.unidade === 'string') {
        try {
          const nomeBusca = `%${req.body.unidade}%`;
          const unidadeLookup = await query(
            'SELECT id FROM unidades WHERE nome ILIKE $1 OR sigla ILIKE $1 LIMIT 1',
            [nomeBusca]
          );
          if (unidadeLookup.rows.length > 0) {
            finalUnidadeId = unidadeLookup.rows[0].id;
          }
          // Fallback: tentar por tokens (número, DBM e cidade parcial) para contornar diferenças como "16º" vs "16"
          if (!finalUnidadeId) {
            const raw = String(req.body.unidade).trim();
            const tokens = raw.split(/\s+/).map(t => t.trim()).filter(Boolean);
            // Reduzir acento no termo de busca parcial (apenas lado do input)
            const partials = tokens
              .map(t => t.length > 5 ? t.slice(0, 5) : t)
              .filter(t => t.length >= 2);
            // Incluir número puro se existir (ex: 16)
            const numericos = tokens.filter(t => /^\d+$/.test(t));
            const buscaLike = [...new Set([...partials, ...numericos])]
              .map(t => `%${t}%`);
            if (buscaLike.length > 0) {
              const params = buscaLike;
              const orClauses = buscaLike
                .map((_, idx) => `(nome ILIKE $${idx + 1} OR sigla ILIKE $${idx + 1})`)
                .join(' OR ');
              const tokenLookup = await query(`
                SELECT id FROM unidades 
                WHERE ${orClauses}
                ORDER BY nome ASC
                LIMIT 1
              `, params);
              if (tokenLookup.rows.length > 0) {
                finalUnidadeId = tokenLookup.rows[0].id;
              }
            }
          }
        } catch (lookupErr) {
          console.warn('Aviso: falha ao mapear unidade por nome:', lookupErr?.message || lookupErr);
        }
      }

      // Converter data_incorporacao vazia para null para evitar erro de tipo
      const finalDataIncorporacao = (data_incorporacao && data_incorporacao !== '')
        ? data_incorporacao
        : null;

      // Validar unidade após mapeamentos
      if (!finalUnidadeId) {
        return res.status(400).json({
          success: false,
          message: 'Unidade não reconhecida. Selecione uma unidade válida.'
        });
      }

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
      if (tipo === 'militar' && finalMatricula) {
        const existingMatricula = await query(
          'SELECT id FROM usuarios WHERE matricula = $1',
          [finalMatricula]
        );
        
        if (existingMatricula.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Matrícula já cadastrada no sistema'
          });
        }
      }
      
      // Inserir solicitação de cadastro (usuário inativo até aprovação)
      // Ajustado para usar coluna 'nome' e 'senha_hash'
      const senhaTempHash = await bcrypt.hash('BravoTemp#123', 10);
      const result = await query(`
        INSERT INTO usuarios (
          nome, email, cpf, telefone, tipo,
          posto_graduacao, nome_guerra, matricula,
          data_nascimento, data_incorporacao, unidade_id, unidade_lotacao_id,
          perfil_id, ativo, senha_hash, status_solicitacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, $14, 'pendente')
        RETURNING id, nome, email, tipo
      `, [
        nome, email, cpf, telefone, tipo,
        posto_graduacao, nome_guerra, finalMatricula,
        data_nascimento, finalDataIncorporacao, finalUnidadeId, finalUnidadeId,
        5, // Perfil Operador por padrão
        senhaTempHash // Senha temporária hash
      ]);

      // Garantir vínculo de lotação em membros_unidade
      try {
        await query(
          `INSERT INTO membros_unidade (usuario_id, unidade_id, ativo)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (usuario_id, unidade_id)
           DO UPDATE SET ativo = EXCLUDED.ativo`,
          [result.rows[0].id, finalUnidadeId]
        );
      } catch (muErr) {
        console.warn('Aviso: falha ao vincular lotação em membros_unidade:', muErr?.message || muErr);
      }

      // Criar notificação para administradores
      await query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo)
        SELECT u.id, $1, $2, 'info', 'sistema'
        FROM usuarios u 
        JOIN perfis p ON u.perfil_id = p.id
        WHERE p.nome = 'Administrador' AND u.ativo = true
      `, [
        'Nova Solicitação de Cadastro',
        `${nome} (${tipo}) solicitou cadastro no sistema.`
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

/**
 * @route GET /api/usuarios/config/unidades
 * @desc Lista unidades disponíveis (público)
 * @access Public
 */
router.get('/config/unidades', async (req, res) => {
  try {
    const unidadesResult = await query(`
      SELECT id, nome, sigla, endereco, telefone, ativa as ativo
      FROM unidades 
      WHERE ativa = true
      ORDER BY nome ASC
    `);

    res.json({
      success: true,
      unidades: unidadesResult.rows
    });
  } catch (error) {
    console.error('Erro ao listar unidades (público):', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * @route GET /api/usuarios/postos-graduacoes
 * @desc Lista padronizada de postos/graduações (público)
 * @access Public
 */
router.get('/postos-graduacoes', async (req, res) => {
  try {
    // Ordem e formato conforme solicitado (foto): do maior para o menor
    const lista = [
      'Coronel',
      'Tenente-Coronel',
      'Major',
      'Capitão',
      '1º Tenente',
      '2º Tenente',
      'Aspirante a Oficial',
      'Subtenente',
      '1º Sargento',
      '2º Sargento',
      '3º Sargento',
      'Cabo',
      'Soldado'
    ];

    return res.json({ success: true, postos_graduacoes: lista });
  } catch (error) {
    console.error('Erro ao listar postos/graduações (público):', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
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
router.get('/', authorizeRoles(['Administrador', 'Comandante', 'Chefe']), optionalTenant, async (req, res) => {
  try {
    const { 
      ativo, 
      tipo,
      perfil, 
      unidade_id,
      setor,
      busca, 
      page = 1, 
      limit = 20 
    } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

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

    if (unidade_id) {
      whereConditions.push(`u.unidade_id = $${paramIndex}`);
      queryParams.push(unidade_id);
      paramIndex++;
    } else if (req.unidade && req.unidade.id) {
      whereConditions.push(`u.unidade_id = $${paramIndex}`);
      queryParams.push(req.unidade.id);
      paramIndex++;
    }

    if (setor) {
      whereConditions.push(`u.setor = $${paramIndex}`);
      queryParams.push(setor);
      paramIndex++;
    }

    if (busca) {
      whereConditions.push(`(
        LOWER(u.nome) LIKE LOWER($${paramIndex}) OR 
        LOWER(u.email) LIKE LOWER($${paramIndex}) OR 
        LOWER(u.nome_guerra) LIKE LOWER($${paramIndex}) OR
        u.matricula LIKE $${paramIndex}
      )`);
      queryParams.push(`%${busca}%`);
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

    // Buscar usuários com paginação
    const offset = (page - 1) * limit;
    
    // Adicionar parâmetros de paginação
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    queryParams.push(limit, offset);

    const usuariosQuery = `
      SELECT 
        u.id,
        u.nome,
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
        u.setor,
        u.funcoes,
        
        -- Informações do perfil (nível calculado)
        p.nome as perfil_nome,
        CASE 
          WHEN p.nome = 'Administrador' THEN 1
          WHEN p.nome = 'Comandante' THEN 2
          WHEN p.nome = 'Chefe' THEN 3
          WHEN p.nome = 'Auxiliares' THEN 4
          WHEN p.nome = 'Operador' THEN 5
          ELSE 5
        END AS nivel_hierarquia,
        
        -- Informações da unidade
        un.nome as unidade_nome,
        un.sigla as unidade_sigla
        
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      LEFT JOIN unidades un ON u.unidade_id = un.id
      ${whereClause}
      ORDER BY u.nome
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
router.get('/pendentes', authorizeRoles(['Administrador', 'Comandante']), optionalTenant, async (req, res) => {
  try {
    // Construir filtro por unidade se disponível
    const whereConditions = ['u.ativo = false'];
    const params = [];
    let paramIndex = 1;

    if (req.unidade && req.unidade.id) {
      whereConditions.push(`u.unidade_id = $${paramIndex}`);
      params.push(req.unidade.id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        u.id,
        u.nome,
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
      ${whereClause}
      ORDER BY u.created_at DESC
    `;

    const result = await query(sql, params);

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
router.get('/solicitacoes-pendentes', authorizeRoles(['Administrador', 'Comandante']), optionalTenant, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Construir filtros dinâmicos com unidade
    const whereConditions = ["status_solicitacao = 'pendente'"];
    const params = [];
    let paramIndex = 1;

    if (req.unidade && req.unidade.id) {
      whereConditions.push(`unidade_id = $${paramIndex}`);
      params.push(req.unidade.id);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const dataQuery = `
      SELECT 
        id,
        nome,
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
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...params, limit, offset];
    const result = await query(dataQuery, dataParams);

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM usuarios 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    
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
 * @desc Aprovar ou rejeitar solicitação de cadastro
 * @access Administrador, Comandante
 */
router.post('/aprovar-cadastro/:id', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    const { id } = req.params;
    const { acao, observacoes_aprovacao = '', setor, funcao, role, funcoes } = req.body || {};

    if (!acao || !['aprovar', 'rejeitar'].includes(acao)) {
      return res.status(400).json({ success: false, message: 'Ação inválida. Use "aprovar" ou "rejeitar".' });
    }

    // Verificar se usuário existe
    const usuarioResult = await query('SELECT id, status_solicitacao FROM usuarios WHERE id = $1', [id]);
    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    // Montar atualização dinâmica
    const setClauses = [];
    const params = [];
    let idx = 0;

    if (acao === 'rejeitar') {
      setClauses.push(`status_solicitacao = 'rejeitado'`);
      setClauses.push('ativo = false');
    } else if (acao === 'aprovar') {
      // Campos obrigatórios para aprovação
      if (!setor) {
        return res.status(400).json({ success: false, message: 'Setor é obrigatório para aprovação' });
      }

      // Definir perfil pelo nome (role) quando fornecido
      let perfilIdToSet = null;
      if (role) {
        const perfilLookup = await query('SELECT id FROM perfis WHERE nome = $1', [role]);
        if (perfilLookup.rows.length > 0) {
          perfilIdToSet = perfilLookup.rows[0].id;
        } else if (!isNaN(Number(role))) {
          perfilIdToSet = Number(role);
        }
      }

      // Normalizar funcoes: aceitar "funcao" única (string) ou "funcoes" array
      function normalizarFuncoes(valorUnico, lista) {
        const FUNCOES_DEFAULT = [
          'Comandante',
          'Subcomandante',
          'Chefe de Sessão',
          'Auxiliar de Sessão',
          'Socorrista/Combatente',
          'Motorista D',
          'Vistoriador',
          'Adjunto'
        ];
        if (Array.isArray(lista) && lista.length > 0) {
          return lista.map((item) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'number') return FUNCOES_DEFAULT[item - 1] || String(item);
            if (item && typeof item === 'object') {
              if (item.nome) return item.nome;
              if (typeof item.id === 'number') return FUNCOES_DEFAULT[item.id - 1] || String(item.id);
            }
            return String(item);
          }).filter(Boolean);
        }
        if (valorUnico && typeof valorUnico === 'string') {
          return [valorUnico];
        }
        return null;
      }

      const funcoesNormalizadas = normalizarFuncoes(funcao, funcoes);

      // Aplicar alterações de aprovação
      setClauses.push(`status_solicitacao = 'aprovado'`);
      setClauses.push('ativo = true');

      idx += 1; params.push(setor); setClauses.push(`setor = $${idx}`);
      if (funcoesNormalizadas && funcoesNormalizadas.length > 0) {
        idx += 1; params.push(JSON.stringify(funcoesNormalizadas)); setClauses.push(`funcoes = $${idx}::jsonb`);
      }
      if (perfilIdToSet) {
        idx += 1; params.push(perfilIdToSet); setClauses.push(`perfil_id = $${idx}`);
      }
    }

    // updated_at
    setClauses.push('updated_at = NOW()');

    // WHERE id
    idx += 1; params.push(id);

    const updateSql = `
      UPDATE usuarios
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING id, nome, ativo, status_solicitacao, setor, funcoes, perfil_id
    `;

    const updateResult = await query(updateSql, params);
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    // Para rejeição: remover a solicitação do banco (hard delete), apenas se ainda for pendente/inativo
    if (acao === 'rejeitar') {
      try {
        await query(
          "DELETE FROM usuarios WHERE id = $1 AND ativo = false",
          [id]
        );
      } catch (delErr) {
        console.warn('Aviso: falha ao excluir usuário rejeitado:', delErr?.message || delErr);
        // Prosseguir mesmo se não conseguir excluir (já foi marcado como rejeitado)
      }
    }

    // Opcional: registrar observações em uma tabela de logs se existir
    // Aqui apenas retornamos no payload
    return res.json({
      success: true,
      message: acao === 'aprovar' ? 'Cadastro aprovado com sucesso' : 'Cadastro rejeitado com sucesso',
      usuario: updateResult.rows[0],
      observacoes: observacoes_aprovacao || ''
    });
  } catch (error) {
    console.error('Erro ao aprovar/rejeitar cadastro:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
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
    const userId = req.user?.id;
    const userPerfil = req.user?.perfil_nome;

    // Garantir autenticação para evitar erro 500 quando req.user estiver indefinido
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // Verificar se o usuário pode acessar este perfil
    if (id !== userId.toString() && !['Administrador', 'Comandante', 'Chefe'].includes(userPerfil)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
    }

    const usuarioResult = await query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.cpf,
        u.telefone,
        u.tipo,
        u.posto_graduacao,
        u.nome_guerra,
        u.matricula,
        u.data_nascimento,
        u.data_incorporacao,
        u.setor,
        u.funcoes,
        u.ativo,
        u.ultimo_login,
        u.created_at,
        u.updated_at,
        u.unidade_id,
        u.unidade_lotacao_id,
        
        -- Informações do perfil (nível calculado)
        p.nome as perfil_nome,
        p.descricao as perfil_descricao,
        CASE 
          WHEN p.nome = 'Administrador' THEN 1
          WHEN p.nome = 'Comandante' THEN 2
          WHEN p.nome = 'Chefe' THEN 3
          WHEN p.nome = 'Auxiliares' THEN 4
          WHEN p.nome = 'Operador' THEN 5
          ELSE 5
        END AS nivel_hierarquia,
        
        -- Informações da unidade
        un.nome as unidade_nome,
        un.sigla as unidade_sigla
        
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      LEFT JOIN unidades un ON u.unidade_id = un.id
      WHERE u.id = $1
    `, [id]);

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      });
    }

    const usuario = usuarioResult.rows[0];

    // Buscar unidades de acesso ativas do usuário via membros_unidade
    let unidadesAcesso = [];
    try {
      const muResult = await query(
        `SELECT unidade_id FROM membros_unidade WHERE usuario_id = $1 AND ativo = TRUE`,
        [id]
      );
      const lotacaoId = usuario.unidade_lotacao_id || usuario.unidade_id || null;
      unidadesAcesso = muResult.rows
        .map((r) => r.unidade_id)
        .filter((uid) => uid && uid !== lotacaoId);
    } catch (e) {
      console.warn('Aviso: falha ao buscar unidades de acesso:', e?.message || e);
    }

    // Se for o próprio usuário ou admin/comandante/chefe, incluir estatísticas
    if (id === userId.toString() || ['Administrador', 'Comandante', 'Chefe'].includes(userPerfil)) {
      // Estatísticas de atividade do usuário
      try {
        const estatisticas = await query(`
          SELECT 
            (SELECT COUNT(*) FROM emprestimos WHERE usuario_solicitante_id = $1) as total_emprestimos,
            (SELECT COUNT(*) FROM viaturas WHERE motorista_id = $1) as viaturas_designadas
        `, [id]);
        usuario.estatisticas = estatisticas.rows[0];
      } catch (statsErr) {
        console.warn('Aviso: falha ao buscar estatísticas do usuário:', statsErr?.message || statsErr);
        usuario.estatisticas = { total_emprestimos: 0, viaturas_designadas: 0 };
      }
    }

    res.json({
      success: true,
      usuario: {
        ...usuario,
        unidades_acesso: unidadesAcesso
      }
    });
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
 * @route POST /api/usuarios
 * @desc Criar novo usuário
 * @access Administrador, Comandante
 */
router.post('/', 
  authorizeRoles(['Administrador', 'Comandante']),
  [
    body('nome').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('tipo').isIn(['militar', 'civil']).withMessage('Tipo deve ser militar ou civil'),
    body('perfil_id').isInt({ min: 1 }).withMessage('Perfil é obrigatório'),
    
    // Validações condicionais para militares
    body('posto_graduacao').if(body('tipo').equals('militar'))
      .notEmpty().withMessage('Posto/graduação é obrigatório para militares'),
    body('matricula').if(body('tipo').equals('militar'))
      .notEmpty().withMessage('Matrícula é obrigatória para militares'),
    
    body('cpf').optional().isLength({ min: 11, max: 14 }).withMessage('CPF inválido'),
    body('telefone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido')
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
        nome, email, cpf, telefone, tipo,
        posto_graduacao, nome_guerra, matricula,
        data_nascimento, data_incorporacao,
        unidade_id, perfil_id,
        senha = 'senha123' // Senha padrão
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
      const result = await query(`
        INSERT INTO usuarios (
          nome, email, cpf, telefone, tipo,
          posto_graduacao, nome_guerra, matricula,
          data_nascimento, data_incorporacao,
          unidade_id, unidade_lotacao_id, perfil_id,
          senha_hash, ativo, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15)
        RETURNING id, nome, email, tipo, ativo, created_at
      `, [
        nome, email, cpf, telefone, tipo,
        posto_graduacao, nome_guerra, matricula,
        data_nascimento, data_incorporacao,
        unidade_id, unidade_id, perfil_id,
        hashedPassword, req.user.id
      ]);

      const novoUsuario = result.rows[0];

      // Vincular lotação e unidades de acesso em membros_unidade
      try {
        if (unidade_id) {
          await query(
            `INSERT INTO membros_unidade (usuario_id, unidade_id, ativo)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (usuario_id, unidade_id)
             DO UPDATE SET ativo = EXCLUDED.ativo`,
            [novoUsuario.id, unidade_id]
          );
        }
        const unidadesAcesso = Array.isArray(req.body.unidades_acesso) ? req.body.unidades_acesso : [];
        for (const uid of unidadesAcesso) {
          if (!Number.isInteger(uid)) continue;
          await query(
            `INSERT INTO membros_unidade (usuario_id, unidade_id, ativo)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (usuario_id, unidade_id)
             DO UPDATE SET ativo = EXCLUDED.ativo`,
            [novoUsuario.id, uid]
          );
        }
      } catch (muErr) {
        console.warn('Aviso: falha ao atualizar membros_unidade:', muErr?.message || muErr);
      }

      // Criar notificação de boas-vindas
      await query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        novoUsuario.id,
        'Bem-vindo ao Sistema',
        `Olá ${nome}, sua conta foi criada com sucesso. Acesse o sistema com suas credenciais.`,
        'info',
        'sistema'
      ]);

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        usuario: novoUsuario
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
      });
    }
  }
);

/**
 * @route PUT /api/usuarios/:id
 * @desc Atualizar usuário (inclui setor e funcoes JSONB)
 * @access Próprio usuário; Administrador, Comandante, Chefe podem editar qualquer usuário
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const editorId = req.user.id;
    const editorPerfil = req.user.perfil_nome;

    // Permitir edição do próprio usuário ou por perfis elevados
    const podeEditarOutro = ['Administrador', 'Comandante', 'Chefe'].includes(editorPerfil);
    if (parseInt(id, 10) !== parseInt(editorId, 10) && !podeEditarOutro) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    // Campos permitidos para atualização
    const body = req.body || {};
    const camposPermitidos = [
      'nome', 'email', 'cpf', 'telefone', 'tipo',
      'posto_graduacao', 'nome_guerra', 'matricula',
      'data_nascimento', 'data_incorporacao',
      'unidade_id', 'unidade_lotacao_id', 'perfil_id', 'ativo',
      'setor', 'funcoes'
    ];

    // Normalizar funcoes para JSONB (array de strings)
    const FUNCOES_DEFAULT = [
      'Comandante',
      'Subcomandante',
      'Chefe de Sessão',
      'Auxiliar de Sessão',
      'Socorrista/Combatente',
      'Motorista D',
      'Vistoriador',
      'Adjunto'
    ];

    function normalizarFuncoes(valor) {
      if (!valor) return null;
      // Se vier string única
      if (typeof valor === 'string') return [valor];
      // Se vier array
      if (Array.isArray(valor)) {
        return valor.map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'number') {
            const idx = item - 1; // IDs do frontend começam em 1
            return FUNCOES_DEFAULT[idx] || `Funcao_${item}`;
          }
          if (item && typeof item === 'object') {
            // Preferir nome quando disponível
            if (item.nome && typeof item.nome === 'string') return item.nome;
            if (typeof item.id === 'number') {
              const idx2 = item.id - 1;
              return FUNCOES_DEFAULT[idx2] || `Funcao_${item.id}`;
            }
          }
          return String(item);
        }).filter(Boolean);
      }
      // Caso venha objeto direto
      if (valor && typeof valor === 'object') {
        if (valor.nome && typeof valor.nome === 'string') return [valor.nome];
      }
      return null;
    }

    // Construir SET dinâmico
    const setClauses = [];
    const params = [];
    let idx = 0;

    // Validações simples de unicidade quando e se fornecidos
    if (body.email) {
      const emailDup = await query('SELECT id FROM usuarios WHERE email = $1 AND id <> $2', [body.email, id]);
      if (emailDup.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Email já está em uso' });
      }
    }

    if (body.tipo === 'militar' && body.matricula) {
      const matDup = await query('SELECT id FROM usuarios WHERE matricula = $1 AND id <> $2', [body.matricula, id]);
      if (matDup.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Matrícula já está em uso' });
      }
    }

    for (const campo of camposPermitidos) {
      if (!(campo in body)) continue;
      const valor = body[campo];

      if (campo === 'funcoes') {
        const funcoesNormalizadas = normalizarFuncoes(valor);
        if (funcoesNormalizadas === null) continue;
        idx += 1;
        setClauses.push(`funcoes = $${idx}::jsonb`);
        params.push(JSON.stringify(funcoesNormalizadas));
        continue;
      }

      idx += 1;
      setClauses.push(`${campo} = $${idx}`);
      params.push(valor);
    }

    // Nada para atualizar
    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    }

    // updated_at
    setClauses.push('updated_at = NOW()');

    // WHERE id
    idx += 1;
    params.push(id);

    const updateSql = `
      UPDATE usuarios
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING id, nome, email, tipo, setor, funcoes, ativo, updated_at
    `;

    const result = await query(updateSql, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    // Sincronizar membros_unidade conforme alterações de lotação e unidades de acesso
    try {
      const lotacaoId = body.unidade_lotacao_id || body.unidade_id || null;
      if (lotacaoId && Number.isInteger(lotacaoId)) {
        await query(
          `INSERT INTO membros_unidade (usuario_id, unidade_id, ativo)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (usuario_id, unidade_id)
           DO UPDATE SET ativo = EXCLUDED.ativo`,
          [id, lotacaoId]
        );
      }

      const unidadesAcesso = Array.isArray(body.unidades_acesso) ? body.unidades_acesso.filter(Number.isInteger) : [];
      for (const uid of unidadesAcesso) {
        await query(
          `INSERT INTO membros_unidade (usuario_id, unidade_id, ativo)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (usuario_id, unidade_id)
           DO UPDATE SET ativo = EXCLUDED.ativo`,
          [id, uid]
        );
      }

      // Desativar acessos que não estão mais presentes (preserva histórico)
      const activeIds = [lotacaoId, ...unidadesAcesso].filter((v) => Number.isInteger(v));
      if (activeIds.length > 0) {
        const placeholders = activeIds.map((_, i) => `$${i + 2}`).join(', ');
        await query(
          `UPDATE membros_unidade
           SET ativo = FALSE
           WHERE usuario_id = $1
             AND unidade_id NOT IN (${placeholders})`,
          [id, ...activeIds]
        );
      }
    } catch (muErr) {
      console.warn('Aviso: falha ao sincronizar membros_unidade:', muErr?.message || muErr);
    }

    return res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// =====================================================
// ROTAS AUXILIARES DE DADOS
// =====================================================

// (rota pública movida para seção de rotas públicas acima)

/**
 * @route GET /api/usuarios/data/unidades
 * @desc Listar unidades disponíveis
 * @access Administrador, Comandante
 */
router.get('/data/unidades', authorizeRoles(['Administrador', 'Comandante']), async (req, res) => {
  try {
    const unidadesResult = await query(`
      SELECT id, nome, sigla, endereco, telefone, ativa as ativo
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
    const setores = [
      'Operacional',
      'Comando', 
      'Subcomando',
      'SAT',
      'SOP',
      'SEC',
      'SAAD',
      'PROEBOM',
      'Não identificada',
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
    const funcoes = [
      'Comandante',
      'Subcomandante',
      'Chefe de Sessão',
      'Auxiliar de Sessão',
      'Socorrista/Combatente',
      'Motorista D',
      'Vistoriador',
      'Adjunto',
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

    const usuarioResult = await query(`
      SELECT 
        u.id,
        u.nome as nome,
        u.nome_guerra,
        u.email,
        u.matricula,
        u.telefone,
        u.tipo,
        u.posto_graduacao,
        u.ativo,
        u.created_at as data_criacao,
        u.ultimo_login,
        
        -- Informações do perfil (nível calculado)
        p.nome as perfil_nome,
        CASE 
          WHEN p.nome = 'Administrador' THEN 1
          WHEN p.nome = 'Comandante' THEN 2
          WHEN p.nome = 'Chefe' THEN 3
          WHEN p.nome = 'Auxiliares' THEN 4
          WHEN p.nome = 'Operador' THEN 5
          ELSE 5
        END AS nivel_hierarquia,
        p.permissoes,
        
        -- Informações da unidade
        un.nome as unidade_nome,
        un.sigla as unidade_sigla,
        
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      LEFT JOIN unidades un ON u.unidade_id = un.id
      WHERE u.id = $1
    `, [userId]);

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const usuarioRaw = usuarioResult.rows[0];
    
    // Mapear campos para compatibilidade com frontend
    const usuario = {
      ...usuarioRaw,
      papel: usuarioRaw.perfil_nome, // Mapear perfil para papel
      unidade: usuarioRaw.unidade_nome, // Adicionar unidade
      setor: null,
      funcao: null
    };

    // Estatísticas de atividade do usuário
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
    // Lista de setores do Corpo de Bombeiros
    const setores = [
      'Operacional',
      'Comando', 
      'Subcomando',
      'SAT',
      'SOP',
      'SEC',
      'SAAD',
      'PROEBOM',
      'Não identificada',
    ];

    res.json({ setores });
  } catch (error) {
    console.error('Erro ao listar setores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @route GET /api/usuarios/config/unidades
 * @desc Listar unidades disponíveis para configuração
 * @access Usuário autenticado
 */
router.get('/config/unidades', async (req, res) => {
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

// =====================================================
// ROTAS ADICIONAIS PARA FRONTEND
// =====================================================

module.exports = router;

// =====================================================
// DOCUMENTAÇÃO DE USO
// =====================================================
//
// EXEMPLOS DE USO:
//
// 1. Listar todos os usuários:
//    GET /api/usuarios
//
// 2. Listar apenas militares ativos:
//    GET /api/usuarios?tipo=militar&ativo=true
//
// 3. Buscar usuários por nome:
//    GET /api/usuarios?busca=João
//
// 4. Listar usuários de uma unidade:
//    GET /api/usuarios?unidade_id=1
//
// 5. Criar novo militar:
//    POST /api/usuarios
//    {
//      "nome_completo": "João Silva",
//      "email": "joao@email.com",
//      "tipo": "militar",
//      "posto_graduacao": "Sargento",
//      "matricula": "123456",
//      "perfil_id": 5
//    }
//
// 6. Criar novo civil:
//    POST /api/usuarios
//    {
//      "nome_completo": "Maria Santos",
//      "email": "maria@email.com",
//      "tipo": "civil",
//      "perfil_id": 5
//    }
//
// =====================================================