exports.up = (pgm) => {
  pgm.sql('ALTER TABLE produtos ADD COLUMN IF NOT EXISTS barcode VARCHAR(64)');
  pgm.sql('ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS barcode VARCHAR(64)');
  pgm.sql('CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_barcode ON produtos(barcode) WHERE barcode IS NOT NULL');
  pgm.sql('CREATE UNIQUE INDEX IF NOT EXISTS idx_equipamentos_barcode ON equipamentos(barcode) WHERE barcode IS NOT NULL');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_equipamentos_barcode');
  pgm.sql('ALTER TABLE equipamentos DROP COLUMN IF EXISTS barcode');
  pgm.sql('DROP INDEX IF EXISTS idx_produtos_barcode');
  pgm.sql('ALTER TABLE produtos DROP COLUMN IF EXISTS barcode');
};
