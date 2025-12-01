const { query } = require('../config/database');

(async () => {
  try {
    const oldEmail = process.env.OLD_EMAIL || 'admin@local';
    const newEmail = process.env.NEW_EMAIL || 'admin@example.com';
    const res = await query('UPDATE usuarios SET email = $1 WHERE email = $2 RETURNING id, email', [newEmail.toLowerCase(), oldEmail.toLowerCase()]);
    if (res.rowCount === 0) {
      console.log('Nenhum usuário atualizado');
      process.exit(0);
    }
    console.log('Email atualizado:', res.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('Falha ao atualizar email:', e.message);
    process.exit(1);
  }
})();

