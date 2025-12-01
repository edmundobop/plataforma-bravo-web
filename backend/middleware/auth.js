const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { getUsuariosUnidadeColumn, columnExists } = require('../utils/schema');

// =====================================================
// MIDDLEWARE DE AUTENTICAÇÃO - ESTRUTURA UNIFICADA
// =====================================================
//
// Este middleware foi atualizado para trabalhar com a nova
// estrutura unificada de usuários (militares + civis) e
// o sistema de perfis simplificado.
//
// PERFIS DISPONÍVEIS:
// - Administrador (1): Acesso total
// - Comandante (2): Comando da unidade
// - Chefe (3): Chefes de sessões
// - Auxiliares (4): Auxiliares dos Chefes
// - Operador (5): Operador de sistema
//
// =====================================================

// Middleware de autenticação principal
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Token de acesso requerido' 
      });
    }

    const jwtSecret = process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim() !== ''
      ? process.env.JWT_SECRET
      : 'dev-secret';

    const decoded = jwt.verify(token, jwtSecret);
    
    // Detectar coluna de unidade em usuarios
    const unidadeCol = await getUsuariosUnidadeColumn();

    // Construir SELECT e JOIN dinamicamente para compatibilidade com esquemas
    const { tableExists } = require('../utils/schema');
    const unidadeSelect = unidadeCol ? ('u.' + unidadeCol + ' as unidade_id') : 'NULL as unidade_id';
    const hasUnidadesTable = await tableExists('unidades');
    const hasSetoresTable = await tableExists('setores');
    const hasFuncoesTable = await tableExists('funcoes');
    const hasSetorIdCol = await columnExists('usuarios', 'setor_id');
    const hasSetorTextCol = await columnExists('usuarios', 'setor');
    const hasFuncaoIdCol = await columnExists('usuarios', 'funcao_id');
    const hasFuncoesTextCol = await columnExists('usuarios', 'funcoes');
    const hasUnSigla = hasUnidadesTable && await columnExists('unidades', 'sigla');
    const hasUnTipo = hasUnidadesTable && await columnExists('unidades', 'tipo');
    const hasSetorSigla = hasSetoresTable && await columnExists('setores', 'sigla');
    const hasPerfilPermissoes = await columnExists('perfis', 'permissoes');
    const hasPerfilDescricao = await columnExists('perfis', 'descricao');
    const unidadeCampos = (unidadeCol && hasUnidadesTable)
      ? ('un.nome as unidade_nome, ' + (hasUnSigla ? 'un.sigla' : 'NULL') + ' as unidade_sigla, ' + (hasUnTipo ? 'un.tipo' : 'NULL') + ' as unidade_tipo,')
      : 'NULL as unidade_nome, NULL as unidade_sigla, NULL as unidade_tipo,';
    const setorCampos = (hasSetoresTable && hasSetorIdCol)
      ? ('s.nome as setor_nome, ' + (hasSetorSigla ? 's.sigla' : 'NULL') + ' as setor_sigla,')
      : (hasSetorTextCol
        ? 'u.setor as setor_nome, NULL as setor_sigla,'
        : 'NULL as setor_nome, NULL as setor_sigla,');
    const funcaoCampo = (hasFuncoesTable && hasFuncaoIdCol)
      ? 'f.nome as funcao_nome'
      : 'NULL as funcao_nome';
    const funcoesCampo = hasFuncoesTextCol ? 'u.funcoes' : 'NULL';
    const unidadeJoin = (unidadeCol && hasUnidadesTable) ? ('LEFT JOIN unidades un ON u.' + unidadeCol + ' = un.id') : '';
    const setorJoin = (hasSetoresTable && hasSetorIdCol) ? 'LEFT JOIN setores s ON u.setor_id = s.id' : '';
    const funcaoJoin = (hasFuncoesTable && hasFuncaoIdCol) ? 'LEFT JOIN funcoes f ON u.funcao_id = f.id' : '';

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
        u.ativo,
        u.ultimo_login,
        ${unidadeSelect},
        ${hasSetorIdCol ? 'u.setor_id' : 'NULL'} as setor_id,
        ${hasFuncaoIdCol ? 'u.funcao_id' : 'NULL'} as funcao_id,
        ${funcoesCampo} as funcoes,
        
        -- Informações do perfil
        p.id as perfil_id,
        p.nome as perfil_nome,
        ${hasPerfilDescricao ? 'p.descricao' : 'NULL'} as perfil_descricao,
        NULL as nivel_hierarquia,
        ${hasPerfilPermissoes ? 'p.permissoes' : 'NULL'} as permissoes,
        
        -- Informações da unidade
        ${unidadeCampos}
        
        -- Informações do setor
        ${setorCampos}
        
        -- Informações da função
        ${funcaoCampo}
        
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      ${unidadeJoin}
      ${setorJoin}
      ${funcaoJoin}
      WHERE u.id = $1 AND u.ativo = true
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não encontrado ou inativo' 
      });
    }

    const user = result.rows[0];
    
    const hasUltimoLoginCol = await columnExists('usuarios', 'ultimo_login');
    if (hasUltimoLoginCol) {
      await query(
        'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
        [user.id]
      );
    }
    
    // Compatibilidade com código legado
    user.nome = user.nome_completo; // Para compatibilidade
    user.papel = user.perfil_nome;  // Para compatibilidade
    user.setor = user.setor_nome;   // Para compatibilidade
    
    // Estruturar informações organizacionais
    user.organizacao = {
      unidade: user.unidade_id ? {
        id: user.unidade_id,
        nome: user.unidade_nome,
        sigla: user.unidade_sigla,
        tipo: user.unidade_tipo
      } : null,
      setor: user.setor_id ? {
        id: user.setor_id,
        nome: user.setor_nome,
        sigla: user.setor_sigla
      } : null,
      funcao: user.funcao_id ? {
        id: user.funcao_id,
        nome: user.funcao_nome
      } : null
    };

    // Incluir funcoes (array) se existir coluna JSONB
    if (hasFuncoesTextCol) {
      user.organizacao.funcoes = user.funcoes || [];
      if (!user.organizacao.funcao && Array.isArray(user.funcoes) && user.funcoes.length > 0) {
        user.organizacao.funcao = { id: null, nome: user.funcoes[0] };
      }
    }
    
    // Estruturar informações do perfil
    user.perfil = {
      id: user.perfil_id,
      nome: user.perfil_nome,
      descricao: user.perfil_descricao,
      nivel_hierarquia: user.nivel_hierarquia,
      permissoes: user.permissoes || []
    };
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false,
        error: 'Token inválido' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false,
        error: 'Token expirado' 
      });
    }
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
};

