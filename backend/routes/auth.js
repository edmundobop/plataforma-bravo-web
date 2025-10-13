/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Endpoints para autenticação e gerenciamento de usuários
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validações
const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
];

const registerValidation = [
  body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('matricula').isLength({ min: 3 }).withMessage('Matrícula deve ter pelo menos 3 caracteres'),
  body('posto_graduacao').notEmpty().withMessage('Posto/Graduação é obrigatório')
];

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Realizar login no sistema
 *     tags: [Autenticação]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "admin@cbmgo.gov.br"
 *             senha: "123456"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id: 1
 *                 nome: "Administrador"
 *                 email: "admin@cbmgo.gov.br"
 *                 matricula: "123456"
 *                 posto_graduacao: "Coronel"
 *                 setor: "Administração"
 *                 role: "admin"
 *                 ativo: true
 *       400:
 *         description: Dados de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Credenciais inválidas"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, senha } = req.body;

    // Buscar usuário com perfil
    const result = await query(
      `SELECT u.*, p.nome as perfil_nome 
       FROM usuarios u 
       LEFT JOIN perfis p ON u.perfil_id = p.id 
       WHERE u.email = $1 AND u.ativo = true`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verificar senha
    console.log('Debug login - Email:', email);
    console.log('Debug login - Senha recebida:', senha);
    console.log('Debug login - Hash armazenado:', user.senha_hash.substring(0, 20) + '...');
    
    const isValidPassword = await bcrypt.compare(senha, user.senha_hash);
    console.log('Debug login - Senha válida:', isValidPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    await query(
      'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, perfil_id: user.perfil_id, perfil_nome: user.perfil_nome },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remover senha da resposta e mapear campos para compatibilidade
    const { senha: _, ...userWithoutPassword } = user;
    userWithoutPassword.papel = userWithoutPassword.perfil_nome;

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registro (apenas admins podem registrar novos usuários)
router.post('/register', authenticateToken, authorizeRoles('Administrador'), registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, email, senha, matricula, posto_graduacao, telefone, perfil_id = 5 } = req.body;

    // Verificar se email já existe
    const emailExists = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    if (emailExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verificar se matrícula já existe
    const matriculaExists = await query(
      'SELECT id FROM usuarios WHERE matricula = $1',
      [matricula]
    );

    if (matriculaExists.rows.length > 0) {
      return res.status(400).json({ error: 'Matrícula já cadastrada' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, parseInt(process.env.BCRYPT_ROUNDS));

    // Inserir usuário
    const result = await query(
      `INSERT INTO usuarios (nome, email, senha_hash, matricula, posto_graduacao, telefone, perfil_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nome, email, matricula, posto_graduacao, telefone, perfil_id, ativo, created_at`,
      [nome, email.toLowerCase(), hashedPassword, matricula, posto_graduacao, telefone, perfil_id]
    );

    const newUser = result.rows[0];

    // Criar notificação de boas-vindas
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        newUser.id,
        'Bem-vindo ao Sistema CBMGO',
        `Olá ${nome}, sua conta foi criada com sucesso. Acesse os módulos disponíveis e explore as funcionalidades.`,
        'info',
        'sistema'
      ]
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: newUser
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/verify', authenticateToken, async (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Alterar senha
router.put('/change-password', authenticateToken, [
  body('senhaAtual').notEmpty().withMessage('Senha atual é obrigatória'),
  body('novaSenha').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { senhaAtual, novaSenha } = req.body;
    const userId = req.user.id;

    // Buscar senha atual
    const result = await query(
      'SELECT senha FROM usuarios WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(senhaAtual, user.senha_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(novaSenha, parseInt(process.env.BCRYPT_ROUNDS));

    // Atualizar senha
    await query(
      'UPDATE usuarios SET senha = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, userId]
    );

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Realizar logout do sistema
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Logout realizado com sucesso"
 *       401:
 *         description: Token de acesso requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Verificar token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Se chegou até aqui, o token é válido (middleware authenticateToken)
    const userId = req.user.userId;
    
    // Buscar dados atualizados do usuário com perfil
    const result = await query(
      `SELECT u.id, u.nome, u.email, u.matricula, u.posto_graduacao, u.setor, u.telefone, u.perfil_id, p.nome as perfil_nome, u.ativo 
       FROM usuarios u 
       LEFT JOIN perfis p ON u.perfil_id = p.id 
       WHERE u.id = $1 AND u.ativo = true`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }
    
    const user = result.rows[0];
    
    res.json({
      valid: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        matricula: user.matricula,
        posto_graduacao: user.posto_graduacao,
        setor: user.setor,
        telefone: user.telefone,
        perfil_nome: user.perfil_nome,
        ativo: user.ativo
      }
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout (invalidar token - implementação básica)
router.post('/logout', authenticateToken, (req, res) => {
  // Em uma implementação mais robusta, você manteria uma blacklist de tokens
  res.json({ message: 'Logout realizado com sucesso' });
});

// Reset de senha (apenas Administrador)
router.post('/reset-password', authenticateToken, authorizeRoles('Administrador'), [
  body('userId').optional().isInt().withMessage('userId deve ser um número inteiro'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('novaSenha').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, email, novaSenha } = req.body;
    if (!userId && !email) {
      return res.status(400).json({ error: 'Informe userId ou email' });
    }

    // Buscar usuário pelo id ou email
    let whereClause = '';
    let params = [];
    if (userId) {
      whereClause = 'id = $1';
      params = [userId];
    } else {
      whereClause = 'email = $1';
      params = [email.toLowerCase()];
    }

    const userResult = await query(`SELECT id, nome, email, ativo FROM usuarios WHERE ${whereClause}`, params);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const targetUser = userResult.rows[0];

    // Gerar hash da nova senha
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedNewPassword = await bcrypt.hash(novaSenha, saltRounds);

    // Atualizar coluna correta de senha (senha_hash)
    await query(
      'UPDATE usuarios SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, targetUser.id]
    );

    // (Opcional) criar notificação para o usuário
    try {
      await query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          targetUser.id,
          'Senha redefinida',
          'Sua senha foi redefinida por um administrador. Caso não reconheça esta ação, contate o suporte.',
          'warning',
          'sistema'
        ]
      );
    } catch (e) {
      // Falha ao criar notificação não deve impedir o sucesso da operação
      console.warn('Aviso: falha ao criar notificação de reset de senha:', e.message);
    }

    res.json({ message: 'Senha redefinida com sucesso', usuario: { id: targetUser.id, email: targetUser.email } });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;