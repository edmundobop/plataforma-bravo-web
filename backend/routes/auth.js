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
const { columnExists } = require('../utils/schema');

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
  body('posto_graduacao').notEmpty().withMessage('Posto/Graduação é obrigatório'),
  body('setor').notEmpty().withMessage('Setor é obrigatório')
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
    if (user.senha_hash) {
      console.log('Debug login - Hash armazenado:', String(user.senha_hash).substring(0, 20) + '...');
    } else {
      console.log('Debug login - Hash armazenado: <indisponível>');
    }
    
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
    const jwtSecret = process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim() !== ''
      ? process.env.JWT_SECRET
      : 'dev-secret';
    const token = jwt.sign(
      { userId: user.id, email: user.email, perfil_id: user.perfil_id, perfil_nome: user.perfil_nome },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    // Remover senha da resposta e mapear campos para compatibilidade
    const { senha: _, ...userWithoutPassword } = user;
    // Remover hash da senha de qualquer resposta
    if (userWithoutPassword.senha_hash) {
      delete userWithoutPassword.senha_hash;
    }
    userWithoutPassword.papel = userWithoutPassword.perfil_nome;
    if (Object.prototype.hasOwnProperty.call(user, 'precisa_trocar_senha')) {
      userWithoutPassword.precisa_trocar_senha = !!user.precisa_trocar_senha;
    }

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro no login:', error);
    // Fornecer mensagem de erro mais detalhada para facilitar o debug
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : `Erro no login: ${error.message}`;
    
    // Registrar detalhes adicionais para debug
    console.error('Stack trace:', error.stack);
    console.error('Detalhes da requisição:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.originalUrl
    });
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Registro (apenas admins podem registrar novos usuários)
router.post('/register', authenticateToken, authorizeRoles('Administrador'), registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome_completo, email, senha, matricula, posto_graduacao, setor, telefone, perfil_id = 5 } = req.body;

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
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(senha, bcryptRounds);

    // Inserir usuário
    const result = await query(
      `INSERT INTO usuarios (nome_completo, email, senha_hash, matricula, posto_graduacao, setor, telefone, perfil_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nome_completo, email, matricula, posto_graduacao, setor, telefone, perfil_id, ativo, created_at`,
      [nome_completo, email.toLowerCase(), hashedPassword, matricula, posto_graduacao, setor, telefone, perfil_id]
    );

    const newUser = result.rows[0];

    // Criar notificação de boas-vindas
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        newUser.id,
        'Bem-vindo ao Sistema CBMGO',
        `Olá ${nome_completo}, sua conta foi criada com sucesso. Acesse os módulos disponíveis e explore as funcionalidades.`,
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

// Alterar senha (suportando camelCase e snake_case)
const handleChangePassword = async (req, res) => {
  try {
    const senhaAtual = req.body.senhaAtual ?? req.body.senha_atual;
    const novaSenha = req.body.novaSenha ?? req.body.nova_senha;

    if (!senhaAtual) {
      return res.status(400).json({ error: 'Senha atual é obrigatória' });
    }
    if (!novaSenha || String(novaSenha).length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    const userId = req.user.id;

    // Buscar hash da senha atual
    const result = await query('SELECT senha_hash FROM usuarios WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const user = result.rows[0];

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(senhaAtual, user.senha_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(novaSenha, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Atualizar senha e limpar flag de troca obrigatória se existir
    const hasFlag = await columnExists('usuarios', 'precisa_trocar_senha');
    const sql = hasFlag
      ? 'UPDATE usuarios SET senha_hash = $1, precisa_trocar_senha = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2'
      : 'UPDATE usuarios SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await query(sql, [hashedNewPassword, userId]);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

router.put('/change-password', authenticateToken, handleChangePassword);
// Alias para compatibilidade com frontend antigo
router.put('/alterar-senha', authenticateToken, handleChangePassword);

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
// (Removido endpoint duplicado de /verify com userId inválido)

// Logout (invalidar token - implementação básica)
router.post('/logout', authenticateToken, (req, res) => {
  // Em uma implementação mais robusta, você manteria uma blacklist de tokens
  res.json({ message: 'Logout realizado com sucesso' });
});

module.exports = router;
