const express = require('express');
const { body, validationResult, query: expressQuery } = require('express-validator');
const { query, pool, transaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkTenantAccess, optionalTenant } = require('../middleware/tenant');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Aplicar verificação de tenant em rotas que precisam de filtro por unidade
router.use(['/viaturas', '/manutencoes'], optionalTenant);

// VIATURAS

// Listar viaturas
router.get('/viaturas', async (req, res) => {
  let queryText = '';
  let params = [];
  
  try {
    const { status, setor, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const unidadeId = req.unidade?.id;

    queryText = `
      SELECT v.*, 
             COUNT(m.id) as total_manutencoes,
             MAX(m.data_manutencao) as ultima_manutencao
      FROM viaturas v
      LEFT JOIN manutencoes m ON v.id = m.viatura_id
      WHERE 1=1
    `;
    params = [];
    let paramCount = 0;

    // Filtro de unidade (tenant)
    if (unidadeId) {
      paramCount++;
      queryText += ` AND v.unidade_id = $${paramCount}`;
      params.push(unidadeId);
    }

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

    // Aplicar mesmo filtro de unidade na contagem
    if (unidadeId) {
      countParamCount++;
      countQuery += ` AND unidade_id = $${countParamCount}`;
      countParams.push(parseInt(unidadeId));
    }

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
    console.error('Stack trace:', error.stack);
    console.error('Query text:', queryText);
    console.error('Query params:', params);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      query: queryText
    });
  }
});

