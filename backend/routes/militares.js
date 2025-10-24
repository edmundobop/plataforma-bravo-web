const express = require('express');
const router = express.Router();

// Importar o router de usuários para reutilizar suas funcionalidades
const usuariosRouter = require('./usuarios');

// Middleware para adicionar filtro tipo=militar nas queries
const addMilitarFilter = (req, res, next) => {
  if (req.method === 'GET' && !req.params.id) {
    req.query.tipo = 'militar';
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    req.body.tipo = 'militar';
  }
  next();
};

// Rotas de dados auxiliares (redirecionamento direto)
router.get('/data/unidades', (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

router.get('/data/setores', (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

router.get('/data/funcoes', (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

router.get('/data/autocomplete', addMilitarFilter, (req, res, next) => {
  req.url = '/autocomplete';
  usuariosRouter(req, res, next);
});

router.get('/postos-graduacoes', (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

// Rotas de unidades públicas (sem autenticação)
router.get('/unidades', (req, res, next) => {
  req.url = '/config/unidades';
  usuariosRouter(req, res, next);
});

// Rotas de solicitações
router.get('/solicitacoes-pendentes', addMilitarFilter, (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

router.post('/solicitar-cadastro', addMilitarFilter, (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

router.post('/aprovar-cadastro/:id', (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

// Rotas de validação
router.post('/validate-cpf', (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

router.post('/validate-identidade', (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

// Rotas de estatísticas
router.get('/estatisticas', addMilitarFilter, (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

// Rotas de exportação/importação
router.get('/export', addMilitarFilter, (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

router.post('/import', addMilitarFilter, (req, res, next) => {
  req.url = req.url.replace('/militares/', '/usuarios/');
  usuariosRouter(req, res, next);
});

// Rotas CRUD principais
router.get('/', addMilitarFilter, (req, res, next) => {
  req.url = '/';
  usuariosRouter(req, res, next);
});

router.get('/:id', (req, res, next) => {
  req.url = `/${req.params.id}`;
  usuariosRouter(req, res, next);
});

router.post('/', addMilitarFilter, (req, res, next) => {
  req.url = '/';
  usuariosRouter(req, res, next);
});

router.put('/:id', addMilitarFilter, (req, res, next) => {
  req.url = `/${req.params.id}`;
  usuariosRouter(req, res, next);
});

router.delete('/:id', (req, res, next) => {
  req.url = `/${req.params.id}`;
  usuariosRouter(req, res, next);
});

module.exports = router;