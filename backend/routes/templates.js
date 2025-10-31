const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Middleware para verificar permissões de admin/gestor/supervisor
const checkTemplatePermissions = (req, res, next) => {
  const allowedRoles = ['Administrador', 'Comandante', 'Chefe'];
  if (!allowedRoles.includes(req.user.perfil_nome)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores, comandantes e chefes podem gerenciar templates.' });
  }
  next();
};

// Listar todos os templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Obter tenant_id do header X-Tenant-ID ou fallback para unidade de lotação
    const tenantId = req.headers['x-tenant-id'] || req.user.unidade_id || 1;
    
    const result = await pool.query(`
      SELECT 
        t.*,
        u.nome as criado_por_nome,
        COUNT(c.id) as total_categorias
      FROM checklist_templates t
      LEFT JOIN usuarios u ON t.criado_por = u.id
      LEFT JOIN template_categorias c ON t.id = c.template_id
      WHERE t.tenant_id = $1
      GROUP BY t.id, u.nome
      ORDER BY t.created_at DESC
    `, [tenantId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar template específico com categorias
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Obter tenant_id do header X-Tenant-ID ou fallback para unidade de lotação
    const tenantId = req.headers['x-tenant-id'] || req.user.unidade_id || 1;
    
    const templateResult = await pool.query(`
      SELECT * FROM checklist_templates 
      WHERE id = $1 AND tenant_id = $2
    `, [req.params.id, tenantId]);
    
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    const categoriasResult = await pool.query(`
      SELECT 
        c.*,
        json_agg(
          json_build_object(
            'id', i.id,
            'nome', i.nome,
            'tipo', i.tipo,
            'obrigatorio', i.obrigatorio,
            'ordem', i.ordem,
            'imagem_url', i.imagem_url
          ) ORDER BY i.ordem
        ) as itens
      FROM template_categorias c
      LEFT JOIN template_itens i ON c.id = i.categoria_id
      WHERE c.template_id = $1
      GROUP BY c.id
      ORDER BY c.ordem
    `, [req.params.id]);
    
    const template = templateResult.rows[0];
    template.categorias = categoriasResult.rows;
    
    res.json(template);
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo template
router.post('/', authenticateToken, checkTemplatePermissions, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { nome, descricao, tipo_viatura, categorias } = req.body;
    
    // Validações
    if (!nome || !tipo_viatura) {
      return res.status(400).json({ error: 'Nome e tipo de viatura são obrigatórios' });
    }
    
    const tiposPermitidos = ['ABTF', 'ABT', 'UR', 'ASA', 'MOB', 'AV'];
    if (!tiposPermitidos.includes(tipo_viatura)) {
      return res.status(400).json({ error: 'Tipo de viatura inválido' });
    }
    
    // Obter tenant_id do header X-Tenant-ID ou fallback para unidade de lotação
    const tenantId = req.headers['x-tenant-id'] || req.user.unidade_id || 1;
    
    // Criar template
    const templateResult = await client.query(`
      INSERT INTO checklist_templates (nome, descricao, tipo_viatura, criado_por, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nome, descricao, tipo_viatura, req.user.id, tenantId]);
    
    const template = templateResult.rows[0];
    
    // Criar categorias e itens
    if (categorias && categorias.length > 0) {
      for (let i = 0; i < categorias.length; i++) {
        const categoria = categorias[i];
        
        const categoriaResult = await client.query(`
          INSERT INTO template_categorias (template_id, nome, descricao, imagem_url, ordem)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [template.id, categoria.nome, categoria.descricao, categoria.imagem_url, i + 1]);
        
        const categoriaId = categoriaResult.rows[0].id;
        
        // Criar itens da categoria
        if (categoria.itens && categoria.itens.length > 0) {
          for (let j = 0; j < categoria.itens.length; j++) {
            const item = categoria.itens[j];
            
            await client.query(`
              INSERT INTO template_itens (categoria_id, nome, tipo, obrigatorio, ordem, imagem_url)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [categoriaId, item.nome, item.tipo || 'checkbox', item.obrigatorio || false, j + 1, item.imagem_url || null]);
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Buscar template completo para retornar
    const templateCompleto = await pool.query(`
      SELECT 
        t.*,
        json_agg(
          json_build_object(
            'id', c.id,
            'nome', c.nome,
            'descricao', c.descricao,
            'imagem_url', c.imagem_url,
            'ordem', c.ordem
          ) ORDER BY c.ordem
        ) as categorias
      FROM checklist_templates t
      LEFT JOIN template_categorias c ON t.id = c.template_id
      WHERE t.id = $1
      GROUP BY t.id
    `, [template.id]);
    
    res.status(201).json(templateCompleto.rows[0]);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Atualizar template
router.put('/:id', authenticateToken, checkTemplatePermissions, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { nome, descricao, tipo_viatura, categorias } = req.body;
    
    // Obter tenant_id do header X-Tenant-ID ou fallback para unidade de lotação
    const tenantId = req.headers['x-tenant-id'] || req.user.unidade_id || 1;
    
    // Verificar se template existe
    const templateExiste = await client.query(`
      SELECT id FROM checklist_templates 
      WHERE id = $1 AND tenant_id = $2
    `, [req.params.id, tenantId]);
    
    if (templateExiste.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    // Atualizar template
    await client.query(`
      UPDATE checklist_templates 
      SET nome = $1, descricao = $2, tipo_viatura = $3, updated_at = NOW()
      WHERE id = $4
    `, [nome, descricao, tipo_viatura, req.params.id]);
    
    // Remover categorias e itens existentes
    await client.query('DELETE FROM template_itens WHERE categoria_id IN (SELECT id FROM template_categorias WHERE template_id = $1)', [req.params.id]);
    await client.query('DELETE FROM template_categorias WHERE template_id = $1', [req.params.id]);
    
    // Recriar categorias e itens
    if (categorias && categorias.length > 0) {
      for (let i = 0; i < categorias.length; i++) {
        const categoria = categorias[i];
        
        const categoriaResult = await client.query(`
          INSERT INTO template_categorias (template_id, nome, descricao, imagem_url, ordem)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [req.params.id, categoria.nome, categoria.descricao, categoria.imagem_url, i + 1]);
        
        const categoriaId = categoriaResult.rows[0].id;
        
        if (categoria.itens && categoria.itens.length > 0) {
          for (let j = 0; j < categoria.itens.length; j++) {
            const item = categoria.itens[j];
            
            await client.query(`
              INSERT INTO template_itens (categoria_id, nome, tipo, obrigatorio, ordem, imagem_url)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [categoriaId, item.nome, item.tipo || 'checkbox', item.obrigatorio || false, j + 1, item.imagem_url || null]);
          }
        }
      }
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Template atualizado com sucesso' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

// Deletar template
router.delete('/:id', authenticateToken, checkTemplatePermissions, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Obter tenant_id do header X-Tenant-ID ou fallback para unidade de lotação
    const tenantId = req.headers['x-tenant-id'] || req.user.unidade_id || 1;
    
    // Verificar se template existe
    const templateExiste = await client.query(`
      SELECT id FROM checklist_templates 
      WHERE id = $1 AND tenant_id = $2
    `, [req.params.id, tenantId]);
    
    if (templateExiste.rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    // Verificar se template está sendo usado
    const templateEmUso = await client.query(`
      SELECT COUNT(*) as count FROM checklist_viaturas 
      WHERE template_id = $1
    `, [req.params.id]);
    
    if (parseInt(templateEmUso.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Não é possível deletar template que está sendo usado em checklists' });
    }
    
    // Deletar itens, categorias e template
    await client.query('DELETE FROM template_itens WHERE categoria_id IN (SELECT id FROM template_categorias WHERE template_id = $1)', [req.params.id]);
    await client.query('DELETE FROM template_categorias WHERE template_id = $1', [req.params.id]);
    await client.query('DELETE FROM checklist_templates WHERE id = $1', [req.params.id]);
    
    await client.query('COMMIT');
    res.json({ message: 'Template deletado com sucesso' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;