// Buscar viatura por ID
router.get('/viaturas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT v.*,
              COUNT(m.id) as total_manutencoes
       FROM viaturas v
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
router.post('/viaturas', authorizeRoles('Administrador', 'Chefe'), [
  body('tipo').isIn(['ABTF', 'ABT', 'UR', 'ASA', 'MOB', 'AV']).withMessage('Tipo de viatura inválido'),
  body('prefixo').notEmpty().withMessage('Prefixo é obrigatório'),
  body('modelo').notEmpty().withMessage('Modelo é obrigatório'),
  body('marca').notEmpty().withMessage('Marca é obrigatória'),
  body('placa').notEmpty().withMessage('Placa é obrigatória'),
  body('ano').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Ano inválido'),
  body('unidade_id').optional().isInt().withMessage('Unidade ID deve ser um número inteiro'),
  body('status').optional().isIn(['Ativo', 'Inativo', 'Manutenção']).withMessage('Status deve ser: Ativo, Inativo ou Manutenção')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      tipo, prefixo, modelo, marca, ano, placa, chassi, renavam,
      km_atual, status, setor_responsavel, observacoes, unidade_id, foto
    } = req.body;

    // IMPORTANTE: unidade_id é a chave estrangeira que referencia a tabela unidades
    // Este campo determina a qual unidade a viatura pertence

    // Usar transação para verificar duplicidade antes de criar
    const result = await transaction(async (client) => {
      // Verificar se prefixo ou placa já existem
      const duplicateCheck = await client.query(
        'SELECT id, prefixo, placa FROM viaturas WHERE prefixo = $1 OR placa = $2',
        [prefixo, placa]
      );
      
      if (duplicateCheck.rows.length > 0) {
        const duplicate = duplicateCheck.rows[0];
        if (duplicate.prefixo === prefixo) {
          throw new Error('DUPLICATE_PREFIXO');
        }
        if (duplicate.placa === placa) {
          throw new Error('DUPLICATE_PLACA');
        }
      }

      // Criar a viatura
      const insertResult = await client.query(
        `INSERT INTO viaturas (tipo, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual, status, setor_responsavel, observacoes, unidade_id, foto)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [tipo, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual || 0, status || 'Ativo', setor_responsavel, observacoes, unidade_id || null, foto]
      );

      return insertResult;
    });

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
    if (error.message === 'DUPLICATE_PREFIXO') {
      return res.status(400).json({ error: 'Prefixo já cadastrado em outra viatura' });
    }
    if (error.message === 'DUPLICATE_PLACA') {
      return res.status(400).json({ error: 'Placa já cadastrada em outra viatura' });
    }
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Prefixo ou placa já cadastrados' });
    }
    console.error('Erro ao criar viatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar viatura
router.put('/viaturas/:id', authorizeRoles('Administrador', 'Chefe'), [
  body('tipo').isIn(['ABTF', 'ABT', 'UR', 'ASA', 'MOB', 'AV']).withMessage('Tipo de viatura inválido'),
  body('prefixo').notEmpty().withMessage('Prefixo é obrigatório'),
  body('modelo').notEmpty().withMessage('Modelo é obrigatório'),
  body('marca').notEmpty().withMessage('Marca é obrigatória'),
  body('placa').notEmpty().withMessage('Placa é obrigatória'),
  body('ano').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Ano inválido'),
  body('unidade_id').optional().isInt().withMessage('Unidade ID deve ser um número inteiro'),
  body('status').optional().isIn(['Ativo', 'Inativo', 'Manutenção']).withMessage('Status deve ser: Ativo, Inativo ou Manutenção')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      tipo, prefixo, modelo, marca, ano, placa, chassi, renavam,
      km_atual, status, setor_responsavel, observacoes, unidade_id, foto
    } = req.body;

    // Usar transação para garantir atomicidade
    const result = await transaction(async (client) => {
      // Verificar se a viatura existe
      const existingViatura = await client.query('SELECT * FROM viaturas WHERE id = $1', [id]);
      if (existingViatura.rows.length === 0) {
        throw new Error('VIATURA_NOT_FOUND');
      }
    
      console.log('DEBUG - Verificando duplicatas para:', { prefixo, placa, id });
      
      // Verificar se prefixo ou placa já existem em outras viaturas (excluindo a atual)
      const duplicateCheck = await client.query(
        'SELECT id, prefixo, placa FROM viaturas WHERE (prefixo = $1 OR placa = $2) AND id <> $3',
        [prefixo, placa, id]
      );
      
      console.log('DEBUG - Duplicatas encontradas:', duplicateCheck.rows);
      
      if (duplicateCheck.rows.length > 0) {
        console.log('DEBUG - Lançando erro DUPLICATE_DATA');
        throw new Error('DUPLICATE_DATA');
      }
    
      console.log('DEBUG - Prosseguindo com UPDATE');
      // Atualizar a viatura
      const updateResult = await client.query(
        `UPDATE viaturas SET 
         tipo = $1, prefixo = $2, modelo = $3, marca = $4, ano = $5, 
         placa = $6, chassi = $7, renavam = $8, km_atual = $9, status = $10, 
         setor_responsavel = $11, observacoes = $12, unidade_id = $13, foto = $14, updated_at = CURRENT_TIMESTAMP
         WHERE id = $15
         RETURNING *`,
        [tipo, prefixo, modelo, marca, ano, placa, chassi, renavam, km_atual, status, setor_responsavel, observacoes, unidade_id || null, foto, id]
      );

      return updateResult;
    });

    res.json({
      message: 'Viatura atualizada com sucesso',
      viatura: result.rows[0]
    });
  } catch (error) {
    if (error.message === 'VIATURA_NOT_FOUND') {
      return res.status(404).json({ error: 'Viatura não encontrada' });
    }
    if (error.message === 'DUPLICATE_DATA') {
      return res.status(400).json({ error: 'Prefixo ou placa já cadastrados em outra viatura' });
    }
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Prefixo ou placa já cadastrados' });
    }
    console.error('Erro ao atualizar viatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir viatura
router.delete('/viaturas/:id', authorizeRoles('Administrador', 'Chefe'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM viaturas WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Viatura não encontrada' });
    }

    res.json({
      message: 'Viatura excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir viatura:', error);
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
  body('data_manutencao').isISO8601().withMessage('Data de manutenção inválida'),
  body('data_proxima_manutencao').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Data da próxima manutenção inválida'),
  body('valor').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valor deve ser um número positivo')
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

    // Tratar valores vazios como null
    const valorFormatado = valor && valor !== '' ? parseFloat(valor) : null;
    const dataProximaManutencao = data_proxima_manutencao && data_proxima_manutencao !== '' ? data_proxima_manutencao : null;
    const kmManutencao = km_manutencao && km_manutencao !== '' ? parseInt(km_manutencao) : null;
    const oficinaFormatada = oficina && oficina !== '' ? oficina : null;

    const result = await query(
      `INSERT INTO manutencoes 
       (viatura_id, usuario_id, tipo, descricao, km_manutencao, data_manutencao, 
        data_proxima_manutencao, valor, oficina, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        viatura_id, req.user.id, tipo, descricao, kmManutencao,
        data_manutencao, dataProximaManutencao, valorFormatado, oficinaFormatada, status
      ]
    );

    // Criar notificação
    await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'Nova Manutenção Agendada',
        `Manutenção ${tipo} agendada para ${data_manutencao}.`,
        'info',
        'frota',
        result.rows[0].id
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

// Atualizar manutenção
router.put('/manutencoes/:id', [
  body('tipo').notEmpty().withMessage('Tipo de manutenção é obrigatório'),
  body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
  body('data_manutencao').isISO8601().withMessage('Data de manutenção inválida'),
  body('data_proxima_manutencao').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Data da próxima manutenção inválida'),
  body('valor').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valor deve ser um número positivo')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      tipo, descricao, km_manutencao,
      data_manutencao, data_proxima_manutencao,
      valor, oficina, status
    } = req.body;

    // Tratar valores vazios como null
    const valorFormatado = valor && valor !== '' ? parseFloat(valor) : null;
    const dataProximaManutencao = data_proxima_manutencao && data_proxima_manutencao !== '' ? data_proxima_manutencao : null;
    const kmManutencao = km_manutencao && km_manutencao !== '' ? parseInt(km_manutencao) : null;
    const oficinaFormatada = oficina && oficina !== '' ? oficina : null;

    const result = await query(
      `UPDATE manutencoes SET 
       tipo = $1, descricao = $2, km_manutencao = $3, data_manutencao = $4, 
       data_proxima_manutencao = $5, valor = $6, oficina = $7, status = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [tipo, descricao, kmManutencao, data_manutencao, dataProximaManutencao, valorFormatado, oficinaFormatada, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    res.json({
      message: 'Manutenção atualizada com sucesso',
      manutencao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir manutenção
router.delete('/manutencoes/:id', authorizeRoles('Administrador', 'Chefe'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM manutencoes WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    res.json({
      message: 'Manutenção excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;