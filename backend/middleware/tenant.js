const { query } = require('../config/database');
const { getUsuariosUnidadeColumn, columnExists } = require('../utils/schema');

// Middleware para verificar acesso do usuário à unidade
const checkTenantAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Obter unidade_id do header, query param ou body
    const unidadeId = req.headers['x-tenant-id'] || 
                     req.headers['x-unidade-id'] || 
                     req.query.unidade_id || 
                     req.body.unidade_id;

    // Se não houver unidade informada, seguir sem aplicar restrição obrigatória
    if (!unidadeId) {
      return next();
    }

    // Detectar coluna de unidade em usuarios
    const unidadeCol = await getUsuariosUnidadeColumn();

    // Construir CASE dinamicamente
    const caseLotacao = unidadeCol ? `WHEN usr.${unidadeCol} = u.id THEN true` : '';

    const hasUnSigla = await columnExists('unidades', 'sigla');
    const accessCheck = await query(`
      SELECT 
        u.id as unidade_id,
        u.nome as unidade_nome,
        u.codigo as unidade_codigo,
        ${hasUnSigla ? 'u.sigla' : 'NULL'} as unidade_sigla,
        mu.role_unidade,
        CASE 
          ${caseLotacao}
          WHEN mu.usuario_id IS NOT NULL AND mu.ativo = true THEN true
          ELSE false
        END as tem_acesso
      FROM unidades u
      LEFT JOIN membros_unidade mu ON u.id = mu.unidade_id AND mu.usuario_id = $1 AND mu.ativo = true
      LEFT JOIN usuarios usr ON usr.id = $1
      WHERE u.id = $2 AND u.ativa = true
    `, [req.user.id, unidadeId]);

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada ou inativa' });
    }

    const unidadeInfo = accessCheck.rows[0];
    
    if (!unidadeInfo.tem_acesso) {
      return res.status(403).json({ 
        error: 'Acesso negado à unidade',
        message: `Você não tem permissão para acessar a unidade ${unidadeInfo.unidade_nome}`
      });
    }

    // Adicionar informações da unidade ao request
    req.unidade = {
      id: unidadeInfo.unidade_id,
      nome: unidadeInfo.unidade_nome,
      codigo: unidadeInfo.unidade_codigo,
      sigla: unidadeInfo.unidade_sigla,
      role_usuario: unidadeInfo.role_unidade || 'membro'
    };

    next();
  } catch (error) {
    console.error('Erro na verificação de tenant:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para obter unidades disponíveis para o usuário
const getUserUnits = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const unidadeCol2 = await getUsuariosUnidadeColumn();
    const condLotacao = unidadeCol2 ? `usr.${unidadeCol2} = u.id` : 'FALSE';
    // Filtrar estritamente: incluir apenas lotação e unidades onde o usuário é membro
    const selectRole = (unidadeCol2 
      ? `CASE WHEN ${condLotacao} THEN 'lotacao' WHEN mu.role_unidade IS NOT NULL THEN mu.role_unidade ELSE 'membro' END as role_unidade`
      : `CASE WHEN mu.role_unidade IS NOT NULL THEN mu.role_unidade ELSE 'membro' END as role_unidade`);
    const selectEhLotacao = unidadeCol2 
      ? `CASE WHEN ${condLotacao} THEN true ELSE false END as eh_lotacao`
      : `false as eh_lotacao`;
    // Apenas unidades vinculadas ao usuário (lotação ou membros_unidade)
    const whereClause = (unidadeCol2 
      ? `( ${condLotacao} OR mu.usuario_id IS NOT NULL )`
      : `( mu.usuario_id IS NOT NULL )`);

    const hasUnSigla2 = await columnExists('unidades', 'sigla');
    const hasUnTipo = await columnExists('unidades', 'tipo');
    const unidades = await query(`
      SELECT DISTINCT
        u.id,
        u.codigo,
        u.nome,
        ${hasUnTipo ? 'u.tipo' : 'NULL'} as tipo,
        u.cidade,
        ${hasUnSigla2 ? 'u.sigla' : 'NULL'} as sigla,
        ${selectRole},
        ${selectEhLotacao}
      FROM unidades u
      LEFT JOIN membros_unidade mu ON u.id = mu.unidade_id AND mu.usuario_id = $1 AND mu.ativo = true
      LEFT JOIN usuarios usr ON usr.id = $1
      WHERE ${whereClause}
        AND u.ativa = true
      ORDER BY eh_lotacao DESC, u.nome
    `, [req.user.id]);

    req.user.unidades_disponiveis = unidades.rows;
    next();
  } catch (error) {
    console.error('Erro ao obter unidades do usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para aplicar filtro de unidade automaticamente nas queries
const applyTenantFilter = (req, res, next) => {
  if (req.unidade) {
    // Adicionar filtro de unidade aos parâmetros de query
    req.tenantFilter = {
      unidade_id: req.unidade.id,
      whereClause: 'unidade_id = $',
      paramValue: req.unidade.id
    };
  }
  next();
};

// Middleware opcional de tenant (não falha se não houver unidade)
const optionalTenant = async (req, res, next) => {
  try {
    const unidadeId = req.headers['x-tenant-id'] || 
                     req.headers['x-unidade-id'] || 
                     req.query.unidade_id || 
                     req.body.unidade_id;
    
    if (unidadeId && req.user) {
      // Verificar se o usuário tem acesso à unidade
      const unidadeCol3 = await getUsuariosUnidadeColumn();
      const caseLotacao2 = unidadeCol3 ? `WHEN usr.${unidadeCol3} = u.id THEN true` : '';
      const hasUnSigla3 = await columnExists('unidades', 'sigla');
      const accessCheck = await query(`
        SELECT 
          u.id as unidade_id,
          u.nome as unidade_nome,
          u.codigo as unidade_codigo,
          ${hasUnSigla3 ? 'u.sigla' : 'NULL'} as unidade_sigla,
          mu.role_unidade,
          CASE 
            ${caseLotacao2}
            WHEN mu.usuario_id IS NOT NULL AND mu.ativo = true THEN true
            ELSE false
          END as tem_acesso
        FROM unidades u
        LEFT JOIN membros_unidade mu ON u.id = mu.unidade_id AND mu.usuario_id = $1 AND mu.ativo = true
        LEFT JOIN usuarios usr ON usr.id = $1
        WHERE u.id = $2 AND u.ativa = true
      `, [req.user.id, unidadeId]);

      if (accessCheck.rows.length > 0 && accessCheck.rows[0].tem_acesso) {
        const unidadeInfo = accessCheck.rows[0];
        // Adicionar informações da unidade ao request
        req.unidade = {
          id: unidadeInfo.unidade_id,
          nome: unidadeInfo.unidade_nome,
          codigo: unidadeInfo.unidade_codigo,
          sigla: unidadeInfo.unidade_sigla,
          role_usuario: unidadeInfo.role_unidade || 'membro'
        };
      }
    }
    
    next();
  } catch (error) {
    console.error('Erro no middleware optionalTenant:', error);
    // Ignora erros em verificação opcional, mas continua sem definir req.unidade
    next();
  }
};

module.exports = {
  checkTenantAccess,
  getUserUnits,
  applyTenantFilter,
  optionalTenant
};