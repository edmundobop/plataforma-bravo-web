const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar dados completos do usuário com nova estrutura
    const result = await query(`
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
        u.ativo,
        u.ultimo_login,
        u.unidade_id,
        u.unidade_lotacao_id,

        -- Informações do perfil (nível calculado)
        p.id as perfil_id,
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
        p.permissoes,
        
        -- Informações da unidade
        un.nome as unidade_nome,
        un.sigla as unidade_sigla,
        un.tipo as unidade_tipo
        
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      LEFT JOIN unidades un ON COALESCE(u.unidade_lotacao_id, u.unidade_id) = un.id
      WHERE u.id = $1 AND u.ativo = true
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não encontrado ou inativo' 
      });
    }

    const user = result.rows[0];
    
    // Atualizar último login
    await query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Compatibilidade com código legado
    // Compatibilidade com código legado
    user.nome = user.nome; // valor já vem de u.nome
    user.papel = user.perfil_nome;  // Para compatibilidade
    
    // Estruturar informações organizacionais
    user.organizacao = {
      unidade: (user.unidade_lotacao_id || user.unidade_id) ? {
        id: user.unidade_lotacao_id || user.unidade_id,
        nome: user.unidade_nome,
        sigla: user.unidade_sigla,
        tipo: user.unidade_tipo
      } : null,
      setor: null,
      funcao: null
    };
    
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
    
    // Mapear roles antigos para novos
    const mappedRoles = roles.map(role => roleMapping[role] || role);
    
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

    const userUnit = req.user.unidade_lotacao_id || req.user.unidade_id;
    
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          u.tipo,
          u.posto_graduacao,
          u.nome_guerra,
          u.matricula,
          u.ativo,
          p.nome as perfil_nome,
          CASE 
            WHEN p.nome = 'Administrador' THEN 1
            WHEN p.nome = 'Comandante' THEN 2
            WHEN p.nome = 'Chefe' THEN 3
            WHEN p.nome = 'Auxiliares' THEN 4
            WHEN p.nome = 'Operador' THEN 5
            ELSE 5
          END AS nivel_hierarquia
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id = p.id
        WHERE u.id = $1 AND u.ativo = true
      `, [decoded.userId]);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        // Compatibilidade com código legado
        user.nome = user.nome;
        user.papel = user.perfil_nome;

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