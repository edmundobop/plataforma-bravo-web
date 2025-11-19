const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// ESCALAS

// Listar escalas
router.get('/escalas', async (req, res) => {
  try {
    const { tipo, ativa, setor, data_inicio, data_fim, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT e.*, u.nome as criado_por_nome,
             COUNT(eu.id) as total_usuarios
      FROM escalas e
      LEFT JOIN usuarios u ON e.created_by = u.id
      LEFT JOIN escala_usuarios eu ON e.id = eu.escala_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (tipo) {
      paramCount++;
      queryText += ` AND e.tipo = $${paramCount}`;
      params.push(tipo);
    }

    if (ativa !== undefined) {
      paramCount++;
      queryText += ` AND e.ativa = $${paramCount}`;
      params.push(ativa === 'true');
    }

    if (setor) {
      paramCount++;
      queryText += ` AND e.setor = $${paramCount}`;
      params.push(setor);
    }

    if (data_inicio) {
      paramCount++;
      queryText += ` AND e.data_inicio >= $${paramCount}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      paramCount++;
      queryText += ` AND e.data_fim <= $${paramCount}`;
      params.push(data_fim);
    }

    queryText += `
      GROUP BY e.id, u.nome
      ORDER BY e.data_inicio DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar escalas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar escala por ID
router.get('/escalas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const escalaResult = await query(
      `SELECT e.*, u.nome as criado_por_nome
       FROM escalas e
       LEFT JOIN usuarios u ON e.created_by = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (escalaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escala não encontrada' });
    }

    // Buscar usuários da escala
    const usuariosResult = await query(
      `SELECT eu.*, u.nome, u.matricula, u.posto_graduacao
       FROM escala_usuarios eu
       JOIN usuarios u ON eu.usuario_id = u.id
       WHERE eu.escala_id = $1
       ORDER BY eu.data_servico, u.nome`,
      [id]
    );

    res.json({
      escala: escalaResult.rows[0],
      usuarios: usuariosResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar escala:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar escala
router.post('/escalas', authorizeRoles('Administrador', 'Chefe'), [
  body('nome').notEmpty().withMessage('Nome da escala é obrigatório'),
  body('tipo').isIn(['diaria', 'semanal', 'mensal']).withMessage('Tipo deve ser diaria, semanal ou mensal'),
  body('data_inicio').isISO8601().withMessage('Data de início inválida'),
  body('data_fim').isISO8601().withMessage('Data de fim inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nome, tipo, data_inicio, data_fim, turno, setor, observacoes
    } = req.body;

    const result = await query(
      `INSERT INTO escalas (nome, tipo, data_inicio, data_fim, turno, setor, observacoes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nome, tipo, data_inicio, data_fim, turno, setor, observacoes, req.user.id]
    );

    res.status(201).json({
      message: 'Escala criada com sucesso',
      escala: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar escala:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar usuário à escala
router.post('/escalas/:id/usuarios', authorizeRoles('Administrador', 'Chefe'), [
  body('usuario_id').isInt().withMessage('ID do usuário é obrigatório'),
  body('data_servico').isISO8601().withMessage('Data de serviço inválida'),
  body('turno').notEmpty().withMessage('Turno é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { usuario_id, data_servico, turno, funcao, observacoes } = req.body;

    // Verificar se a escala existe
    const escalaResult = await query(
      'SELECT id FROM escalas WHERE id = $1',
      [id]
    );

    if (escalaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escala não encontrada' });
    }

    // Verificar se o usuário já está escalado para esta data/turno
    const conflictResult = await query(
      'SELECT id FROM escala_usuarios WHERE usuario_id = $1 AND data_servico = $2 AND turno = $3',
      [usuario_id, data_servico, turno]
    );

    if (conflictResult.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já está escalado para esta data e turno' });
    }

    const result = await query(
      `INSERT INTO escala_usuarios (escala_id, usuario_id, data_servico, turno, funcao, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, usuario_id, data_servico, turno, funcao, observacoes]
    );

    // Criar notificação para o usuário
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        usuario_id,
        'Nova Escala',
        `Você foi escalado para ${data_servico} no turno ${turno}.`,
        'info',
        'operacional',
        result.rows[0].id
      ]
    );

    res.status(201).json({
      message: 'Usuário adicionado à escala com sucesso',
      escala_usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao adicionar usuário à escala:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// TROCAS DE SERVIÇO

// Listar trocas de serviço
router.get('/trocas', async (req, res) => {
  try {
    const { status, usuario_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT t.*,
             us.nome as solicitante_nome, us.matricula as solicitante_matricula,
             usub.nome as substituto_nome, usub.matricula as substituto_matricula,
             ua.nome as aprovado_por_nome
      FROM trocas_servico t
      JOIN usuarios us ON t.usuario_solicitante_id = us.id
      LEFT JOIN usuarios usub ON t.usuario_substituto_id = usub.id
      LEFT JOIN usuarios ua ON t.aprovado_por = ua.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryText += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (usuario_id) {
      paramCount++;
      queryText += ` AND (t.usuario_solicitante_id = $${paramCount} OR t.usuario_substituto_id = $${paramCount})`;
      params.push(usuario_id);
    }

    queryText += `
      ORDER BY t.data_solicitacao DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar trocas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Solicitar troca de serviço
router.post('/trocas', [
  body('escala_original_id').isInt().withMessage('ID da escala original é obrigatório'),
  body('usuario_substituto_id').isInt().withMessage('ID do usuário substituto é obrigatório'),
  body('data_servico_original').isISO8601().withMessage('Data do serviço original inválida'),
  body('data_servico_troca').isISO8601().withMessage('Data do serviço de troca inválida'),
  body('motivo').notEmpty().withMessage('Motivo da troca é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      escala_original_id, usuario_substituto_id, data_servico_original,
      data_servico_troca, motivo
    } = req.body;

    // Verificar se a escala original existe e pertence ao usuário
    const escalaResult = await query(
      'SELECT id FROM escala_usuarios WHERE id = $1 AND usuario_id = $2',
      [escala_original_id, req.user.id]
    );

    if (escalaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escala não encontrada ou não pertence ao usuário' });
    }

    const result = await query(
      `INSERT INTO trocas_servico 
       (usuario_solicitante_id, usuario_substituto_id, escala_original_id, data_servico_original, data_servico_troca, motivo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, usuario_substituto_id, escala_original_id, data_servico_original, data_servico_troca, motivo]
    );

    // Criar notificação para o substituto
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        usuario_substituto_id,
        'Solicitação de Troca',
        `${req.user.nome} solicitou uma troca de serviço com você. Motivo: ${motivo}`,
        'info',
        'operacional',
        result.rows[0].id
      ]
    );

    res.status(201).json({
      message: 'Solicitação de troca enviada com sucesso',
      troca: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao solicitar troca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aprovar/Rejeitar troca de serviço
router.put('/trocas/:id/status', authorizeRoles('Administrador', 'Chefe'), [
  body('status').isIn(['aprovada', 'rejeitada']).withMessage('Status deve ser aprovada ou rejeitada')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    await transaction(async (client) => {
      // Buscar dados da troca
      const trocaResult = await client.query(
        'SELECT * FROM trocas_servico WHERE id = $1 AND status = $2',
        [id, 'pendente']
      );

      if (trocaResult.rows.length === 0) {
        throw new Error('Troca não encontrada ou já processada');
      }

      const troca = trocaResult.rows[0];

      // Atualizar status da troca
      await client.query(
        'UPDATE trocas_servico SET status = $1, aprovado_por = $2, data_aprovacao = CURRENT_TIMESTAMP WHERE id = $3',
        [status, req.user.id, id]
      );

      if (status === 'aprovada') {
        // Atualizar a escala original
        await client.query(
          'UPDATE escala_usuarios SET usuario_id = $1, data_servico = $2 WHERE id = $3',
          [troca.usuario_substituto_id, troca.data_servico_troca, troca.escala_original_id]
        );
      }

      // Criar notificações
      await client.query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          troca.usuario_solicitante_id,
          `Troca ${status === 'aprovada' ? 'Aprovada' : 'Rejeitada'}`,
          `Sua solicitação de troca de serviço foi ${status}.`,
          status === 'aprovada' ? 'success' : 'warning',
          'operacional',
          id
        ]
      );

      await client.query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          troca.usuario_substituto_id,
          `Troca ${status === 'aprovada' ? 'Aprovada' : 'Rejeitada'}`,
          `A troca de serviço solicitada foi ${status}.`,
          status === 'aprovada' ? 'success' : 'warning',
          'operacional',
          id
        ]
      );
    });

    res.json({ message: `Troca ${status} com sucesso` });
  } catch (error) {
    if (error.message.includes('não encontrada') || error.message.includes('já processada')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao processar troca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// SERVIÇOS EXTRA

// Listar serviços extra
router.get('/extras', async (req, res) => {
  try {
    const { status, usuario_id, data_inicio, data_fim, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT se.*, u.nome as usuario_nome, u.matricula,
             ua.nome as aprovado_por_nome
      FROM servicos_extra se
      JOIN usuarios u ON se.usuario_id = u.id
      LEFT JOIN usuarios ua ON se.aprovado_por = ua.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryText += ` AND se.status = $${paramCount}`;
      params.push(status);
    }

    if (usuario_id) {
      paramCount++;
      queryText += ` AND se.usuario_id = $${paramCount}`;
      params.push(usuario_id);
    }

    if (data_inicio) {
      paramCount++;
      queryText += ` AND se.data_servico >= $${paramCount}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      paramCount++;
      queryText += ` AND se.data_servico <= $${paramCount}`;
      params.push(data_fim);
    }

    queryText += `
      ORDER BY se.data_servico DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar serviços extra:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar serviço extra
router.post('/extras', [
  body('data_servico').isISO8601().withMessage('Data do serviço inválida'),
  body('turno').notEmpty().withMessage('Turno é obrigatório'),
  body('horas').isInt({ min: 1 }).withMessage('Horas deve ser maior que zero'),
  body('tipo').notEmpty().withMessage('Tipo de serviço é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      usuario_id, data_servico, turno, horas, tipo, descricao, valor
    } = req.body;

    const usuarioServicoId = usuario_id || req.user.id;

    const result = await query(
      `INSERT INTO servicos_extra (usuario_id, data_servico, turno, horas, tipo, descricao, valor)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [usuarioServicoId, data_servico, turno, horas, tipo, descricao, valor]
    );

    res.status(201).json({
      message: 'Serviço extra registrado com sucesso',
      servico_extra: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao registrar serviço extra:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aprovar/Rejeitar serviço extra
router.put('/extras/:id/status', authorizeRoles('Administrador', 'Chefe'), [
  body('status').isIn(['aprovado', 'rejeitado']).withMessage('Status deve ser aprovado ou rejeitado')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
      'UPDATE servicos_extra SET status = $1, aprovado_por = $2 WHERE id = $3 RETURNING *',
      [status, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço extra não encontrado' });
    }

    const servicoExtra = result.rows[0];

    // Criar notificação
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        servicoExtra.usuario_id,
        `Serviço Extra ${status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}`,
        `Seu serviço extra de ${servicoExtra.data_servico} foi ${status}.`,
        status === 'aprovado' ? 'success' : 'warning',
        'operacional',
        id
      ]
    );

    res.json({
      message: `Serviço extra ${status} com sucesso`,
      servico_extra: servicoExtra
    });
  } catch (error) {
    console.error('Erro ao processar serviço extra:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório operacional
router.get('/relatorio', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    // Estatísticas gerais
    const estatisticas = await query(`
      SELECT 
        (SELECT COUNT(*) FROM escalas WHERE ativa = true) as escalas_ativas,
        (SELECT COUNT(*) FROM trocas_servico WHERE status = 'pendente') as trocas_pendentes,
        (SELECT COUNT(*) FROM servicos_extra WHERE status = 'pendente') as extras_pendentes,
        (SELECT COUNT(*) FROM escala_usuarios WHERE data_servico = CURRENT_DATE) as servicos_hoje
    `);

    // Serviços por usuário
    let servicosQuery = `
      SELECT u.nome, u.matricula,
             COUNT(eu.id) as total_servicos,
             COUNT(se.id) as servicos_extra
      FROM usuarios u
      LEFT JOIN escala_usuarios eu ON u.id = eu.usuario_id
      LEFT JOIN servicos_extra se ON u.id = se.usuario_id AND se.status = 'aprovado'
      WHERE u.ativo = true
    `;
    const params = [];
    let paramCount = 0;

    if (data_inicio) {
      paramCount++;
      servicosQuery += ` AND (eu.data_servico >= $${paramCount} OR se.data_servico >= $${paramCount})`;
      params.push(data_inicio);
    }

    if (data_fim) {
      paramCount++;
      servicosQuery += ` AND (eu.data_servico <= $${paramCount} OR se.data_servico <= $${paramCount})`;
      params.push(data_fim);
    }

    servicosQuery += `
      GROUP BY u.id, u.nome, u.matricula
      ORDER BY total_servicos DESC
      LIMIT 10
    `;

    const servicosResult = await query(servicosQuery, params);

    res.json({
      estatisticas: estatisticas.rows[0],
      servicos_por_usuario: servicosResult.rows
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;