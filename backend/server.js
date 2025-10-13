const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5000", "http://localhost:3000"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração do Swagger
const { swaggerUi, specs } = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Plataforma BRAVO - API Documentation'
}));

// Socket.io para notificações em tempo real
io.use((socket, next) => {
  // Permitir conexão sem autenticação por enquanto
  // TODO: Implementar autenticação JWT para Socket.io
  next();
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Cliente ${socket.id} entrou na sala ${room}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Disponibilizar io para as rotas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas da API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/frota', require('./routes/frota'));
app.use('/api/checklist', require('./routes/checklist'));
app.use('/api/almoxarifado', require('./routes/almoxarifado'));
app.use('/api/emprestimos', require('./routes/emprestimos'));
app.use('/api/operacional', require('./routes/operacional'));
app.use('/api/notificacoes', require('./routes/notificacoes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/upload', require('./routes/upload'));

// Importar e registrar rotas de templates
app.use('/api/templates', require('./routes/templates'));

// Rotas de compatibilidade para militares (redirecionam para usuarios)
app.use('/api/militares', require('./routes/militares'));

// Rota de teste
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString()
  });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 API disponível em http://localhost:${PORT}/api`);
});

module.exports = { app, io };