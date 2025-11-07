/**
 * IMPORTANTE - ESTRUTURA DE UNIDADES:
 * 
 * unidade_id (INTEGER): Usado para controle tenant/acesso - define qual unidade o usuário pode acessar
 * 
 * SEMPRE usar unidade_id para filtros de segurança e controle de acesso!
 */

const express = require('express');
const { body, validationResult, query: expressQuery, param } = require('express-validator');
const { query } = require('../config/database');
const { getUsuariosUnidadeColumn, columnExists } = require('../utils/schema');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Helper: obter usuários do setor SOP com função Administrativo/Chefe/Auxiliar na mesma unidade
async function getSOPNotificationUsers(unidadeId) {
  try {
    const unidadeCol = (await getUsuariosUnidadeColumn()) || 'unidade_id';
    const hasUsuariosSetorId = await columnExists('usuarios', 'setor_id');
    const hasSetorSigla = await columnExists('setores', 'sigla');
    const hasUsuariosFuncaoId = await columnExists('usuarios', 'funcao_id');
    const hasUsuariosFuncoes = await columnExists('usuarios', 'funcoes');

    let sql = `SELECT u.id FROM usuarios u`;
    const params = [unidadeId];
    let where = ` WHERE u.ativo = true AND u.${unidadeCol} = $1`;

    if (hasUsuariosSetorId) {
      sql += ` LEFT JOIN setores s ON u.setor_id = s.id`;
      where += hasSetorSigla
        ? ` AND (s.nome = 'SOP' OR s.sigla = 'SOP')`
        : ` AND s.nome = 'SOP'`;
    } else {
      // Fallback para coluna de texto "setor" em usuarios
      where += ` AND LOWER(COALESCE(u.setor, '')) = 'sop'`;
    }

    if (hasUsuariosFuncaoId) {
      sql += ` LEFT JOIN funcoes f ON u.funcao_id = f.id`;
      where += ` AND f.nome IN ('Administrativo','Chefe de Seção','Auxiliar de Seção')`;
    } else if (hasUsuariosFuncoes) {
      // funcoes em JSONB (lista de textos)
      where += ` AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(u.funcoes, '[]'::jsonb)) v WHERE v IN ('Administrativo','Chefe de Seção','Auxiliar de Seção'))`;
    } else {
      // Se não houver informação de função, não retornar ninguém
      where += ` AND 1=0`;
    }

    const result = await query(sql + where, params);
    return result.rows.map(r => r.id);
  } catch (err) {
    console.error('Erro ao buscar usuários para notificação SOP:', err);
    return [];
  }
}

