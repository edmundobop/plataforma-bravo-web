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
      tipo, prefixo, modelo, marca, ano, placa, chassi, renavam,
      km_atual, status, setor_responsavel, observacoes, unidade_bm, foto
    } = req.body;

    const result = await query(
      `INSERT INTO viaturas (tipo, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual, status, setor_responsavel, observacoes, unidade_bm, foto)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [tipo, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual || 0, status || 'disponivel', setor_responsavel, observacoes, unidade_bm, foto]
    );

    // Criar notificação
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'Nova Viatura Cadastrada',
        `Viatura ${prefixo} - ${marca} ${modelo} foi cadastrada no sistema.`,
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
      tipo, prefixo, modelo, marca, ano, placa, chassi, renavam,
      km_atual, status, setor_responsavel, observacoes, unidade_bm, foto
    } = req.body;

    // Verificar se a viatura existe
    const existingViatura = await query('SELECT * FROM viaturas WHERE id = $1', [id]);
    if (existingViatura.rows.length === 0) {
      return res.status(404).json({ error: 'Viatura não encontrada' });
    }

    const result = await query(
      `UPDATE viaturas SET 
       tipo = $1, prefixo = $2, modelo = $3, marca = $4, ano = $5, 
       placa = $6, chassi = $7, renavam = $8, km_atual = $9, status = $10, 
       setor_responsavel = $11, observacoes = $12, unidade_bm = $13, foto = $14, updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING *`,
      [tipo, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual || 0, status || 'disponivel', setor_responsavel, observacoes, unidade_bm, foto, id]
    );

    // Criar notificação
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'Viatura Atualizada',
        `Viatura ${prefixo} - ${marca} ${modelo} foi atualizada no sistema.`,
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
      SELECT c.*, v.prefixo as viatura_prefixo, v.tipo as viatura_tipo, u.nome as usuario_nome
      FROM checklists_viatura c
      JOIN viaturas v ON c.viatura_id = v.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
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
      ORDER BY c.data_checklist DESC, c.id DESC
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

// Gerar checklists diários para todas as viaturas elegíveis
router.post('/checklists/gerar-diarios', async (req, res) => {
  try {
    const { data_checklist } = req.body;
    const dataChecklist = data_checklist || new Date().toISOString().split('T')[0];

    // Buscar viaturas elegíveis (ABT, ABTF, UR, ASA)
    const viaturasResult = await query(
      `SELECT id, prefixo, tipo FROM viaturas 
       WHERE tipo IN ('ABT', 'ABTF', 'UR', 'ASA') AND status = 'disponivel'
       ORDER BY prefixo`
    );

    const checklistsGerados = [];

    for (const viatura of viaturasResult.rows) {
      // Verificar se já existe checklist para esta viatura na data
      const existeChecklist = await query(
        `SELECT id FROM checklists_viatura 
         WHERE viatura_id = $1 AND data_checklist = $2 AND tipo = 'diario'`,
        [viatura.id, dataChecklist]
      );

      if (existeChecklist.rows.length === 0) {
        // Criar checklist diário
        const checklistResult = await query(
          `INSERT INTO checklists_viatura 
           (viatura_id, tipo, data_checklist, status)
           VALUES ($1, 'diario', $2, 'pendente')
           RETURNING *`,
          [viatura.id, dataChecklist]
        );

        checklistsGerados.push({
          ...checklistResult.rows[0],
          viatura_prefixo: viatura.prefixo,
          viatura_tipo: viatura.tipo
        });
      }
    }

    res.json({
      message: `${checklistsGerados.length} checklists diários gerados com sucesso`,
      checklists: checklistsGerados
    });
  } catch (error) {
    console.error('Erro ao gerar checklists diários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar checklists pendentes do dia
router.get('/checklists/pendentes', async (req, res) => {
  try {
    const { data_checklist } = req.query;
    const dataChecklist = data_checklist || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT c.*, v.prefixo as viatura_prefixo, v.tipo as viatura_tipo
       FROM checklists_viatura c
       JOIN viaturas v ON c.viatura_id = v.id
       WHERE c.tipo = 'diario' AND c.data_checklist = $1 AND c.status = 'pendente'
       ORDER BY v.prefixo`,
      [dataChecklist]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar checklists pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar checklist por ID
router.get('/checklists/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, v.prefixo as viatura_prefixo, v.tipo as viatura_tipo
       FROM checklists_viatura c
       JOIN viaturas v ON c.viatura_id = v.id
       WHERE c.id = $1`,
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    const checklist = result.rows[0];
    
    // Parse JSON fields
    if (checklist.checklist_motorista) {
      checklist.checklist_motorista = JSON.parse(checklist.checklist_motorista);
    }
    if (checklist.checklist_combatente) {
      checklist.checklist_combatente = JSON.parse(checklist.checklist_combatente);
    }
    if (checklist.fotos) {
      checklist.fotos = JSON.parse(checklist.fotos);
    }

    res.json(checklist);
  } catch (error) {
    console.error('Erro ao buscar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



// Atualizar checklist
router.put('/checklists/:id', [
  body('checklist_motorista').optional().isObject().withMessage('Checklist do motorista deve ser um objeto'),
  body('checklist_combatente').optional().isObject().withMessage('Checklist do combatente deve ser um objeto')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { id } = req.params;
    const {
      checklist_motorista,
      checklist_combatente,
      observacoes_gerais,
      fotos,
      km_inicial,
      km_final,
      combustivel_inicial,
      combustivel_final
    } = req.body;

    const result = await query(
      `UPDATE checklists_viatura 
       SET checklist_motorista = $1, checklist_combatente = $2, observacoes_gerais = $3, 
           fotos = $4, km_inicial = $5, km_final = $6, combustivel_inicial = $7, 
           combustivel_final = $8, usuario_id = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        checklist_motorista ? JSON.stringify(checklist_motorista) : null,
        checklist_combatente ? JSON.stringify(checklist_combatente) : null,
        observacoes_gerais,
        fotos ? JSON.stringify(fotos) : null,
        km_inicial,
        km_final,
        combustivel_inicial,
        combustivel_final,
        req.user.id,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    res.json({
      message: 'Checklist atualizado com sucesso',
      checklist: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Finalizar checklist com assinatura
router.post('/checklists/:id/finalizar', [
  body('nome_completo').notEmpty().withMessage('Nome completo é obrigatório'),
  body('senha').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nome_completo, senha } = req.body;

    // Verificar se o usuário existe e a senha está correta
    const userCheck = await query(
      'SELECT id, nome, senha FROM usuarios WHERE nome = $1 AND ativo = true',
      [nome_completo]
    );

    if (userCheck.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    const user = userCheck.rows[0];
    
    // Verificar senha (assumindo que está em texto plano por simplicidade)
    // Em produção, use bcrypt para comparar hashes
    if (user.senha !== senha) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const result = await query(
      `UPDATE checklists_viatura 
       SET status = 'concluido', usuario_assinatura = $1, 
           data_finalizacao = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [nome_completo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    // Criar notificação (opcional)
    try {
      if (req.user && req.user.id) {
        await query(
          `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
            'Checklist Finalizado',
            `Checklist diário finalizado com sucesso.`,
            'success',
            'frota',
            id
          ]
        );
      }
    } catch (notificationError) {
      console.error('Erro ao criar notificação:', notificationError);
      // Não falha a operação principal se a notificação falhar
    }

    res.json({
      message: 'Checklist finalizado com sucesso',
      checklist: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao finalizar checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar checklist (manter compatibilidade)
router.post('/checklists', [
  body('viatura_id').isInt().withMessage('ID da viatura é obrigatório'),
  body('tipo').isIn(['diario', 'saida', 'retorno']).withMessage('Tipo deve ser diario, saida ou retorno')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      viatura_id, tipo, data_checklist, km_inicial, km_final,
      combustivel_inicial, combustivel_final,
      checklist_motorista, checklist_combatente, observacoes_gerais,
      template_id
    } = req.body;

    const dataFinal = data_checklist || new Date().toISOString().split('T')[0];

    const result = await query(
      `INSERT INTO checklists_viatura 
       (viatura_id, usuario_id, tipo, data_checklist, km_inicial, km_final, 
        combustivel_inicial, combustivel_final, checklist_motorista, 
        checklist_combatente, observacoes_gerais, template_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        viatura_id, req.user.id, tipo, dataFinal, km_inicial, km_final,
        combustivel_inicial, combustivel_final,
        checklist_motorista ? JSON.stringify(checklist_motorista) : null,
        checklist_combatente ? JSON.stringify(checklist_combatente) : null,
        observacoes_gerais,
        template_id || null
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

// TEMPLATES DE CHECKLIST

// Listar todos os templates
router.get('/checklist-templates', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM checklist_templates 
       ORDER BY nome ASC`
    );

    // Parse JSON fields
    const templates = result.rows.map(template => ({
      ...template,
      configuracao: template.configuracao && typeof template.configuracao === 'string' ? JSON.parse(template.configuracao) : template.configuracao
    }));

    res.json(templates);
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar template por ID
router.get('/checklist-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM checklist_templates WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    const template = result.rows[0];
    if (template.configuracao && typeof template.configuracao === 'string') {
      template.configuracao = JSON.parse(template.configuracao);
    }

    res.json(template);
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar template por tipo de viatura
router.get('/checklist-templates/tipo/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;

    const result = await query(
      `SELECT * FROM checklist_templates 
       WHERE tipo_viatura = $1 AND ativo = true 
       ORDER BY padrao DESC, nome ASC 
       LIMIT 1`,
      [tipo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado para este tipo de viatura' });
    }

    const template = result.rows[0];
    if (template.configuracao && typeof template.configuracao === 'string') {
      template.configuracao = JSON.parse(template.configuracao);
    }

    res.json({ template });
  } catch (error) {
    console.error('Erro ao buscar template por tipo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar templates por viatura específica
router.get('/checklist-templates/viatura/:viaturaId', async (req, res) => {
  try {
    const { viaturaId } = req.params;

    // Primeiro busca a viatura para obter o tipo
    const viaturaResult = await query(
      'SELECT tipo FROM viaturas WHERE id = $1',
      [parseInt(viaturaId)]
    );

    if (viaturaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Viatura não encontrada' });
    }

    const tipoViatura = viaturaResult.rows[0].tipo;

    // Busca templates para este tipo de viatura
    const result = await query(
      `SELECT * FROM checklist_templates 
       WHERE tipo_viatura = $1 AND ativo = true 
       ORDER BY padrao DESC, created_at DESC`,
      [tipoViatura]
    );

    const templates = result.rows.map(template => ({
      ...template,
      configuracao: template.configuracao && typeof template.configuracao === 'string' ? JSON.parse(template.configuracao) : template.configuracao
    }));

    res.json({ templates, tipoViatura });
  } catch (error) {
    console.error('Erro ao buscar templates por viatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo template
router.post('/checklist-templates', authorizeRoles('admin', 'gestor'), [
  body('nome').notEmpty().withMessage('Nome do template é obrigatório'),
  body('tipo_viatura').isIn(['ABT', 'ABTF', 'UR', 'AV', 'ASA', 'MOB']).withMessage('Tipo de viatura inválido'),
  body('configuracao').isObject().withMessage('Configuração deve ser um objeto')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nome,
      descricao,
      tipo_viatura,
      configuracao,
      padrao = false
    } = req.body;

    // Se for definido como padrão, remover padrão dos outros templates do mesmo tipo
    if (padrao) {
      await query(
        'UPDATE checklist_templates SET padrao = false WHERE tipo_viatura = $1',
        [tipo_viatura]
      );
    }

    const result = await query(
      `INSERT INTO checklist_templates 
       (nome, descricao, tipo_viatura, configuracao, padrao, ativo, usuario_criacao_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        nome,
        descricao,
        tipo_viatura,
        typeof configuracao === 'string' ? configuracao : JSON.stringify(configuracao),
        padrao,
        true, // ativo = true por padrão
        req.user.id
      ]
    );

    const template = result.rows[0];
    // Se configuracao já é um objeto (JSONB), não precisa fazer parse
    if (typeof template.configuracao === 'string') {
      template.configuracao = JSON.parse(template.configuracao);
    }

    res.status(201).json({
      message: 'Template criado com sucesso',
      template
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe um template com este nome' });
    }
    console.error('Erro ao criar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar template
router.put('/checklist-templates/:id', authorizeRoles('admin', 'gestor'), [
  body('nome').notEmpty().withMessage('Nome do template é obrigatório'),
  body('tipo_viatura').isIn(['ABT', 'ABTF', 'UR', 'AV', 'ASA', 'MOB']).withMessage('Tipo de viatura inválido'),
  body('configuracao').isObject().withMessage('Configuração deve ser um objeto')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      nome,
      descricao,
      tipo_viatura,
      configuracao,
      padrao = false
    } = req.body;

    // Se for definido como padrão, remover padrão dos outros templates do mesmo tipo
    if (padrao) {
      await query(
        'UPDATE checklist_templates SET padrao = false WHERE tipo_viatura = $1 AND id != $2',
        [tipo_viatura, id]
      );
    }

    const result = await query(
      `UPDATE checklist_templates 
       SET nome = $1, descricao = $2, tipo_viatura = $3, configuracao = $4, 
           padrao = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        nome,
        descricao,
        tipo_viatura,
        typeof configuracao === 'string' ? configuracao : JSON.stringify(configuracao),
        padrao,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    const template = result.rows[0];
    if (typeof template.configuracao === 'string') {
      template.configuracao = JSON.parse(template.configuracao);
    }

    res.json({
      message: 'Template atualizado com sucesso',
      template
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe um template com este nome' });
    }
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir template
router.delete('/checklist-templates/:id', authorizeRoles('admin', 'gestor'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM checklist_templates WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    res.json({
      message: 'Template excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Duplicar template
router.post('/checklist-templates/:id/duplicate', authorizeRoles('admin', 'gestor'), [
  body('nome').notEmpty().withMessage('Nome do novo template é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nome } = req.body;

    // Buscar template original
    const originalResult = await query(
      'SELECT * FROM checklist_templates WHERE id = $1',
      [parseInt(id)]
    );

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template original não encontrado' });
    }

    const original = originalResult.rows[0];

    // Criar cópia
    const result = await query(
      `INSERT INTO checklist_templates 
       (nome, descricao, tipo_viatura, configuracao, padrao, usuario_criacao_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        nome,
        `Cópia de ${original.descricao || original.nome}`,
        original.tipo_viatura,
        original.configuracao,
        false, // Cópia nunca é padrão
        req.user.id
      ]
    );

    const template = result.rows[0];
    if (typeof template.configuracao === 'string') {
      template.configuracao = JSON.parse(template.configuracao);
    }

    res.status(201).json({
      message: 'Template duplicado com sucesso',
      template
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe um template com este nome' });
    }
    console.error('Erro ao duplicar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Definir template como padrão
router.post('/checklist-templates/:id/set-default', authorizeRoles('admin', 'gestor'), [
  body('tipo_viatura').isIn(['ABT', 'ABTF', 'UR', 'AV', 'ASA', 'MOB']).withMessage('Tipo de viatura inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { tipo_viatura } = req.body;

    // Remover padrão dos outros templates do mesmo tipo
    await query(
      'UPDATE checklist_templates SET padrao = false WHERE tipo_viatura = $1',
      [tipo_viatura]
    );

    // Definir este como padrão
    const result = await query(
      `UPDATE checklist_templates 
       SET padrao = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tipo_viatura = $2
       RETURNING *`,
      [parseInt(id), tipo_viatura]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado ou tipo de viatura incompatível' });
    }

    res.json({
      message: 'Template definido como padrão com sucesso'
    });
  } catch (error) {
    console.error('Erro ao definir template padrão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir checklist por ID
router.delete('/checklists/:id', authorizeRoles('admin', 'gestor', 'operador'), async (req, res) => {  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM checklists_viatura WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist não encontrado' });
    }

    res.json({
      message: 'Checklist excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir checklist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir todos os checklists
router.delete('/checklists', authorizeRoles('admin', 'gestor'), async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM checklists_viatura RETURNING COUNT(*) as total'
    );

    res.json({
      message: 'Todos os checklists foram excluídos com sucesso',
      total_excluidos: result.rows[0]?.total || 0
    });
  } catch (error) {
    console.error('Erro ao excluir todos os checklists:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;