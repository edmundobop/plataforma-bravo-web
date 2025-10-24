const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar notificações do usuário
router.get('/', async (req, res) => {
  try {
    const { lida, tipo, modulo, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT *
      FROM notificacoes
      WHERE usuario_id = $1
    `;
    const params = [req.user.id];
    let paramCount = 1;

    if (lida !== undefined) {
      paramCount++;
      queryText += ` AND lida = $${paramCount}`;
      params.push(lida === 'true');
    }

    if (tipo) {
      paramCount++;
      queryText += ` AND tipo = $${paramCount}`;
      params.push(tipo);
    }

    if (modulo) {
      paramCount++;
      queryText += ` AND modulo = $${paramCount}`;
      params.push(modulo);
    }

    queryText += `
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Contar total de notificações
    let countQuery = 'SELECT COUNT(*) FROM notificacoes WHERE usuario_id = $1';
    const countParams = [req.user.id];
    let countParamCount = 1;

    if (lida !== undefined) {
      countParamCount++;
      countQuery += ` AND lida = $${countParamCount}`;
      countParams.push(lida === 'true');
    }

    if (tipo) {
      countParamCount++;
      countQuery += ` AND tipo = $${countParamCount}`;
      countParams.push(tipo);
    }

    if (modulo) {
      countParamCount++;
      countQuery += ` AND modulo = $${countParamCount}`;
      countParams.push(modulo);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Contar não lidas
    const naoLidasResult = await query(
      'SELECT COUNT(*) FROM notificacoes WHERE usuario_id = $1 AND lida = false',
      [req.user.id]
    );
    const naoLidas = parseInt(naoLidasResult.rows[0].count);

    res.json({
      notificacoes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      nao_lidas: naoLidas
    });
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar notificação por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM notificacoes WHERE id = $1 AND usuario_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como lida
router.put('/:id/lida', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE notificacoes SET lida = true, data_leitura = CURRENT_TIMESTAMP WHERE id = $1 AND usuario_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    // Emitir evento via Socket.io
    if (req.io) {
      req.io.to(`user_${req.user.id}`).emit('notificacao_lida', {
        id: parseInt(id),
        usuario_id: req.user.id
      });
    }

    res.json({
      message: 'Notificação marcada como lida',
      notificacao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como não lida
router.put('/:id/nao-lida', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE notificacoes SET lida = false, data_leitura = NULL WHERE id = $1 AND usuario_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    // Emitir evento via Socket.io
    if (req.io) {
      req.io.to(`user_${req.user.id}`).emit('notificacao_nao_lida', {
        id: parseInt(id),
        usuario_id: req.user.id
      });
    }

    res.json({
      message: 'Notificação marcada como não lida',
      notificacao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como não lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar todas as notificações como lidas
router.put('/todas/lidas', async (req, res) => {
  try {
    const result = await query(
      'UPDATE notificacoes SET lida = true, data_leitura = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND lida = false',
      [req.user.id]
    );

    // Emitir evento via Socket.io
    if (req.io) {
      req.io.to(`user_${req.user.id}`).emit('todas_notificacoes_lidas', {
        usuario_id: req.user.id
      });
    }

    res.json({
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error) {
    console.error('Erro ao marcar todas como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar notificação (apenas admins e gestores)
router.post('/', authorizeRoles('Administrador', 'Chefe'), [
  body('usuario_id').optional().isInt().withMessage('ID do usuário deve ser um número'),
  body('titulo').notEmpty().withMessage('Título é obrigatório'),
  body('mensagem').notEmpty().withMessage('Mensagem é obrigatória'),
  body('tipo').isIn(['info', 'success', 'warning', 'error']).withMessage('Tipo deve ser info, success, warning ou error'),
  body('modulo').optional().notEmpty().withMessage('Módulo não pode estar vazio')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      usuario_id, titulo, mensagem, tipo, modulo, referencia_id, broadcast = false
    } = req.body;

    if (broadcast) {
      // Enviar para todos os usuários ativos
      const usuariosResult = await query(
        'SELECT id FROM usuarios WHERE ativo = true'
      );

      const notificacoes = [];
      for (const usuario of usuariosResult.rows) {
        const result = await query(
          `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [usuario.id, titulo, mensagem, tipo, modulo, referencia_id]
        );
        notificacoes.push(result.rows[0]);

        // Emitir via Socket.io
        if (req.io) {
          req.io.to(`user_${usuario.id}`).emit('nova_notificacao', result.rows[0]);
        }
      }

      res.status(201).json({
        message: `Notificação enviada para ${notificacoes.length} usuários`,
        total_enviadas: notificacoes.length
      });
    } else {
      // Enviar para usuário específico
      if (!usuario_id) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório quando não é broadcast' });
      }

      const result = await query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [usuario_id, titulo, mensagem, tipo, modulo, referencia_id]
      );

      // Emitir via Socket.io
      if (req.io) {
        req.io.to(`user_${usuario_id}`).emit('nova_notificacao', result.rows[0]);
      }

      res.status(201).json({
        message: 'Notificação criada com sucesso',
        notificacao: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar todas as notificações lidas
router.delete('/lidas', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM notificacoes WHERE usuario_id = $1 AND lida = true',
      [req.user.id]
    );

    res.json({
      message: 'Todas as notificações lidas foram deletadas',
      deletadas: result.rowCount
    });
  } catch (error) {
    console.error('Erro ao deletar notificações lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar notificação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM notificacoes WHERE id = $1 AND usuario_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json({ message: 'Notificação deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de notificações
router.get('/estatisticas', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN lida = false THEN 1 END) as nao_lidas,
        COUNT(CASE WHEN tipo = 'info' THEN 1 END) as info,
        COUNT(CASE WHEN tipo = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN tipo = 'warning' THEN 1 END) as warning,
        COUNT(CASE WHEN tipo = 'error' THEN 1 END) as error,
        COUNT(CASE WHEN modulo = 'frota' THEN 1 END) as frota,
        COUNT(CASE WHEN modulo = 'almoxarifado' THEN 1 END) as almoxarifado,
        COUNT(CASE WHEN modulo = 'emprestimos' THEN 1 END) as emprestimos,
        COUNT(CASE WHEN modulo = 'operacional' THEN 1 END) as operacional
      FROM notificacoes 
      WHERE usuario_id = $1
    `, [parseInt(req.user.id)]);

    // Notificações recentes (últimos 7 dias)
    const recentesResult = await query(`
      SELECT DATE(created_at) as data, COUNT(*) as quantidade
      FROM notificacoes 
      WHERE usuario_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `, [parseInt(req.user.id)]);

    res.json({
      resumo: result.rows[0],
      ultimos_7_dias: recentesResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/stats/resumo', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN lida = false THEN 1 END) as nao_lidas,
        COUNT(CASE WHEN tipo = 'info' THEN 1 END) as info,
        COUNT(CASE WHEN tipo = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN tipo = 'warning' THEN 1 END) as warning,
        COUNT(CASE WHEN tipo = 'error' THEN 1 END) as error,
        COUNT(CASE WHEN modulo = 'frota' THEN 1 END) as frota,
        COUNT(CASE WHEN modulo = 'almoxarifado' THEN 1 END) as almoxarifado,
        COUNT(CASE WHEN modulo = 'emprestimos' THEN 1 END) as emprestimos,
        COUNT(CASE WHEN modulo = 'operacional' THEN 1 END) as operacional
      FROM notificacoes 
      WHERE usuario_id = $1
    `, [req.user.id]);

    // Notificações recentes (últimos 7 dias)
    const recentesResult = await query(`
      SELECT DATE(created_at) as data, COUNT(*) as quantidade
      FROM notificacoes 
      WHERE usuario_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `, [req.user.id]);

    res.json({
      resumo: result.rows[0],
      ultimos_7_dias: recentesResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Configurações de notificação do usuário (para futuras implementações)
router.get('/configuracoes', async (req, res) => {
  try {
    // Por enquanto, retorna configurações padrão
    // No futuro, pode ser implementada uma tabela de configurações
    res.json({
      email_enabled: true,
      push_enabled: true,
      modulos: {
        frota: true,
        almoxarifado: true,
        emprestimos: true,
        operacional: true
      },
      tipos: {
        info: true,
        success: true,
        warning: true,
        error: true
      }
    });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;