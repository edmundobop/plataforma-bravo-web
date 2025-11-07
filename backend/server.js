const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config({ override: true });
const { query } = require('./config/database');

const app = express();
const server = http.createServer(app);
// Origens permitidas no desenvolvimento (inclui múltiplas portas localhost)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5000", ...allowedOrigins],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:5000", ...allowedOrigins]
    }
  }
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} não permitido pelo CORS`));
  },
  credentials: true
}));
// Aumentar limites de payload para suportar checklists com fotos/base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Scheduler simples para gerar solicitações das automações
const semanaMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function parseMaybeJson(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return []; }
}

async function processarAutomacoes() {
  const agora = new Date();
  const dia = semanaMap[agora.getDay()];
  try {
    const res = await query('SELECT * FROM checklist_automacoes WHERE ativo = true');
    const autos = res.rows || [];
    for (const a of autos) {
      const dias = parseMaybeJson(a.dias_semana);
      if (!Array.isArray(dias) || !dias.includes(dia)) continue;
      const [hh, mm] = (a.horario || '07:00').split(':');
      const alvoHora = parseInt(hh, 10);
      const alvoMin = parseInt(mm, 10);
      if (agora.getHours() !== alvoHora || agora.getMinutes() !== alvoMin) continue;

      const dataPrevista = new Date(agora);
      dataPrevista.setSeconds(0, 0);

      const viaturas = parseMaybeJson(a.viaturas);
      for (const vid of viaturas) {
        // Evitar duplicação: já existe pendente igual no mesmo horário?
        const chk = await query(`
          SELECT id FROM checklist_solicitacoes
          WHERE unidade_id = $1 AND viatura_id = $2 AND tipo_checklist = $3
            AND COALESCE(template_id, 0) = COALESCE($4, 0)
            AND status = 'pendente'
            AND DATE(data_prevista) = DATE($5)
            AND EXTRACT(HOUR FROM data_prevista) = $6
            AND EXTRACT(MINUTE FROM data_prevista) = $7
          LIMIT 1
        `, [a.unidade_id, vid, a.tipo_checklist, a.template_id || null, dataPrevista, alvoHora, alvoMin]);
        if (chk.rows && chk.rows.length > 0) continue;

        await query(`
          INSERT INTO checklist_solicitacoes (
            unidade_id, viatura_id, template_id, tipo_checklist, ala_servico, data_prevista, responsavel_id, status, criada_em, atualizada_em
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pendente',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        `, [a.unidade_id, vid, a.template_id || null, a.tipo_checklist, a.ala_servico, dataPrevista, a.criado_por || null]);
      }
    }
  } catch (e) {
    console.error('Erro no scheduler de automações:', e);
  }
}

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 API disponível em http://localhost:${PORT}/api`);
    // Agendar execução exatamente no início de cada minuto
    function agendarSchedulerMinuto() {
      const agora = new Date();
      const msAteProximoMinuto = (60 - agora.getSeconds()) * 1000 - agora.getMilliseconds();
      setTimeout(() => {
        // Executa no início do minuto e segue a cada 60s ancorado
        processarAutomacoes();
        setInterval(processarAutomacoes, 60 * 1000);
      }, Math.max(msAteProximoMinuto, 0));
    }
    agendarSchedulerMinuto();
  });
}

// Handlers globais para evitar quedas silenciosas do servidor
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection em promessa:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

module.exports = { app, io };