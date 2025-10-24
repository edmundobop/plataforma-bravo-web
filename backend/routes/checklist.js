/**
 * IMPORTANTE - ESTRUTURA DE UNIDADES:
 * 
 * unidade_id (INTEGER): Usado para controle tenant/acesso - define qual unidade o usuário pode acessar
 * 
 * SEMPRE usar unidade_id para filtros de segurança e controle de acesso!
 */

const express = require('express');
const { body, validationResult, query: expressQuery } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');
const bcrypt = require('bcryptjs');

const router = express.Router();

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

// Listar checklists de viaturas com filtros
router.get('/viaturas', async (req, res) => {
  try {
    console.log('🔍 GET /checklist/viaturas - req.unidade:', req.unidade);
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Query params:', req.query);
    
    const { page = 1, limit = 10, viatura_id, status } = req.query;
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
router.post('/viaturas', [
  body('viatura_id').isInt().withMessage('ID da viatura é obrigatório'),
  body('template_id').optional().isInt().withMessage('ID do template deve ser um número'),
  body('km_inicial').isInt({ min: 0 }).withMessage('KM inicial deve ser um número positivo'),
  body('combustivel_percentual').isInt({ min: 0, max: 100 }).withMessage('Percentual de combustível deve estar entre 0 e 100'),
  body('ala_servico').isIn(['Alpha', 'Bravo', 'Charlie', 'Delta', 'ADM']).withMessage('Ala de serviço deve ser Alpha, Bravo, Charlie, Delta ou ADM'),
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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

    const usuario_id = req.user.id;

    // Verificar se a viatura existe e se o usuário tem acesso a ela
    // IMPORTANTE: Usar unidade_id (tenant/controle de acesso)
    let viaturaQuery = 'SELECT * FROM viaturas WHERE id = $1';
    let viaturaParams = [viatura_id];
    
    if (req.unidade && req.unidade.id) {
      viaturaQuery += ' AND unidade_id = $2';
      viaturaParams.push(req.unidade.id);
    }
    
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

    // Criar o checklist
    const viatura = viaturaResult.rows[0];
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

    res.status(201).json({
      message: 'Checklist criado com sucesso',
      checklist: checklistResult.rows[0]
    });
  } catch (error) {
    console.error('=== ERRO AO CRIAR CHECKLIST ===');
    console.error('Erro:', error.message);
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
      const temAlteracao = itens.some(item => item.status === 'com_alteracao');
      const situacao = temAlteracao ? 'Com Alteração' : 'Sem Alteração';

      // Atualizar a situação do checklist
      await query(`
        UPDATE checklist_viaturas SET situacao = $1 WHERE id = $2
      `, [situacao, id]);
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