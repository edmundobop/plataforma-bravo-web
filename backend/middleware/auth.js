const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar dados atualizados do usuário
    const result = await query(
      'SELECT id, nome, email, matricula, posto_graduacao, setor, role, ativo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    
    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expirado' });
    }
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware de autorização por role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: `Requer uma das seguintes permissões: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

// Middleware de autorização por setor
const authorizeSector = (...sectors) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!sectors.includes(req.user.setor)) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: `Requer acesso a um dos seguintes setores: ${sectors.join(', ')}` 
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
      const result = await query(
        'SELECT id, nome, email, matricula, posto_graduacao, setor, role, ativo FROM usuarios WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0 && result.rows[0].ativo) {
        req.user = result.rows[0];
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
  authorizeSector,
  optionalAuth
};