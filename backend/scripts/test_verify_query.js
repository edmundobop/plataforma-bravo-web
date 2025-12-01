const jwt = require('jsonwebtoken');
const axios = require('axios');
const { query } = require('../config/database');
const { getUsuariosUnidadeColumn, columnExists, tableExists } = require('../utils/schema');

(async () => {
  try {
    const baseURL = process.env.API_URL || 'http://localhost:5000/api';
    const email = process.env.TEST_EMAIL || 'admin@example.com';
    const senha = process.env.TEST_PASSWORD || '123456';
    const loginResp = await axios.post(baseURL + '/auth/login', { email, senha }, { headers: { 'Content-Type': 'application/json' } });
    const token = loginResp.data.token;
    const jwtSecret = process.env.JWT_SECRET && String(process.env.JWT_SECRET).trim() !== ''
      ? process.env.JWT_SECRET
      : 'dev-secret';
    const decoded = jwt.verify(token, jwtSecret);

    const unidadeCol = await getUsuariosUnidadeColumn();
    const unidadeSelect = unidadeCol ? ('u.' + unidadeCol + ' as unidade_id') : 'NULL as unidade_id';
    const hasUnidadesTable = await tableExists('unidades');
    const hasSetoresTable = await tableExists('setores');
    const hasFuncoesTable = await tableExists('funcoes');
    const hasSetorIdCol = await columnExists('usuarios', 'setor_id');
    const hasSetorTextCol = await columnExists('usuarios', 'setor');
    const hasFuncaoIdCol = await columnExists('usuarios', 'funcao_id');
    const hasFuncoesTextCol = await columnExists('usuarios', 'funcoes');
    const hasUnSigla = hasUnidadesTable && await columnExists('unidades', 'sigla');
    const hasUnTipo = hasUnidadesTable && await columnExists('unidades', 'tipo');
    const hasSetorSigla = hasSetoresTable && await columnExists('setores', 'sigla');
    const hasPerfilPermissoes = await columnExists('perfis', 'permissoes');
    const hasPerfilDescricao = await columnExists('perfis', 'descricao');
    const unidadeCampos = (unidadeCol && hasUnidadesTable)
      ? ('un.nome as unidade_nome, ' + (hasUnSigla ? 'un.sigla' : 'NULL') + ' as unidade_sigla, ' + (hasUnTipo ? 'un.tipo' : 'NULL') + ' as unidade_tipo,')
      : 'NULL as unidade_nome, NULL as unidade_sigla, NULL as unidade_tipo,';
    const setorCampos = (hasSetoresTable && hasSetorIdCol)
      ? ('s.nome as setor_nome, ' + (hasSetorSigla ? 's.sigla' : 'NULL') + ' as setor_sigla,')
      : (hasSetorTextCol
        ? 'u.setor as setor_nome, NULL as setor_sigla,'
        : 'NULL as setor_nome, NULL as setor_sigla,');
    const funcaoCampo = hasFuncoesTable ? 'f.nome as funcao_nome' : 'NULL as funcao_nome';
    const funcoesCampo = hasFuncoesTextCol ? 'u.funcoes' : 'NULL';
    const unidadeJoin = (unidadeCol && hasUnidadesTable) ? ('LEFT JOIN unidades un ON u.' + unidadeCol + ' = un.id') : '';
    const setorJoin = (hasSetoresTable && hasSetorIdCol) ? 'LEFT JOIN setores s ON u.setor_id = s.id' : '';
    const funcaoJoin = (hasFuncoesTable && hasFuncaoIdCol) ? 'LEFT JOIN funcoes f ON u.funcao_id = f.id' : '';

    const sql = `
      SELECT 
        u.id,
        u.nome_completo,
        u.email,
        u.cpf,
        u.telefone,
        u.tipo,
        u.posto_graduacao,
        u.nome_guerra,
        u.matricula,
        u.ativo,
        u.ultimo_login,
        ${unidadeSelect},
        ${hasSetorIdCol ? 'u.setor_id' : 'NULL'} as setor_id,
        ${hasFuncaoIdCol ? 'u.funcao_id' : 'NULL'} as funcao_id,
        ${funcoesCampo} as funcoes,
        p.id as perfil_id,
        p.nome as perfil_nome,
        ${hasPerfilDescricao ? 'p.descricao' : 'NULL'} as perfil_descricao,
        NULL as nivel_hierarquia,
        ${hasPerfilPermissoes ? 'p.permissoes' : 'NULL'} as permissoes,
        ${unidadeCampos}
        ${setorCampos}
        ${funcaoCampo}
      FROM usuarios u
      LEFT JOIN perfis p ON u.perfil_id = p.id
      ${unidadeJoin}
      ${setorJoin}
      ${funcaoJoin}
      WHERE u.id = $1 AND u.ativo = true
    `;
    const result = await query(sql, [decoded.userId]);
    console.log('Rows:', result.rows.length);
    console.log('Row sample:', result.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
})();
