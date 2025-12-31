exports.up = (pgm) => {
  pgm.addColumn('produtos', {
    barcode: { type: 'varchar(64)' }
  });
  pgm.createIndex('produtos', 'barcode', { unique: true, where: 'barcode IS NOT NULL' });
  pgm.addColumn('equipamentos', {
    barcode: { type: 'varchar(64)' }
  });
  pgm.createIndex('equipamentos', 'barcode', { unique: true, where: 'barcode IS NOT NULL' });
};

exports.down = (pgm) => {
  pgm.dropIndex('equipamentos', 'barcode');
  pgm.dropColumn('equipamentos', 'barcode');
  pgm.dropIndex('produtos', 'barcode');
  pgm.dropColumn('produtos', 'barcode');
};
