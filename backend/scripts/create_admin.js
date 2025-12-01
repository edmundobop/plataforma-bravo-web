const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@local';
    const senha = process.env.ADMIN_PASSWORD || '123456';
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hash = await bcrypt.hash(senha, rounds);

    const perf = await query('SELECT id FROM perfis WHERE nome = $1', ['Administrador']);
    if (perf.rows.length === 0) {
      throw new Error('Perfil Administrador não encontrado');
    }
    const perfil_id = perf.rows[0].id;

    const unidade = await query('SELECT id FROM unidades WHERE ativa = true ORDER BY id LIMIT 1');
    const unidade_id = unidade.rows[0] ? unidade.rows[0].id : null;

    const exists = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      console.log('Usuario já existe:', exists.rows[0].id);
      process.exit(0);
    }

    const res = await query(
      `INSERT INTO usuarios (nome_completo, nome, email, senha_hash, matricula, posto_graduacao, setor, telefone, perfil_id, ativo, unidade_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
       RETURNING id, email`,
      ['Admin Local', 'Admin Local', email, hash, '000001', 'Coronel', 'Administração', '', perfil_id, unidade_id]
    );

    console.log('Usuario criado:', res.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('Falha ao criar admin:', e.message);
    process.exit(1);
  }
})();
