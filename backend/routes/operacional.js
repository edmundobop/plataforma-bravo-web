const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');
const { getUsuariosUnidadeColumn, columnExists } = require('../utils/schema');
const PDFDocument = require('pdfkit');

const VALID_ALAS = ['Alfa', 'Bravo', 'Charlie', 'Delta'];
const SHIFT_SEQUENCE = [...VALID_ALAS];
const AUTO_SCALE_REFERENCE_DATE = '2026-01-01';
const AUTO_SCALE_REFERENCE_ALA = 'Delta';
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

const diffDaysUtc = (fromDate, toDate) => {
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  return Math.round((to - from) / 86400000);
};

const getAutoAlaForDate = (dateStr) => {
  const referenceIndex = SHIFT_SEQUENCE.indexOf(AUTO_SCALE_REFERENCE_ALA);
  const offset = diffDaysUtc(AUTO_SCALE_REFERENCE_DATE, dateStr);
  const index = ((referenceIndex + offset) % SHIFT_SEQUENCE.length + SHIFT_SEQUENCE.length) % SHIFT_SEQUENCE.length;
  return SHIFT_SEQUENCE[index];
};

const getYearBounds = (year) => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`,
});

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

const todayDateOnly = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const formatDatePtBR = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('pt-BR');
};

const parseAlaFromName = (name) => {
  if (!name) return null;
  const match = name.match(/Ala\s+([A-Za-z]+)/i) || name.match(/-\s*([A-Za-z]+)\s*-/i);
  if (!match) return null;
  const candidate = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  return VALID_ALAS.includes(candidate) ? candidate : null;
};

const applyTenantFilter = (queryText, params, unidadeId, column = 'unidade_id') => {
  if (!unidadeId) return queryText;
  params.push(unidadeId);
  return `${queryText} AND ${column} = $${params.length}`;
};

const ensureTrocasColumns = async (clientOrQuery = null) => {
  const runner = clientOrQuery || { query };
  await runner.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trocas_servico' AND column_name='aceito_substituto_em') THEN
        ALTER TABLE trocas_servico ADD COLUMN aceito_substituto_em TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trocas_servico' AND column_name='observacoes_decisao') THEN
        ALTER TABLE trocas_servico ADD COLUMN observacoes_decisao TEXT;
      END IF;
    END $$;
  `);
};

const ensureEscalasAutomationColumns = async (clientOrQuery = null) => {
  const runner = clientOrQuery || { query };
  await runner.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escalas' AND column_name='automatica') THEN
        ALTER TABLE escalas ADD COLUMN automatica BOOLEAN DEFAULT false;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='escalas' AND column_name='origem_automacao') THEN
        ALTER TABLE escalas ADD COLUMN origem_automacao VARCHAR(100);
      END IF;
    END $$;
  `);
};

const findEscalaByDateForSync = async (client, unidadeId, dataServico) => {
  const params = [dataServico];
  let unidadeFilter = '';
  if (unidadeId) {
    params.push(unidadeId);
    unidadeFilter = ` AND unidade_id = $${params.length}`;
  }

  const result = await client.query(
    `SELECT *
       FROM escalas
      WHERE tipo = 'operacional_24x72'
        AND setor = $${params.length + 1}
        AND data_inicio::date = $1::date
        ${unidadeFilter}
      ORDER BY COALESCE(automatica, false) DESC, id ASC
      LIMIT 1`,
    [...params, OPERACIONAL_SETOR]
  );

  return result.rows[0] || null;
};

const escalaHasTroca = async (client, escalaId) => {
  const result = await client.query(
    `SELECT 1
       FROM escala_usuarios eu
       LEFT JOIN trocas_servico t ON eu.troca_id = t.id
      WHERE eu.escala_id = $1
        AND (eu.troca_id IS NOT NULL OR t.status IN ('pendente', 'aguardando_aprovacao', 'aprovada'))
      LIMIT 1`,
    [escalaId]
  );
  return result.rows.length > 0;
};

const hasParticipantConflictForDate = async (client, participantes, dataServico, escalaId = null) => {
  if (!participantes.length) return false;
  const params = [participantes, dataServico];
  let ignoreCurrent = '';
  if (escalaId) {
    params.push(escalaId);
    ignoreCurrent = ` AND escala_id <> $${params.length}`;
  }

  const result = await client.query(
    `SELECT 1
       FROM escala_usuarios
      WHERE usuario_id = ANY($1::int[])
        AND data_servico = $2
        ${ignoreCurrent}
      LIMIT 1`,
    params
  );
  return result.rows.length > 0;
};

const replaceEscalaParticipants = async (client, escalaId, participantes, dataServico) => {
  await client.query('DELETE FROM escala_usuarios WHERE escala_id = $1', [escalaId]);
  for (const usuarioId of participantes) {
    const conflict = await client.query(
      `SELECT 1
         FROM escala_usuarios
        WHERE usuario_id = $1
          AND data_servico = $2
          AND escala_id <> $3
        LIMIT 1`,
      [usuarioId, dataServico, escalaId]
    );
    if (conflict.rows.length > 0) {
      const error = new Error(`Usuário ${usuarioId} já possui escala registrada em ${formatDatePtBR(dataServico)}`);
      error.statusCode = 409;
      throw error;
    }
    await client.query(
      `INSERT INTO escala_usuarios (escala_id, usuario_id, data_servico, turno, funcao, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [escalaId, usuarioId, dataServico, ESCALA_USUARIO_TURNO, ESCALA_USUARIO_FUNCAO, 'agendado']
    );
  }
};

