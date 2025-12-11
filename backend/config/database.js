const { Pool } = require('pg');
require('dotenv').config();
const dns = require('dns');
const dnsPromises = require('dns').promises;
dns.setDefaultResultOrder('ipv4first');
const customLookup = (hostname, _options, callback) => {
  dns.lookup(hostname, { family: 4 }, callback);
};

const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production';

let poolPromise = (async () => {
  const host = process.env.DB_HOST || 'localhost';
  let resolvedHost = host;
  try {
    const res = await dnsPromises.lookup(host, { family: 4 });
    resolvedHost = res.address;
  } catch (_) {}
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: resolvedHost,
    database: process.env.DB_NAME || 'cbmgo_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: sslEnabled ? { require: true, rejectUnauthorized: false, servername: process.env.DB_HOST || 'localhost' } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    lookup: customLookup,
  });
  pool.on('connect', () => {
    console.log('✅ Conectado ao banco PostgreSQL');
  });
  pool.on('error', (err) => {
    console.error('❌ Erro na conexão com o banco:', err);
  });
  return pool;
})();

// Teste de conexão
// Função para executar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const pool = await poolPromise;
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Erro na query:', { text, error: error.message });
    throw error;
  }
};

// Função para transações
const transaction = async (callback) => {
  const pool = await poolPromise;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool: null,
  query,
  transaction
};
