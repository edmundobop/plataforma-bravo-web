exports.up = (pgm) => {
  pgm.sql('ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS observacoes_autorizacao TEXT');
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE emprestimos DROP COLUMN IF EXISTS observacoes_autorizacao');
};
