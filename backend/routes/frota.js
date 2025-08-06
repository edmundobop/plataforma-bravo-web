const express = require('express');
const { body, validationResult, query: expressQuery } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// VIATURAS

// Listar viaturas
router.get('/viaturas', async (req, res) => {
  try {
    const { status, setor, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT v.*, 
             COUNT(m.id) as total_manutencoes,
             MAX(m.data_manutencao) as ultima_manutencao
      FROM viaturas v
      LEFT JOIN manutencoes m ON v.id = m.viatura_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryText += ` AND v.status = $${paramCount}`;
      params.push(status);
    }

    if (setor) {
      paramCount++;
      queryText += ` AND v.setor_responsavel = $${paramCount}`;
      params.push(setor);
    }

    queryText += `
      GROUP BY v.id
      ORDER BY v.prefixo
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) FROM viaturas WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (setor) {
      countParamCount++;
      countQuery += ` AND setor_responsavel = $${countParamCount}`;
      countParams.push(setor);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      viaturas: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar viaturas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar viatura por ID
router.get('/viaturas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT v.*,
              COUNT(c.id) as total_checklists,
              COUNT(m.id) as total_manutencoes
       FROM viaturas v
       LEFT JOIN checklists_viatura c ON v.id = c.viatura_id
       LEFT JOIN manutencoes m ON v.id = m.viatura_id
       WHERE v.id = $1
       GROUP BY v.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Viatura não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar viatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar viatura
router.post('/viaturas', authorizeRoles('admin', 'gestor'), [
  body('tipo').isIn(['ABT', 'ABTF', 'UR', 'AV', 'ASA', 'MOB']).withMessage('Tipo de viatura inválido'),
  body('nome').notEmpty().withMessage('Nome da viatura é obrigatório'),
  body('prefixo').notEmpty().withMessage('Prefixo é obrigatório'),
  body('modelo').notEmpty().withMessage('Modelo é obrigatório'),
  body('marca').notEmpty().withMessage('Marca é obrigatória'),
  body('placa').notEmpty().withMessage('Placa é obrigatória'),
  body('ano').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Ano inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      tipo, nome, prefixo, modelo, marca, ano, placa, chassi, renavam,
      km_atual, status, setor_responsavel, observacoes, unidade_bm
    } = req.body;

    const result = await query(
      `INSERT INTO viaturas (tipo, nome, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual, status, setor_responsavel, observacoes, unidade_bm)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [tipo, nome, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual || 0, status || 'disponivel', setor_responsavel, observacoes, unidade_bm]
    );

    // Criar notificação
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'Nova Viatura Cadastrada',
        `Viatura ${nome} (${prefixo}) - ${marca} ${modelo} foi cadastrada no sistema.`,
        'success',
        'frota',
        result.rows[0].id
      ]
    );

    res.status(201).json({
      message: 'Viatura criada com sucesso',
      viatura: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Prefixo ou placa já cadastrados' });
    }
    console.error('Erro ao criar viatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar viatura
router.put('/viaturas/:id', authorizeRoles('admin', 'gestor'), [
  body('tipo').isIn(['ABT', 'ABTF', 'UR', 'AV', 'ASA', 'MOB']).withMessage('Tipo de viatura inválido'),
  body('nome').notEmpty().withMessage('Nome da viatura é obrigatório'),
  body('prefixo').notEmpty().withMessage('Prefixo é obrigatório'),
  body('modelo').notEmpty().withMessage('Modelo é obrigatório'),
  body('marca').notEmpty().withMessage('Marca é obrigatória'),
  body('placa').notEmpty().withMessage('Placa é obrigatória'),
  body('ano').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Ano inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      tipo, nome, prefixo, modelo, marca, ano, placa, chassi, renavam,
      km_atual, status, setor_responsavel, observacoes, unidade_bm
    } = req.body;

    // Verificar se a viatura existe
    const existingViatura = await query('SELECT * FROM viaturas WHERE id = $1', [id]);
    if (existingViatura.rows.length === 0) {
      return res.status(404).json({ error: 'Viatura não encontrada' });
    }

    const result = await query(
      `UPDATE viaturas SET 
       tipo = $1, nome = $2, prefixo = $3, modelo = $4, marca = $5, ano = $6, 
       placa = $7, chassi = $8, renavam = $9, km_atual = $10, status = $11, 
       setor_responsavel = $12, observacoes = $13, unidade_bm = $14, updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING *`,
      [tipo, nome, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual || 0, status || 'disponivel', setor_responsavel, observacoes, unidade_bm, id]
    );

    // Criar notificação
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'Viatura Atualizada',
        `Viatura ${nome} (${prefixo}) - ${marca} ${modelo} foi atualizada no sistema.`,
        'info',
        'frota',
        id
      ]
    );

    res.json({
      message: 'Viatura atualizada com sucesso',
      viatura: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Prefixo ou placa já cadastrados' });
    }
    console.error('Erro ao atualizar viatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// CHECKLISTS

// Listar checklists
router.get('/checklists', async (req, res) => {
  try {
    const { viatura_id, tipo, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT c.*, v.prefixo, v.modelo, v.marca, u.nome as usuario_nome
      FROM checklists_viatura c
      JOIN viaturas v ON c.viatura_id = v.id
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (viatura_id) {
      paramCount++;
      queryText += ` AND c.viatura_id = $${paramCount}`;
      params.push(viatura_id);
    }

    if (tipo) {
      paramCount++;
      queryText += ` AND c.tipo = $${paramCount}`;
      params.push(tipo);
    }

    if (status) {
      paramCount++;
      queryText += ` AND c.status = $${paramCount}`;
      params.push(status);
    }

    queryText += `
      ORDER BY c.data_checklist DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar checklists:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar checklist
router.post('/checklists', [
  body('viatura_id').isInt().withMessage('ID da viatura é obrigatório'),
  body('tipo').isIn(['saida', 'retorno']).withMessage('Tipo deve ser saida ou retorno'),
  body('itens_verificados').isObject().withMessage('Itens verificados devem ser um objeto')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      viatura_id, tipo, km_inicial, km_final,
      combustivel_inicial, combustivel_final,
      itens_verificados, observacoes
    } = req.body;

    const result = await query(
      `INSERT INTO checklists_viatura 
       (viatura_id, usuario_id, tipo, km_inicial, km_final, combustivel_inicial, combustivel_final, itens_verificados, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        viatura_id, req.user.id, tipo, km_inicial, km_final,
        combustivel_inicial, combustivel_final,
        JSON.stringify(itens_verificados), observacoes
      ]
    );

    // Atualizar KM da viatura se for checklist de retorno
    if (tipo === 'retorno' && km_final) {
      await query(
        'UPDATE viaturas SET km_atual = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [km_final, viatura_id]
      );
    }

    res.status(201).json({
      message: 'Checklist criado com sucesso',
      checklist: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// MANUTENÇÕES

// Listar manutenções
router.get('/manutencoes', async (req, res) => {
  try {
    const { viatura_id, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT m.*, v.prefixo, v.modelo, v.marca, u.nome as usuario_nome
      FROM manutencoes m
      JOIN viaturas v ON m.viatura_id = v.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (viatura_id) {
      paramCount++;
      queryText += ` AND m.viatura_id = $${paramCount}`;
      params.push(viatura_id);
    }

    if (status) {
      paramCount++;
      queryText += ` AND m.status = $${paramCount}`;
      params.push(status);
    }

    queryText += `
      ORDER BY m.data_manutencao DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar manutenções:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar manutenção
router.post('/manutencoes', [
  body('viatura_id').isInt().withMessage('ID da viatura é obrigatório'),
  body('tipo').notEmpty().withMessage('Tipo de manutenção é obrigatório'),
  body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
  body('data_manutencao').isISO8601().withMessage('Data de manutenção inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      viatura_id, tipo, descricao, km_manutencao,
      data_manutencao, data_proxima_manutencao,
      valor, oficina, status = 'agendada'
    } = req.body;

    const result = await query(
      `INSERT INTO manutencoes 
       (viatura_id, tipo, descricao, km_manutencao, data_manutencao, data_proxima_manutencao, valor, oficina, status, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        viatura_id, tipo, descricao, km_manutencao,
        data_manutencao, data_proxima_manutencao,
        valor, oficina, status, req.user.id
      ]
    );

    res.status(201).json({
      message: 'Manutenção criada com sucesso',
      manutencao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status da manutenção
router.put('/manutencoes/:id/status', authorizeRoles('admin', 'gestor'), [
  body('status').isIn(['agendada', 'em_andamento', 'concluida', 'cancelada']).withMessage('Status inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
      'UPDATE manutencoes SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    res.json({
      message: 'Status da manutenção atualizado com sucesso',
      manutencao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;