const { query } = require('../config/database');

const fixUserUnits = async () => {
  try {
    console.log('🔄 Iniciando correção de dados de usuários e unidades...');
    
    // 1. Verificar se existem unidades
    const unidadesResult = await query('SELECT * FROM unidades ORDER BY id LIMIT 5');
    console.log(`📋 Unidades encontradas: ${unidadesResult.rows.length}`);
    
    if (unidadesResult.rows.length === 0) {
      console.log('⚠️ Nenhuma unidade encontrada. Executando migração multi-tenant...');
      const { createMultiTenantTables } = require('./migrate_multitenant');
      await createMultiTenantTables();
      
      // Verificar novamente
      const novasUnidades = await query('SELECT * FROM unidades ORDER BY id LIMIT 5');
      console.log(`📋 Unidades criadas: ${novasUnidades.rows.length}`);
    }
    
    // 2. Verificar usuários sem unidade de lotação
    const usuariosSemLotacao = await query(`
      SELECT id, nome, email 
      FROM usuarios 
      WHERE unidade_id IS NULL
    `);
    
    console.log(`👥 Usuários sem unidade de lotação: ${usuariosSemLotacao.rows.length}`);
    
    if (usuariosSemLotacao.rows.length > 0) {
      // Pegar a primeira unidade disponível
      const primeiraUnidade = await query('SELECT id FROM unidades WHERE ativa = true ORDER BY id LIMIT 1');
      
      if (primeiraUnidade.rows.length > 0) {
        const unidadeId = primeiraUnidade.rows[0].id;
        
        for (const usuario of usuariosSemLotacao.rows) {
          console.log(`🔧 Atribuindo unidade ${unidadeId} ao usuário ${usuario.nome} (${usuario.email})`);
          
          // Atualizar unidade de lotação
          await query(
            'UPDATE usuarios SET unidade_id = $1 WHERE id = $2',
            [unidadeId, usuario.id]
          );
          
          // Verificar se já existe relacionamento na tabela membros_unidade
          const membroExiste = await query(
            'SELECT id FROM membros_unidade WHERE usuario_id = $1 AND unidade_id = $2',
            [usuario.id, unidadeId]
          );
          
          if (membroExiste.rows.length === 0) {
            // Criar relacionamento na tabela membros_unidade
            await query(
              'INSERT INTO membros_unidade (usuario_id, unidade_id, ativo) VALUES ($1, $2, true)',
              [usuario.id, unidadeId]
            );
            console.log(`✅ Relacionamento criado na tabela membros_unidade`);
          } else {
            console.log(`ℹ️ Relacionamento já existe na tabela membros_unidade`);
          }
        }
      } else {
        console.log('❌ Nenhuma unidade ativa encontrada!');
      }
    }
    
    // 3. Verificar se todos os usuários têm acesso a pelo menos uma unidade
    const usuariosSemAcesso = await query(`
      SELECT u.id, u.nome, u.email 
      FROM usuarios u
      LEFT JOIN membros_unidade mu ON u.id = mu.usuario_id AND mu.ativo = true
      WHERE mu.id IS NULL
    `);
    
    console.log(`👥 Usuários sem acesso a unidades: ${usuariosSemAcesso.rows.length}`);
    
    if (usuariosSemAcesso.rows.length > 0) {
      const primeiraUnidade = await query('SELECT id FROM unidades WHERE ativa = true ORDER BY id LIMIT 1');
      
      if (primeiraUnidade.rows.length > 0) {
        const unidadeId = primeiraUnidade.rows[0].id;
        
        for (const usuario of usuariosSemAcesso.rows) {
          console.log(`🔧 Dando acesso à unidade ${unidadeId} para o usuário ${usuario.nome}`);
          
          // Verificar se já existe relacionamento antes de inserir
          const membroExiste = await query(
            'SELECT id FROM membros_unidade WHERE usuario_id = $1 AND unidade_id = $2',
            [usuario.id, unidadeId]
          );
          
          if (membroExiste.rows.length === 0) {
            await query(
              'INSERT INTO membros_unidade (usuario_id, unidade_id, ativo) VALUES ($1, $2, true)',
              [usuario.id, unidadeId]
            );
            console.log(`✅ Relacionamento criado`);
          } else {
            // Atualizar para ativo se existir mas estiver inativo
            await query(
              'UPDATE membros_unidade SET ativo = true WHERE usuario_id = $1 AND unidade_id = $2',
              [usuario.id, unidadeId]
            );
            console.log(`✅ Relacionamento ativado`);
          }
        }
      }
    }
    
    // 4. Relatório final
    console.log('\n📊 Relatório final:');
    
    const totalUnidades = await query('SELECT COUNT(*) as total FROM unidades WHERE ativa = true');
    console.log(`   📋 Unidades ativas: ${totalUnidades.rows[0].total}`);
    
    const totalUsuarios = await query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true');
    console.log(`   👥 Usuários ativos: ${totalUsuarios.rows[0].total}`);
    
    const usuariosComLotacao = await query('SELECT COUNT(*) as total FROM usuarios WHERE unidade_id IS NOT NULL AND ativo = true');
    console.log(`   🏢 Usuários com lotação: ${usuariosComLotacao.rows[0].total}`);
    
    const relacionamentos = await query('SELECT COUNT(*) as total FROM membros_unidade WHERE ativo = true');
    console.log(`   🔗 Relacionamentos ativos: ${relacionamentos.rows[0].total}`);
    
    console.log('\n✅ Correção concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
    throw error;
  }
};

if (require.main === module) {
  fixUserUnits()
    .then(() => {
      console.log('🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = { fixUserUnits };