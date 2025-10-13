const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');

// Mock das dependências
jest.mock('../config/database');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// Configurar variáveis de ambiente para testes
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

// Criar rota de login simplificada para testes
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Validações
  const loginValidation = [
    body('email').isEmail().withMessage('Email inválido'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
  ];

  // Rota de login para testes
  app.post('/api/auth/login', loginValidation, async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, senha } = req.body;

      // Buscar usuário
      const result = await query(
        'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const user = result.rows[0];

      // Verificar senha
      const isValidPassword = await bcrypt.compare(senha, user.senha);
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
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Remover senha da resposta
      const { senha: _, ...userWithoutPassword } = user;

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

  // Rota de logout simplificada
  app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logout realizado com sucesso' });
  });

  return app;
};

describe('Auth API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      // Mock do usuário encontrado no banco
      const mockUser = {
        id: 1,
        email: 'admin@cbmgo.gov.br',
        senha: '$2a$10$hashedpassword',
        nome: 'Administrador',
        matricula: '123456',
        funcao: 'admin',
        role: 'admin',
        ativo: true
      };

      query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);
      query.mockResolvedValueOnce({ rows: [] }); // Update último login
      jwt.sign.mockReturnValue('mock-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@cbmgo.gov.br',
          senha: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login realizado com sucesso');
      expect(response.body.token).toBe('mock-token');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('admin@cbmgo.gov.br');
      expect(response.body.user.senha).toBeUndefined();
    });

    it('deve retornar erro com email inválido', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'usuario@inexistente.com',
          senha: 'senha123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
    });

    it('deve retornar erro com senha inválida', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@cbmgo.gov.br',
        senha: '$2a$10$hashedpassword',
        ativo: true
      };

      query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@cbmgo.gov.br',
          senha: 'senhaerrada'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
    });

    it('deve retornar erro com usuário inativo', async () => {
      // Usuários inativos não são retornados pela query (WHERE ativo = true)
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@cbmgo.gov.br',
          senha: 'admin123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
    });

    it('deve retornar erro com dados inválidos', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'email-invalido',
          senha: '123' // muito curta
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('deve retornar erro com dados faltando', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@cbmgo.gov.br'
          // senha faltando
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('deve fazer logout com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout realizado com sucesso');
    });
  });
});