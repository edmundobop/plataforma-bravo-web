const { query } = require('./config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    console.log('👤 Criando usuário administrador...');
    
    // Verificar se já existe um admin
    const existingAdmin = await query(
      'SELECT id FROM usuarios WHERE email = $1 OR role = \'admin\'',
      ['admin@cbmgo.gov.br']
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('✅ Usuário administrador já existe!');
      console.log('\n📧 Email: admin@cbmgo.gov.br');
      console.log('🔒 Senha: admin123');
      console.log('\n🌐 Acesse: http://localhost:3000');
      process.exit(0);
    }
    
    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Inserir usuário admin
    const result = await query(`
      INSERT INTO usuarios (
        nome, email, senha, matricula, posto_graduacao, 
        setor, telefone, role, ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, nome, email, matricula, role
    `, [
      'Administrador do Sistema',
      'admin@cbmgo.gov.br',
      hashedPassword,
      'ADMIN001',
      'Coronel',
      'Administração',
      '(62) 99999-9999',
      'admin',
      true
    ]);
    
    console.log('\n🎉 Usuário administrador criado com sucesso!');
    console.log('\n📋 Dados de acesso:');
    console.log('   📧 Email: admin@cbmgo.gov.br');
    console.log('   🔒 Senha: admin123');
    console.log('   🆔 Matrícula: ADMIN001');
    console.log('   👑 Papel: Administrador');
    
    console.log('\n🚀 Sistema pronto para uso!');
    console.log('   🌐 Frontend: http://localhost:3000');
    console.log('   🔧 Backend: http://localhost:5000');
    
    console.log('\n⚠️ IMPORTANTE:');
    console.log('   🔐 Altere a senha após o primeiro login!');
    console.log('   👥 Use este usuário para criar outros usuários');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Erro ao criar usuário admin:', error.message);
    
    if (error.code === '23505') {
      console.log('\n💡 O usuário já existe com esse email ou matrícula.');
      console.log('   📧 Tente fazer login com: admin@cbmgo.gov.br');
      console.log('   🔒 Senha: admin123');
    } else {
      console.log('\n🔧 Verifique:');
      console.log('   1. Se o banco de dados está rodando');
      console.log('   2. Se as tabelas foram criadas (node database/migrate.js)');
      console.log('   3. Se as configurações do .env estão corretas');
    }
    
    process.exit(1);
  }
}

console.log('🔧 Configurando usuário administrador do sistema...');
createAdmin();