/* eslint-disable camelcase */
/**
 * Migration: add categoria_cnh to usuarios
 * Up: adiciona coluna se não existir
 * Down: remove coluna se existir
 */

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'categoria_cnh'
      ) THEN
        ALTER TABLE usuarios ADD COLUMN categoria_cnh VARCHAR(5);
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'categoria_cnh'
      ) THEN
        ALTER TABLE usuarios DROP COLUMN categoria_cnh;
      END IF;
    END $$;
  `);
};
