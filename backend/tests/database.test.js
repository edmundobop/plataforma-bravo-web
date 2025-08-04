const db = require('../config/database');
const { Pool } = require('pg');

// Mock do pg
jest.mock('pg');

describe('Database Configuration', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    };
    Pool.mockImplementation(() => mockPool);
    jest.clearAllMocks();
  });

  describe('query function', () => {
    it('deve existir função query', () => {
      expect(typeof db.query).toBe('function');
    });
  });

  describe('transaction function', () => {
    it('deve existir função transaction', () => {
      expect(typeof db.transaction).toBe('function');
    });

    it('deve ser uma função assíncrona', () => {
      const result = db.transaction(() => {});
      expect(result).toBeInstanceOf(Promise);
      // Limpar a promise para evitar warnings
      result.catch(() => {});
    });
  });

  describe('pool configuration', () => {
    it('deve ter Pool mockado corretamente', () => {
      // Verificar se o Pool foi mockado
      expect(Pool).toBeDefined();
      expect(typeof Pool).toBe('function');
    });
  });
});