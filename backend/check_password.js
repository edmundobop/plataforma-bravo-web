const { query } = require('./config/database');
const bcrypt = require('bcryptjs');

async function checkPassword() {
  try {
    const result = await query('SELECT id, nome, email, senha FROM usuarios WHERE email = $1', ['admin@cbmgo.gov.br']);
    
    if (result.rows.length === 0) {
      console.log('Usuário não encontrado');
      return;
    }
    
    const user = result.rows[0];
    console.log('Usuário encontrado:', user.nome);
    console.log('Email:', user.email);
    
    // Testar algumas senhas comuns
    const senhasParaTestar = ['123456', 'admin123', 'admin', 'password', 'cbmgo123'];
    
    for (const senha of senhasParaTestar) {
      try {
        const isValid = await bcrypt.compare(senha, user.senha);
        if (isValid) {
          console.log(`✅ Senha encontrada: ${senha}`);
          return;
        }
      } catch (err) {
        // Pode ser que a senha não esteja hasheada
        if (user.senha === senha) {
          console.log(`✅ Senha encontrada (texto plano): ${senha}`);
          return;
        }
      }
    }
    
    console.log('❌ Nenhuma das senhas testadas funcionou');
    console.log('Hash da senha no banco:', user.senha.substring(0, 20) + '...');
    
  } catch (err) {
    console.error('Erro:', err);
  }
  
  process.exit(0);
}

checkPassword();