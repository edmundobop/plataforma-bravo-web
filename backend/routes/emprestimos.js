const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// EQUIPAMENTOS

// Listar equipamentos
router.get('/equipamentos', async (req, res) => {
  try {
    const { status, condicao, setor, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT e.*,
             COUNT(emp.id) as total_emprestimos,
             COUNT(CASE WHEN emp.status = 'ativo' THEN 1 END) as emprestimos_ativos
      FROM equipamentos e
      LEFT JOIN emprestimos emp ON e.id = emp.equipamento_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryText += ` AND e.status = $${paramCount}`;
      params.push(status);
    }

    if (condicao) {
      paramCount++;
      queryText += ` AND e.condicao = $${paramCount}`;
      params.push(condicao);
    }

    if (setor) {
      paramCount++;
      queryText += ` AND e.setor_responsavel = $${paramCount}`;
      params.push(setor);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (e.nome ILIKE $${paramCount} OR e.codigo ILIKE $${paramCount} OR e.numero_serie ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    queryText += `
      GROUP BY e.id
      ORDER BY e.nome
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) FROM equipamentos e WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND e.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (condicao) {
      countParamCount++;
      countQuery += ` AND e.condicao = $${countParamCount}`;
      countParams.push(condicao);
    }

    if (setor) {
      countParamCount++;
      countQuery += ` AND e.setor_responsavel = $${countParamCount}`;
      countParams.push(setor);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (e.nome ILIKE $${countParamCount} OR e.codigo ILIKE $${countParamCount} OR e.numero_serie ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      equipamentos: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar equipamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar equipamento por ID
router.get('/equipamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM equipamentos WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    // Buscar histórico de empréstimos
    const emprestimos = await query(
      `SELECT e.*, 
              us.nome as solicitante_nome, us.matricula as solicitante_matricula,
              ua.nome as autorizador_nome, ua.matricula as autorizador_matricula
       FROM emprestimos e
       LEFT JOIN usuarios us ON e.usuario_solicitante_id = us.id
       LEFT JOIN usuarios ua ON e.usuario_autorizador_id = ua.id
       WHERE e.equipamento_id = $1
       ORDER BY e.data_emprestimo DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      equipamento: result.rows[0],
      historico_emprestimos: emprestimos.rows
    });
  } catch (error) {
    console.error('Erro ao buscar equipamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar equipamento
router.post('/equipamentos', authorizeRoles('Administrador', 'Chefe'), [
  body('codigo').notEmpty().withMessage('Código é obrigatório'),
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('marca').notEmpty().withMessage('Marca é obrigatória'),
  body('modelo').notEmpty().withMessage('Modelo é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      codigo, nome, descricao, marca, modelo, numero_serie,
      valor, data_aquisicao, setor_responsavel, observacoes
    } = req.body;

    const result = await query(
      `INSERT INTO equipamentos 
       (codigo, nome, descricao, marca, modelo, numero_serie, valor, data_aquisicao, setor_responsavel, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [codigo, nome, descricao, marca, modelo, numero_serie, valor, data_aquisicao, setor_responsavel, observacoes]
    );

    res.status(201).json({
      message: 'Equipamento criado com sucesso',
      equipamento: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Código do equipamento já existe' });
    }
    console.error('Erro ao criar equipamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// EMPRÉSTIMOS

// Listar empréstimos
router.get('/', async (req, res) => {
  try {
    const { status, equipamento_id, usuario_id, vencidos, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT e.*, 
             eq.nome as equipamento_nome, eq.codigo as equipamento_codigo,
             us.nome as solicitante_nome, us.matricula as solicitante_matricula,
             ua.nome as autorizador_nome, ua.matricula as autorizador_matricula,
             CASE WHEN e.data_prevista_devolucao < CURRENT_DATE AND e.status = 'ativo' THEN true ELSE false END as vencido
      FROM emprestimos e
      JOIN equipamentos eq ON e.equipamento_id = eq.id
      JOIN usuarios us ON e.usuario_solicitante_id = us.id
      LEFT JOIN usuarios ua ON e.usuario_autorizador_id = ua.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryText += ` AND e.status = $${paramCount}`;
      params.push(status);
    }

    if (equipamento_id) {
      paramCount++;
      queryText += ` AND e.equipamento_id = $${paramCount}`;
      params.push(equipamento_id);
    }

    if (usuario_id) {
      paramCount++;
      queryText += ` AND e.usuario_solicitante_id = $${paramCount}`;
      params.push(usuario_id);
    }

    if (vencidos === 'true') {
      queryText += ' AND e.data_prevista_devolucao < CURRENT_DATE AND e.status = \'ativo\'';
    }

    queryText += `
      ORDER BY e.data_emprestimo DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar empréstimos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar empréstimo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT e.*, 
              eq.nome as equipamento_nome, eq.codigo as equipamento_codigo, eq.marca, eq.modelo,
              us.nome as solicitante_nome, us.matricula as solicitante_matricula, us.setor as solicitante_setor,
              ua.nome as autorizador_nome, ua.matricula as autorizador_matricula
       FROM emprestimos e
       JOIN equipamentos eq ON e.equipamento_id = eq.id
       JOIN usuarios us ON e.usuario_solicitante_id = us.id
       LEFT JOIN usuarios ua ON e.usuario_autorizador_id = ua.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar empréstimo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar empréstimo
router.post('/', [
  body('equipamento_id').isInt().withMessage('ID do equipamento é obrigatório'),
  body('data_prevista_devolucao').isISO8601().withMessage('Data prevista de devolução inválida'),
  body('motivo').notEmpty().withMessage('Motivo do empréstimo é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      equipamento_id, usuario_solicitante_id, data_prevista_devolucao,
      motivo, observacoes_emprestimo, condicao_emprestimo
    } = req.body;

    const solicitanteId = usuario_solicitante_id || req.user.id;

    await transaction(async (client) => {
      // Verificar se equipamento está disponível
      const equipamentoResult = await client.query(
        'SELECT status, nome FROM equipamentos WHERE id = $1',
        [equipamento_id]
      );

      if (equipamentoResult.rows.length === 0) {
        throw new Error('Equipamento não encontrado');
      }

      const equipamento = equipamentoResult.rows[0];
      if (equipamento.status !== 'disponivel') {
        throw new Error('Equipamento não está disponível para empréstimo');
      }

      // Verificar se há empréstimo ativo para este equipamento
      const emprestimoAtivoResult = await client.query(
        'SELECT id FROM emprestimos WHERE equipamento_id = $1 AND status = $2',
        [equipamento_id, 'ativo']
      );

      if (emprestimoAtivoResult.rows.length > 0) {
        throw new Error('Equipamento já possui empréstimo ativo');
      }

      // Criar empréstimo
      const emprestimoResult = await client.query(
        `INSERT INTO emprestimos 
         (equipamento_id, usuario_solicitante_id, usuario_autorizador_id, data_prevista_devolucao, motivo, observacoes_emprestimo, condicao_emprestimo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [equipamento_id, solicitanteId, req.user.id, data_prevista_devolucao, motivo, observacoes_emprestimo, condicao_emprestimo]
      );

      // Atualizar status do equipamento
      await client.query(
        'UPDATE equipamentos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['emprestado', equipamento_id]
      );

      // Criar notificação
      await client.query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          solicitanteId,
          'Empréstimo Registrado',
          `Empréstimo do equipamento ${equipamento.nome} registrado com sucesso. Data prevista de devolução: ${data_prevista_devolucao}`,
          'success',
          'emprestimos',
          emprestimoResult.rows[0].id
        ]
      );

      return emprestimoResult.rows[0];
    });

    res.status(201).json({
      message: 'Empréstimo registrado com sucesso'
    });
  } catch (error) {
    if (error.message.includes('não encontrado') || error.message.includes('não está disponível') || error.message.includes('já possui empréstimo')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao criar empréstimo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Devolver equipamento
router.put('/:id/devolver', [
  body('condicao_devolucao').notEmpty().withMessage('Condição de devolução é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { condicao_devolucao, observacoes_devolucao } = req.body;

    await transaction(async (client) => {
      // Buscar empréstimo
      const emprestimoResult = await client.query(
        'SELECT equipamento_id, status FROM emprestimos WHERE id = $1',
        [id]
      );

      if (emprestimoResult.rows.length === 0) {
        throw new Error('Empréstimo não encontrado');
      }

      const emprestimo = emprestimoResult.rows[0];
      if (emprestimo.status !== 'ativo') {
        throw new Error('Empréstimo não está ativo');
      }

      // Atualizar empréstimo
      await client.query(
        `UPDATE emprestimos 
         SET status = 'devolvido', data_devolucao = CURRENT_TIMESTAMP, 
             condicao_devolucao = $1, observacoes_devolucao = $2
         WHERE id = $3`,
        [condicao_devolucao, observacoes_devolucao, id]
      );

      // Atualizar status e condição do equipamento
      await client.query(
        'UPDATE equipamentos SET status = $1, condicao = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['disponivel', condicao_devolucao, emprestimo.equipamento_id]
      );

      // Criar notificação
      await client.query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'Equipamento Devolvido',
          `Equipamento devolvido com sucesso. Condição: ${condicao_devolucao}`,
          'success',
          'emprestimos',
          id
        ]
      );
    });

    res.json({ message: 'Equipamento devolvido com sucesso' });
  } catch (error) {
    if (error.message.includes('não encontrado') || error.message.includes('não está ativo')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao devolver equipamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de empréstimos
router.get('/relatorio/geral', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    let queryText = `
      SELECT 
        COUNT(*) as total_emprestimos,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as emprestimos_ativos,
        COUNT(CASE WHEN status = 'devolvido' THEN 1 END) as emprestimos_devolvidos,
        COUNT(CASE WHEN data_prevista_devolucao < CURRENT_DATE AND status = 'ativo' THEN 1 END) as emprestimos_vencidos
      FROM emprestimos
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (data_inicio) {
      paramCount++;
      queryText += ` AND data_emprestimo >= $${paramCount}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      paramCount++;
      queryText += ` AND data_emprestimo <= $${paramCount}`;
      params.push(data_fim);
    }

    const result = await query(queryText, params);

    // Equipamentos mais emprestados
    const equipamentosResult = await query(`
      SELECT eq.nome, eq.codigo, COUNT(e.id) as total_emprestimos
      FROM emprestimos e
      JOIN equipamentos eq ON e.equipamento_id = eq.id
      GROUP BY eq.id, eq.nome, eq.codigo
      ORDER BY total_emprestimos DESC
      LIMIT 10
    `);

    res.json({
      resumo: result.rows[0],
      equipamentos_mais_emprestados: equipamentosResult.rows
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;