const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { optionalTenant } = require('../middleware/tenant');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Aplicar middleware de tenant para filtrar dados por unidade
router.use(optionalTenant);

// Dashboard geral
router.get('/geral', optionalTenant, async (req, res) => {
  try {
    const unidadeId = req.unidade?.id;
    const { getUsuariosUnidadeColumn } = require('../utils/schema');
    const unidadeCol = await getUsuariosUnidadeColumn();
    
    // Estatísticas gerais
    let estatisticasQuery;
    if (unidadeId) {
      estatisticasQuery = `
        SELECT 
          (SELECT COUNT(*) FROM viaturas WHERE unidade_id = $1) as total_viaturas,
          (SELECT COUNT(*) FROM equipamentos WHERE unidade_id = $1) as total_equipamentos,
          (SELECT COUNT(*) FROM produtos WHERE unidade_id = $1) as total_produtos,
          (SELECT COUNT(*) FROM usuarios WHERE ativo = true ${unidadeCol ? `AND ${unidadeCol} = $1` : ''}) as total_usuarios
      `;
    } else {
      estatisticasQuery = `
        SELECT 
          (SELECT COUNT(*) FROM viaturas) as total_viaturas,
          (SELECT COUNT(*) FROM equipamentos) as total_equipamentos,
          (SELECT COUNT(*) FROM produtos) as total_produtos,
          (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as total_usuarios
      `;
    }
    const statsResult = await query(estatisticasQuery, unidadeId ? [unidadeId.toString()] : []);
    console.log('Estatísticas gerais executadas com sucesso:', statsResult.rows[0]);

    // Atividades recentes (últimas 24 horas)
    let atividadesQuery;
    if (unidadeId) {
      atividadesQuery = `
        SELECT 'movimentacao' as tipo, 
               CASE WHEN m.tipo = 'entrada' THEN 'Entrada de estoque' ELSE 'Saída de estoque' END as descricao,
               m.data_movimentacao as data, u.nome as usuario
        FROM movimentacoes_estoque m
        JOIN usuarios u ON m.usuario_id = u.id
        JOIN produtos p ON m.produto_id = p.id
        WHERE m.data_movimentacao >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND p.unidade_id = $1
        ORDER BY m.data_movimentacao DESC
        LIMIT 10
      `;
    } else {
      atividadesQuery = `
        SELECT 'movimentacao' as tipo, 
               CASE WHEN m.tipo = 'entrada' THEN 'Entrada de estoque' ELSE 'Saída de estoque' END as descricao,
               m.data_movimentacao as data, u.nome as usuario
        FROM movimentacoes_estoque m
        JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.data_movimentacao >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY m.data_movimentacao DESC
        LIMIT 10
      `;
    }
    
    const atividadesResult = await query(atividadesQuery, unidadeId ? [unidadeId] : []);

    // Alertas importantes
    const alertas = [];

    // Verificar empréstimos vencidos
    let emprestimosVencidosQuery;
    if (unidadeId) {
      emprestimosVencidosQuery = `
        SELECT COUNT(*) as total
        FROM emprestimos e
        JOIN equipamentos eq ON e.equipamento_id = eq.id
        WHERE e.data_prevista_devolucao < CURRENT_DATE AND e.status = 'ativo'
        AND eq.unidade_id = $1
      `;
    } else {
      emprestimosVencidosQuery = `
        SELECT COUNT(*) as total
        FROM emprestimos e
        WHERE e.data_prevista_devolucao < CURRENT_DATE AND e.status = 'ativo'
      `;
    }
    
    const emprestimosVencidosResult = await query(emprestimosVencidosQuery, unidadeId ? [unidadeId] : []);
    
    if (parseInt(emprestimosVencidosResult.rows[0].total) > 0) {
      alertas.push({
        tipo: 'warning',
        titulo: 'Empréstimos Vencidos',
        mensagem: `${emprestimosVencidosResult.rows[0].total} empréstimo(s) com devolução em atraso`,
        modulo: 'emprestimos'
      });
    }

    // Verificar produtos com estoque baixo
    let produtosBaixoEstoqueQuery;
    if (unidadeId) {
      produtosBaixoEstoqueQuery = `
        SELECT COUNT(*) as total
        FROM produtos 
        WHERE estoque_atual <= estoque_minimo AND ativo = true
        AND unidade_id = $1
      `;
    } else {
      produtosBaixoEstoqueQuery = `
        SELECT COUNT(*) as total
        FROM produtos 
        WHERE estoque_atual <= estoque_minimo AND ativo = true
      `;
    }
    
    const produtosBaixoEstoque = await query(produtosBaixoEstoqueQuery, unidadeId ? [unidadeId] : []);
    
    if (parseInt(produtosBaixoEstoque.rows[0].total) > 0) {
      alertas.push({
        tipo: 'warning',
        titulo: 'Estoque Baixo',
        mensagem: `${produtosBaixoEstoque.rows[0].total} produto(s) com estoque abaixo do mínimo`,
        modulo: 'almoxarifado'
      });
    }

    // Verificar manutenções pendentes
    let manutencoesVencidasQuery;
    if (unidadeId) {
      manutencoesVencidasQuery = `
        SELECT COUNT(*) as total
        FROM manutencoes m
        WHERE m.status = 'agendada' AND m.data_manutencao < CURRENT_DATE
        AND m.unidade_id = $1
      `;
    } else {
      manutencoesVencidasQuery = `
        SELECT COUNT(*) as total
        FROM manutencoes m
        WHERE m.status = 'agendada' AND m.data_manutencao < CURRENT_DATE
      `;
    }
    
    const manutencoesVencidas = await query(manutencoesVencidasQuery, unidadeId ? [unidadeId] : []);
    
    if (parseInt(manutencoesVencidas.rows[0].total) > 0) {
      alertas.push({
        tipo: 'error',
        titulo: 'Manutenções Atrasadas',
        mensagem: `${manutencoesVencidas.rows[0].total} manutenção(ões) com data vencida`,
        modulo: 'frota'
      });
    }

    console.log('Preparando resposta do dashboard geral...');
    const response = {
      estatisticas: statsResult.rows[0],
      atividades_recentes: atividadesResult.rows || [],
      alertas: alertas
    };
    res.json(response);
  } catch (error) {
    console.error('❌ Erro no dashboard geral:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Dashboard do módulo Frota
router.get('/frota', async (req, res) => {
  try {
    const unidadeId = req.unidade?.id;
    
    // Estatísticas de viaturas
    let estatisticasQuery = `
      SELECT 
        COUNT(*) as total_viaturas,
        COUNT(CASE WHEN status = 'Ativo' THEN 1 END) as ativas,
        COUNT(CASE WHEN status = 'Inativo' THEN 1 END) as inativas,
        COUNT(CASE WHEN status = 'Manutenção' THEN 1 END) as em_manutencao
      FROM viaturas
      ${unidadeId ? 'WHERE unidade_id = $1' : ''}
    `;
    
    const estatisticasViaturas = await query(estatisticasQuery, unidadeId ? [unidadeId.toString()] : []);

    // Manutenções por status
    let manutencoesQuery = `
      SELECT 
        m.status,
        COUNT(*) as quantidade
      FROM manutencoes m
      ${unidadeId ? 'JOIN viaturas v ON m.viatura_id = v.id' : ''}
      WHERE m.data_manutencao >= CURRENT_DATE - INTERVAL '30 days'
      ${unidadeId ? 'AND v.unidade_id = $1' : ''}
      GROUP BY m.status
    `;
    
    const manutencoesPorStatus = await query(manutencoesQuery, unidadeId ? [unidadeId.toString()] : []);

    // Viaturas com mais uso (por manutenções)
    let viaturasUsoQuery = `
      SELECT 
        v.prefixo,
        v.modelo,
        v.marca,
        COUNT(m.id) as total_manutencoes
      FROM viaturas v
      LEFT JOIN manutencoes m ON v.id = m.viatura_id
      WHERE 1=1
      ${unidadeId ? 'AND v.unidade_id = $1' : ''}
      AND (m.data_manutencao >= CURRENT_DATE - INTERVAL '30 days' OR m.data_manutencao IS NULL)
      GROUP BY v.id, v.prefixo, v.modelo, v.marca
      ORDER BY total_manutencoes DESC
      LIMIT 5
    `;
    
    const viaturasComMaisUso = await query(viaturasUsoQuery, unidadeId ? [unidadeId.toString()] : []);

    // Próximas manutenções
    let proximasManutencoesQuery = `
      SELECT 
        m.tipo,
        m.data_manutencao,
        v.prefixo,
        v.modelo
      FROM manutencoes m
      JOIN viaturas v ON m.viatura_id = v.id
      WHERE m.status = 'agendada' AND m.data_manutencao >= CURRENT_DATE
      ${unidadeId ? 'AND v.unidade_id = $1' : ''}
      ORDER BY m.data_manutencao
      LIMIT 5
    `;
    
    const proximasManutencoes = await query(proximasManutencoesQuery, unidadeId ? [unidadeId] : []);

    res.json({
      estatisticas_viaturas: estatisticasViaturas.rows[0],
      manutencoes_por_status: manutencoesPorStatus.rows,

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
    const unidadeId = req.unidade?.id;
    
    // Estatísticas de produtos
    let produtosQuery = `
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(CASE WHEN ativo = true THEN 1 END) as produtos_ativos,
        COUNT(CASE WHEN estoque_atual <= estoque_minimo THEN 1 END) as baixo_estoque,
        SUM(estoque_atual * valor_unitario) as valor_total_estoque
      FROM produtos
      ${unidadeId ? 'WHERE unidade_id = $1' : ''}
    `;
    
    const estatisticasProdutos = await query(produtosQuery, unidadeId ? [unidadeId] : []);

    // Movimentações por tipo (últimos 30 dias)
    let movimentacoesTipoQuery = `
      SELECT 
        m.tipo,
        COUNT(*) as quantidade,
        SUM(m.valor_total) as valor_total
      FROM movimentacoes_estoque m
      ${unidadeId ? 'JOIN produtos p ON m.produto_id = p.id' : ''}
      WHERE m.data_movimentacao >= CURRENT_DATE - INTERVAL '30 days'
      ${unidadeId ? 'AND p.unidade_id = $1' : ''}
      GROUP BY m.tipo
    `;
    
    const movimentacoesPorTipo = await query(movimentacoesTipoQuery, unidadeId ? [unidadeId] : []);

    // Movimentações diárias (últimos 7 dias)
    let movimentacoesDiariasQuery = `
      SELECT 
        DATE(m.data_movimentacao) as data,
        m.tipo,
        COUNT(*) as quantidade
      FROM movimentacoes_estoque m
      ${unidadeId ? 'JOIN produtos p ON m.produto_id = p.id' : ''}
      WHERE m.data_movimentacao >= CURRENT_DATE - INTERVAL '7 days'
      ${unidadeId ? 'AND p.unidade_id = $1' : ''}
      GROUP BY DATE(m.data_movimentacao), m.tipo
      ORDER BY data
    `;
    
    const movimentacoesDiarias = await query(movimentacoesDiariasQuery, unidadeId ? [unidadeId] : []);

    // Produtos mais movimentados
    let produtosMovimentadosQuery = `
      SELECT 
        p.nome,
        p.codigo,
        COUNT(m.id) as total_movimentacoes,
        SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END) as total_entradas,
        SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END) as total_saidas
      FROM produtos p
      LEFT JOIN movimentacoes_estoque m ON p.id = m.produto_id
      WHERE 1=1
      ${unidadeId ? 'AND p.unidade_id = $1' : ''}
      AND (m.data_movimentacao >= CURRENT_DATE - INTERVAL '30 days' OR m.data_movimentacao IS NULL)
      GROUP BY p.id, p.nome, p.codigo
      ORDER BY total_movimentacoes DESC
      LIMIT 5
    `;
    
    const produtosMaisMovimentados = await query(produtosMovimentadosQuery, unidadeId ? [unidadeId] : []);

    // Produtos com estoque baixo
    console.log('Executando query de produtos com estoque baixo...');
    const estoqueBaixoQuery = `
      SELECT COUNT(*) as total
      FROM produtos 
      WHERE estoque_atual <= estoque_minimo
        ${unidadeId ? 'AND unidade_id = $1' : ''}
    `;
    const estoqueBaixoResult = await query(estoqueBaixoQuery, unidadeId ? [unidadeId] : []);
    console.log('Produtos com estoque baixo executados com sucesso:', estoqueBaixoResult.rows[0]);

    // Manutenções pendentes (usando tabela de manutenções se existir)
    console.log('Executando query de manutenções pendentes...');
    let manutencoesResult;
    try {
      const manutencoesQuery = `
        SELECT COUNT(*) as total
        FROM manutencoes m
        JOIN viaturas v ON m.viatura_id = v.id
        WHERE m.status = 'agendada' AND m.data_manutencao <= CURRENT_DATE
        ${unidadeId ? 'AND v.unidade_id = $1' : ''}
      `;
      manutencoesResult = await query(manutencoesQuery, unidadeId ? [unidadeId.toString()] : []);
    } catch (error) {
      // Se a tabela manutencoes não existir, retornar 0
      console.log('Tabela manutencoes não encontrada, retornando 0');
      manutencoesResult = { rows: [{ total: '0' }] };
    }
    console.log('Manutenções pendentes executadas com sucesso:', manutencoesResult.rows[0]);

    res.json({
      estatisticas_produtos: estatisticasProdutos.rows[0],
      movimentacoes_por_tipo: movimentacoesPorTipo.rows,
      movimentacoes_diarias: movimentacoesDiarias.rows,
      produtos_mais_movimentados: produtosMaisMovimentados.rows,
      produtos_baixo_estoque: estoqueBaixoResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard almoxarifado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard do módulo Empréstimos
router.get('/emprestimos', async (req, res) => {
  try {
    const unidadeId = req.unidade?.id;
    
    // Estatísticas de empréstimos
    let emprestimosQuery = `
      SELECT 
        COUNT(*) as total_emprestimos,
        COUNT(CASE WHEN e.status = 'ativo' THEN 1 END) as ativos,
        COUNT(CASE WHEN e.status = 'devolvido' THEN 1 END) as devolvidos,
        COUNT(CASE WHEN e.status = 'ativo' AND e.data_prevista_devolucao < CURRENT_DATE THEN 1 END) as vencidos
      FROM emprestimos e
      ${unidadeId ? 'JOIN equipamentos eq ON e.equipamento_id = eq.id WHERE eq.unidade_id = $1' : ''}
    `;
    
    const estatisticasEmprestimos = await query(emprestimosQuery, unidadeId ? [unidadeId] : []);

    // Estatísticas de equipamentos
    let equipamentosQuery = `
      SELECT 
        COUNT(*) as total_equipamentos,
        COUNT(CASE WHEN status = 'disponivel' THEN 1 END) as disponiveis,
        COUNT(CASE WHEN status = 'emprestado' THEN 1 END) as emprestados,
        COUNT(CASE WHEN status = 'manutencao' THEN 1 END) as em_manutencao
      FROM equipamentos
      ${unidadeId ? 'WHERE unidade_id = $1' : ''}
    `;
    
    const estatisticasEquipamentos = await query(equipamentosQuery, unidadeId ? [unidadeId] : []);

    // Empréstimos por mês (últimos 6 meses)
    let emprestimosMesQuery = `
      SELECT 
        TO_CHAR(e.data_emprestimo, 'YYYY-MM') as mes,
        COUNT(*) as quantidade
      FROM emprestimos e
      ${unidadeId ? 'JOIN equipamentos eq ON e.equipamento_id = eq.id' : ''}
      WHERE e.data_emprestimo >= CURRENT_DATE - INTERVAL '6 months'
      ${unidadeId ? 'AND eq.unidade_id = $1' : ''}
      GROUP BY TO_CHAR(e.data_emprestimo, 'YYYY-MM')
      ORDER BY mes
    `;
    
    const emprestimosPorMes = await query(emprestimosMesQuery, unidadeId ? [unidadeId] : []);

    // Equipamentos mais emprestados
    let equipamentosMaisEmprestadosQuery = `
      SELECT 
        eq.codigo,
        eq.nome,
        eq.marca,
        COUNT(e.id) as total_emprestimos
      FROM equipamentos eq
      LEFT JOIN emprestimos e ON eq.id = e.equipamento_id
      WHERE 1=1
      ${unidadeId ? 'AND eq.unidade_id = $1' : ''}
      GROUP BY eq.id, eq.codigo, eq.nome, eq.marca
      ORDER BY total_emprestimos DESC
      LIMIT 5
    `;
    
    const equipamentosMaisEmprestados = await query(equipamentosMaisEmprestadosQuery, unidadeId ? [unidadeId] : []);

    // Empréstimos vencidos
    const emprestimosVencidosQuery = `
      SELECT COUNT(*) as total
      FROM emprestimos e
      ${unidadeId ? 'JOIN equipamentos eq ON e.equipamento_id = eq.id' : ''}
      WHERE e.data_prevista_devolucao < CURRENT_DATE 
        AND e.status = 'ativo'
        ${unidadeId ? 'AND eq.unidade_id = $1' : ''}
    `;
    const emprestimosVencidosResult = await query(emprestimosVencidosQuery, unidadeId ? [unidadeId] : []);

    // Produtos com estoque baixo
    const estoqueBaixoQuery = `
      SELECT COUNT(*) as total
      FROM produtos 
      WHERE estoque_atual <= estoque_minimo
        ${unidadeId ? 'AND unidade_id = $1' : ''}
    `;
    const estoqueBaixoResult = await query(estoqueBaixoQuery, unidadeId ? [unidadeId] : []);
    console.log('Produtos com estoque baixo executados com sucesso:', estoqueBaixoResult.rows[0]);

    // Manutenções pendentes (usando tabela de manutenções se existir)
    let manutencoesResult;
    try {
      const manutencoesQuery = `
        SELECT COUNT(*) as total
        FROM manutencoes m
        JOIN viaturas v ON m.viatura_id = v.id
        WHERE m.status = 'agendada' AND m.data_manutencao <= CURRENT_DATE
        ${unidadeId ? 'AND v.unidade_id = $1' : ''}
      `;
      manutencoesResult = await query(manutencoesQuery, unidadeId ? [unidadeId] : []);
    } catch (error) {
      // Se a tabela manutencoes não existir, retornar 0
      console.log('Tabela manutencoes não encontrada, retornando 0');
      manutencoesResult = { rows: [{ total: '0' }] };
    }
    console.log('Manutenções pendentes executadas com sucesso:', manutencoesResult.rows[0]);

    res.json({
      estatisticas_emprestimos: estatisticasEmprestimos.rows[0],
      estatisticas_equipamentos: estatisticasEquipamentos.rows[0],
      emprestimos_por_mes: emprestimosPorMes.rows,
      equipamentos_mais_emprestados: equipamentosMaisEmprestados.rows,
      emprestimos_vencidos: emprestimosVencidosResult.rows[0].total,
      produtos_estoque_baixo: estoqueBaixoResult.rows[0].total,
      manutencoes_pendentes: manutencoesResult.rows[0].total
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard empréstimos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard do módulo Operacional
router.get('/operacional', async (req, res) => {
  try {
    const unidadeId = req.unidade?.id;
    
    // Estatísticas gerais
    console.log('Iniciando busca de estatísticas gerais...');
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM viaturas ${unidadeId ? 'WHERE unidade_id = $1' : ''}) as total_viaturas,
        (SELECT COUNT(*) FROM equipamentos ${unidadeId ? 'WHERE unidade_id = $2' : ''}) as total_equipamentos,
        (SELECT COUNT(*) FROM produtos ${unidadeId ? 'WHERE unidade_id = $3' : ''}) as total_produtos,
        (SELECT COUNT(*) FROM usuarios WHERE ativo = true ${unidadeId ? 'AND unidade_id = $4' : ''}) as total_usuarios
    `;
    const statsResult = await query(statsQuery, unidadeId ? [parseInt(unidadeId), parseInt(unidadeId), parseInt(unidadeId), parseInt(unidadeId)] : []);
    console.log('Estatísticas gerais executadas com sucesso:', statsResult.rows[0]);
    let estatisticasQuery = `
      SELECT 
        (SELECT COUNT(*) FROM escalas WHERE ativa = true ${unidadeId ? 'AND unidade_id = $1' : ''}) as escalas_ativas,
        (SELECT COUNT(*) FROM trocas_servico WHERE status = 'pendente' ${unidadeId ? 'AND unidade_id = $1' : ''}) as trocas_pendentes,
        (SELECT COUNT(*) FROM servicos_extra WHERE status = 'pendente' ${unidadeId ? 'AND unidade_id = $1' : ''}) as extras_pendentes,
        (SELECT COUNT(*) FROM escala_usuarios eu JOIN escalas e ON eu.escala_id = e.id WHERE eu.data_servico = CURRENT_DATE ${unidadeId ? 'AND e.unidade_id = $1' : ''}) as servicos_hoje
    `;
    
    const estatisticasGerais = await query(estatisticasQuery, unidadeId ? [unidadeId] : []);

    // Serviços por dia (próximos 7 dias)
    let servicosProximosQuery = `
      SELECT 
        eu.data_servico,
        eu.turno,
        COUNT(*) as quantidade_usuarios
      FROM escala_usuarios eu
      ${unidadeId ? 'JOIN escalas e ON eu.escala_id = e.id' : ''}
      WHERE eu.data_servico BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ${unidadeId ? 'AND e.unidade_id = $1' : ''}
      GROUP BY eu.data_servico, eu.turno
      ORDER BY eu.data_servico, eu.turno
    `;
    
    const servicosProximos = await query(servicosProximosQuery, unidadeId ? [unidadeId] : []);

    // Trocas de serviço por status
    let trocasStatusQuery = `
      SELECT 
        status,
        COUNT(*) as quantidade
      FROM trocas_servico
      WHERE data_solicitacao >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY status
    `;
    
    const trocasPorStatus = await query(trocasStatusQuery, unidadeId ? [unidadeId] : []);

    // Serviços extra por mês
    let servicosExtraQuery = `
      SELECT 
        TO_CHAR(data_servico, 'YYYY-MM') as mes,
        COUNT(*) as quantidade,
        SUM(horas) as total_horas,
        SUM(valor) as valor_total
      FROM servicos_extra
      WHERE data_servico >= CURRENT_DATE - INTERVAL '6 months' AND status = 'aprovado'
      GROUP BY TO_CHAR(data_servico, 'YYYY-MM')
      ORDER BY mes
    `;
    
    const servicosExtraPorMes = await query(servicosExtraQuery, unidadeId ? [unidadeId] : []);

    // Usuários com mais serviços (últimos 30 dias)
    let usuariosServicosQuery = `
      SELECT 
        u.nome,
        u.matricula,
        COUNT(eu.id) as servicos_normais,
        COUNT(se.id) as servicos_extra,
        SUM(COALESCE(se.horas, 0)) as total_horas_extra
      FROM usuarios u
      LEFT JOIN escala_usuarios eu ON u.id = eu.usuario_id AND eu.data_servico >= CURRENT_DATE - INTERVAL '30 days'
      LEFT JOIN servicos_extra se ON u.id = se.usuario_id AND se.data_servico >= CURRENT_DATE - INTERVAL '30 days' AND se.status = 'aprovado'
      ${unidadeId ? 'JOIN membros_unidade mu ON u.id = mu.usuario_id' : ''}
      WHERE u.ativo = true
      ${unidadeId ? 'AND mu.unidade_id = $1' : ''}
      GROUP BY u.id, u.nome, u.matricula
      ORDER BY (COUNT(eu.id) + COUNT(se.id)) DESC
      LIMIT 5
    `;
    
    const usuariosComMaisServicos = await query(usuariosServicosQuery, unidadeId ? [unidadeId] : []);

    // Escalas ativas
    let escalasAtivasQuery = `
      SELECT 
        e.nome,
        e.tipo,
        e.data_inicio,
        e.data_fim,
        COUNT(eu.id) as total_usuarios
      FROM escalas e
      LEFT JOIN escala_usuarios eu ON e.id = eu.escala_id
      WHERE e.ativa = true
      ${unidadeId ? 'AND e.unidade_id = $1' : ''}
      GROUP BY e.id, e.nome, e.tipo, e.data_inicio, e.data_fim
      ORDER BY e.data_inicio
    `;
    
    const escalasAtivas = await query(escalasAtivasQuery, unidadeId ? [unidadeId] : []);

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
    const unidadeId = req.unidade?.id;
    let statsQuery;
    if (unidadeId) {
      statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM escalas WHERE ativa = true AND unidade_id = $1) as escalas_ativas,
          (SELECT COUNT(*) FROM trocas_servico WHERE status = 'pendente' AND unidade_id = $1) as trocas_pendentes,
          (SELECT COUNT(*) FROM escala_usuarios eu JOIN escalas e ON eu.escala_id = e.id WHERE eu.data_servico = CURRENT_DATE AND e.unidade_id = $1) as servicos_hoje
      `;
    } else {
      statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM escalas WHERE ativa = true) as escalas_ativas,
          (SELECT COUNT(*) FROM trocas_servico WHERE status = 'pendente') as trocas_pendentes,
          (SELECT COUNT(*) FROM escala_usuarios eu JOIN escalas e ON eu.escala_id = e.id WHERE eu.data_servico = CURRENT_DATE) as servicos_hoje
      `;
    }
    
    const atividadePorModulo = await query(atividadeQuery, unidadeId ? [unidadeId] : []);
    
    // Usuários mais ativos
    let usuariosAtivosQuery = `
      SELECT 
        u.nome,
        u.matricula,
        COUNT(*) as total_atividades
      FROM (
        SELECT cv.usuario_id FROM checklist_viaturas cv ${unidadeId ? 'JOIN viaturas v ON cv.viatura_id = v.id' : ''} WHERE cv.data_checklist >= CURRENT_DATE - INTERVAL '${periodo} days' ${unidadeId ? 'AND v.unidade_id = $1' : ''}
        UNION ALL
        SELECT me.usuario_id FROM movimentacoes_estoque me ${unidadeId ? 'JOIN produtos p ON me.produto_id = p.id' : ''} WHERE me.data_movimentacao >= CURRENT_DATE - INTERVAL '${periodo} days' ${unidadeId ? 'AND p.unidade_id = $1' : ''}
        UNION ALL
        SELECT e.usuario_solicitante_id as usuario_id FROM emprestimos e ${unidadeId ? 'JOIN equipamentos eq ON e.equipamento_id = eq.id' : ''} WHERE e.data_emprestimo >= CURRENT_DATE - INTERVAL '${periodo} days' ${unidadeId ? 'AND eq.unidade_id = $1' : ''}
      ) atividades
      JOIN usuarios u ON atividades.usuario_id = u.id
      ${unidadeId ? 'JOIN membros_unidade mu ON u.id = mu.usuario_id AND mu.unidade_id = $1' : ''}
      GROUP BY u.id, u.nome, u.matricula
      ORDER BY total_atividades DESC
      LIMIT 10
    `;
    
    const usuariosMaisAtivos = await query(usuariosAtivosQuery, unidadeId ? [unidadeId] : []);

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