const syncAutomaticEscalasForYear = async (client, {
  alaMap,
  unidadeId,
  createdBy,
  year = new Date().getFullYear(),
}) => {
  await ensureEscalasAutomationColumns(client);
  const { start, end } = getYearBounds(year);
  const today = todayDateOnly();
  const resultados = {
    year,
    criadas: 0,
    atualizadas: 0,
    preservadas: 0,
    conflitos: 0,
    semParticipantes: 0,
  };

  for (let date = start; date <= end; date = addDaysUtc(date, 1)) {
    const alaAtual = getAutoAlaForDate(date);
    const participantes = alaMap[alaAtual] || [];
    if (participantes.length === 0) {
      resultados.semParticipantes += 1;
      continue;
    }

    const existing = await findEscalaByDateForSync(client, unidadeId, date);
    const dataFim = addDaysUtc(date, 1);
    const escalaNome = `Escala Operacional - ${alaAtual} - ${date.split('-').reverse().join('/')}`;

    if (!existing) {
      const hasConflict = await hasParticipantConflictForDate(client, participantes, date);
      if (hasConflict) {
        resultados.conflitos += 1;
        resultados.preservadas += 1;
        continue;
      }

      const escalaResult = await client.query(
        `INSERT INTO escalas
          (nome, tipo, data_inicio, data_fim, turno, setor, observacoes, created_by, unidade_id, automatica, origem_automacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
         RETURNING id`,
        [
          escalaNome,
          'operacional_24x72',
          formatTimestamp(date, SHIFT_START_TIME),
          formatTimestamp(dataFim, SHIFT_END_TIME),
          SHIFT_TURNO_LABEL,
          OPERACIONAL_SETOR,
          `Escala automática: referência ${formatDatePtBR(AUTO_SCALE_REFERENCE_DATE)} = Ala ${AUTO_SCALE_REFERENCE_ALA}`,
          createdBy,
          unidadeId,
          'referencia_2026_delta'
        ]
      );
      await replaceEscalaParticipants(client, escalaResult.rows[0].id, participantes, date);
      resultados.criadas += 1;
      continue;
    }

    const hasTroca = await escalaHasTroca(client, existing.id);
    const hasConflict = await hasParticipantConflictForDate(client, participantes, date, existing.id);
    if (date < today || hasTroca || hasConflict) {
      if (hasConflict) {
        resultados.conflitos += 1;
      }
      resultados.preservadas += 1;
      continue;
    }

    await client.query(
      `UPDATE escalas
          SET nome = $1,
              data_inicio = $2,
              data_fim = $3,
              turno = $4,
              setor = $5,
              automatica = true,
              origem_automacao = $6
        WHERE id = $7`,
      [
        escalaNome,
        formatTimestamp(date, SHIFT_START_TIME),
        formatTimestamp(dataFim, SHIFT_END_TIME),
        SHIFT_TURNO_LABEL,
        OPERACIONAL_SETOR,
        'referencia_2026_delta',
        existing.id
      ]
    );
    await replaceEscalaParticipants(client, existing.id, participantes, date);
    resultados.atualizadas += 1;
  }

  return resultados;
};

