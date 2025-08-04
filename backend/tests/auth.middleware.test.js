const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

// Mock das dependências
jest.mock('jsonwebtoken');
jest.mock('../config/database');

// Configurar variáveis de ambiente para testes
process.env.JWT_SECRET = 'test-secret';

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('deve permitir acesso com token válido', async () => {
    const mockUser = {
      id: 1,
      email: 'admin@cbmgo.gov.br',
      funcao: 'admin',
      ativo: true
    };

    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({ userId: 1 });
    query.mockResolvedValue({ rows: [mockUser] });

    await authenticateToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar erro 401 sem token', async () => {
    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token de acesso requerido'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar erro 403 com token inválido', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    const error = new Error('Token inválido');
    error.name = 'JsonWebTokenError';
    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token inválido'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar erro 403 com formato de token inválido', async () => {
    req.headers.authorization = 'Bearer invalid-format-token';
    const error = new Error('Token inválido');
    error.name = 'JsonWebTokenError';
    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token inválido'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar erro 403 com token expirado', async () => {
    req.headers.authorization = 'Bearer expired-token';
    const error = new Error('Token expirado');
    error.name = 'TokenExpiredError';
    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token expirado'
    });
    expect(next).not.toHaveBeenCalled();
  });
});