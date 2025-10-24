const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getUserUnits } = require('../middleware/tenant');
const { getUsuariosUnidadeColumn, columnExists } = require('../utils/schema');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Obter unidades disponíveis para o usuário
router.get('/units', getUserUnits, async (req, res) => {
  try {
    res.json({
      success: true,
      units: req.user.unidades_disponiveis || []
    });
  } catch (error) {
    console.error('Erro ao obter unidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar acesso à unidade específica
router.get('/check-access/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    
    // Verificar se o usuário tem acesso à unidade
    const unidadeCol = await getUsuariosUnidadeColumn();
    const hasUnSigla = await columnExists('unidades', 'sigla');
    const caseLotacao = unidadeCol ? `WHEN usr.${unidadeCol} = u.id THEN true` : '';
    const accessCheck = await query(`
      SELECT 
        u.id as unidade_id,
        u.nome as unidade_nome,
        u.codigo as unidade_codigo,
        ${hasUnSigla ? 'u.sigla' : 'NULL'} as unidade_sigla,
        mu.role_unidade,
        CASE 
          ${caseLotacao}
          WHEN mu.usuario_id IS NOT NULL AND mu.ativo = true THEN true
          ELSE false
        END as tem_acesso
      FROM unidades u
      LEFT JOIN membros_unidade mu ON u.id = mu.unidade_id AND mu.usuario_id = $1 AND mu.ativo = true
      LEFT JOIN usuarios usr ON usr.id = $1
      WHERE u.id = $2 AND u.ativa = true
    `, [req.user.id, unitId]);

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada ou inativa' });
    }

    const unidadeInfo = accessCheck.rows[0];
    
    if (!unidadeInfo.tem_acesso) {
      return res.status(403).json({ 
        error: 'Acesso negado à unidade',
        message: `Você não tem permissão para acessar a unidade ${unidadeInfo.unidade_nome}`
      });
    }

    res.json({
      success: true,
      access: true,
      unit: {
        id: unidadeInfo.unidade_id,
        nome: unidadeInfo.unidade_nome,
        codigo: unidadeInfo.unidade_codigo,
        sigla: unidadeInfo.unidade_sigla,
        role_usuario: unidadeInfo.role_unidade || 'membro'
      }
    });
  } catch (error) {
    console.error('Erro ao verificar acesso à unidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todas as unidades (apenas para admins)
router.get('/all-units', async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.perfil_nome !== 'Administrador') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem listar todas as unidades.' });
    }

    const unidades = await query(`
      SELECT 
        id,
        codigo,
        nome,
        tipo,
        cidade,
        estado,
        comandante,
        ativa,
        created_at
      FROM unidades
      ORDER BY ativa DESC, nome
    `);

    res.json({
      success: true,
      units: unidades.rows
    });
  } catch (error) {
    console.error('Erro ao listar todas as unidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova unidade (apenas para admins)
router.post('/units', async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.perfil_nome !== 'Administrador') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar unidades.' });
    }

    const { codigo, nome, tipo, endereco, cidade, estado, telefone, email, comandante } = req.body;

    // Validações básicas
    if (!codigo || !nome || !tipo) {
      return res.status(400).json({ error: 'Código, nome e tipo são obrigatórios' });
    }

    const result = await query(`
      INSERT INTO unidades (codigo, nome, tipo, endereco, cidade, estado, telefone, email, comandante)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [codigo, nome, tipo, endereco, cidade, estado || 'GO', telefone, email, comandante]);

    res.status(201).json({
      success: true,
      message: 'Unidade criada com sucesso',
      unit: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar unidade:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Código da unidade já existe' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar unidade (apenas para admins)
router.put('/units/:id', async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.perfil_nome !== 'Administrador') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem atualizar unidades.' });
    }

    const { id } = req.params;
    const { codigo, nome, tipo, endereco, cidade, estado, telefone, email, comandante, ativa } = req.body;

    const result = await query(`
      UPDATE unidades 
      SET codigo = $1, nome = $2, tipo = $3, endereco = $4, cidade = $5, 
          estado = $6, telefone = $7, email = $8, comandante = $9, ativa = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [codigo, nome, tipo, endereco, cidade, estado, telefone, email, comandante, ativa, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    res.json({
      success: true,
      message: 'Unidade atualizada com sucesso',
      unit: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar unidade:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Código da unidade já existe' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;