const findEscalaConflicts = async (usuarioIds, datasServico) => {
  if (!usuarioIds.length || !datasServico.length) {
    return [];
  }

  const result = await query(
    `SELECT eu.usuario_id,
            eu.data_servico,
            u.nome,
            u.nome_guerra,
            e.nome AS escala_nome
     FROM escala_usuarios eu
     LEFT JOIN usuarios u ON u.id = eu.usuario_id
     LEFT JOIN escalas e ON e.id = eu.escala_id
     WHERE eu.usuario_id = ANY($1)
       AND eu.data_servico = ANY($2::date[])
     ORDER BY eu.data_servico, COALESCE(u.nome_guerra, u.nome, eu.usuario_id::text)`,
    [usuarioIds, datasServico]
  );

  return result.rows;
};

const formatEscalaConflictMessage = (conflicts) => {
  const preview = conflicts.slice(0, 5).map((conflict) => {
    const nome = conflict.nome_guerra || conflict.nome || `Usuário ${conflict.usuario_id}`;
    return `${nome} em ${formatDatePtBR(conflict.data_servico)}`;
  }).join('; ');
  const suffix = conflicts.length > 5 ? ` e mais ${conflicts.length - 5} conflito(s)` : '';
  return `Já existe escala registrada para ${preview}${suffix}. Escolha outra data inicial ou ajuste as escalas existentes.`;
};

const criarNotificacao = async (client, usuarioId, titulo, mensagem, tipo, modulo, referenciaId = null, io = null) => {
  const result = await client.query(
    `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [usuarioId, titulo, mensagem, tipo, modulo, referenciaId]
  );
  if (io) {
    io.to(`user_${usuarioId}`).emit('nova_notificacao', result.rows[0]);
  }
  return result.rows[0];
};

const canAnalyzeTroca = (user) => {
  if (!user) return false;
  const perfilId = Number(user.perfil_id);
  const setor = (user.setor || user.setor_nome || '').toString().trim().toLowerCase();
  return user.perfil_nome === 'Administrador' || (setor !== 'operacional' && perfilId >= 2 && perfilId <= 5);
};

const canViewAllTrocas = (user) => {
  const perfilId = Number(user?.perfil_id);
  return perfilId >= 1 && perfilId <= 4;
};

const fetchAdministrativeApprovers = async (client, unidadeId = null) => {
  const params = [OPERACIONAL_SETOR];
  let unidadeFilter = '';
  if (unidadeId) {
    params.push(unidadeId);
    unidadeFilter = `AND COALESCE(u.unidade_lotacao_id, u.unidade_id) = $${params.length}`;
  }

  const result = await client.query(
    `SELECT DISTINCT u.id
     FROM usuarios u
     LEFT JOIN perfis p ON u.perfil_id = p.id
     WHERE u.ativo = true
       AND (
         p.nome = 'Administrador'
         OR (LOWER(COALESCE(u.setor, '')) <> LOWER($1) AND u.perfil_id BETWEEN 2 AND 5)
       )
       ${unidadeFilter}`,
    params
  );

  return result.rows;
};

const aceitarTrocaPeloSubstitutoComTransacao = async (client, troca, usuarioId, io = null) => {
  await client.query(
    `UPDATE trocas_servico
     SET status = $1, aceito_substituto_em = CURRENT_TIMESTAMP
     WHERE id = $2`,
    ['aguardando_aprovacao', troca.id]
  );

  await client.query(
    `INSERT INTO trocas_historico (troca_id, escala_usuario_id, acao, criado_por)
     VALUES ($1, $2, 'aceito_substituto', $3)`,
    [troca.id, troca.escala_original_id, usuarioId]
  );

  const admins = await fetchAdministrativeApprovers(client, troca.unidade_id);
  for (const admin of admins) {
    await criarNotificacao(
      client,
      admin.id,
      'Troca aguardando analise',
      `A troca de servico #${troca.id} foi aceita pelo substituto e aguarda decisao administrativa.`,
      'info',
      'operacional',
      troca.id,
      io
    );
  }

  await criarNotificacao(
    client,
    troca.usuario_solicitante_id,
    'Troca aceita pelo colega',
    'Sua solicitacao de troca foi aceita pelo substituto e enviada para analise administrativa.',
    'info',
    'operacional',
    troca.id,
    io
  );
};

