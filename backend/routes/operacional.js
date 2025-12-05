const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');

const VALID_ALAS = ['Alfa', 'Bravo', 'Charlie', 'Delta'];
const SHIFT_SEQUENCE = [...VALID_ALAS];
const SHIFT_START_TIME = '08:00:00';
const SHIFT_END_TIME = '07:59:00';
const SHIFT_TURNO_LABEL = '24h (08h às 07h59)';
const ESCALA_USUARIO_TURNO = '24h';
const OPERACIONAL_SETOR = 'Operacional';
const ESCALA_USUARIO_FUNCAO = 'Plantão Operacional';

const router = express.Router();

const buildEmptyAlaMap = () => VALID_ALAS.reduce((acc, ala) => {
  acc[ala] = [];
  return acc;
}, {});

const normalizeAlaName = (raw) => {
  if (!raw) return null;
  const normalized = raw.toString().trim().toLowerCase();
  return VALID_ALAS.find((ala) => ala.toLowerCase() === normalized) || null;
};

const normalizeAlaAssignments = (input) => {
  if (!input || typeof input !== 'object') {
    throw new Error('Formato de alas inválido');
  }
  const assignments = buildEmptyAlaMap();
  const seen = new Set();

  Object.entries(input).forEach(([key, value]) => {
    const alaName = normalizeAlaName(key);
    if (!alaName) {
      throw new Error(`Ala desconhecida: ${key}`);
    }
    if (!Array.isArray(value)) {
      throw new Error(`A lista de usuários da ala ${alaName} deve ser um array`);
    }
    assignments[alaName] = value.map((id) => {
      const numericId = Number(id);
      if (!Number.isInteger(numericId)) {
        throw new Error('IDs de usuários devem ser inteiros');
      }
      if (seen.has(numericId)) {
        throw new Error(`Usuário ${numericId} foi atribuído a mais de uma ala`);
      }
      seen.add(numericId);
      return numericId;
    });
  });

  return assignments;
};