// Middleware de autorização por perfil (roles) - com compatibilidade
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    // Verificar se o usuário tem um dos perfis permitidos
    const userRole = req.user.perfil_nome;
    
    // Mapeamento de compatibilidade para roles antigos
    const roleMapping = {
      'admin': 'Administrador',
      'comandante': 'Comandante', 
      'chefe': 'Chefe',
      'auxiliar': 'Auxiliares',
      'operador': 'Operador',
      's1': 'Administrador', // S1 também pode ser Administrador
      'gestor': 'Chefe' // Gestor = Chefe
    };
    
    // Aceitar roles como varargs ou como um array único
    const inputRoles = (roles.length === 1 && Array.isArray(roles[0])) ? roles[0] : roles;
    // Mapear roles antigos para novos
    const mappedRoles = inputRoles.map(role => roleMapping[role] || role);
    
    // Verificar se o perfil do usuário está permitido
    // Administrador sempre tem acesso (nível hierárquico 1)
    const isAllowed = mappedRoles.includes(userRole) ||
                     (userRole === 'Administrador' && req.user.nivel_hierarquia === 1);
    
    if (!isAllowed) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado',
        message: `Requer uma das seguintes permissões: ${mappedRoles.join(', ')}`,
        user_role: userRole
      });
    }

    next();
  };
};

