const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Dashboard geral
router.get('/geral', async (req, res) => {
  try {
    // Estatísticas gerais do sistema
    const estatisticasGerais = await query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as usuarios_ativos,
        (SELECT COUNT(*) FROM viaturas WHERE status = 'disponivel') as viaturas_disponiveis,
        (SELECT COUNT(*) FROM produtos WHERE estoque_atual <= estoque_minimo) as produtos_baixo_estoque,
        (SELECT COUNT(*) FROM emprestimos WHERE status = 'ativo') as emprestimos_ativos,
        (SELECT COUNT(*) FROM escalas WHERE ativa = true) as escalas_ativas,
        (SELECT COUNT(*) FROM notificacoes WHERE lida = false) as notificacoes_nao_lidas
    `);

    // Atividades recentes (últimas 24 horas)
    const atividadesRecentes = await query(`
      SELECT 'checklist' as tipo, 'Checklist realizado' as descricao, data_checklist as data, u.nome as usuario
      FROM checklists_viatura c
      JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.data_checklist >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      
      UNION ALL
      
      SELECT 'movimentacao' as tipo, 
             CASE WHEN m.tipo = 'entrada' THEN 'Entrada de estoque' ELSE 'Saída de estoque' END as descricao,
             m.data_movimentacao as data, u.nome as usuario
      FROM movimentacoes_estoque m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.data_movimentacao >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      
      UNION ALL
      
      SELECT 'emprestimo' as tipo, 'Empréstimo registrado' as descricao, e.data_emprestimo as data, u.nome as usuario
      FROM emprestimos e
      JOIN usuarios u ON e.usuario_solicitante_id = u.id
      WHERE e.data_emprestimo >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      
      ORDER BY data DESC
      LIMIT 10
    `);

    // Alertas importantes
    const alertas = [];

    // Verificar empréstimos vencidos
    const emprestimosVencidos = await query(`
      SELECT COUNT(*) as total
      FROM emprestimos 
      WHERE status = 'ativo' AND data_prevista_devolucao < CURRENT_DATE
    `);
    
    if (parseInt(emprestimosVencidos.rows[0].total) > 0) {
      alertas.push({
        tipo: 'warning',
        titulo: 'Empréstimos Vencidos',
        mensagem: `${emprestimosVencidos.rows[0].total} empréstimo(s) com devolução em atraso`,
        modulo: 'emprestimos'
      });
    }

    // Verificar produtos com estoque baixo
    const produtosBaixoEstoque = await query(`
      SELECT COUNT(*) as total
      FROM produtos 
      WHERE estoque_atual <= estoque_minimo AND ativo = true
    `);
    
    if (parseInt(produtosBaixoEstoque.rows[0].total) > 0) {
      alertas.push({
        tipo: 'warning',
        titulo: 'Estoque Baixo',
        mensagem: `${produtosBaixoEstoque.rows[0].total} produto(s) com estoque abaixo do mínimo`,
        modulo: 'almoxarifado'
      });
    }

    // Verificar manutenções pendentes
    const manutencoesVencidas = await query(`
      SELECT COUNT(*) as total
      FROM manutencoes 
      WHERE status = 'agendada' AND data_manutencao < CURRENT_DATE
    `);
    
    if (parseInt(manutencoesVencidas.rows[0].total) > 0) {
      alertas.push({
        tipo: 'error',
        titulo: 'Manutenções Atrasadas',
        mensagem: `${manutencoesVencidas.rows[0].total} manutenção(ões) com data vencida`,
        modulo: 'frota'
      });
    }

    res.json({
      estatisticas: estatisticasGerais.rows[0],
      atividades_recentes: atividadesRecentes.rows,
      alertas
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard geral:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard do módulo Frota
router.get('/frota', async (req, res) => {
  try {
    // Estatísticas de viaturas
    const estatisticasViaturas = await query(`
      SELECT 
        COUNT(*) as total_viaturas,
        COUNT(CASE WHEN status = 'disponivel' THEN 1 END) as disponiveis,
        COUNT(CASE WHEN status = 'em_uso' THEN 1 END) as em_uso,
        COUNT(CASE WHEN status = 'manutencao' THEN 1 END) as em_manutencao,
        COUNT(CASE WHEN status = 'inativa' THEN 1 END) as inativas
      FROM viaturas
    `);

    // Manutenções por status
    const manutencoesPorStatus = await query(`
      SELECT 
        status,
        COUNT(*) as quantidade
      FROM manutencoes
      WHERE data_manutencao >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY status
    `);

    // Checklists realizados (últimos 7 dias)
    const checklistsRecentes = await query(`
      SELECT 
        DATE(data_checklist) as data,
        COUNT(*) as quantidade
      FROM checklists_viatura
      WHERE data_checklist >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(data_checklist)
      ORDER BY data
    `);

    // Viaturas com mais uso (por checklist)
    const viaturasComMaisUso = await query(`
      SELECT 
        v.prefixo,
        v.modelo,
        v.marca,
        COUNT(c.id) as total_checklists
      FROM viaturas v
      LEFT JOIN checklists_viatura c ON v.id = c.viatura_id
      WHERE c.data_checklist >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY v.id, v.prefixo, v.modelo, v.marca
      ORDER BY total_checklists DESC
      LIMIT 5
    `);

    // Próximas manutenções
    const proximasManutencoes = await query(`
      SELECT 
        m.tipo,
        m.data_manutencao,
        v.prefixo,
        v.modelo
      FROM manutencoes m
      JOIN viaturas v ON m.viatura_id = v.id
      WHERE m.status = 'agendada' AND m.data_manutencao >= CURRENT_DATE
      ORDER BY m.data_manutencao
      LIMIT 5
    `);

    res.json({
      estatisticas_viaturas: estatisticasViaturas.rows[0],
      manutencoes_por_status: manutencoesPorStatus.rows,
      checklists_recentes: checklistsRecentes.rows,
      viaturas_mais_usadas: viaturasComMaisUso.rows,
      proximas_manutencoes: proximasManutencoes.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard frota:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard do módulo Almoxarifado
router.get('/almoxarifado', async (req, res) => {
  try {
    // Estatísticas de produtos
    const estatisticasProdutos = await query(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(CASE WHEN ativo = true THEN 1 END) as produtos_ativos,
        COUNT(CASE WHEN estoque_atual <= estoque_minimo THEN 1 END) as baixo_estoque,
        SUM(estoque_atual * valor_unitario) as valor_total_estoque
      FROM produtos
    `);

    // Movimentações por tipo (últimos 30 dias)
    const movimentacoesPorTipo = await query(`
      SELECT 
        tipo,
        COUNT(*) as quantidade,
        SUM(valor_total) as valor_total
      FROM movimentacoes_estoque
      WHERE data_movimentacao >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY tipo
    `);

    // Movimentações diárias (últimos 7 dias)
    const movimentacoesDiarias = await query(`
      SELECT 
        DATE(data_movimentacao) as data,
        tipo,
        COUNT(*) as quantidade
      FROM movimentacoes_estoque
      WHERE data_movimentacao >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(data_movimentacao), tipo
      ORDER BY data
    `);

    // Produtos mais movimentados
    const produtosMaisMovimentados = await query(`
      SELECT 
        p.nome,
        p.codigo,
        COUNT(m.id) as total_movimentacoes,
        SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END) as total_entradas,
        SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END) as total_saidas
      FROM produtos p
      LEFT JOIN movimentacoes_estoque m ON p.id = m.produto_id
      WHERE m.data_movimentacao >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY p.id, p.nome, p.codigo
      ORDER BY total_movimentacoes DESC
      LIMIT 5
    `);

    // Produtos com estoque baixo
    const produtosBaixoEstoque = await query(`
      SELECT 
        nome,
        codigo,
        estoque_atual,
        estoque_minimo
      FROM produtos
      WHERE estoque_atual <= estoque_minimo AND ativo = true
      ORDER BY (estoque_atual::float / estoque_minimo::float)
      LIMIT 10
    `);

    res.json({
      estatisticas_produtos: estatisticasProdutos.rows[0],
      movimentacoes_por_tipo: movimentacoesPorTipo.rows,
      movimentacoes_diarias: movimentacoesDiarias.rows,
      produtos_mais_movimentados: produtosMaisMovimentados.rows,
      produtos_baixo_estoque: produtosBaixoEstoque.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard almoxarifado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard do módulo Empréstimos
router.get('/emprestimos', async (req, res) => {
  try {
    // Estatísticas de empréstimos
    const estatisticasEmprestimos = await query(`
      SELECT 
        COUNT(*) as total_emprestimos,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
        COUNT(CASE WHEN status = 'devolvido' THEN 1 END) as devolvidos,
        COUNT(CASE WHEN status = 'ativo' AND data_prevista_devolucao < CURRENT_DATE THEN 1 END) as vencidos
      FROM emprestimos
    `);

    // Estatísticas de equipamentos
    const estatisticasEquipamentos = await query(`
      SELECT 
        COUNT(*) as total_equipamentos,
        COUNT(CASE WHEN status = 'disponivel' THEN 1 END) as disponiveis,
        COUNT(CASE WHEN status = 'emprestado' THEN 1 END) as emprestados,
        COUNT(CASE WHEN status = 'manutencao' THEN 1 END) as em_manutencao
      FROM equipamentos
    `);

    // Empréstimos por mês (últimos 6 meses)
    const emprestimosPorMes = await query(`
      SELECT 
        TO_CHAR(data_emprestimo, 'YYYY-MM') as mes,
        COUNT(*) as quantidade
      FROM emprestimos
      WHERE data_emprestimo >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(data_emprestimo, 'YYYY-MM')
      ORDER BY mes
    `);

    // Equipamentos mais emprestados
    const equipamentosMaisEmprestados = await query(`
      SELECT 
        eq.nome,
        eq.codigo,
        COUNT(e.id) as total_emprestimos,
        AVG(EXTRACT(DAY FROM (COALESCE(e.data_devolucao, CURRENT_TIMESTAMP) - e.data_emprestimo))) as media_dias
      FROM equipamentos eq
      LEFT JOIN emprestimos e ON eq.id = e.equipamento_id
      WHERE e.data_emprestimo >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY eq.id, eq.nome, eq.codigo
      ORDER BY total_emprestimos DESC
      LIMIT 5
    `);

    // Empréstimos vencidos
    const emprestimosVencidos = await query(`
      SELECT 
        e.data_emprestimo,
        e.data_prevista_devolucao,
        eq.nome as equipamento_nome,
        u.nome as usuario_nome,
        EXTRACT(DAY FROM (CURRENT_DATE - e.data_prevista_devolucao)) as dias_atraso
      FROM emprestimos e
      JOIN equipamentos eq ON e.equipamento_id = eq.id
      JOIN usuarios u ON e.usuario_solicitante_id = u.id
      WHERE e.status = 'ativo' AND e.data_prevista_devolucao < CURRENT_DATE
      ORDER BY dias_atraso DESC
      LIMIT 10
    `);

    res.json({
      estatisticas_emprestimos: estatisticasEmprestimos.rows[0],
      estatisticas_equipamentos: estatisticasEquipamentos.rows[0],
      emprestimos_por_mes: emprestimosPorMes.rows,
      equipamentos_mais_emprestados: equipamentosMaisEmprestados.rows,
      emprestimos_vencidos: emprestimosVencidos.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard empréstimos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard do módulo Operacional
router.get('/operacional', async (req, res) => {
  try {
    // Estatísticas gerais
    const estatisticasGerais = await query(`
      SELECT 
        (SELECT COUNT(*) FROM escalas WHERE ativa = true) as escalas_ativas,
        (SELECT COUNT(*) FROM trocas_servico WHERE status = 'pendente') as trocas_pendentes,
        (SELECT COUNT(*) FROM servicos_extra WHERE status = 'pendente') as extras_pendentes,
        (SELECT COUNT(*) FROM escala_usuarios WHERE data_servico = CURRENT_DATE) as servicos_hoje
    `);

    // Serviços por dia (próximos 7 dias)
    const servicosProximos = await query(`
      SELECT 
        eu.data_servico,
        eu.turno,
        COUNT(*) as quantidade_usuarios
      FROM escala_usuarios eu
      WHERE eu.data_servico BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      GROUP BY eu.data_servico, eu.turno
      ORDER BY eu.data_servico, eu.turno
    `);

    // Trocas de serviço por status
    const trocasPorStatus = await query(`
      SELECT 
        status,
        COUNT(*) as quantidade
      FROM trocas_servico
      WHERE data_solicitacao >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY status
    `);

    // Serviços extra por mês
    const servicosExtraPorMes = await query(`
      SELECT 
        TO_CHAR(data_servico, 'YYYY-MM') as mes,
        COUNT(*) as quantidade,
        SUM(horas) as total_horas,
        SUM(valor) as valor_total
      FROM servicos_extra
      WHERE data_servico >= CURRENT_DATE - INTERVAL '6 months' AND status = 'aprovado'
      GROUP BY TO_CHAR(data_servico, 'YYYY-MM')
      ORDER BY mes
    `);

    // Usuários com mais serviços (últimos 30 dias)
    const usuariosComMaisServicos = await query(`
      SELECT 
        u.nome,
        u.matricula,
        COUNT(eu.id) as servicos_normais,
        COUNT(se.id) as servicos_extra,
        SUM(COALESCE(se.horas, 0)) as total_horas_extra
      FROM usuarios u
      LEFT JOIN escala_usuarios eu ON u.id = eu.usuario_id AND eu.data_servico >= CURRENT_DATE - INTERVAL '30 days'
      LEFT JOIN servicos_extra se ON u.id = se.usuario_id AND se.data_servico >= CURRENT_DATE - INTERVAL '30 days' AND se.status = 'aprovado'
      WHERE u.ativo = true
      GROUP BY u.id, u.nome, u.matricula
      ORDER BY (COUNT(eu.id) + COUNT(se.id)) DESC
      LIMIT 5
    `);

    // Escalas ativas
    const escalasAtivas = await query(`
      SELECT 
        e.nome,
        e.tipo,
        e.data_inicio,
        e.data_fim,
        COUNT(eu.id) as total_usuarios
      FROM escalas e
      LEFT JOIN escala_usuarios eu ON e.id = eu.escala_id
      WHERE e.ativa = true
      GROUP BY e.id, e.nome, e.tipo, e.data_inicio, e.data_fim
      ORDER BY e.data_inicio
    `);

    res.json({
      estatisticas_gerais: estatisticasGerais.rows[0],
      servicos_proximos: servicosProximos.rows,
      trocas_por_status: trocasPorStatus.rows,
      servicos_extra_por_mes: servicosExtraPorMes.rows,
      usuarios_mais_servicos: usuariosComMaisServicos.rows,
      escalas_ativas: escalasAtivas.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard operacional:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Métricas de performance do sistema
router.get('/metricas', async (req, res) => {
  try {
    const { periodo = '30' } = req.query; // dias

    // Atividade por módulo
    const atividadePorModulo = await query(`
      SELECT 
        'frota' as modulo,
        COUNT(*) as atividades
      FROM checklists_viatura
      WHERE data_checklist >= CURRENT_DATE - INTERVAL '${periodo} days'
      
      UNION ALL
      
      SELECT 
        'almoxarifado' as modulo,
        COUNT(*) as atividades
      FROM movimentacoes_estoque
      WHERE data_movimentacao >= CURRENT_DATE - INTERVAL '${periodo} days'
      
      UNION ALL
      
      SELECT 
        'emprestimos' as modulo,
        COUNT(*) as atividades
      FROM emprestimos
      WHERE data_emprestimo >= CURRENT_DATE - INTERVAL '${periodo} days'
      
      UNION ALL
      
      SELECT 
        'operacional' as modulo,
        COUNT(*) as atividades
      FROM trocas_servico
      WHERE data_solicitacao >= CURRENT_DATE - INTERVAL '${periodo} days'
    `);

    // Usuários mais ativos
    const usuariosMaisAtivos = await query(`
      SELECT 
        u.nome,
        u.matricula,
        COUNT(*) as total_atividades
      FROM (
        SELECT usuario_id FROM checklists_viatura WHERE data_checklist >= CURRENT_DATE - INTERVAL '${periodo} days'
        UNION ALL
        SELECT usuario_id FROM movimentacoes_estoque WHERE data_movimentacao >= CURRENT_DATE - INTERVAL '${periodo} days'
        UNION ALL
        SELECT usuario_solicitante_id as usuario_id FROM emprestimos WHERE data_emprestimo >= CURRENT_DATE - INTERVAL '${periodo} days'
      ) atividades
      JOIN usuarios u ON atividades.usuario_id = u.id
      GROUP BY u.id, u.nome, u.matricula
      ORDER BY total_atividades DESC
      LIMIT 10
    `);

    res.json({
      periodo_dias: parseInt(periodo),
      atividade_por_modulo: atividadePorModulo.rows,
      usuarios_mais_ativos: usuariosMaisAtivos.rows
    });
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;