const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cbmgo_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function testConnection() {
  try {
    console.log('🔄 Testando conexão com o banco de dados...');
    console.log('Configurações:');
    console.log('- Host:', process.env.DB_HOST || 'localhost');
    console.log('- Port:', process.env.DB_PORT || 5432);
    console.log('- Database:', process.env.DB_NAME || 'cbmgo_db');
    console.log('- User:', process.env.DB_USER || 'postgres');
    console.log('- Password:', process.env.DB_PASSWORD ? '***' : 'não definida');
    
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    const result = await client.query('SELECT version()');
    console.log('📋 Versão do PostgreSQL:', result.rows[0].version);
    
    // Verificar se a tabela militares já existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'militares'
      );
    `);
    
    console.log('📊 Tabela militares existe:', tableCheck.rows[0].exists);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    process.exit(1);
  }
}

testConnection();