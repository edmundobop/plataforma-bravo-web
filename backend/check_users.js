const { query } = require('./config/database');

async function checkUsers() {
  try {
    const result = await query('SELECT id, nome, email, role, ativo FROM usuarios');
    console.log('Usuários encontrados:');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}, Role: ${user.role}, Ativo: ${user.ativo}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

checkUsers();