const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Aplicar verificação de tenant em rotas que precisam de filtro por unidade
router.use(['/produtos', '/movimentacoes'], optionalTenant);

// CATEGORIAS

// Listar categorias
router.get('/categorias', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, COUNT(p.id) as total_produtos
       FROM categorias_produto c
       LEFT JOIN produtos p ON c.id = p.categoria_id
       GROUP BY c.id
       ORDER BY c.nome`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar categoria
router.post('/categorias', authorizeRoles('Administrador', 'Chefe'), [
  body('nome').notEmpty().withMessage('Nome da categoria é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, descricao } = req.body;

    const result = await query(
      'INSERT INTO categorias_produto (nome, descricao) VALUES ($1, $2) RETURNING *',
      [nome, descricao]
    );

    res.status(201).json({
      message: 'Categoria criada com sucesso',
      categoria: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Categoria já existe' });
    }
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PRODUTOS

// Listar produtos
router.get('/produtos', async (req, res) => {
  try {
    const { categoria_id, baixo_estoque, busca, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const unidadeId = req.unidade?.id;

    let queryText = `
      SELECT p.*, c.nome as categoria_nome,
             CASE WHEN p.estoque_atual <= p.estoque_minimo THEN true ELSE false END as baixo_estoque
      FROM produtos p
      LEFT JOIN categorias_produto c ON p.categoria_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Filtro de unidade (tenant)
    if (unidadeId) {
      paramCount++;
      queryText += ` AND p.unidade_id = $${paramCount}`;
      params.push(unidadeId);
    }

    if (categoria_id) {
      paramCount++;
      queryText += ` AND p.categoria_id = $${paramCount}`;
      params.push(categoria_id);
    }

    if (baixo_estoque === 'true') {
      queryText += ' AND p.estoque_atual <= p.estoque_minimo';
    }

    if (busca) {
      paramCount++;
      queryText += ` AND (p.nome ILIKE $${paramCount} OR p.codigo ILIKE $${paramCount})`;
      params.push(`%${busca}%`);
    }

    queryText += `
      ORDER BY p.nome
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Contar total com os mesmos filtros
    let countQuery = 'SELECT COUNT(*) FROM produtos p WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    // Aplicar mesmo filtro de unidade na contagem
    if (unidadeId) {
      countParamCount++;
      countQuery += ` AND p.unidade_id = $${countParamCount}`;
      countParams.push(unidadeId);
    }

    if (categoria_id) {
      countParamCount++;
      countQuery += ` AND p.categoria_id = $${countParamCount}`;
      countParams.push(categoria_id);
    }

    if (baixo_estoque === 'true') {
      countQuery += ' AND p.estoque_atual <= p.estoque_minimo';
    }

    if (busca) {
      countParamCount++;
      countQuery += ` AND (p.nome ILIKE $${countParamCount} OR p.codigo ILIKE $${countParamCount})`;
      countParams.push(`%${busca}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      produtos: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar produto por ID
router.get('/produtos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, c.nome as categoria_nome,
              CASE WHEN p.estoque_atual <= p.estoque_minimo THEN true ELSE false END as baixo_estoque
       FROM produtos p
       LEFT JOIN categorias_produto c ON p.categoria_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Buscar últimas movimentações
    const movimentacoes = await query(
      `SELECT m.*, u.nome as usuario_nome
       FROM movimentacoes_estoque m
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       WHERE m.produto_id = $1
       ORDER BY m.data_movimentacao DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      produto: result.rows[0],
      movimentacoes: movimentacoes.rows
    });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar produto
router.post('/produtos', authorizeRoles('Administrador', 'Chefe'), [
  body('codigo').notEmpty().withMessage('Código é obrigatório'),
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('categoria_id').isInt().withMessage('Categoria é obrigatória'),
  body('unidade_medida').notEmpty().withMessage('Unidade de medida é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      codigo, nome, descricao, categoria_id, unidade_medida,
      estoque_minimo, valor_unitario
    } = req.body;

    const result = await query(
      `INSERT INTO produtos (codigo, nome, descricao, categoria_id, unidade_medida, estoque_minimo, valor_unitario)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [codigo, nome, descricao, categoria_id, unidade_medida, estoque_minimo || 0, valor_unitario]
    );

    res.status(201).json({
      message: 'Produto criado com sucesso',
      produto: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Código do produto já existe' });
    }
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// MOVIMENTAÇÕES DE ESTOQUE

// Listar movimentações
router.get('/movimentacoes', async (req, res) => {
  try {
    const { produto_id, tipo, data_inicio, data_fim, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT m.*, p.nome as produto_nome, p.codigo as produto_codigo, u.nome as usuario_nome
      FROM movimentacoes_estoque m
      JOIN produtos p ON m.produto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (produto_id) {
      paramCount++;
      queryText += ` AND m.produto_id = $${paramCount}`;
      params.push(produto_id);
    }

    if (tipo) {
      paramCount++;
      queryText += ` AND m.tipo = $${paramCount}`;
      params.push(tipo);
    }

    if (data_inicio) {
      paramCount++;
      queryText += ` AND m.data_movimentacao >= $${paramCount}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      paramCount++;
      queryText += ` AND m.data_movimentacao <= $${paramCount}`;
      params.push(data_fim);
    }

    queryText += `
      ORDER BY m.data_movimentacao DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar movimentação (entrada ou saída)
router.post('/movimentacoes', [
  body('produto_id').isInt().withMessage('ID do produto é obrigatório'),
  body('tipo').isIn(['entrada', 'saida']).withMessage('Tipo deve ser entrada ou saida'),
  body('quantidade').isInt({ min: 1 }).withMessage('Quantidade deve ser maior que zero'),
  body('motivo').notEmpty().withMessage('Motivo é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      produto_id, tipo, quantidade, valor_unitario,
      motivo, documento, fornecedor
    } = req.body;

    await transaction(async (client) => {
      // Buscar produto atual
      const produtoResult = await client.query(
        'SELECT estoque_atual, valor_unitario FROM produtos WHERE id = $1',
        [produto_id]
      );

      if (produtoResult.rows.length === 0) {
        throw new Error('Produto não encontrado');
      }

      const produto = produtoResult.rows[0];
      const valorUnit = valor_unitario || produto.valor_unitario || 0;
      const valorTotal = valorUnit * quantidade;

      // Verificar se há estoque suficiente para saída
      if (tipo === 'saida' && produto.estoque_atual < quantidade) {
        throw new Error('Estoque insuficiente');
      }

      // Calcular novo estoque
      const novoEstoque = tipo === 'entrada' 
        ? produto.estoque_atual + quantidade
        : produto.estoque_atual - quantidade;

      // Inserir movimentação
      const movimentacaoResult = await client.query(
        `INSERT INTO movimentacoes_estoque 
         (produto_id, tipo, quantidade, valor_unitario, valor_total, motivo, documento, fornecedor, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [produto_id, tipo, quantidade, valorUnit, valorTotal, motivo, documento, fornecedor, req.user.id]
      );

      // Atualizar estoque do produto
      await client.query(
        'UPDATE produtos SET estoque_atual = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [novoEstoque, produto_id]
      );

      // Verificar se ficou com estoque baixo e criar notificação
      if (novoEstoque <= produto.estoque_minimo) {
        const produtoInfo = await client.query(
          'SELECT nome, estoque_minimo FROM produtos WHERE id = $1',
          [produto_id]
        );

        await client.query(
          `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
            'Estoque Baixo',
            `O produto ${produtoInfo.rows[0].nome} está com estoque baixo (${novoEstoque} unidades). Estoque mínimo: ${produtoInfo.rows[0].estoque_minimo}`,
            'warning',
            'almoxarifado',
            produto_id
          ]
        );
      }

      return movimentacaoResult.rows[0];
    });

    res.status(201).json({
      message: 'Movimentação registrada com sucesso'
    });
  } catch (error) {
    if (error.message === 'Produto não encontrado') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Estoque insuficiente') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao criar movimentação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de estoque
router.get('/relatorio/estoque', async (req, res) => {
  try {
    const { categoria_id, baixo_estoque } = req.query;

    let queryText = `
      SELECT p.*, c.nome as categoria_nome,
             CASE WHEN p.estoque_atual <= p.estoque_minimo THEN true ELSE false END as baixo_estoque,
             p.estoque_atual * p.valor_unitario as valor_total_estoque
      FROM produtos p
      LEFT JOIN categorias_produto c ON p.categoria_id = c.id
      WHERE p.ativo = true
    `;
    const params = [];
    let paramCount = 0;

    if (categoria_id) {
      paramCount++;
      queryText += ` AND p.categoria_id = $${paramCount}`;
      params.push(categoria_id);
    }

    if (baixo_estoque === 'true') {
      queryText += ' AND p.estoque_atual <= p.estoque_minimo';
    }

    queryText += ' ORDER BY p.nome';

    const result = await query(queryText, params);

    // Calcular totais
    const totais = result.rows.reduce((acc, produto) => {
      acc.total_produtos++;
      acc.valor_total += parseFloat(produto.valor_total_estoque || 0);
      if (produto.baixo_estoque) {
        acc.produtos_baixo_estoque++;
      }
      return acc;
    }, {
      total_produtos: 0,
      produtos_baixo_estoque: 0,
      valor_total: 0
    });

    res.json({
      produtos: result.rows,
      resumo: totais
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;