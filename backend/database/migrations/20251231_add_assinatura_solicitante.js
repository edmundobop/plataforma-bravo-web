exports.up = (pgm) => {
  pgm.sql('ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS assinatura_solicitante TEXT');
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE emprestimos DROP COLUMN IF EXISTS assinatura_solicitante');
};
