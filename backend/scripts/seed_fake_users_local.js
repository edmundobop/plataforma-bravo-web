const { query } = require('../config/database');

(async () => {
  try {
    await query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    const preferred = process.env.SEED_UNIT_ID ? parseInt(process.env.SEED_UNIT_ID, 10) : null;
    let unitRow;
    if (preferred && !Number.isNaN(preferred)) {
      unitRow = await query('SELECT id, nome FROM unidades WHERE id = $1 AND ativa = true', [preferred]);
    }
    if (!unitRow || unitRow.rows.length === 0) {
      unitRow = await query('SELECT id, nome FROM unidades WHERE ativa = true ORDER BY id LIMIT 1');
    }
    const seedUnitId = unitRow.rows[0]?.id;
    const seedUnitName = unitRow.rows[0]?.nome;

    const sql = `
      WITH unidade_ref AS (
        SELECT $1::int AS unidade_id
      ),
      perfil_operador AS (
        SELECT id AS perfil_id FROM perfis WHERE nome = 'Operador' LIMIT 1
      )
      INSERT INTO usuarios (
        nome_completo, nome, email, senha_hash, cpf, telefone, tipo, data_nascimento,
        data_incorporacao, posto_graduacao, nome_guerra, matricula, ativo, perfil_id,
        unidade_id, unidade_lotacao_id, setor, created_at, updated_at
      )
      SELECT
        novo.nome_completo,
        novo.nome_curto,
        novo.email,
        crypt('Senha123!', gen_salt('bf')),
        novo.cpf,
        novo.telefone,
        'militar',
        novo.data_nascimento::date,
        novo.data_incorporacao::date,
        novo.posto,
        novo.nome_guerra,
        novo.matricula,
        true,
        perfil_operador.perfil_id,
        unidade_ref.unidade_id,
        unidade_ref.unidade_id,
        novo.setor,
        NOW(), NOW()
      FROM (
        VALUES
          ('Marina Almeida Costa','Marina Costa','marina.costa@cbmgo.gov.br','013.452.987-05','(62) 99911-4401','1989-03-10','2010-01-05','1º Ten','Costa','CBM-9001','Seção Operacional'),
          ('Eduardo Ramos Nogueira','Eduardo Nogueira','eduardo.nogueira@cbmgo.gov.br','024.765.198-44','(62) 99922-4402','1987-07-18','2008-02-12','Cap','Ramos','CBM-9002','Logística'),
          ('Patrícia Souza Martins','Patrícia Martins','patricia.martins@cbmgo.gov.br','051.234.987-11','(62) 99933-4403','1990-11-01','2012-05-20','1º Sgt','Martins','CBM-9003','Recursos Humanos'),
          ('Henrique Lopes Brito','Henrique Brito','henrique.brito@cbmgo.gov.br','089.654.321-77','(62) 99944-4404','1985-04-25','2006-09-14','Cap','Brito','CBM-9004','Centro de Operações'),
          ('Fernanda Pires Machado','Fernanda Machado','fernanda.machado@cbmgo.gov.br','063.219.874-33','(62) 99955-4405','1992-09-07','2014-03-02','2º Ten','Machado','CBM-9005','Seção Administrativa'),
          ('Rafael Teixeira Prado','Rafael Prado','rafael.prado@cbmgo.gov.br','072.854.119-02','(62) 99966-4406','1988-12-16','2009-08-11','1º Sgt','Prado','CBM-9006','Manutenção de Viaturas'),
          ('Isabela Rocha Guimarães','Isabela Guimarães','isabela.guimaraes@cbmgo.gov.br','034.511.628-90','(62) 99977-4407','1993-05-30','2015-06-08','2º Ten','Guimarães','CBM-9007','Comunicação Social'),
          ('Thiago Menezes Faria','Thiago Faria','thiago.faria@cbmgo.gov.br','081.732.549-12','(62) 99988-4408','1986-01-22','2007-10-03','Maj','Faria','CBM-9008','Planejamento'),
          ('Luciana Dias Ferraz','Luciana Ferraz','luciana.ferraz@cbmgo.gov.br','096.510.243-58','(62) 99999-4409','1991-06-11','2013-04-17','1º Ten','Ferraz','CBM-9009','Serviço Técnico'),
          ('Bruno Andrade Queiroz','Bruno Queiroz','bruno.queiroz@cbmgo.gov.br','015.768.492-66','(62) 99900-4410','1984-08-04','2005-11-21','Cap','Queiroz','CBM-9010','Inteligência Operacional')
      ) AS novo (
        nome_completo, nome_curto, email, cpf, telefone, data_nascimento,
        data_incorporacao, posto, nome_guerra, matricula, setor
      )
      LEFT JOIN unidade_ref ON true
      LEFT JOIN perfil_operador ON true
      WHERE NOT EXISTS (
        SELECT 1 FROM usuarios u WHERE u.email = novo.email OR u.matricula = novo.matricula
      );
    `;

    console.log('Usando unidade para lotação do seed:', { id: seedUnitId, nome: seedUnitName });
    await query(sql, [seedUnitId]);

    const count = await query(
      `SELECT COUNT(*) AS total FROM usuarios WHERE matricula LIKE 'CBM-90%'`
    );
    const list = await query(
      `SELECT email, matricula FROM usuarios WHERE matricula LIKE 'CBM-90%' ORDER BY matricula`
    );

    console.log('Total inserido/registrado com prefixo CBM-90:', count.rows[0].total);
    console.table(list.rows);
    process.exit(0);
  } catch (e) {
    console.error('Falha ao inserir usuários fictícios (local):', e.message);
    process.exit(1);
  }
})();
