const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Rota pública para autocomplete de usuários (sem autenticação)
router.get('/autocomplete', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nome, posto_graduacao FROM usuarios WHERE ativo = true ORDER BY nome'
    );

    res.json({ 
      success: true,
      usuarios: result.rows 
    });
  } catch (error) {
    console.error('Erro ao buscar usuários para autocomplete:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aplicar autenticação em todas as outras rotas
router.use(authenticateToken);

// Listar usuários (apenas admin e gestores)
router.get('/', authorizeRoles(['admin', 'gestor']), async (req, res) => {
  try {
    const { 
      ativo, 
      papel, 
      setor, 
      busca, 
      page = 1, 
      limit = 20 
    } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtros
    if (ativo !== undefined) {
      whereConditions.push(`u.ativo = $${paramIndex}`);
      queryParams.push(ativo === 'true');
      paramIndex++;
    }

    if (papel) {
      whereConditions.push(`u.papel = $${paramIndex}`);
      queryParams.push(papel);
      paramIndex++;
    }

    if (setor) {
      whereConditions.push(`u.setor = $${paramIndex}`);
      queryParams.push(setor);
      paramIndex++;
    }

    if (busca) {
      whereConditions.push(`(
        LOWER(u.nome) LIKE LOWER($${paramIndex}) OR 
        LOWER(u.email) LIKE LOWER($${paramIndex}) OR 
        u.matricula LIKE $${paramIndex}
      )`);
      queryParams.push(`%${busca}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM usuarios u
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Buscar usuários com paginação
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const usuariosQuery = `
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.matricula,
        u.papel,
        u.setor,
        u.telefone,
        u.ativo,
        u.data_criacao,
        u.ultimo_login
      FROM usuarios u
      ${whereClause}
      ORDER BY u.nome
      LIMIT $${paramIndex - 1} OFFSET $${paramIndex}
    `;

    const usuariosResult = await query(usuariosQuery, queryParams);

    res.json({
      usuarios: usuariosResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar usuário por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.papel;

    // Verificar se o usuário pode acessar este perfil
    if (id !== userId.toString() && !['admin', 'gestor'].includes(userRole)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const usuarioResult = await query(`
      SELECT 
        id,
        nome,
        email,
        matricula,
        papel,
        setor,
        telefone,
        ativo,
        data_criacao,
        ultimo_login
      FROM usuarios 
      WHERE id = $1
    `, [id]);

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const usuario = usuarioResult.rows[0];

    // Se for o próprio usuário ou admin/gestor, incluir estatísticas
    if (id === userId.toString() || ['admin', 'gestor'].includes(userRole)) {
      // Estatísticas de atividade do usuário
      const estatisticas = await query(`
        SELECT 
          (SELECT COUNT(*) FROM checklists_viatura WHERE usuario_id = $1) as total_checklists,
          (SELECT COUNT(*) FROM movimentacoes_estoque WHERE usuario_id = $1) as total_movimentacoes,
          (SELECT COUNT(*) FROM emprestimos WHERE usuario_solicitante_id = $1) as total_emprestimos,
          (SELECT COUNT(*) FROM servicos_extra WHERE usuario_id = $1 AND status = 'aprovado') as total_extras
      `, [id]);

      usuario.estatisticas = estatisticas.rows[0];
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar usuário (apenas admin)
router.post('/', 
  authorizeRoles(['admin']),
  [
    body('nome').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('matricula').trim().isLength({ min: 1 }).withMessage('Matrícula é obrigatória'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('papel').isIn(['admin', 'gestor', 'operador']).withMessage('Papel inválido'),
    body('setor').trim().isLength({ min: 1 }).withMessage('Setor é obrigatório'),
    body('telefone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { nome, email, matricula, senha, papel, setor, telefone } = req.body;

      // Verificar se email já existe
      const emailExists = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (emailExists.rows.length > 0) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }

      // Verificar se matrícula já existe
      const matriculaExists = await query('SELECT id FROM usuarios WHERE matricula = $1', [matricula]);
      if (matriculaExists.rows.length > 0) {
        return res.status(400).json({ error: 'Matrícula já está em uso' });
      }

      // Hash da senha
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(senha, saltRounds);

      // Inserir usuário
      const result = await query(`
        INSERT INTO usuarios (nome, email, matricula, senha, papel, setor, telefone)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nome, email, matricula, papel, setor, telefone, ativo, data_criacao
      `, [nome, email, matricula, hashedPassword, papel, setor, telefone]);

      const novoUsuario = result.rows[0];

      // Criar notificação de boas-vindas
      await query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, modulo)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        novoUsuario.id,
        'Bem-vindo ao Sistema',
        `Olá ${nome}, sua conta foi criada com sucesso. Acesse o sistema com suas credenciais.`,
        'info',
        'sistema'
      ]);

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        usuario: novoUsuario
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Atualizar usuário
router.put('/:id',
  [
    body('nome').optional().trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('matricula').optional().trim().isLength({ min: 1 }).withMessage('Matrícula é obrigatória'),
    body('papel').optional().isIn(['admin', 'gestor', 'operador']).withMessage('Papel inválido'),
    body('setor').optional().trim().isLength({ min: 1 }).withMessage('Setor é obrigatório'),
    body('telefone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.papel;
      const { nome, email, matricula, papel, setor, telefone, ativo } = req.body;

      // Verificar permissões
      if (id !== userId.toString() && !['admin', 'gestor'].includes(userRole)) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Usuários não-admin não podem alterar papel ou status ativo
      if (userRole !== 'admin' && (papel !== undefined || ativo !== undefined)) {
        return res.status(403).json({ error: 'Apenas administradores podem alterar papel ou status' });
      }

      // Verificar se usuário existe
      const usuarioExists = await query('SELECT id FROM usuarios WHERE id = $1', [id]);
      if (usuarioExists.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar conflitos de email e matrícula
      if (email) {
        const emailExists = await query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
        if (emailExists.rows.length > 0) {
          return res.status(400).json({ error: 'Email já está em uso' });
        }
      }

      if (matricula) {
        const matriculaExists = await query('SELECT id FROM usuarios WHERE matricula = $1 AND id != $2', [matricula, id]);
        if (matriculaExists.rows.length > 0) {
          return res.status(400).json({ error: 'Matrícula já está em uso' });
        }
      }

      // Construir query de atualização
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (nome !== undefined) {
        updateFields.push(`nome = $${paramIndex}`);
        updateValues.push(nome);
        paramIndex++;
      }

      if (email !== undefined) {
        updateFields.push(`email = $${paramIndex}`);
        updateValues.push(email);
        paramIndex++;
      }

      if (matricula !== undefined) {
        updateFields.push(`matricula = $${paramIndex}`);
        updateValues.push(matricula);
        paramIndex++;
      }

      if (papel !== undefined && userRole === 'admin') {
        updateFields.push(`papel = $${paramIndex}`);
        updateValues.push(papel);
        paramIndex++;
      }

      if (setor !== undefined) {
        updateFields.push(`setor = $${paramIndex}`);
        updateValues.push(setor);
        paramIndex++;
      }

      if (telefone !== undefined) {
        updateFields.push(`telefone = $${paramIndex}`);
        updateValues.push(telefone);
        paramIndex++;
      }

      if (ativo !== undefined && userRole === 'admin') {
        updateFields.push(`ativo = $${paramIndex}`);
        updateValues.push(ativo);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      updateValues.push(id);

      const updateQuery = `
        UPDATE usuarios 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, nome, email, matricula, papel, setor, telefone, ativo, data_criacao
      `;

      const result = await query(updateQuery, updateValues);
      const usuarioAtualizado = result.rows[0];

      res.json({
        message: 'Usuário atualizado com sucesso',
        usuario: usuarioAtualizado
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Alterar senha
router.put('/:id/senha',
  [
    body('senha_atual').isLength({ min: 1 }).withMessage('Senha atual é obrigatória'),
    body('nova_senha').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.papel;
      const { senha_atual, nova_senha } = req.body;

      // Verificar permissões (próprio usuário ou admin)
      if (id !== userId.toString() && userRole !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Buscar senha atual do usuário
      const usuarioResult = await query('SELECT senha FROM usuarios WHERE id = $1', [id]);
      if (usuarioResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const { senha: senhaAtualHash } = usuarioResult.rows[0];

      // Verificar senha atual (apenas se não for admin alterando outro usuário)
      if (id === userId.toString()) {
        const senhaValida = await bcrypt.compare(senha_atual, senhaAtualHash);
        if (!senhaValida) {
          return res.status(400).json({ error: 'Senha atual incorreta' });
        }
      }

      // Hash da nova senha
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const novaSenhaHash = await bcrypt.hash(nova_senha, saltRounds);

      // Atualizar senha
      await query('UPDATE usuarios SET senha = $1 WHERE id = $2', [novaSenhaHash, id]);

      res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

// Desativar usuário (apenas admin)
router.delete('/:id', authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Não permitir que o usuário desative a si mesmo
    if (id === userId.toString()) {
      return res.status(400).json({ error: 'Não é possível desativar sua própria conta' });
    }

    // Verificar se usuário existe
    const usuarioExists = await query('SELECT id, nome FROM usuarios WHERE id = $1', [id]);
    if (usuarioExists.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Desativar usuário
    await query('UPDATE usuarios SET ativo = false WHERE id = $1', [id]);

    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter perfil do usuário logado
router.get('/me/perfil', async (req, res) => {
  try {
    const userId = req.user.id;

    const usuarioResult = await query(`
      SELECT 
        id,
        nome,
        email,
        matricula,
        papel,
        setor,
        telefone,
        ativo,
        data_criacao,
        ultimo_login
      FROM usuarios 
      WHERE id = $1
    `, [userId]);

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const usuario = usuarioResult.rows[0];

    // Estatísticas de atividade
    const estatisticas = await query(`
      SELECT 
        (SELECT COUNT(*) FROM checklists_viatura WHERE usuario_id = $1) as total_checklists,
        (SELECT COUNT(*) FROM movimentacoes_estoque WHERE usuario_id = $1) as total_movimentacoes,
        (SELECT COUNT(*) FROM emprestimos WHERE usuario_solicitante_id = $1) as total_emprestimos,
        (SELECT COUNT(*) FROM servicos_extra WHERE usuario_id = $1 AND status = 'aprovado') as total_extras,
        (SELECT COUNT(*) FROM notificacoes WHERE usuario_id = $1 AND lida = false) as notificacoes_nao_lidas
    `, [userId]);

    usuario.estatisticas = estatisticas.rows[0];

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar setores disponíveis
router.get('/config/setores', async (req, res) => {
  try {
    // Lista de setores do Corpo de Bombeiros
    const setores = [
      'Comando Geral',
      'Subcomando Geral',
      'Estado Maior',
      'Diretoria de Pessoal',
      'Diretoria de Logística',
      'Diretoria de Ensino',
      'Diretoria de Atividades Técnicas',
      'Centro de Operações',
      '1º Comando Regional',
      '2º Comando Regional',
      '3º Comando Regional',
      '4º Comando Regional',
      '5º Comando Regional',
      'Grupamento de Busca e Salvamento',
      'Grupamento de Operações Aéreas',
      'Grupamento de Mergulhadores',
      'Grupamento de Bombeiros Rodoviários',
      'Centro de Formação e Aperfeiçoamento',
      'Seção de Investigação de Incêndio',
      'Seção de Análise de Projetos'
    ];

    res.json({ setores });
  } catch (error) {
    console.error('Erro ao listar setores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;