// Helper: criar notificações para uma lista de usuários
async function createChecklistAlteracaoNotifications(userIds, referenciaId, titulo, mensagem) {
  try {
    for (const uid of userIds) {
      await query(
        `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uid, titulo, mensagem, 'warning', 'frota', referenciaId]
      );
    }
  } catch (err) {
    console.error('Erro ao criar notificações de checklist com alteração:', err);
  }
}

// Rota de validação de credenciais (sem autenticação)
router.post('/validar-credenciais', [
  body('usuario_autenticacao').notEmpty().withMessage('Nome do usuário é obrigatório'),
  body('senha_autenticacao').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { usuario_autenticacao, senha_autenticacao } = req.body;
    
    console.log('🔐 Backend - Validando credenciais:', {
      usuario: usuario_autenticacao,
      senhaLength: senha_autenticacao?.length || 0
    });

    // Buscar usuário por nome ou email
    const usuarioResult = await query(`
      SELECT * FROM usuarios 
      WHERE (nome ILIKE $1 OR email ILIKE $1) AND ativo = true
    `, [usuario_autenticacao]);
    
    console.log('👤 Usuário encontrado:', usuarioResult.rows.length > 0 ? 'SIM' : 'NÃO');

    if (usuarioResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const usuario = usuarioResult.rows[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha_autenticacao, usuario.senha_hash);
    
    if (!senhaValida) {
      console.log('❌ Senha incorreta para usuário:', usuario.nome);
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    console.log('✅ Senha válida para usuário:', usuario.nome);

    res.json({
      message: 'Credenciais válidas',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error('Erro ao validar credenciais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Finalizar checklist com autenticação própria (sem JWT)
router.post('/viaturas/:id/finalizar', [
  body('usuario_autenticacao').notEmpty().withMessage('Nome do usuário é obrigatório'),
  body('senha_autenticacao').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { usuario_autenticacao, senha_autenticacao } = req.body;

    // Verificar se o checklist existe
    const checklistResult = await query('SELECT * FROM checklist_viaturas WHERE id = $1', [id]);
    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    // Verificar se o checklist já foi finalizado
    if (checklistResult.rows[0].status === 'finalizado') {
      return res.status(400).json({ error: 'Checklist já foi finalizado' });
    }

    // Buscar usuário por nome ou email
    const usuarioResult = await query(`
      SELECT * FROM usuarios 
      WHERE (nome ILIKE $1 OR email ILIKE $1) AND ativo = true
    `, [usuario_autenticacao]);

    if (usuarioResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const usuario = usuarioResult.rows[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha_autenticacao, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Finalizar checklist
    const finalizedResult = await query(`
      UPDATE checklist_viaturas 
      SET status = 'finalizado',
          usuario_autenticacao = $2,
          finalizado_em = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, usuario.nome]); // Salvar o nome do usuário que finalizou

    res.json({
      message: 'Checklist finalizado com sucesso',
      checklist: finalizedResult.rows[0]
    });
  } catch (error) {
    console.error('Erro ao finalizar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de autenticação e tenant para todas as rotas subsequentes
router.use(authenticateToken);
router.use(optionalTenant);

// Solicitações de Checklist de Viaturas
// Listar solicitações
router.get('/solicitacoes', async (req, res) => {
  try {
    const { status = 'pendente', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT s.*, v.prefixo as viatura_prefixo, v.modelo as viatura_modelo,
             t.nome as template_nome
      FROM checklist_solicitacoes s
      JOIN viaturas v ON s.viatura_id = v.id
      LEFT JOIN checklist_templates t ON s.template_id = t.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (req.unidade?.id) {
      paramCount++;
      queryText += ` AND s.unidade_id = $${paramCount}`;
      params.push(req.unidade.id);
    }

    if (status) {
      paramCount++;
      queryText += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    queryText += ` ORDER BY COALESCE(s.data_prevista, s.criada_em) DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Contagem
    let countQuery = `SELECT COUNT(*) as total FROM checklist_solicitacoes s WHERE 1=1`;
    const countParams = [];
    let countIdx = 1;
    if (req.unidade?.id) {
      countQuery += ` AND s.unidade_id = $${countIdx}`;
      countParams.push(req.unidade.id);
      countIdx++;
    }
    if (status) {
      countQuery += ` AND s.status = $${countIdx}`;
      countParams.push(status);
      countIdx++;
    }
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      solicitacoes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar solicitações de checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Automações de Checklist de Viaturas (CRUD simples)
// Listar automações
router.get('/automacoes', async (req, res) => {
  try {
    const params = [];
    let queryText = `
      SELECT a.*, t.nome as template_nome
      FROM checklist_automacoes a
      LEFT JOIN checklist_templates t ON a.template_id = t.id
      WHERE 1=1
    `;
    if (req.unidade?.id) {
      params.push(req.unidade.id);
      queryText += ` AND a.unidade_id = $${params.length}`;
    }
    queryText += ' ORDER BY a.created_at DESC';
    const result = await query(queryText, params);
    res.json({ automacoes: result.rows });
  } catch (error) {
    console.error('Erro ao listar automações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar automação
router.post('/automacoes', [
  body('horario').notEmpty().withMessage('Horário é obrigatório'),
  body('dias_semana').isArray({ min: 1 }).withMessage('Informe ao menos um dia da semana'),
  body('ala_servico').isIn(['Alpha', 'Bravo', 'Charlie', 'Delta', 'ADM']).withMessage('Ala de serviço inválida'),
  body('viaturas').isArray({ min: 1 }).withMessage('Selecione ao menos uma viatura'),
  body('template_id').isInt().withMessage('Template é obrigatório'),
  body('tipo_checklist').notEmpty().withMessage('Tipo de checklist é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      nome = null,
      ativo = true,
      horario,
      dias_semana,
      ala_servico,
      viaturas,
      template_id,
      tipo_checklist
    } = req.body;

    const unidade_id = req.unidade?.id;
    if (!unidade_id) {
      return res.status(400).json({ error: 'Unidade não definida' });
    }

    const result = await query(`
      INSERT INTO checklist_automacoes (
        unidade_id, nome, ativo, horario, dias_semana, ala_servico, viaturas, template_id, tipo_checklist, criado_por, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *
    `, [unidade_id, nome, !!ativo, horario, JSON.stringify(dias_semana), ala_servico, JSON.stringify(viaturas), template_id, tipo_checklist, req.user.id]);

    res.status(201).json({ message: 'Automação criada com sucesso', automacao: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar automação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar automação
router.put('/automacoes/:id', [
  param('id').isInt(),
  body('horario').optional().notEmpty(),
  body('dias_semana').optional().isArray({ min: 1 }),
  body('ala_servico').optional().isIn(['Alpha', 'Bravo', 'Charlie', 'Delta', 'ADM']),
  body('viaturas').optional().isArray({ min: 1 }),
  body('template_id').optional().isInt(),
  body('tipo_checklist').optional().notEmpty(),
  body('ativo').optional().isBoolean(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let idx = 1;
    const updatable = ['nome','ativo','horario','dias_semana','ala_servico','viaturas','template_id','tipo_checklist'];
    for (const key of updatable) {
      if (key in req.body) {
        fields.push(`${key} = $${idx}`);
        if (key === 'dias_semana' || key === 'viaturas') {
          values.push(JSON.stringify(req.body[key]));
        } else {
          values.push(req.body[key]);
        }
        idx++;
      }
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    values.push(id);
    const result = await query(`
      UPDATE checklist_automacoes
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${idx}
      RETURNING *
    `, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    res.json({ message: 'Automação atualizada', automacao: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar automação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ativar/Desativar automação
router.put('/automacoes/:id/ativar', async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;
    const result = await query(`
      UPDATE checklist_automacoes SET ativo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *
    `, [!!ativo, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    res.json({ message: 'Status atualizado', automacao: result.rows[0] });
  } catch (error) {
    console.error('Erro ao alternar status da automação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir automação
router.delete('/automacoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM checklist_automacoes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    res.json({ message: 'Automação excluída' });
  } catch (error) {
    console.error('Erro ao excluir automação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar solicitações agora com base na automação
router.post('/automacoes/:id/gerar-solicitacoes', async (req, res) => {
  try {
    const { id } = req.params;
    const sel = await query('SELECT * FROM checklist_automacoes WHERE id = $1', [id]);
    if (sel.rows.length === 0) {
      return res.status(404).json({ error: 'Automação não encontrada' });
    }
    const a = sel.rows[0];
    if (!a.ativo) {
      return res.status(400).json({ error: 'Automação desativada' });
    }

    // Calcular data_prevista usando a hora configurada para hoje
    const [h, m] = (a.horario || '07:00').split(':');
    const dataPrevista = new Date();
    dataPrevista.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);

    const viaturas = Array.isArray(a.viaturas) ? a.viaturas : (a.viaturas?.ids || []);
    const created = [];
    for (const vid of viaturas) {
      const r = await query(`
        INSERT INTO checklist_solicitacoes (
          unidade_id, viatura_id, template_id, tipo_checklist, ala_servico, data_prevista, responsavel_id, status, criada_em, atualizada_em
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pendente',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        RETURNING *
      `, [a.unidade_id, vid, a.template_id || null, a.tipo_checklist, a.ala_servico, dataPrevista, req.user.id]);
      created.push(r.rows[0]);
    }

    res.json({ message: `${created.length} solicitações criadas`, solicitacoes: created });
  } catch (error) {
    console.error('Erro ao gerar solicitações da automação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar solicitação
router.post('/solicitacoes', [
  body('viatura_id').isInt().withMessage('ID da viatura é obrigatório'),
  body('template_id').optional().isInt(),
  body('tipo_checklist').notEmpty().withMessage('Tipo de checklist é obrigatório'),
  body('ala_servico').isIn(['Alpha', 'Bravo', 'Charlie', 'Delta', 'ADM']).withMessage('Ala de serviço inválida'),
  body('data_prevista').optional().isISO8601().withMessage('Data prevista inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { viatura_id, template_id, tipo_checklist, ala_servico, data_prevista } = req.body;

    // Verificar viatura e unidade
    let vQuery = 'SELECT id, unidade_id FROM viaturas WHERE id = $1';
    const vParams = [viatura_id];
    const vResult = await query(vQuery, vParams);
    if (vResult.rows.length === 0) {
      return res.status(404).json({ error: 'Viatura não encontrada' });
    }
    const unidade_id = vResult.rows[0].unidade_id;

    // Inserir solicitação
    const result = await query(`
      INSERT INTO checklist_solicitacoes (
        unidade_id, viatura_id, template_id, tipo_checklist, ala_servico, data_prevista, responsavel_id, status, criada_em, atualizada_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [unidade_id, viatura_id, template_id || null, tipo_checklist, ala_servico, data_prevista || null, req.user.id]);

    res.status(201).json({ message: 'Solicitação criada com sucesso', solicitacao: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar solicitação de checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cancelar solicitação
router.put('/solicitacoes/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;

    // Atualizar status para cancelada
    const result = await query(`
      UPDATE checklist_solicitacoes SET status = 'cancelada', atualizada_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    res.json({ message: 'Solicitação cancelada', solicitacao: result.rows[0] });
  } catch (error) {
    console.error('Erro ao cancelar solicitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir solicitação definitivamente (apenas Administrador/Chefe)
router.delete('/solicitacoes/:id', authorizeRoles('Administrador', 'Chefe'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM checklist_solicitacoes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    res.json({ message: 'Solicitação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir solicitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Iniciar solicitação (marca como atendida e retorna dados de prefill)
router.post('/solicitacoes/:id/iniciar', async (req, res) => {
  try {
    const { id } = req.params;

    const sel = await query('SELECT * FROM checklist_solicitacoes WHERE id = $1', [id]);
    if (sel.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    const s = sel.rows[0];

    // Marcar como atendida
    await query('UPDATE checklist_solicitacoes SET status = $1, atualizada_em = CURRENT_TIMESTAMP WHERE id = $2', ['atendida', id]);

    res.json({
      message: 'Solicitação iniciada',
      prefill: {
        viatura_id: s.viatura_id,
        template_id: s.template_id,
        tipo_checklist: s.tipo_checklist,
        ala_servico: s.ala_servico
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar solicitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar checklists de viaturas com filtros
router.get('/viaturas', async (req, res) => {
  try {
    console.log('🔍 GET /checklist/viaturas - req.unidade:', req.unidade);
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Query params:', req.query);
    
    const { page = 1, limit = 10, viatura_id, status, data_inicio, data_fim, tipo_checklist, ala_servico } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
             c.id,
             c.viatura_id,
             c.usuario_id,
             c.data_checklist,
             c.km_inicial,
             c.combustivel_percentual,
             c.ala_servico,
             c.tipo_checklist,
             c.observacoes_gerais,
             c.status,
             v.prefixo as viatura_prefixo,
             v.placa,
             v.modelo,
             v.tipo as viatura_tipo,
             u.nome as usuario_nome,
             u.matricula as usuario_matricula,
             c.situacao,
             t.nome as template_nome,
             t.tipo_viatura as template_tipo
      FROM checklist_viaturas c
      JOIN viaturas v ON c.viatura_id = v.id
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN checklist_templates t ON c.template_id = t.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Filtro por unidade se disponível
    // IMPORTANTE: Usar c.unidade_id (da tabela checklist_viaturas) para filtro tenant
    if (req.unidade?.id) {
      paramCount++;
      queryText += ` AND c.unidade_id = $${paramCount}`;
      params.push(req.unidade.id);
      console.log('🏢 Aplicando filtro de unidade:', req.unidade.id);
    }

    if (viatura_id) {
      paramCount++;
      queryText += ` AND c.viatura_id = $${paramCount}`;
      params.push(viatura_id);
    }

    if (status) {
      paramCount++;
      queryText += ` AND c.status = $${paramCount}`;
      params.push(status);
    }

    if (tipo_checklist) {
      paramCount++;
      queryText += ` AND c.tipo_checklist = $${paramCount}`;
      params.push(tipo_checklist);
    }

    if (ala_servico) {
      paramCount++;
      queryText += ` AND c.ala_servico = $${paramCount}`;
      params.push(ala_servico);
    }

    if (data_inicio) {
      paramCount++;
      queryText += ` AND DATE(c.data_checklist) >= $${paramCount}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      paramCount++;
      queryText += ` AND DATE(c.data_checklist) <= $${paramCount}`;
      params.push(data_fim);
    }
    
    queryText += `
      ORDER BY c.data_checklist DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    console.log('🔍 Query final:', queryText);
    console.log('🔍 Parâmetros:', params);

    const result = await query(queryText, params);

    // Buscar total de registros
    // Construir query de contagem com filtros
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM checklist_viaturas c
      JOIN viaturas v ON c.viatura_id = v.id
      WHERE 1=1
    `;
    let countParams = [];
    let countParamIndex = 1;

    // IMPORTANTE: Usar c.unidade_id (tenant)
    if (req.unidade && req.unidade.id) {
      countQuery += ` AND c.unidade_id = $${countParamIndex}`;
      countParams.push(req.unidade.id);
      countParamIndex++;
    }

    if (viatura_id) {
      countQuery += ` AND c.viatura_id = $${countParamIndex}`;
      countParams.push(viatura_id);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND c.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (tipo_checklist) {
      countQuery += ` AND c.tipo_checklist = $${countParamIndex}`;
      countParams.push(tipo_checklist);
      countParamIndex++;
    }

    if (ala_servico) {
      countQuery += ` AND c.ala_servico = $${countParamIndex}`;
      countParams.push(ala_servico);
      countParamIndex++;
    }

    if (data_inicio) {
      countQuery += ` AND DATE(c.data_checklist) >= $${countParamIndex}`;
      countParams.push(data_inicio);
      countParamIndex++;
    }

    if (data_fim) {
      countQuery += ` AND DATE(c.data_checklist) <= $${countParamIndex}`;
      countParams.push(data_fim);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      checklists: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar checklists:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar checklist por ID
router.get('/viaturas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checklistResult = await query(`
      SELECT c.*, 
             v.prefixo as viatura_prefixo,
             v.modelo as viatura_modelo,
             v.marca as viatura_marca,
             u.nome as usuario_nome,
             t.nome as template_nome,
             t.tipo_viatura as template_tipo
      FROM checklist_viaturas c
      JOIN viaturas v ON c.viatura_id = v.id
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN checklist_templates t ON c.template_id = t.id
      WHERE c.id = $1
    `, [id]);

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    const itensResult = await query(`
      SELECT * FROM checklist_itens
      WHERE checklist_id = $1
      ORDER BY ordem, id
    `, [id]);

    const checklist = checklistResult.rows[0];
    checklist.itens = itensResult.rows;

    res.json(checklist);
  } catch (error) {
    console.error('Erro ao buscar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo checklist
// Criar novo checklist
router.post('/viaturas', [
  body('viatura_id').isInt().withMessage('ID da viatura é obrigatório'),
  body('template_id').optional().isInt().withMessage('ID do template deve ser um número'),
  body('km_inicial').isInt({ min: 0 }).withMessage('KM inicial deve ser um número positivo'),
  body('combustivel_percentual').isInt({ min: 0, max: 100 }).withMessage('Percentual de combustível deve estar entre 0 e 100'),
  // Normalizar ala_servico antes de validar contra a lista permitida
  body('ala_servico').customSanitizer((val) => {
    const v = (val || '').trim();
    const map = {
      'alpha': 'Alpha', 'Alpha': 'Alpha',
      'bravo': 'Bravo', 'Bravo': 'Bravo',
      'charlie': 'Charlie', 'Charlie': 'Charlie',
      'delta': 'Delta', 'Delta': 'Delta',
      'adm': 'ADM', 'ADM': 'ADM'
    };
    return map[v] || v;
  }).isIn(['Alpha', 'Bravo', 'Charlie', 'Delta', 'ADM']).withMessage('Ala de serviço deve ser Alpha, Bravo, Charlie, Delta ou ADM'),
  body('tipo_checklist').notEmpty().withMessage('Tipo de checklist é obrigatório'),
  body('data_hora').isISO8601().withMessage('Data e hora devem estar em formato válido'),
  body('itens').isArray().withMessage('Itens do checklist são obrigatórios'),
  body('itens.*.nome_item').notEmpty().withMessage('Nome do item é obrigatório'),
  body('itens.*.categoria').optional(),
  body('itens.*.status').isIn(['ok', 'com_alteracao']).withMessage('Status deve ser "ok" ou "com_alteracao"'),
  body('itens.*.observacoes').optional(),
  body('itens.*.fotos').optional().isArray(),
  body('itens.*.ordem').optional().isInt()
], async (req, res) => {
  // Declarar variáveis fora do try para que estejam disponíveis no catch
  let viatura_id, template_id, km_inicial, combustivel_percentual, ala_servico, tipo_checklist, data_hora, observacoes_gerais, itens;
  
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('⚠️ Validação falhou em POST /checklist/viaturas:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    ({
      viatura_id,
      template_id,
      km_inicial,
      combustivel_percentual,
      ala_servico,
      tipo_checklist,
      data_hora,
      observacoes_gerais,
      itens
    } = req.body);

    // Debug: valores recebidos brutos (parcial)
    console.log('📥 Payload recebido (parcial):', {
      viatura_id,
      template_id,
      km_inicial,
      combustivel_percentual,
      ala_servico_raw: ala_servico,
      tipo_checklist,
      data_hora,
      itens_count: Array.isArray(itens) ? itens.length : 0
    });

    // Reforçar normalização de ala_servico (defensivo, caso sanitização não rode)
    const normalizeAlaServico = (val) => {
      const v = (val || '').trim();
      const map = {
        'alpha': 'Alpha', 'Alpha': 'Alpha',
        'bravo': 'Bravo', 'Bravo': 'Bravo',
        'charlie': 'Charlie', 'Charlie': 'Charlie',
        'delta': 'Delta', 'Delta': 'Delta',
        'adm': 'ADM', 'ADM': 'ADM'
      };
      return map[v] || 'Alpha';
    };
    ala_servico = normalizeAlaServico(ala_servico);
    console.log('✅ ala_servico normalizado:', ala_servico);

    const usuario_id = req.user.id;

    // Verificar se a viatura existe e se o usuário tem acesso a ela
    // IMPORTANTE: Usar unidade_id (tenant/controle de acesso)
    let viaturaQuery = 'SELECT * FROM viaturas WHERE id = $1';
    let viaturaParams = [viatura_id];
    
    if (req.unidade && req.unidade.id) {
      viaturaQuery += ' AND unidade_id = $2';
      viaturaParams.push(req.unidade.id);
    }
    console.log('🔎 Buscando viatura:', { viaturaQuery, viaturaParams });
    const viaturaResult = await query(viaturaQuery, viaturaParams);
    
    if (viaturaResult.rows.length === 0) {
      const errorMessage = req.unidade && req.unidade.id 
        ? 'Viatura não encontrada ou você não tem acesso a ela nesta unidade'
        : 'Viatura não encontrada';
      return res.status(404).json({ error: errorMessage });
    }

    // Calcular situação baseada nos itens
    const temAlteracao = itens.some(item => item.status === 'com_alteracao');
    const situacao = temAlteracao ? 'Com Alteração' : 'Sem Alteração';
    console.log('🧮 Situação calculada:', { temAlteracao, situacao });

    // Criar o checklist
    const viatura = viaturaResult.rows[0];
    console.log('🧾 Preparando INSERT checklist_viaturas com valores:', {
      viatura_id,
      template_id: template_id || null,
      usuario_id,
      unidade_id: viatura.unidade_id,
      km_inicial,
      combustivel_percentual,
      ala_servico,
      tipo_checklist,
      data_hora,
      observacoes_gerais,
      situacao
    });
    const checklistResult = await query(`
      INSERT INTO checklist_viaturas (
        viatura_id, template_id, usuario_id, unidade_id, km_inicial, combustivel_percentual, ala_servico, tipo_checklist, data_hora, observacoes_gerais, situacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [viatura_id, template_id || null, usuario_id, viatura.unidade_id, km_inicial, combustivel_percentual, ala_servico, tipo_checklist, data_hora, observacoes_gerais, situacao]);

    const checklist_id = checklistResult.rows[0].id;

    // Inserir os itens do checklist
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      await query(`
        INSERT INTO checklist_itens (
          checklist_id, nome_item, categoria, status, observacoes, fotos, ordem
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        checklist_id,
        item.nome_item,
        item.categoria || null,
        item.status,
        item.observacoes || null,
        JSON.stringify(item.fotos || []),
        item.ordem || i
      ]);
    }

    // Notificar SOP (Administrativo/Chefe/Auxiliar) se houver alteração
    if (temAlteracao) {
      const userIds = await getSOPNotificationUsers(viatura.unidade_id);
      if (userIds.length > 0) {
        const titulo = 'Checklist com Alteração';
        const mensagem = `Checklist da viatura ${viatura.prefixo} (${viatura.marca} ${viatura.modelo}) possui itens com alteração.`;
        await createChecklistAlteracaoNotifications(userIds, checklist_id, titulo, mensagem);
      }
    }

    res.status(201).json({
      message: 'Checklist criado com sucesso',
      checklist: checklistResult.rows[0]
    });
  } catch (error) {
    console.error('=== ERRO AO CRIAR CHECKLIST ===');
    console.error('Erro:', error.message);
    if (error.detail) console.error('Detalhe:', error.detail);
    if (error.constraint) console.error('Constraint:', error.constraint);
    console.error('Stack trace:', error.stack);
    console.error('Dados recebidos completos:', JSON.stringify({
      viatura_id,
      template_id,
      km_inicial,
      combustivel_percentual,
      ala_servico,
      tipo_checklist,
      data_hora,
      observacoes_gerais,
      itens
    }, null, 2));
    console.error('=== FIM DO ERRO ===');
    // Tratar violação de CHECK (PostgreSQL code 23514) com mensagem mais precisa
    if (error.code === '23514') {
      // Tentar identificar constraint para mensagem apropriada
      const msg = (error.constraint || '').includes('combustivel')
        ? 'Percentual de combustível inválido. Deve estar entre 0 e 100.'
        : (error.constraint || '').includes('situacao')
          ? 'Situação inválida. Permitidos: "Sem Alteração" ou "Com Alteração".'
          : (error.constraint || '').includes('ala_servico')
            ? 'Ala de serviço inválida. Permitidos: Alpha, Bravo, Charlie, Delta, ADM.'
            : (error.table === 'checklist_itens')
              ? 'Status do item inválido. Permitidos: ok ou com_alteracao.'
              : 'Dados inválidos (violação de regra). Verifique os campos informados.';
      const details = {
        constraint: error.constraint,
        detail: error.detail,
        received: {
          ala_servico,
          combustivel_percentual,
          situacao
        }
      };
      return res.status(400).json({ error: msg, details: JSON.stringify(details) });
    }
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atualizar checklist
router.put('/viaturas/:id', [
  body('km_inicial').optional().isInt({ min: 0 }).withMessage('KM inicial deve ser um número positivo'),
  body('combustivel_percentual').optional().isInt({ min: 0, max: 100 }).withMessage('Percentual de combustível deve estar entre 0 e 100'),
  body('observacoes_gerais').optional(),
  body('status').optional().isIn(['em_andamento', 'finalizado']).withMessage('Status inválido'),
  body('itens').optional().isArray().withMessage('Itens devem ser um array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      km_inicial,
      combustivel_percentual,
      observacoes_gerais,
      status,
      itens
    } = req.body;

    // Verificar se o checklist existe
    const checklistResult = await query('SELECT * FROM checklist_viaturas WHERE id = $1', [id]);
    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    // Atualizar o checklist
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (km_inicial !== undefined) {
      paramCount++;
      updateFields.push(`km_inicial = $${paramCount}`);
      updateValues.push(km_inicial);
    }

    if (combustivel_percentual !== undefined) {
      paramCount++;
      updateFields.push(`combustivel_percentual = $${paramCount}`);
      updateValues.push(combustivel_percentual);
    }

    if (observacoes_gerais !== undefined) {
      paramCount++;
      updateFields.push(`observacoes_gerais = $${paramCount}`);
      updateValues.push(observacoes_gerais);
    }

    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
      
      if (status === 'finalizado') {
        paramCount++;
        updateFields.push(`finalizado_em = $${paramCount}`);
        updateValues.push(new Date());
      }
    }

    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date());

    updateValues.push(id);

    const updateQuery = `
      UPDATE checklist_viaturas 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;

    const updatedChecklistResult = await query(updateQuery, updateValues);
    
    // Atualizar itens se fornecidos
    let temAlteracaoRecalc = false;
    if (itens && itens.length > 0) {
      // Remover itens existentes
      await query('DELETE FROM checklist_itens WHERE checklist_id = $1', [id]);

      // Inserir novos itens
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        await query(`
          INSERT INTO checklist_itens (
            checklist_id, nome_item, categoria, status, observacoes, fotos, ordem
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          id,
          item.nome_item,
          item.categoria || null,
          item.status,
          item.observacoes || null,
          JSON.stringify(item.fotos || []),
          item.ordem || i
        ]);
      }

      // Recalcular situação baseada nos novos itens
      temAlteracaoRecalc = itens.some(item => item.status === 'com_alteracao');
      const situacao = temAlteracaoRecalc ? 'Com Alteração' : 'Sem Alteração';

      // Atualizar a situação do checklist
      await query(`
        UPDATE checklist_viaturas SET situacao = $1 WHERE id = $2
      `, [situacao, id]);
    }

    // Criar notificação se o checklist estiver com alteração (itens recalculados ou já estava) e, opcionalmente, quando finalizado
    const updatedChecklist = updatedChecklistResult.rows[0];
    const shouldNotify = temAlteracaoRecalc || updatedChecklist.situacao === 'Com Alteração';
    if (shouldNotify) {
      const unidadeId = updatedChecklist.unidade_id;
      const userIds = await getSOPNotificationUsers(unidadeId);
      if (userIds.length > 0) {
        // Buscar dados da viatura para mensagem mais clara
        const vRes = await query('SELECT prefixo, marca, modelo FROM viaturas WHERE id = $1', [updatedChecklist.viatura_id]);
        const v = vRes.rows[0] || { prefixo: updatedChecklist.viatura_id, marca: '', modelo: '' };
        const titulo = 'Checklist com Alteração';
        const mensagem = `Checklist da viatura ${v.prefixo} (${v.marca} ${v.modelo}) possui itens com alteração.`;
        await createChecklistAlteracaoNotifications(userIds, updatedChecklist.id, titulo, mensagem);
      }
    }

    res.json({
      message: 'Checklist atualizado com sucesso',
      checklist: updatedChecklistResult.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cancelar checklist (Administrador, Chefe, Comandante)
router.put('/viaturas/:id/cancelar', authorizeRoles('Administrador', 'Chefe', 'Comandante'), [
  body('motivo').trim().isLength({ min: 3, max: 1000 }).withMessage('Motivo do cancelamento é obrigatório (mín. 3 caracteres)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar se o checklist existe
    const checklistResult = await query('SELECT id, status FROM checklist_viaturas WHERE id = $1', [id]);
    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    const checklist = checklistResult.rows[0];
    if (checklist.status === 'cancelado') {
      return res.status(400).json({ error: 'Checklist já está cancelado' });
    }

    // Atualizar para cancelado e persistir motivo
    const updateResult = await query(`
      UPDATE checklist_viaturas
      SET status = 'cancelado', cancelamento_motivo = $2, cancelado_em = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, motivo]);

    res.json({
      message: 'Checklist cancelado com sucesso',
      checklist: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Erro ao cancelar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



// Deletar checklist
router.delete('/viaturas/:id', authorizeRoles('Administrador', 'Chefe'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM checklist_viaturas WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    res.json({ message: 'Checklist deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar usuários para autocomplete
router.get('/usuarios/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const result = await query(`
      SELECT id, nome, email, matricula
      FROM usuarios 
      WHERE (nome ILIKE $1 OR email ILIKE $1 OR matricula ILIKE $1) 
        AND ativo = true
      ORDER BY nome
      LIMIT 10
    `, [`%${q}%`]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;