const addDaysUtc = (dateStr, days) => {
  const base = new Date(`${dateStr}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const formatTimestamp = (dateStr, timeStr) => `${dateStr} ${timeStr}`;

const extractDateOnly = (value) => {
  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
      return match[0];
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data inválida');
  }
  return parsed.toISOString().slice(0, 10);
};

const rotateSequenceFrom = (startAla) => {
  const index = SHIFT_SEQUENCE.indexOf(startAla);
  if (index === -1) {
    throw new Error('Ala inicial inválida');
  }
  return SHIFT_SEQUENCE.slice(index).concat(SHIFT_SEQUENCE.slice(0, index));
};

const flattenAssignments = (alaMap) => VALID_ALAS.flatMap((ala) => alaMap[ala] || []);

const ensureDistributionConstraints = (alaMap, totalEligible) => {
  const flattened = flattenAssignments(alaMap);
  const uniqueIds = new Set(flattened);
  if (flattened.length !== uniqueIds.size) {
    throw new Error('Existem usuários duplicados na distribuição das alas');
  }

  const minimumByAla = totalEligible >= VALID_ALAS.length * 5 ? 5 : 1;
  VALID_ALAS.forEach((ala) => {
    if ((alaMap[ala] || []).length < minimumByAla) {
      throw new Error(`A ala ${ala} precisa de pelo menos ${minimumByAla} participantes`);
    }
  });
};

const ensureCoverage = (alaMap, eligibleIds) => {
  const assigned = new Set(flattenAssignments(alaMap));
  const missing = eligibleIds.filter((id) => !assigned.has(id));
  if (missing.length > 0) {
    throw new Error('Todos os usuários operacionais precisam ser atribuídos a uma ala');
  }
};

const fetchEligibleOperationalUsers = async (unidadeId = null) => {
  const params = [OPERACIONAL_SETOR];
  let whereClause = 'WHERE u.ativo = true AND u.setor = $1';

  if (unidadeId) {
    params.push(unidadeId);
    whereClause += ` AND COALESCE(u.unidade_lotacao_id, u.unidade_id) = $${params.length}`;
  }

  const result = await query(
    `
      SELECT u.id, u.nome, u.matricula, u.posto_graduacao, u.nome_guerra,
             u.ala, u.setor, u.perfil_id, u.ativo
      FROM usuarios u
      ${whereClause}
      ORDER BY COALESCE(u.ala, 'Z'), u.nome
    `,
    params
  );

  return result.rows;
};

const assignUsersToAlas = async (client, alaMap, eligibleIds) => {
  if (eligibleIds.length === 0) {
    return 0;
  }

  const flattened = flattenAssignments(alaMap);
  if (flattened.length === 0) {
    throw new Error('Nenhum usuário foi associado a uma ala');
  }

  await client.query(
    'UPDATE usuarios SET ala = NULL, updated_at = CURRENT_TIMESTAMP WHERE setor = $1 AND id = ANY($2)',
    [OPERACIONAL_SETOR, eligibleIds]
  );

  for (const ala of VALID_ALAS) {
    const ids = alaMap[ala] || [];
    if (ids.length === 0) continue;
    await client.query(
      'UPDATE usuarios SET ala = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)',
      [ala, ids]
    );
  }

  return flattened.length;
};

const loadCurrentAlaAssignments = async (unidadeId = null) => {
  const rows = await fetchEligibleOperationalUsers(unidadeId);
  const map = buildEmptyAlaMap();
  rows.forEach((user) => {
    if (user.ala && map[user.ala]) {
      map[user.ala].push(user.id);
    }
  });
  return { map, rows };
};

const determineUnidadeId = (req) => req.unidade?.id || req.user?.unidade_lotacao_id || req.user?.unidade_id || null;

const applyTenantFilter = (queryText, params, unidadeId, column = 'unidade_id') => {
  if (!unidadeId) return queryText;
  params.push(unidadeId);
  return `${queryText} AND ${column} = $${params.length}`;
};

const criarNotificacao = async (client, usuarioId, titulo, mensagem, tipo, modulo, referenciaId = null) => {
  await client.query(
    `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [usuarioId, titulo, mensagem, tipo, modulo, referenciaId]
  );
};

const confirmarTrocaComTransacao = async (client, troca, aprovadorId, compensacao) => {
  const escalaRow = await client.query(
    'SELECT * FROM escala_usuarios WHERE id = $1',
    [troca.escala_original_id]
  );

  if (escalaRow.rows.length === 0) {
    throw new Error('Escala do solicitante não encontrada');
  }

  const targetDate = troca.data_servico_troca || escalaRow.rows[0].data_servico;
  await client.query(
    'UPDATE escala_usuarios SET usuario_id = $1, data_servico = $2, troca_id = $3 WHERE id = $4',
    [troca.usuario_substituto_id, targetDate, troca.id, troca.escala_original_id]
  );
  await client.query(
    `UPDATE trocas_servico
     SET status = $1, aprovado_por = $2, data_aprovacao = CURRENT_TIMESTAMP, data_servico_compensacao = $3
     WHERE id = $4`,
    ['aprovada', aprovadorId, compensacao, troca.id]
  );

  const admins = await client.query(`
    SELECT u.id
    FROM usuarios u
    JOIN perfis p ON u.perfil_id = p.id
    WHERE p.nome = 'Administrador'
  `);

  for (const admin of admins.rows) {
    await criarNotificacao(
      client,
      admin.id,
      'Troca confirmada',
      `Troca de serviço #${troca.id} confirmada pelo substituto.`,
      'info',
      'operacional',
      troca.id
    );
  }
};

const rejeitarTrocaComTransacao = async (client, troca, rejeitadoPor) => {
  await client.query(
    'UPDATE trocas_servico SET status = $1, aprovado_por = $2, data_aprovacao = CURRENT_TIMESTAMP WHERE id = $3',
    ['rejeitada', rejeitadoPor, troca.id]
  );
  await client.query(
    'UPDATE escala_usuarios SET troca_id = NULL WHERE id = $1',
    [troca.escala_original_id]
  );

  await criarNotificacao(
    client,
    troca.usuario_solicitante_id,
    'Troca rejeitada',
    'Sua solicitação de troca de serviço foi rejeitada.',
    'warning',
    'operacional',
    troca.id
  );
  await criarNotificacao(
    client,
    troca.usuario_substituto_id,
    'Troca rejeitada',
    'Você rejeitou a solicitação de troca de serviço.',
    'warning',
    'operacional',
    troca.id
  );
};

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);
router.use(optionalTenant);