// Middleware para verificar se pode gerenciar usuários
const canManageUsers = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    const allowedProfiles = ['Administrador', 'Comandante'];
    const userProfile = req.user.perfil_nome;
    
    if (!allowedProfiles.includes(userProfile) && req.user.nivel_hierarquia > 2) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado - Não pode gerenciar usuários' 
      });
    }

    next();
  };
};

// Middleware de autorização por nível hierárquico
const authorizeLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    const userLevel = req.user.nivel_hierarquia || 5; // Operador por padrão
    
    if (userLevel > minLevel) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado',
        message: `Requer nível hierárquico ${minLevel} ou superior`,
        user_level: userLevel
      });
    }

    next();
  };
};

// Middleware de autorização por permissão específica
const authorizePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    const userPermissions = req.user.perfil?.permissoes || [];
    
    if (!userPermissions.includes(permission) && !userPermissions.includes('*')) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado',
        message: `Requer permissão: ${permission}`,
        user_permissions: userPermissions
      });
    }

    next();
  };
};

// Middleware de autorização por setor
const authorizeSector = (...sectors) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    const userSector = req.user.setor_nome || req.user.setor;
    
    if (!sectors.includes(userSector)) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado',
        message: `Requer acesso a um dos seguintes setores: ${sectors.join(', ')}`,
        user_sector: userSector
      });
    }

    next();
  };
};

// Middleware de autorização por unidade
const authorizeUnit = (...units) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    const userUnit = req.user.unidade_id;
    
    if (!units.includes(userUnit)) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado',
        message: `Requer acesso a uma das seguintes unidades: ${units.join(', ')}`,
        user_unit: userUnit
      });
    }

    next();
  };
};

// Middleware opcional de autenticação (não falha se não houver token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const jwtSecret = process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim() !== ''
        ? process.env.JWT_SECRET
        : 'dev-secret';
      const decoded = jwt.verify(token, jwtSecret);
      const result = await query(`
        SELECT 
          u.id,
          u.nome_completo,
          u.email,
          u.tipo,
          u.posto_graduacao,
          u.nome_guerra,
          u.matricula,
          u.ativo,
          p.nome as perfil_nome,
          p.nivel_hierarquia,
          u.setor as setor_nome
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id = p.id
        WHERE u.id = $1 AND u.ativo = true
      `, [decoded.userId]);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        // Compatibilidade com código legado
        user.nome = user.nome_completo;
        user.papel = user.perfil_nome;
        user.setor = user.setor_nome;
        
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignora erros de token em autenticação opcional
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeLevel,
  authorizePermission,
  authorizeSector,
  authorizeUnit,
  optionalAuth,
  canManageUsers
};

// =====================================================
// DOCUMENTAÇÃO DE USO
// =====================================================
//
// EXEMPLOS DE USO:
//
// 1. Autenticação básica:
//    router.use(authenticateToken);
//
// 2. Autorização por perfil:
//    router.get('/', authorizeRoles(['Administrador', 'Comandante']));
//
// 3. Autorização por nível hierárquico:
//    router.post('/', authorizeLevel(2)); // Comandante ou superior
//
// 4. Autorização por permissão específica:
//    router.delete('/', authorizePermission('delete_users'));
//
// 5. Autorização por setor:
//    router.get('/', authorizeSector(['S1', 'S3']));
//
// 6. Autorização por unidade:
//    router.get('/', authorizeUnit([1, 2, 3]));
//
// 7. Combinando múltiplas autorizações:
//    router.post('/', 
//      authenticateToken,
//      authorizeRoles(['Administrador']),
//      authorizeLevel(1)
//    );
//
// =====================================================
