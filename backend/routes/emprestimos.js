const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);
router.use(optionalTenant);

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

    // Filtro por unidade (tenant)
    const unidadeId = req.unidade?.id || req.user?.unidade_id || null;
    if (unidadeId) {
      paramCount++;
      queryText += ` AND e.unidade_id = $${paramCount}`;
      params.push(unidadeId);
    }

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
      queryText += ` AND (e.nome ILIKE $${paramCount} OR e.codigo ILIKE $${paramCount} OR e.numero_serie ILIKE $${paramCount} OR e.barcode ILIKE $${paramCount})`;
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

    if (unidadeId) {
      countParamCount++;
      countQuery += ` AND e.unidade_id = $${countParamCount}`;
      countParams.push(unidadeId);
    }

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
router.post('/equipamentos', authorizeRoles('Administrador', 'Chefe', 'Comandante'), [
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
      valor, data_aquisicao, setor_responsavel, observacoes, barcode, status, condicao, fotos,
      exige_autorizacao, exige_data_devolucao, tipo, localizacao
    } = req.body;
    const unidadeId = req.unidade?.id || req.user?.unidade_id || null;

    const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    const parseValor = (v) => {
      if (isEmpty(v)) return null;
      const num = parseFloat(String(v).replace(',', '.'));
      return Number.isNaN(num) ? null : num;
    };
    const valorSafe = parseValor(valor);
    const dataAquisicaoSafe = isEmpty(data_aquisicao) ? null : data_aquisicao;
    const setorRespSafe = isEmpty(setor_responsavel) ? null : setor_responsavel;
    const observacoesSafe = isEmpty(observacoes) ? null : observacoes;
    const barcodeSafe = isEmpty(barcode) ? null : barcode;
    const statusSafe = isEmpty(status) ? 'disponivel' : status;
    const condicaoSafe = isEmpty(condicao) ? 'bom' : condicao;
    const fotosSafe = Array.isArray(fotos) ? JSON.stringify(fotos) : null;
    const tipoSafe = isEmpty(tipo) ? null : tipo;
    const localizacaoSafe = isEmpty(localizacao) ? null : localizacao;
    const exigeAutSafe = (exige_autorizacao === undefined || exige_autorizacao === null) ? true : !!exige_autorizacao;
    const exigeDataDevSafe = (exige_data_devolucao === undefined || exige_data_devolucao === null) ? false : !!exige_data_devolucao;

    let result;
    try {
      result = await query(
        `INSERT INTO equipamentos 
         (codigo, nome, descricao, marca, modelo, numero_serie, valor, data_aquisicao, setor_responsavel, observacoes, unidade_id, barcode, status, condicao, fotos, tipo, localizacao, exige_autorizacao, exige_data_devolucao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING *`,
        [codigo, nome, descricao, marca, modelo, numero_serie, valorSafe, dataAquisicaoSafe, setorRespSafe, observacoesSafe, unidadeId, barcodeSafe, statusSafe, condicaoSafe, fotosSafe, tipoSafe, localizacaoSafe, exigeAutSafe, exigeDataDevSafe]
      );
    } catch (e) {
      if (e.code === '42703') {
        // Column does not exist (e.g., fotos) - reinsert without the optional column
        result = await query(
          `INSERT INTO equipamentos 
           (codigo, nome, descricao, marca, modelo, numero_serie, valor, data_aquisicao, setor_responsavel, observacoes, unidade_id, barcode, status, condicao)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING *`,
          [codigo, nome, descricao, marca, modelo, numero_serie, valorSafe, dataAquisicaoSafe, setorRespSafe, observacoesSafe, unidadeId, barcodeSafe, statusSafe, condicaoSafe]
        );
      } else {
        throw e;
      }
    }

    res.status(201).json({
      message: 'Equipamento criado com sucesso',
      equipamento: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      const msg = (error.detail || '').includes('barcode') ? 'Código de barras já existe' : 'Código do equipamento já existe';
      return res.status(400).json({ error: msg });
    }
    console.error('Erro ao criar equipamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/equipamentos/:id', authorizeRoles('Administrador', 'Chefe'), [
  body('nome').optional().notEmpty(),
  body('marca').optional().notEmpty(),
  body('modelo').optional().notEmpty()
], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo, nome, descricao, marca, modelo, numero_serie,
      valor, data_aquisicao, setor_responsavel, observacoes, status, condicao, barcode, fotos,
      exige_autorizacao, exige_data_devolucao, tipo, localizacao
    } = req.body;
    const fields = [];
    const params = [];
    let i = 1;
    if (codigo !== undefined) { fields.push(`codigo = $${i++}`); params.push(codigo); }
    if (nome !== undefined) { fields.push(`nome = $${i++}`); params.push(nome); }
    if (descricao !== undefined) { fields.push(`descricao = $${i++}`); params.push(descricao); }
    if (marca !== undefined) { fields.push(`marca = $${i++}`); params.push(marca); }
    if (modelo !== undefined) { fields.push(`modelo = $${i++}`); params.push(modelo); }
    if (numero_serie !== undefined) { fields.push(`numero_serie = $${i++}`); params.push(numero_serie); }
    if (valor !== undefined) {
      const num = parseFloat(String(valor).replace(',', '.'));
      fields.push(`valor = $${i++}`); params.push(Number.isNaN(num) ? null : num);
    }
    if (data_aquisicao !== undefined) { fields.push(`data_aquisicao = $${i++}`); params.push(data_aquisicao || null); }
    if (setor_responsavel !== undefined) { fields.push(`setor_responsavel = $${i++}`); params.push(setor_responsavel || null); }
    if (observacoes !== undefined) { fields.push(`observacoes = $${i++}`); params.push(observacoes || null); }
    if (status !== undefined) { fields.push(`status = $${i++}`); params.push(status); }
    if (condicao !== undefined) { fields.push(`condicao = $${i++}`); params.push(condicao); }
    if (barcode !== undefined) { fields.push(`barcode = $${i++}`); params.push(barcode || null); }
    if (fotos !== undefined) { fields.push(`fotos = $${i++}`); params.push(Array.isArray(fotos) ? JSON.stringify(fotos) : null); }
    if (tipo !== undefined) { fields.push(`tipo = $${i++}`); params.push(tipo || null); }
    if (localizacao !== undefined) { fields.push(`localizacao = $${i++}`); params.push(localizacao || null); }
    if (exige_autorizacao !== undefined) { fields.push(`exige_autorizacao = $${i++}`); params.push(!!exige_autorizacao); }
    if (exige_data_devolucao !== undefined) { fields.push(`exige_data_devolucao = $${i++}`); params.push(!!exige_data_devolucao); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    params.push(id);
    let result;
    try {
      result = await query(
        `UPDATE equipamentos SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
        params
      );
    } catch (e) {
      if (e.code === '42703') {
        // Remove fotos from update if column missing and retry
        const idx = fields.findIndex(f => f.startsWith('fotos ='));
        if (idx >= 0) {
          fields.splice(idx, 1);
          params.splice(idx, 1);
          i--;
        }
        result = await query(
          `UPDATE equipamentos SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
          params
        );
      } else {
        throw e;
      }
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipamento não encontrado' });
    res.json({ message: 'Equipamento atualizado com sucesso', equipamento: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar equipamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/equipamentos/:id', authorizeRoles('Administrador', 'Chefe'), async (req, res) => {
  try {
    const { id } = req.params;
    const emp = await query('SELECT id FROM emprestimos WHERE equipamento_id = $1 LIMIT 1', [id]);
    if (emp.rows.length > 0) return res.status(400).json({ error: 'Equipamento possui empréstimos vinculados' });
    const result = await query('DELETE FROM equipamentos WHERE id = $1', [id]);
    res.json({ message: 'Equipamento removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover equipamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// EMPRÉSTIMOS

// Listar empréstimos
router.get('/', async (req, res) => {
  try {
    const { status, equipamento_id, usuario_id, vencidos, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Verificar se é Operador (perfil 1 - Operador segundo solicitação, ou nome 'Operador')
    // Se for operador, filtra apenas suas próprias cautelas
    const isOperador = (req.user.perfil_nome && req.user.perfil_nome.toLowerCase() === 'operador') || 
                       (req.user.papel && req.user.papel.toLowerCase() === 'operador');
    const filterUsuarioId = isOperador ? req.user.id : usuario_id;

    let queryText = `
      SELECT e.*, 
             eq.nome as equipamento_nome, eq.codigo as equipamento_codigo,
             COALESCE(us.nome_completo, us.nome) as solicitante_nome, us.matricula as solicitante_matricula,
             COALESCE(ua.nome_completo, ua.nome) as autorizador_nome, ua.matricula as autorizador_matricula,
             CASE WHEN e.data_prevista_devolucao < CURRENT_DATE AND e.status = 'ativo' THEN true ELSE false END as vencido
      FROM emprestimos e
      JOIN equipamentos eq ON e.equipamento_id = eq.id
      JOIN usuarios us ON e.usuario_solicitante_id = us.id
      LEFT JOIN usuarios ua ON e.usuario_autorizador_id = ua.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    const unidadeId = req.unidade?.id || req.user?.unidade_id || null;

    if (unidadeId) {
      paramCount++;
      // Mostrar empréstimos onde o equipamento é da unidade
      queryText += ` AND eq.unidade_id = $${paramCount}`;
      params.push(unidadeId);
    }

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

    if (filterUsuarioId) {
      paramCount++;
      queryText += ` AND e.usuario_solicitante_id = $${paramCount}`;
      params.push(filterUsuarioId);
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
    // Contagem total
    let countQuery = `
      SELECT COUNT(*) 
      FROM emprestimos e
      JOIN equipamentos eq ON e.equipamento_id = eq.id
      JOIN usuarios us ON e.usuario_solicitante_id = us.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;
    if (unidadeId) {
      countParamCount++;
      countQuery += ` AND eq.unidade_id = $${countParamCount}`;
      countParams.push(unidadeId);
    }
    if (status) {
      countParamCount++;
      countQuery += ` AND e.status = $${countParamCount}`;
      countParams.push(status);
    }
    if (equipamento_id) {
      countParamCount++;
      countQuery += ` AND e.equipamento_id = $${countParamCount}`;
      countParams.push(equipamento_id);
    }
    if (filterUsuarioId) {
      countParamCount++;
      countQuery += ` AND e.usuario_solicitante_id = $${countParamCount}`;
      countParams.push(filterUsuarioId);
    }
    if (vencidos === 'true') {
      countQuery += ' AND e.data_prevista_devolucao < CURRENT_DATE AND e.status = \'ativo\'';
    }
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count || '0', 10);
    res.json({
      emprestimos: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit || 1)
      }
    });
  } catch (error) {
    console.error('Erro ao listar empréstimos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Lista de termos de cautela (recentes ou por emprestimo_id)
router.get('/termos', async (req, res) => {
  try {
    const { emprestimo_id, limit = 50 } = req.query;
    const params = [];
    let paramCount = 0;
    
    const unidadeId = req.unidade?.id || req.user?.unidade_id || null;

    let q = `
      SELECT t.*, 
             e.equipamento_id, e.usuario_solicitante_id, e.data_emprestimo,
             eq.nome AS equipamento_nome, eq.codigo AS equipamento_codigo
      FROM termos_cautela t
      LEFT JOIN emprestimos e ON t.emprestimo_id = e.id
      LEFT JOIN equipamentos eq ON e.equipamento_id = eq.id
      WHERE 1=1
    `;

    if (unidadeId) {
      paramCount++;
      q += ` AND eq.unidade_id = $${paramCount}`;
      params.push(unidadeId);
    }

    if (emprestimo_id) {
      paramCount++;
      params.push(parseInt(emprestimo_id, 10));
      q += ` AND t.emprestimo_id = $${paramCount}`;
    }
    
    q += ` ORDER BY t.created_at DESC LIMIT ${parseInt(limit, 10)}`;
    
    const r = await query(q, params);
    res.json({ termos: r.rows || [] });
  } catch (error) {
    if (error.code === '42P01') {
      return res.json({ termos: [] });
    }
    console.error('Erro ao listar termos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Resumo de empréstimos para relatório
router.get('/relatorio/geral', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    const unidadeId = req.unidade?.id || req.user?.unidade_id || null;
    
    let queryText = `
      SELECT
        COUNT(*) as total_emprestimos,
        COUNT(CASE WHEN e.status = 'ativo' THEN 1 END) as emprestimos_ativos,
        COUNT(CASE WHEN e.status = 'devolvido' THEN 1 END) as emprestimos_devolvidos,
        COUNT(CASE WHEN e.data_prevista_devolucao < CURRENT_DATE AND e.status = 'ativo' THEN 1 END) as emprestimos_vencidos
      FROM emprestimos e
      JOIN equipamentos eq ON e.equipamento_id = eq.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (unidadeId) {
      paramCount++;
      queryText += ` AND eq.unidade_id = $${paramCount}`;
      params.push(unidadeId);
    }

    if (data_inicio) {
      paramCount++;
      queryText += ` AND e.data_emprestimo >= $${paramCount}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      paramCount++;
      queryText += ` AND e.data_emprestimo <= $${paramCount}`;
      params.push(data_fim);
    }

    const result = await query(queryText, params);

    // Equipamentos mais emprestados (Top 10)
    let topQuery = `
      SELECT eq.nome, eq.codigo, COUNT(e.id) as total_emprestimos
      FROM emprestimos e
      JOIN equipamentos eq ON e.equipamento_id = eq.id
      WHERE 1=1
    `;
    const topParams = [];
    let topParamCount = 0;

    if (unidadeId) {
      topParamCount++;
      topQuery += ` AND eq.unidade_id = $${topParamCount}`;
      topParams.push(unidadeId);
    }
    
    // Opcional: filtrar top por data também, se desejado. Por enquanto manter apenas unidade para consistência.
    
    topQuery += `
      GROUP BY eq.id, eq.nome, eq.codigo
      ORDER BY total_emprestimos DESC
      LIMIT 10
    `;

    const equipamentosResult = await query(topQuery, topParams);

    res.json({ 
      resumo: result.rows[0],
      equipamentos_mais_emprestados: equipamentosResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de empréstimos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Top equipamentos mais emprestados
router.get('/relatorio/top-equipamentos', async (req, res) => {
  try {
    const unidadeId = req.unidade?.id || req.user?.unidade_id || null;
    let queryText = `
      SELECT eq.id, eq.codigo, eq.nome, COUNT(e.id) AS total
      FROM emprestimos e
      JOIN equipamentos eq ON e.equipamento_id = eq.id
      WHERE 1=1
    `;
    const params = [];

    if (unidadeId) {
      queryText += ` AND eq.unidade_id = $1`;
      params.push(unidadeId);
    }

    queryText += `
      GROUP BY eq.id, eq.codigo, eq.nome
      ORDER BY total DESC
      LIMIT 10
    `;

    const r = await query(queryText, params);
    res.json({ top: r.rows || [] });
  } catch (error) {
    console.error('Erro ao listar top equipamentos:', error);
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
              COALESCE(us.nome_completo, us.nome) as solicitante_nome, us.matricula as solicitante_matricula, us.setor as solicitante_setor,
              COALESCE(ua.nome_completo, ua.nome) as autorizador_nome, ua.matricula as autorizador_matricula
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
  body('data_prevista_devolucao').optional().isISO8601().withMessage('Data prevista de devolução inválida'),
  body('motivo').notEmpty().withMessage('Motivo do empréstimo é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      equipamento_id, usuario_solicitante_id, data_prevista_devolucao,
      motivo, observacoes_emprestimo, condicao_emprestimo, assinatura_solicitante
    } = req.body;

    const solicitanteId = usuario_solicitante_id || req.user.id;

    let statusEmp = 'ativo';
    await transaction(async (client) => {
      // Verificar se equipamento está disponível
      const equipamentoResult = await client.query(
        'SELECT status, nome, exige_autorizacao, exige_data_devolucao FROM equipamentos WHERE id = $1',
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

      if (equipamento.exige_data_devolucao && !data_prevista_devolucao) {
        throw new Error('Este equipamento exige data de devolução');
      }
      let autorizadorId = req.user.id;
      if (equipamento.exige_autorizacao) {
        statusEmp = 'pendente';
        autorizadorId = null;
      }
      const emprestimoResult = await client.query(
        `INSERT INTO emprestimos 
         (equipamento_id, usuario_solicitante_id, usuario_autorizador_id, data_prevista_devolucao, motivo, observacoes_emprestimo, condicao_emprestimo, status, assinatura_solicitante)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [equipamento_id, solicitanteId, autorizadorId, data_prevista_devolucao, motivo, observacoes_emprestimo, condicao_emprestimo, statusEmp, assinatura_solicitante]
      );

      // Atualizar status do equipamento
      if (statusEmp === 'ativo') {
        await client.query(
          'UPDATE equipamentos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['emprestado', equipamento_id]
        );
      }

      // Criar notificação
      await client.query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          solicitanteId,
          statusEmp === 'pendente' ? 'Cautela Pendente' : 'Empréstimo Registrado',
          statusEmp === 'pendente'
            ? `Cautela do equipamento ${equipamento.nome} está pendente de autorização do Administrador.`
            : `Empréstimo do equipamento ${equipamento.nome} registrado com sucesso. Data prevista de devolução: ${data_prevista_devolucao}`,
          statusEmp === 'pendente' ? 'warning' : 'success',
          'emprestimos',
          emprestimoResult.rows[0].id
        ]
      );

      return emprestimoResult.rows[0];
    });

    res.status(201).json({
      message: statusEmp === 'pendente' ? 'Cautela pendente de autorização' : 'Empréstimo registrado com sucesso',
      status: statusEmp
    });
  } catch (error) {
    if (error.message.includes('não encontrado') || error.message.includes('não está disponível') || error.message.includes('já possui empréstimo')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao criar empréstimo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Autorizar cautela pendente
router.put('/:id/autorizar', async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;
    const userRole = req.user?.perfil_nome || req.user?.papel;
    // Buscar unidade e config
    const empRes = await query('SELECT e.equipamento_id, e.status, e.usuario_solicitante_id, eq.nome as equipamento_nome FROM emprestimos e JOIN equipamentos eq ON e.equipamento_id = eq.id WHERE e.id = $1', [id]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: 'Empréstimo não encontrado' });
    const emprestimo = empRes.rows[0];
    if (emprestimo.status !== 'pendente') return res.status(400).json({ error: 'Empréstimo não está pendente' });
    if (emprestimo.usuario_solicitante_id === req.user.id) return res.status(403).json({ error: 'Você não pode autorizar sua própria cautela' });
    const eqRes = await query('SELECT unidade_id FROM equipamentos WHERE id = $1', [emprestimo.equipamento_id]);
    const unidadeId = eqRes.rows[0]?.unidade_id || null;
    const configRes = await query('SELECT cautelas_autorizacao_roles FROM almox_config WHERE unidade_id = $1 LIMIT 1', [unidadeId]);
    const roles = (configRes.rows[0]?.cautelas_autorizacao_roles) || ['Administrador', 'Chefe', 'Comandante'];
    const allowed = Array.isArray(roles) ? roles.includes(userRole) : false;
    if (!allowed) return res.status(403).json({ error: 'Usuário não pode autorizar cautelas' });
    await transaction(async (client) => {
      await client.query(
        `UPDATE emprestimos 
         SET status = 'ativo', usuario_autorizador_id = $1, data_emprestimo = CURRENT_TIMESTAMP, observacoes_autorizacao = $2
         WHERE id = $3`,
        [req.user.id, observacoes || null, id]
      );
      await client.query(
        'UPDATE equipamentos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['emprestado', emprestimo.equipamento_id]
      );
      await client.query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [emprestimo.usuario_solicitante_id, 'Cautela Autorizada', `Sua cautela do equipamento ${emprestimo.equipamento_nome} foi autorizada.${observacoes ? ' Observações: ' + observacoes : ''}`, 'success', 'emprestimos', id]
      );
    });
    res.json({ message: 'Cautela autorizada' });
  } catch (error) {
    console.error('Erro ao autorizar cautela:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rejeitar/Cancelar cautela
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body; // Observações no body do DELETE (alguns clients não suportam, mas axios suporta)
    const userRole = req.user?.perfil_nome || req.user?.papel;
    
    const empRes = await query('SELECT e.equipamento_id, e.status, e.usuario_solicitante_id, eq.nome as equipamento_nome FROM emprestimos e JOIN equipamentos eq ON e.equipamento_id = eq.id WHERE e.id = $1', [id]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: 'Empréstimo não encontrado' });
    const emprestimo = empRes.rows[0];

    // Apenas cautelas pendentes podem ser rejeitadas/canceladas por essa rota
    // (Devoluções usam a rota de devolver)
    if (emprestimo.status !== 'pendente') {
      return res.status(400).json({ error: 'Apenas cautelas pendentes podem ser canceladas/rejeitadas' });
    }

    // Quem pode cancelar: O próprio solicitante ou quem tem permissão de autorizar
    const isSolicitante = emprestimo.usuario_solicitante_id === req.user.id;
    
    const eqRes = await query('SELECT unidade_id FROM equipamentos WHERE id = $1', [emprestimo.equipamento_id]);
    const unidadeId = eqRes.rows[0]?.unidade_id || null;
    const configRes = await query('SELECT cautelas_autorizacao_roles FROM almox_config WHERE unidade_id = $1 LIMIT 1', [unidadeId]);
    const roles = (configRes.rows[0]?.cautelas_autorizacao_roles) || ['Administrador', 'Chefe', 'Comandante'];
    const isAutorizador = Array.isArray(roles) ? roles.includes(userRole) : false;

    if (!isSolicitante && !isAutorizador) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    await transaction(async (client) => {
      // Remover empréstimo
      await client.query('DELETE FROM emprestimos WHERE id = $1', [id]);
      
      // Liberar equipamento (embora já devesse estar 'disponivel' se estava pendente, mas garantindo)
      // Se estava pendente, o status do equipamento não muda para emprestado, mas vamos garantir que fique disponivel
      // Na logica de criação: se pendente, equipamento fica 'disponivel' (nao muda status). 
      // Mas se tiver logica que muda, aqui reverte.
      // O create não mudava status se pendente.
      
      // Notificar solicitante se foi rejeitado por outro
      if (!isSolicitante) {
        await client.query(
            `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [emprestimo.usuario_solicitante_id, 'Cautela Rejeitada', `Sua solicitação de cautela do equipamento ${emprestimo.equipamento_nome} foi rejeitada/cancelada.${observacoes ? ' Motivo: ' + observacoes : ''}`, 'error', 'emprestimos', null]
          );
      }
    });

    res.json({ message: 'Cautela cancelada/rejeitada com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar cautela:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

router.post('/lote', [
  body('equipamentos').isArray({ min: 1 }),
  body('data_prevista_devolucao').isISO8601(),
  body('motivo').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { equipamentos, data_prevista_devolucao, motivo, observacoes_emprestimo, condicao_emprestimo } = req.body;
    const solicitanteId = req.user.id;
    const results = [];
    const failures = [];
    for (const item of equipamentos) {
      const equipamento_id = item.id || item.equipamento_id;
      try {
        const txStatus = await transaction(async (client) => {
          const equipamentoResult = await client.query('SELECT status, nome, exige_autorizacao, exige_data_devolucao FROM equipamentos WHERE id = $1', [equipamento_id]);
          if (equipamentoResult.rows.length === 0) throw new Error('Equipamento não encontrado');
          const equipamento = equipamentoResult.rows[0];
          if (equipamento.status !== 'disponivel') throw new Error('Equipamento não está disponível para empréstimo');
          const emprestimoAtivoResult = await client.query('SELECT id FROM emprestimos WHERE equipamento_id = $1 AND status = $2', [equipamento_id, 'ativo']);
          if (emprestimoAtivoResult.rows.length > 0) throw new Error('Equipamento já possui empréstimo ativo');
          if (equipamento.exige_data_devolucao && !data_prevista_devolucao) {
            throw new Error('Este equipamento exige data de devolução');
          }
          let statusEmp = 'ativo';
          let autorizadorId = req.user.id;
          if (equipamento.exige_autorizacao) {
            statusEmp = 'pendente';
            autorizadorId = null;
          }
          const emprestimoResult = await client.query(
            `INSERT INTO emprestimos 
             (equipamento_id, usuario_solicitante_id, usuario_autorizador_id, data_prevista_devolucao, motivo, observacoes_emprestimo, condicao_emprestimo, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [equipamento_id, solicitanteId, autorizadorId, data_prevista_devolucao, motivo, observacoes_emprestimo, condicao_emprestimo, statusEmp]
          );
          if (statusEmp === 'ativo') {
            await client.query('UPDATE equipamentos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['emprestado', equipamento_id]);
          }
          await client.query(
            `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              solicitanteId, 
              statusEmp === 'pendente' ? 'Cautela Pendente' : 'Empréstimo Registrado', 
              statusEmp === 'pendente'
                ? `Cautela do equipamento ${equipamento.nome} está pendente de autorização do Administrador.`
                : `Empréstimo do equipamento ${equipamento.nome} registrado com sucesso.`,
              statusEmp === 'pendente' ? 'warning' : 'success',
              'emprestimos', 
              emprestimoResult.rows[0].id
            ]
          );
          return statusEmp;
        });
        results.push({ equipamento_id, status: 'ok', loan_status: txStatus });
      } catch (e) {
        failures.push({ equipamento_id, error: e.message });
      }
    }
    res.status(201).json({ created: results.length, failures, results });
  } catch (error) {
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


// Gerar termo de cautela em PDF
router.post('/:id/termo', async (req, res) => {
  try {
    const { id } = req.params;
    const { assinatura_solicitante, assinatura_autorizador } = req.body || {};
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
    const emp = result.rows[0];
    const termDir = path.join(__dirname, '..', 'uploads', 'termos');
    const signDir = path.join(__dirname, '..', 'uploads', 'assinaturas');
    fs.mkdirSync(termDir, { recursive: true });
    fs.mkdirSync(signDir, { recursive: true });
    const pdfName = `termo_cautela_${id}_${Date.now()}.pdf`;
    const pdfPathFs = path.join(termDir, pdfName);
    const pdfUrl = `/uploads/termos/${pdfName}`;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const fileStream = fs.createWriteStream(pdfPathFs);
    doc.pipe(fileStream);
    // Header
    doc.fontSize(16).text('Termo de Cautela de Equipamento', { align: 'center' });
    doc.moveDown();
    // Dados
    doc.fontSize(12).text(`Equipamento: ${emp.equipamento_nome} (${emp.equipamento_codigo})`);
    doc.text(`Marca/Modelo: ${emp.marca || '-'} / ${emp.modelo || '-'}`);
    doc.text(`Solicitante: ${emp.solicitante_nome} (Matrícula: ${emp.solicitante_matricula || '-'})`);
    doc.text(`Autorizador: ${emp.autorizador_nome || '-'} (Matrícula: ${emp.autorizador_matricula || '-'})`);
    doc.text(`Data da Cautela: ${new Date(emp.data_emprestimo).toLocaleDateString('pt-BR')}`);
    doc.text(`Devolução Prevista: ${emp.data_prevista_devolucao ? new Date(emp.data_prevista_devolucao).toLocaleDateString('pt-BR') : '-'}`);
    doc.moveDown();
    // Termo
    doc.text('Declaro ter recebido o equipamento acima e me comprometo com seu uso adequado, conservação e devolução na data prevista, sujeito às normas internas.');
    doc.moveDown();
    // Assinaturas
    let assinSolicUrl = null;
    let assinAutoUrl = null;
    const drawSignature = (label, dataUrl, filenameBase) => {
      doc.text(label);
      if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
        const base64 = dataUrl.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        const x = doc.x, y = doc.y;
        doc.image(buffer, x, y, { width: 200 }).moveDown(3);
        const fileName = `${filenameBase}_${Date.now()}.png`;
        const filePath = path.join(signDir, fileName);
        fs.writeFileSync(filePath, buffer);
        if (filenameBase.includes('solicitante')) assinSolicUrl = `/uploads/assinaturas/${fileName}`;
        if (filenameBase.includes('autorizador')) assinAutoUrl = `/uploads/assinaturas/${fileName}`;
      } else {
        doc.moveDown(2);
        doc.text('______________________________');
        doc.moveDown();
      }
    };
    drawSignature('Assinatura do Solicitante:', assinatura_solicitante, `assinatura_solicitante_${id}`);
    drawSignature('Assinatura do Autorizador:', assinatura_autorizador, `assinatura_autorizador_${id}`);
    doc.end();
    fileStream.on('finish', async () => {
      try {
        await query(
          `INSERT INTO termos_cautela (emprestimo_id, url_pdf, assinatura_solicitante, assinatura_autorizador)
           VALUES ($1, $2, $3, $4)`,
          [id, pdfUrl, assinSolicUrl, assinAutoUrl]
        );
        res.download(pdfPathFs, pdfName);
      } catch (e) {
        console.error('Erro ao salvar termo_cautela:', e);
        res.status(500).json({ error: 'Erro ao salvar termo' });
      }
    });
  } catch (error) {
    console.error('Erro ao gerar termo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
module.exports = router;

