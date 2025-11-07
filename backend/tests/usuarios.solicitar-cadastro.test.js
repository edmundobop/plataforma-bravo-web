const request = require('supertest');

describe('POST /api/usuarios/solicitar-cadastro', () => {
  it('deve aceitar uma solicitação pública de cadastro (militar)', async () => {
    const ts = Date.now();
    const cpfUnique = String(ts).slice(-11).padEnd(11, '0');
    const payload = {
      nome_completo: `Teste Jest ${ts}`,
      email: `jest_${ts}@example.com`,
      cpf: cpfUnique,
      telefone: '62999999999',
      tipo: 'militar',
      posto_graduacao: 'Soldado',
      nome_guerra: 'Teste',
      matricula: `MT${ts}`,
      data_nascimento: '1990-01-01',
      data_incorporacao: '2020-01-01',
      unidade_id: 1,
      observacoes: 'Teste via Jest'
    };

    const res = await request('http://localhost:5000')
      .post('/api/usuarios/solicitar-cadastro')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('email', payload.email);
  });
});