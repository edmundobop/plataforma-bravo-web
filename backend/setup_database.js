const { Client } = require('pg');

async function setupDatabase() {
  console.log('🔧 Configurando banco de dados...');
  console.log('💡 Certifique-se que o PostgreSQL está rodando!');
  
  // Solicitar senha do postgres
  if (process.argv.length < 3) {
    console.log('\n❓ Como usar:');
    console.log('   node setup_database.js <senha_do_postgres>');
    console.log('\n📝 Exemplos:');
    console.log('   node setup_database.js postgres');
    console.log('   node setup_database.js admin123');
    console.log('   node setup_database.js 123456');
    console.log('\n🔍 A senha é a que você definiu durante a instalação do PostgreSQL');
    process.exit(1);
  }

  const postgresPassword = process.argv[2];
  
  // Conectar como superusuário postgres
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: postgresPassword
  });

  try {
    console.log('🔌 Testando conexão com PostgreSQL...');
    await adminClient.connect();
    console.log('✅ Conectado ao PostgreSQL!');
    
    // Verificar se o banco já existe
    console.log('🔍 Verificando banco cbmgo_db...');
    const dbExists = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = \'cbmgo_db\''
    );
    
    if (dbExists.rows.length === 0) {
      console.log('🗄️ Criando banco cbmgo_db...');
      await adminClient.query('CREATE DATABASE cbmgo_db');
      console.log('✅ Banco cbmgo_db criado!');
    } else {
      console.log('✅ Banco cbmgo_db já existe!');
    }
    
    // Verificar se o usuário já existe
    console.log('🔍 Verificando usuário cbmgo_user...');
    const userExists = await adminClient.query(
      'SELECT 1 FROM pg_roles WHERE rolname = \'cbmgo_user\''
    );
    
    if (userExists.rows.length === 0) {
      console.log('👤 Criando usuário cbmgo_user...');
      await adminClient.query(
        'CREATE USER cbmgo_user WITH PASSWORD \'cbmgo123\''
      );
      console.log('✅ Usuário cbmgo_user criado!');
    } else {
      console.log('✅ Usuário cbmgo_user já existe!');
    }
    
    // Dar permissões
    console.log('🔐 Configurando permissões...');
    await adminClient.query('GRANT ALL PRIVILEGES ON DATABASE cbmgo_db TO cbmgo_user');
    
    await adminClient.end();
    
    // Conectar ao banco cbmgo_db para configurar permissões do schema
    const dbClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'cbmgo_db',
      user: 'postgres',
      password: postgresPassword
    });
    
    await dbClient.connect();
    await dbClient.query('GRANT ALL ON SCHEMA public TO cbmgo_user');
    await dbClient.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cbmgo_user');
    await dbClient.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cbmgo_user');
    await dbClient.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cbmgo_user');
    await dbClient.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cbmgo_user');
    await dbClient.end();
    
    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('\n📋 Resumo da configuração:');
    console.log('   🗄️ Banco de dados: cbmgo_db');
    console.log('   👤 Usuário: cbmgo_user');
    console.log('   🔒 Senha: cbmgo123');
    console.log('   🌐 Host: localhost:5432');
    console.log('\n🚀 Próximos passos:');
    console.log('   1. Execute: node database/migrate.js');
    console.log('   2. Crie o usuário admin (script será fornecido)');
    console.log('   3. Acesse: http://localhost:3000');
    
  } catch (error) {
    console.error('\n❌ Erro na configuração:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Soluções possíveis:');
      console.log('   1. Verifique se o PostgreSQL está rodando');
      console.log('   2. Inicie o serviço: services.msc → PostgreSQL');
      console.log('   3. Ou reinicie o computador');
    } else if (error.code === '28P01') {
      console.log('\n🔑 Problema de autenticação:');
      console.log('   1. Verifique a senha do usuário postgres');
      console.log('   2. Tente senhas comuns: postgres, admin, 123456');
      console.log('   3. Use o pgAdmin para redefinir a senha');
    } else {
      console.log('\n💡 Dicas gerais:');
      console.log('   1. Certifique-se que o PostgreSQL está instalado');
      console.log('   2. Verifique se a porta 5432 está disponível');
      console.log('   3. Tente executar como administrador');
    }
    
    process.exit(1);
  }
}

setupDatabase();