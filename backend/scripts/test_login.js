const axios = require('axios');

(async () => {
  try {
    const baseURL = process.env.API_URL || 'http://localhost:5000/api';
    const email = process.env.TEST_EMAIL || 'admin@example.com';
    const senha = process.env.TEST_PASSWORD || '123456';

    const loginResp = await axios.post(baseURL + '/auth/login', { email, senha }, {
      headers: { 'Content-Type': 'application/json' }
    });
    const token = loginResp.data.token;
    console.log('Token obtido:', token ? token.substring(0, 24) + '...' : null);

    const verifyResp = await axios.get(baseURL + '/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Verify:', verifyResp.status, verifyResp.data.valid);
    process.exit(0);
  } catch (e) {
    console.error('Falha no teste de login:', e.response ? e.response.status + ' ' + JSON.stringify(e.response.data) : e.message);
    process.exit(1);
  }
})();
