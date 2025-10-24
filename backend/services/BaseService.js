const { query } = require('../config/database');

class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
  }

  // Aplicar filtro de unidade automaticamente
  applyTenantFilter(baseQuery, params, unidadeId) {
    if (!unidadeId) {
      return { query: baseQuery, params };
    }

    // Verificar se a query já tem WHERE clause
    const hasWhere = baseQuery.toLowerCase().includes('where');
    const connector = hasWhere ? 'AND' : 'WHERE';
    
    const tenantQuery = `${baseQuery} ${connector} ${this.tableName}.unidade_id = $${params.length + 1}`;
    const tenantParams = [...params, unidadeId];

    return {
      query: tenantQuery,
      params: tenantParams
    };
  }

  // Buscar todos os registros com filtro de tenant
  async findAll(unidadeId, additionalWhere = '', additionalParams = []) {
    let baseQuery = `SELECT * FROM ${this.tableName}`;
    
    if (additionalWhere) {
      baseQuery += ` WHERE ${additionalWhere}`;
    }
    
    const { query: finalQuery, params: finalParams } = this.applyTenantFilter(
      baseQuery, 
      additionalParams, 
      unidadeId
    );

    return await query(finalQuery, finalParams);
  }

  // Buscar por ID com filtro de tenant
  async findById(id, unidadeId) {
    const { query: finalQuery, params: finalParams } = this.applyTenantFilter(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id],
      unidadeId
    );

    return await query(finalQuery, finalParams);
  }

  // Criar registro com unidade_id
  async create(data, unidadeId) {
    if (unidadeId) {
      data.unidade_id = unidadeId;
    }

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(data);

    const insertQuery = `
      INSERT INTO ${this.tableName} (${columns}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;

    return await query(insertQuery, values);
  }

  // Atualizar registro com verificação de tenant
  async update(id, data, unidadeId) {
    const setClause = Object.keys(data)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(data)];
    
    const { query: finalQuery, params: finalParams } = this.applyTenantFilter(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1`,
      values,
      unidadeId
    );

    finalQuery += ' RETURNING *';

    return await query(finalQuery, finalParams);
  }

  // Deletar registro com verificação de tenant
  async delete(id, unidadeId) {
    const { query: finalQuery, params: finalParams } = this.applyTenantFilter(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id],
      unidadeId
    );

    return await query(finalQuery, finalParams);
  }
}

module.exports = BaseService;