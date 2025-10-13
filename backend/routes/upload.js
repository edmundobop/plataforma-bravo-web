const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configurar multer para upload de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/fotos');
    // Criar diretório se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `foto-${uniqueSuffix}${extension}`);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas JPEG, PNG, GIF e SVG são aceitos.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Upload de foto
router.post('/foto', upload.single('foto'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const fotoUrl = `/uploads/fotos/${req.file.filename}`;
    
    res.json({
      message: 'Foto enviada com sucesso',
      url: fotoUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Erro no upload da foto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload múltiplo de fotos
router.post('/fotos', upload.array('fotos', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const fotos = req.files.map(file => ({
      url: `/uploads/fotos/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));
    
    res.json({
      message: `${fotos.length} foto(s) enviada(s) com sucesso`,
      fotos: fotos
    });
  } catch (error) {
    console.error('Erro no upload das fotos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



// Middleware de tratamento de erros do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Muitos arquivos. Máximo: 10 fotos' });
    }
  }
  
  if (error.message.includes('Tipo de arquivo não permitido')) {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Erro no upload:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

module.exports = router;