const aprovarTrocaComTransacao = async (client, troca, aprovadorId, compensacao, observacoes = null, io = null) => {
  const escalaRow = await client.query(
    'SELECT * FROM escala_usuarios WHERE id = $1',
    [troca.escala_original_id]
  );

  if (escalaRow.rows.length === 0) {
    throw new Error('Escala original nao encontrada');
  }

  const targetDate = troca.data_servico_original || escalaRow.rows[0].data_servico;
  const conflitoSolicitante = await client.query(
    `SELECT id FROM escala_usuarios
     WHERE usuario_id = $1 AND data_servico = $2 AND id <> $3
     LIMIT 1`,
    [troca.usuario_solicitante_id, targetDate, troca.escala_original_id]
  );
  if (conflitoSolicitante.rows.length > 0) {
    throw new Error('Solicitante ja possui servico nessa data');
  }

  await client.query(
    'UPDATE escala_usuarios SET usuario_id = $1, data_servico = $2, troca_id = $3 WHERE id = $4',
    [troca.usuario_solicitante_id, targetDate, troca.id, troca.escala_original_id]
  );

  if (compensacao) {
    const conflitoPagamento = await client.query(
      `SELECT id FROM escala_usuarios
       WHERE usuario_id = $1 AND data_servico = $2 AND id <> $3
       LIMIT 1`,
      [troca.usuario_substituto_id, compensacao, troca.escala_original_id]
    );
    if (conflitoPagamento.rows.length > 0) {
      throw new Error('Militar selecionado ja possui servico na data de pagamento');
    }

    const pagamentoResult = await client.query(
      `UPDATE escala_usuarios
       SET usuario_id = $1, troca_id = $2
       WHERE id = (
         SELECT id FROM escala_usuarios
         WHERE usuario_id = $3 AND data_servico = $4 AND id <> $5
         ORDER BY id
         LIMIT 1
       )`,
      [troca.usuario_substituto_id, troca.id, troca.usuario_solicitante_id, compensacao, troca.escala_original_id]
    );
    if (pagamentoResult.rowCount === 0) {
      throw new Error('Servico de pagamento do solicitante nao encontrado');
    }
  }

  await client.query(
    `UPDATE trocas_servico
     SET status = $1, aprovado_por = $2, data_aprovacao = CURRENT_TIMESTAMP, data_servico_compensacao = $3, observacoes_decisao = $4
     WHERE id = $5`,
    ['aprovada', aprovadorId, compensacao, observacoes, troca.id]
  );

  const adminsAprovacaoLegado = { rows: [] };

  for (const admin of adminsAprovacaoLegado.rows) {
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
  const detalhe = observacoes ? ` Observacoes: ${observacoes}` : '';
  await criarNotificacao(client, troca.usuario_solicitante_id, 'Troca aprovada', `Sua solicitacao de troca de servico foi aprovada.${detalhe}`, 'success', 'operacional', troca.id, io);
  await criarNotificacao(client, troca.usuario_substituto_id, 'Troca aprovada', `A troca de servico foi aprovada.${detalhe}`, 'success', 'operacional', troca.id, io);
};

const rejeitarTrocaComTransacao = async (client, troca, rejeitadoPor, observacoes = null, io = null) => {
  await client.query(
    'UPDATE trocas_servico SET status = $1, aprovado_por = $2, data_aprovacao = CURRENT_TIMESTAMP, observacoes_decisao = $3 WHERE id = $4',
    ['rejeitada', rejeitadoPor, observacoes, troca.id]
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
    troca.id,
    io
  );
  await criarNotificacao(
    client,
    troca.usuario_substituto_id,
    'Troca rejeitada',
    'Você rejeitou a solicitação de troca de serviço.',
    'warning',
    'operacional',
    troca.id,
    io
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

    let syncResult = null;
    await transaction(async (client) => {
      await assignUsersToAlas(client, alaMap, eligibleIds);
      syncResult = await syncAutomaticEscalasForYear(client, {
        alaMap,
        unidadeId,
        createdBy: req.user.id,
        year: new Date().getFullYear(),
      });
    });

    res.json({
      message: 'Alas atualizadas e escalas automáticas sincronizadas com sucesso',
      alas: alaMap,
      total: usuarios.length,
      automacao: {
        referencia_data: AUTO_SCALE_REFERENCE_DATE,
        referencia_ala: AUTO_SCALE_REFERENCE_ALA,
        ...syncResult,
      }
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
    const datasServico = Array.from({ length: Number(quantidade_servicos) }, (_, index) => addDaysUtc(baseDate, index));
    const participantesGerados = [...new Set(
      datasServico.flatMap((_, index) => {
        const alaAtual = rotation[index % rotation.length];
        return alaMap[alaAtual] || [];
      })
    )];
    const conflicts = await findEscalaConflicts(participantesGerados, datasServico);
    if (conflicts.length > 0) {
      return res.status(409).json({ error: formatEscalaConflictMessage(conflicts) });
    }

    await transaction(async (client) => {
      if (alas) {
        await assignUsersToAlas(client, alaMap, eligibleIds);
      }

      for (let i = 0; i < Number(quantidade_servicos); i++) {
        const alaAtual = rotation[i % rotation.length];
        const dataServico = datasServico[i];
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
            const error = new Error(`Usuário ${usuarioId} já possui escala registrada em ${formatDatePtBR(dataServico)}`);
            error.statusCode = 409;
            throw error;
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
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro interno do servidor' });
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
              t.id as troca_id, t.status as troca_status,
              t.usuario_solicitante_id, t.usuario_substituto_id,
              us.nome as troca_solicitante_nome,
              usub.nome as troca_substituto_nome,
              t.data_servico_original, t.data_servico_troca, t.data_servico_compensacao
       FROM escala_usuarios eu
       JOIN usuarios u ON eu.usuario_id = u.id
       LEFT JOIN trocas_servico t ON eu.troca_id = t.id
       LEFT JOIN usuarios us ON t.usuario_solicitante_id = us.id
       LEFT JOIN usuarios usub ON t.usuario_substituto_id = usub.id
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

router.post('/escalas/pdf', async (req, res) => {
  try {
    const { data_servico } = req.body;
    if (!data_servico) {
      return res.status(400).json({ error: 'Data do serviço é obrigatória' });
    }

    const unidadeId = determineUnidadeId(req);
    const params = [data_servico];
    let queryText = `
      SELECT e.id as escala_id, e.nome as escala_nome,
             eu.id as escala_usuario_id, eu.funcao as funcao_escala,
             u.posto_graduacao, u.matricula, u.nome as nome_completo,
             t.id as troca_id,
             us.nome as solicitante_nome,
             usub.nome as substituto_nome
      FROM escala_usuarios eu
      JOIN escalas e ON eu.escala_id = e.id
      JOIN usuarios u ON eu.usuario_id = u.id
      LEFT JOIN trocas_servico t ON eu.troca_id = t.id
      LEFT JOIN usuarios us ON t.usuario_solicitante_id = us.id
      LEFT JOIN usuarios usub ON t.usuario_substituto_id = usub.id
      WHERE eu.data_servico = $1
    `;

    if (unidadeId) {
      params.push(unidadeId);
      queryText += ` AND e.unidade_id = $${params.length}`;
    }

    queryText += ' ORDER BY e.id, eu.id';

    const result = await query(queryText, params);
    const sectionsMap = new Map();
    result.rows.forEach((row) => {
      const key = row.escala_id;
      if (!sectionsMap.has(key)) {
        const alaNome = parseAlaFromName(row.escala_nome) || 'Operacional';
        sectionsMap.set(key, {
          ala: alaNome,
          rows: [],
        });
      }
      const group = sectionsMap.get(key);
      const trocaText = row.troca_id
        ? `${row.solicitante_nome || '---'} para ${row.substituto_nome || '---'}`
        : '';
      group.rows.push({
        ord: group.rows.length + 1,
        militar: `${row.posto_graduacao || '---'} ${row.matricula || '---'} ${row.nome_completo || '---'}`,
        funcao: row.funcao_escala || '---',
        troca: trocaText,
      });
    });

    const sections = Array.from(sectionsMap.values()).map((group) => ({
      ala: group.ala,
      rows: group.rows,
    }));

    const extrasColumnResult = await query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'servicos_extra'
          AND column_name = 'unidade_id'
        LIMIT 1
      `
    );
    const hasExtraUnidadeColumn = extrasColumnResult.rows.length > 0;

    const extrasParams = [data_servico];
    let extrasQuery = `
      SELECT se.*, u.nome as militar_nome, u.matricula
      FROM servicos_extra se
      JOIN usuarios u ON se.usuario_id = u.id
      WHERE se.data_servico = $1
    `;

    if (unidadeId) {
      extrasParams.push(unidadeId);
      if (hasExtraUnidadeColumn) {
        extrasQuery += ` AND se.unidade_id = $${extrasParams.length}`;
      } else {
        // Fallback: filtrar pelo usuário se a tabela servicos_extra não tiver unidade_id
        const userUnidadeCol = await getUsuariosUnidadeColumn() || 'unidade_id';
        extrasQuery += ` AND u.${userUnidadeCol} = $${extrasParams.length}`;
      }
    }

    extrasQuery += ' ORDER BY se.turno, u.nome';
    const extrasResult = await query(extrasQuery, extrasParams);
    const extras = extrasResult.rows.map((row) => ({
      militar: `${row.militar_nome || '---'} (${row.matricula || '---'})`,
      turno: row.turno || '---',
      tipo: row.tipo || '---',
      horas: row.horas ?? '---',
      descricao: row.descricao || row.tipo || '---',
      status: row.status || '---',
    }));

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const filename = `escala-${data_servico}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(16).text(`Escalas · ${formatDatePtBR(data_servico)}`, {
      align: 'center',
    });
    doc.moveDown(1.5);

    if (sections.length === 0) {
      doc.font('Helvetica').fontSize(12).text('Nenhuma escala encontrada para esta data.', {
        align: 'center',
      });
    } else {
      sections.forEach((section) => {
        doc.font('Helvetica-Bold').fontSize(12).text(`Ala ${section.ala}`);
        doc.moveDown(0.3);
        section.rows.forEach((row) => {
          doc.font('Helvetica').fontSize(10).text(`${row.ord}. ${row.militar}`);
          doc.font('Helvetica-Oblique').fontSize(9).text(`Função: ${row.funcao}`);
          if (row.troca) {
            doc.font('Helvetica').fontSize(9).text(`Troca: ${row.troca}`);
          }
          doc.moveDown(0.2);
        });
        doc.moveDown(0.8);
      });
    }

    if (extras.length) {
      doc.addPage();
      doc.font('Helvetica-Bold').fontSize(13).text('Serviços Extras', { underline: true });
      doc.moveDown(0.5);
      extras.forEach((extra, index) => {
        doc.font('Helvetica').fontSize(10).text(`${index + 1}. ${extra.militar}`);
        doc.font('Helvetica-Oblique').fontSize(9).text(
          `Turno: ${extra.turno} | Tipo: ${extra.tipo} | Horas: ${extra.horas} | Status: ${extra.status}`
        );
        if (extra.descricao) {
          doc.font('Helvetica').fontSize(9).text(`Descrição: ${extra.descricao}`);
        }
        doc.moveDown(0.4);
      });
    }

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF da escala:', error);
    res.status(500).json({ error: 'Erro interno ao gerar o PDF da escala' });
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
    const notificacaoResult = await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        usuario_id,
        'Nova Escala',
        `Você foi escalado para ${data_servico} no turno ${turno}.`,
        'info',
        'operacional',
        result.rows[0].id
      ]
    );
    req.io?.to(`user_${usuario_id}`).emit('nova_notificacao', notificacaoResult.rows[0]);

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

    if (canViewAllTrocas(req.user) && usuario_id) {
      paramCount++;
      queryText += ` AND (t.usuario_solicitante_id = $${paramCount} OR t.usuario_substituto_id = $${paramCount})`;
      params.push(usuario_id);
    }

    if (!canViewAllTrocas(req.user)) {
      paramCount++;
      queryText += ` AND (t.usuario_solicitante_id = $${paramCount} OR t.usuario_substituto_id = $${paramCount})`;
      params.push(req.user.id);
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

  // Verificar se a escala original existe e pertence ao militar que vai folgar
  if (Number(usuario_substituto_id) === Number(req.user.id)) {
    return res.status(400).json({ error: 'Nao e permitido solicitar troca de servico consigo mesmo' });
  }

  const hoje = todayDateOnly();
  const dataOriginal = extractDateOnly(data_servico_original);
  const dataTroca = extractDateOnly(data_servico_troca);
  if (dataOriginal < hoje || dataTroca < hoje) {
    return res.status(400).json({ error: 'Nao e permitido solicitar troca para servico em data retroativa' });
  }

  const escalaResult = await query(
    `SELECT eu.id, eu.data_servico, e.unidade_id
     FROM escala_usuarios eu
     JOIN escalas e ON eu.escala_id = e.id
     LEFT JOIN trocas_servico t ON eu.troca_id = t.id AND t.status IN ('pendente', 'aguardando_aprovacao')
     WHERE eu.id = $1 AND eu.usuario_id = $2 AND t.id IS NULL${unidadeId ? ' AND e.unidade_id = $3' : ''}`,
    unidadeId ? [escala_original_id, usuario_substituto_id, unidadeId] : [escala_original_id, usuario_substituto_id]
  );

  if (escalaResult.rows.length === 0) {
    return res.status(404).json({ error: 'Escala não encontrada ou não pertence ao militar selecionado' });
  }
  const dataEscalaOriginal = extractDateOnly(escalaResult.rows[0].data_servico);
  if (dataEscalaOriginal !== dataOriginal) {
    return res.status(400).json({ error: 'Data do servico selecionado nao confere com a escala' });
  }
 
    const participantesResult = await query(
      `SELECT id, setor, ativo, ala
       FROM usuarios
       WHERE id = ANY($1::int[])`,
      [[req.user.id, usuario_substituto_id]]
    );
    const participantes = participantesResult.rows;
    if (
      participantes.length !== 2 ||
      participantes.some((usuario) => usuario.ativo === false || (usuario.setor || '').toLowerCase() !== 'operacional')
    ) {
      return res.status(400).json({ error: 'Trocas de servico so podem envolver usuarios ativos do setor Operacional' });
    }
    const usuarioSolicitante = participantes.find((usuario) => Number(usuario.id) === Number(req.user.id));
    const usuarioSelecionado = participantes.find((usuario) => Number(usuario.id) === Number(usuario_substituto_id));
    if (usuarioSolicitante?.ala && usuarioSelecionado?.ala && usuarioSolicitante.ala === usuarioSelecionado.ala) {
      return res.status(400).json({ error: 'Nao e permitido solicitar troca com militar da mesma ala' });
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
    const notificacaoTrocaResult = await query(
      `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo, referencia_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        usuario_substituto_id,
        'Solicitação de Troca',
        `${req.user.nome} solicitou trabalhar no seu serviço. Motivo: ${motivo}`,
        'info',
        'operacional',
        result.rows[0].id
      ]
    );
    req.io?.to(`user_${usuario_substituto_id}`).emit('nova_notificacao', notificacaoTrocaResult.rows[0]);

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

    await ensureTrocasColumns();
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
      return res.status(403).json({ error: 'Você não pode confirmar esta troca' });
    }

    const compensacao = data_servico_compensacao ||
      troca.data_servico_compensacao ||
      troca.data_servico_original;

    try {
      await transaction(async (client) => {
        await aceitarTrocaPeloSubstitutoComTransacao(client, troca, req.user.id, req.io);
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

    res.json({ message: 'Troca aceita e enviada para análise administrativa' });
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

    await ensureTrocasColumns();
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
        await aceitarTrocaPeloSubstitutoComTransacao(client, troca, req.user.id, req.io);
      });

      return res.json({ message: 'Troca aceita e enviada para análise administrativa' });
    }

    await transaction(async (client) => {
      await rejeitarTrocaComTransacao(client, troca, req.user.id, null, req.io);
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
router.put('/trocas/:id/status', [
  body('status').isIn(['aprovada', 'rejeitada']).withMessage('Status deve ser aprovada ou rejeitada'),
  body('observacoes').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 2000 }).withMessage('Observações devem ter até 2000 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, observacoes = '' } = req.body;
    if (!canAnalyzeTroca(req.user)) {
      return res.status(403).json({ error: 'Apenas usuarios administrativos autorizados podem analisar trocas' });
    }
    await ensureTrocasColumns();
    const unidadeId = determineUnidadeId(req);
    await transaction(async (client) => {
      // Buscar dados da troca
      let selectQuery = 'SELECT * FROM trocas_servico WHERE id = $1 AND status = $2';
      const selectParams = [id, 'aguardando_aprovacao'];
      if (unidadeId) {
        selectQuery += ' AND unidade_id = $3';
        selectParams.push(unidadeId);
      }
      const trocaResult = await client.query(selectQuery, selectParams);

      if (trocaResult.rows.length === 0) {
        throw new Error('Troca não encontrada ou já processada');
      }

      const troca = trocaResult.rows[0];
      if (status === 'aprovada') {
        const compensacao = troca.data_servico_compensacao || null;
        await aprovarTrocaComTransacao(client, troca, req.user.id, compensacao, observacoes, req.io);
      } else {
        await rejeitarTrocaComTransacao(client, troca, req.user.id, observacoes, req.io);
      }
      return;

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
    if (
      error.message.includes('não encontrada') ||
      error.message.includes('já processada') ||
      error.message.includes('nao encontrada') ||
      error.message.includes('ja possui servico') ||
      error.message.includes('data de pagamento') ||
      error.message.includes('pagamento do solicitante')
    ) {
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
    const hasUnidadeId = await columnExists('servicos_extra', 'unidade_id');
    const userUnidadeCol = await getUsuariosUnidadeColumn() || 'unidade_id';

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

    if (unidadeId) {
      paramCount++;
      if (hasUnidadeId) {
        queryText += ` AND se.unidade_id = $${paramCount}`;
      } else {
        queryText += ` AND u.${userUnidadeCol} = $${paramCount}`;
      }
      params.push(unidadeId);
    }

    const baseParamCount = params.length;
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
    const hasUnidadeId = await columnExists('servicos_extra', 'unidade_id');

    let result;
    if (hasUnidadeId) {
      result = await query(
        `INSERT INTO servicos_extra (usuario_id, data_servico, turno, horas, tipo, descricao, valor, unidade_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [usuarioServicoId, data_servico, turno, horas, tipo, descricao, valor, unidadeId]
      );
    } else {
      result = await query(
        `INSERT INTO servicos_extra (usuario_id, data_servico, turno, horas, tipo, descricao, valor)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [usuarioServicoId, data_servico, turno, horas, tipo, descricao, valor]
      );
    }

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
    const hasUnidadeId = await columnExists('servicos_extra', 'unidade_id');
    const userUnidadeCol = await getUsuariosUnidadeColumn() || 'unidade_id';

    if (unidadeId) {
      // Verificar se o serviço pertence à unidade
      let checkQuery;
      let checkParams = [id, unidadeId];
      
      if (hasUnidadeId) {
        checkQuery = `SELECT 1 FROM servicos_extra WHERE id = $1 AND unidade_id = $2`;
      } else {
        checkQuery = `
          SELECT 1 FROM servicos_extra se
          JOIN usuarios u ON se.usuario_id = u.id
          WHERE se.id = $1 AND u.${userUnidadeCol} = $2
        `;
      }
      
      const checkResult = await query(checkQuery, checkParams);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Serviço extra não encontrado ou não pertence à sua unidade' });
      }
    }

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
    const unidadeId = determineUnidadeId(req);
    const hasUnidadeId = await columnExists('servicos_extra', 'unidade_id');
    const userUnidadeCol = await getUsuariosUnidadeColumn() || 'unidade_id';

    // Estatísticas gerais
    let extrasQueryPart;
    if (hasUnidadeId) {
      extrasQueryPart = `(SELECT COUNT(*) FROM servicos_extra WHERE status = 'pendente' ${unidadeId ? 'AND unidade_id = $1' : ''})`;
    } else {
      extrasQueryPart = `(SELECT COUNT(*) FROM servicos_extra se JOIN usuarios u ON se.usuario_id = u.id WHERE se.status = 'pendente' ${unidadeId ? `AND u.${userUnidadeCol} = $1` : ''})`;
    }

    const estatisticasQuery = `
      SELECT 
        (SELECT COUNT(*) FROM escalas WHERE ativa = true ${unidadeId ? 'AND unidade_id = $1' : ''}) as escalas_ativas,
        (SELECT COUNT(*) FROM trocas_servico WHERE status = 'pendente' ${unidadeId ? 'AND unidade_id = $1' : ''}) as trocas_pendentes,
        ${extrasQueryPart} as extras_pendentes,
        (SELECT COUNT(*) FROM escala_usuarios eu JOIN escalas e ON eu.escala_id = e.id WHERE eu.data_servico = CURRENT_DATE ${unidadeId ? 'AND e.unidade_id = $1' : ''}) as servicos_hoje
    `;
    const estatisticas = await query(estatisticasQuery, unidadeId ? [unidadeId] : []);

    // Serviços por usuário
    let servicosQuery = `
      SELECT u.nome, u.matricula,
             COUNT(eu.id) as total_servicos,
             COUNT(se.id) as servicos_extra
      FROM usuarios u
      LEFT JOIN escala_usuarios eu ON u.id = eu.usuario_id
      LEFT JOIN servicos_extra se ON u.id = se.usuario_id AND se.status = 'aprovado'
      WHERE u.ativo = true
      ${unidadeId ? `AND u.${userUnidadeCol} = $1` : ''}
    `;
    const params = [];
    let paramCount = 0;

    if (unidadeId) {
        paramCount++;
        params.push(unidadeId);
    }

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