// ALAS OPERACIONAIS

router.get('/alas/usuarios', async (req, res) => {
  try {
    const unidadeId = determineUnidadeId(req);
    const usuarios = await fetchEligibleOperationalUsers(unidadeId);
    const alas = buildEmptyAlaMap();

    usuarios.forEach((user) => {
      if (user.ala && alas[user.ala]) {
        alas[user.ala].push(user.id);
      }
    });

    res.json({
      total: usuarios.length,
      usuarios,
      alas
    });
  } catch (error) {
    console.error('Erro ao listar usuários operacionais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/alas/usuarios', authorizeRoles('Administrador'), [
  body('alas').notEmpty().withMessage('A distribuição das alas é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let alaMap;
    try {
      alaMap = normalizeAlaAssignments(req.body.alas);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const unidadeId = determineUnidadeId(req);
    const usuarios = await fetchEligibleOperationalUsers(unidadeId);
    if (usuarios.length === 0) {
      return res.status(400).json({ error: 'Não há usuários operacionais cadastrados' });
    }
    const eligibleIds = usuarios.map((user) => user.id);

    try {
      ensureCoverage(alaMap, eligibleIds);
      ensureDistributionConstraints(alaMap, usuarios.length);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    await transaction(async (client) => {
      await assignUsersToAlas(client, alaMap, eligibleIds);
    });

    res.json({
      message: 'Alas atualizadas com sucesso',
      alas: alaMap,
      total: usuarios.length
    });
  } catch (error) {
    console.error('Erro ao atualizar alas operacionais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/alas/escalas', authorizeRoles('Administrador'), [
  body('data_inicio').isISO8601().withMessage('Data de início inválida'),
  body('ala_inicial').notEmpty().withMessage('Ala inicial é obrigatória'),
  body('quantidade_servicos').isInt({ min: 1, max: 120 }).withMessage('Quantidade de serviços deve ser entre 1 e 120'),
  body('alas').optional().custom((value) => {
    try {
      normalizeAlaAssignments(value);
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  }),
  body('nome_base').optional().isLength({ max: 255 }),
  body('observacoes').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { data_inicio, ala_inicial, quantidade_servicos, observacoes, nome_base, alas } = req.body;
    const unidadeId = determineUnidadeId(req);
    if (!unidadeId) {
      return res.status(400).json({ error: 'Selecione uma unidade para gerar as escalas' });
    }
    const usuarios = await fetchEligibleOperationalUsers(unidadeId);
    if (usuarios.length === 0) {
      return res.status(400).json({ error: 'Não há usuários operacionais cadastrados' });
    }

    const eligibleIds = usuarios.map((user) => user.id);
    const alaInicialNormalizada = normalizeAlaName(ala_inicial);
    if (!alaInicialNormalizada) {
      return res.status(400).json({ error: 'Ala inicial inválida' });
    }

    let alaMap;
    if (alas) {
      try {
        alaMap = normalizeAlaAssignments(alas);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    } else {
      const { map } = await loadCurrentAlaAssignments(unidadeId);
      alaMap = map;
    }

    try {
      ensureCoverage(alaMap, eligibleIds);
      ensureDistributionConstraints(alaMap, usuarios.length);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    let baseDate;
    try {
      baseDate = extractDateOnly(data_inicio);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const rotation = rotateSequenceFrom(alaInicialNormalizada);
    const nomeBase = nome_base?.trim() || 'Escala Operacional';
    const resultados = [];

    await transaction(async (client) => {
      if (alas) {
        await assignUsersToAlas(client, alaMap, eligibleIds);
      }

      for (let i = 0; i < Number(quantidade_servicos); i++) {
        const alaAtual = rotation[i % rotation.length];
        const dataServico = addDaysUtc(baseDate, i);
        const dataFim = addDaysUtc(dataServico, 1);
        const escalaNome = `${nomeBase} - ${alaAtual} - ${dataServico.split('-').reverse().join('/')}`;

        const escalaResult = await client.query(
          `INSERT INTO escalas (nome, tipo, data_inicio, data_fim, turno, setor, observacoes, created_by, unidade_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, data_inicio, data_fim`,
          [
            escalaNome,
            'operacional_24x72',
            formatTimestamp(dataServico, SHIFT_START_TIME),
            formatTimestamp(dataFim, SHIFT_END_TIME),
            SHIFT_TURNO_LABEL,
            OPERACIONAL_SETOR,
            observacoes || null,
            req.user.id,
            unidadeId
          ]
        );

        const escalaId = escalaResult.rows[0].id;
        const participantes = alaMap[alaAtual] || [];

        for (const usuarioId of participantes) {
          const conflict = await client.query(
            'SELECT 1 FROM escala_usuarios WHERE usuario_id = $1 AND data_servico = $2',
            [usuarioId, dataServico]
          );

          if (conflict.rows.length > 0) {
            throw new Error(`Usuário ${usuarioId} já possui escala registrada em ${dataServico}`);
          }

          await client.query(
            `INSERT INTO escala_usuarios (escala_id, usuario_id, data_servico, turno, funcao, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [escalaId, usuarioId, dataServico, ESCALA_USUARIO_TURNO, ESCALA_USUARIO_FUNCAO, 'agendado']
          );
        }

        resultados.push({
          escala_id: escalaId,
          ala: alaAtual,
          data_servico: dataServico,
          participantes: participantes.length
        });
      }
    });

    res.status(201).json({
      message: 'Escalas geradas com sucesso',
      total: resultados.length,
      escalas: resultados
    });
  } catch (error) {
    console.error('Erro ao gerar escalas operacionais:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// ESCALAS

// Listar escalas
router.get('/escalas', async (req, res) => {
  try {
    const { tipo, ativa, setor, data_inicio, data_fim, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const unidadeId = determineUnidadeId(req);

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

    queryText = applyTenantFilter(queryText, params, unidadeId, 'e.unidade_id');
    const baseParamCount = params.length;
    queryText += `
      GROUP BY e.id, u.nome
      ORDER BY e.data_inicio DESC
      LIMIT $${baseParamCount + 1} OFFSET $${baseParamCount + 2}
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
    const unidadeId = determineUnidadeId(req);

    let escalaQuery = `
      SELECT e.*, u.nome as criado_por_nome
      FROM escalas e
      LEFT JOIN usuarios u ON e.created_by = u.id
      WHERE e.id = $1
    `;
    const escalaParams = [id];
    if (unidadeId) {
      escalaQuery = applyTenantFilter(escalaQuery, escalaParams, unidadeId, 'e.unidade_id');
    }

    const escalaResult = await query(escalaQuery, escalaParams);

    if (escalaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escala não encontrada' });
    }

    // Buscar usuários da escala
    const usuariosResult = await query(
      `SELECT eu.*, u.nome, u.matricula, u.posto_graduacao,
              t.id as troca_id, t.status as troca_status, t.usuario_substituto_id,
              t.data_servico_original, t.data_servico_troca, t.data_servico_compensacao
       FROM escala_usuarios eu
       JOIN usuarios u ON eu.usuario_id = u.id
       LEFT JOIN trocas_servico t ON eu.troca_id = t.id
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
    const unidadeId = determineUnidadeId(req);
    if (!unidadeId) {
      return res.status(400).json({ error: 'Selecione uma unidade para registrar a escala' });
    }

    const result = await query(
      `INSERT INTO escalas (nome, tipo, data_inicio, data_fim, turno, setor, observacoes, created_by, unidade_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [nome, tipo, data_inicio, data_fim, turno, setor, observacoes, req.user.id, unidadeId]
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
    const unidadeId = determineUnidadeId(req);
    const { usuario_id, data_servico, turno, funcao, observacoes } = req.body;

    // Verificar se a escala existe
    const escalaResult = await query(
      'SELECT id, unidade_id FROM escalas WHERE id = $1',
      [id]
    );

    if (escalaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escala não encontrada' });
    }

    if (unidadeId && escalaResult.rows[0].unidade_id !== unidadeId) {
      return res.status(403).json({ error: 'Escala não pertence à unidade selecionada' });
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
    const unidadeId = determineUnidadeId(req);

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

    queryText = applyTenantFilter(queryText, params, unidadeId, 't.unidade_id');
    const baseParamCount = params.length;
    queryText += `
      ORDER BY t.data_solicitacao DESC
      LIMIT $${baseParamCount + 1} OFFSET $${baseParamCount + 2}
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
  body('data_servico_compensacao').optional().isISO8601().withMessage('Data de pagamento inválida'),
  body('motivo').notEmpty().withMessage('Motivo da troca é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

  const {
    escala_original_id, usuario_substituto_id, data_servico_original,
    data_servico_troca, data_servico_compensacao, motivo
  } = req.body;
  const unidadeId = determineUnidadeId(req);
  if (!unidadeId) {
    return res.status(400).json({ error: 'Selecione uma unidade para registrar a troca' });
  }

  // Verificar se a escala original existe e pertence ao usuário
  const escalaResult = await query(
    `SELECT eu.id, e.unidade_id
     FROM escala_usuarios eu
     JOIN escalas e ON eu.escala_id = e.id
     LEFT JOIN trocas_servico t ON eu.troca_id = t.id AND t.status = 'pendente'
     WHERE eu.id = $1 AND eu.usuario_id = $2 AND t.id IS NULL${unidadeId ? ' AND e.unidade_id = $3' : ''}`,
    unidadeId ? [escala_original_id, req.user.id, unidadeId] : [escala_original_id, req.user.id]
  );

  if (escalaResult.rows.length === 0) {
    return res.status(404).json({ error: 'Escala não encontrada ou não pertence ao usuário' });
  }
 
    const result = await query(
      `INSERT INTO trocas_servico 
       (usuario_solicitante_id, usuario_substituto_id, escala_original_id, data_servico_original, data_servico_troca, motivo, unidade_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, usuario_substituto_id, escala_original_id, data_servico_original, data_servico_troca, motivo, unidadeId]
    );

    if (data_servico_compensacao) {
      await query(
        'UPDATE trocas_servico SET data_servico_compensacao = $1 WHERE id = $2',
        [data_servico_compensacao, result.rows[0].id]
      );
    }
    await query(
      'UPDATE escala_usuarios SET troca_id = $1 WHERE id = $2',
      [result.rows[0].id, escala_original_id]
    );
    await query(
      `INSERT INTO trocas_historico (troca_id, escala_usuario_id, acao, criado_por)
       VALUES ($1, $2, 'solicitado', $3)`,
      [result.rows[0].id, escala_original_id, req.user.id]
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

// Confirmar troca de serviço (usuario substituto ou admin)
router.post('/trocas/:id/confirmar', [
  body('data_servico_compensacao').optional().isISO8601().withMessage('Data de compensação inválida')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { data_servico_compensacao } = req.body;

    const unidadeId = determineUnidadeId(req);
    const trocaResult = await query('SELECT * FROM trocas_servico WHERE id = $1', [id]);
    if (trocaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Troca não encontrada' });
    }

    const troca = trocaResult.rows[0];
    if (unidadeId && troca.unidade_id !== unidadeId) {
      return res.status(403).json({ error: 'Troca não pertence à unidade selecionada' });
    }
    if (troca.status !== 'pendente') {
      return res.status(400).json({ error: 'Troca já foi processada' });
    }
    if (req.user.id !== troca.usuario_substituto_id && req.user.perfil_nome !== 'Administrador') {
      return res.status(403).json({ error: 'Você não pode confirmar esta troca' });
    }

    const compensacao = data_servico_compensacao ||
      troca.data_servico_compensacao ||
      troca.data_servico_original;

    try {
      await transaction(async (client) => {
        await confirmarTrocaComTransacao(client, troca, req.user.id, compensacao);
      });
    } catch (error) {
      if ([
        'Escala do solicitante não encontrada',
        'Escala do substituto não encontrada',
        'Registro do substituto ausente'
      ].includes(error.message)) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }

    res.json({ message: 'Troca confirmada com sucesso' });
  } catch (error) {
    console.error('Erro ao confirmar troca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Responder troca de serviço (substituto)
router.put('/trocas/:id/responder', [
  body('resposta').isIn(['aceitar', 'rejeitar']).withMessage('Resposta inválida'),
  body('data_servico_compensacao').optional().isISO8601().withMessage('Data de compensação inválida'),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { resposta, data_servico_compensacao } = req.body;

    const unidadeId = determineUnidadeId(req);
    const trocaResult = await query('SELECT * FROM trocas_servico WHERE id = $1', [id]);
    if (trocaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Troca não encontrada' });
    }

    const troca = trocaResult.rows[0];
    if (unidadeId && troca.unidade_id !== unidadeId) {
      return res.status(403).json({ error: 'Troca não pertence à unidade selecionada' });
    }
    if (troca.status !== 'pendente') {
      return res.status(400).json({ error: 'Troca já foi processada' });
    }
    if (req.user.id !== troca.usuario_substituto_id) {
      return res.status(403).json({ error: 'Você não pode responder esta troca' });
    }

    if (resposta === 'aceitar') {
      const compensacao = data_servico_compensacao ||
        troca.data_servico_compensacao ||
        troca.data_servico_original;

      await transaction(async (client) => {
        await confirmarTrocaComTransacao(client, troca, req.user.id, compensacao);
      });

      return res.json({ message: 'Troca confirmada com sucesso' });
    }

    await transaction(async (client) => {
      await rejeitarTrocaComTransacao(client, troca, req.user.id);
    });

    res.json({ message: 'Troca rejeitada com sucesso' });
  } catch (error) {
    if (error.message.includes('Escala do solicitante não encontrada')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao responder troca:', error);
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
    const unidadeId = determineUnidadeId(req);
    await transaction(async (client) => {
      // Buscar dados da troca
      let selectQuery = 'SELECT * FROM trocas_servico WHERE id = $1 AND status = $2';
      const selectParams = [id, 'pendente'];
      if (unidadeId) {
        selectQuery += ' AND unidade_id = $3';
        selectParams.push(unidadeId);
      }
      const trocaResult = await client.query(selectQuery, selectParams);

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
    const unidadeId = determineUnidadeId(req);

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

    queryText = applyTenantFilter(queryText, params, unidadeId, 'se.unidade_id');
<<<<<<< HEAD

=======
    const baseParamCount = params.length;
>>>>>>> develop
    queryText += `
      ORDER BY se.data_servico DESC
      LIMIT $${baseParamCount + 1} OFFSET $${baseParamCount + 2}
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
    const unidadeId = determineUnidadeId(req);
    if (!unidadeId) {
      return res.status(400).json({ error: 'Selecione uma unidade para registrar o serviço extra' });
    }

    const usuarioServicoId = usuario_id || req.user.id;

    const result = await query(
      `INSERT INTO servicos_extra (usuario_id, data_servico, turno, horas, tipo, descricao, valor, unidade_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [usuarioServicoId, data_servico, turno, horas, tipo, descricao, valor, unidadeId]
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
    const unidadeId = determineUnidadeId(req);

    const queryText = unidadeId
      ? 'UPDATE servicos_extra SET status = $1, aprovado_por = $2 WHERE id = $3 AND unidade_id = $4 RETURNING *'
      : 'UPDATE servicos_extra SET status = $1, aprovado_por = $2 WHERE id = $3 RETURNING *';
    const queryParams = unidadeId
      ? [status, req.user.id, id, unidadeId]
      : [status, req.user.id, id];

    const result = await query(queryText, queryParams);

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
