const http = require('http');
const querystring = require('querystring');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAuth() {
  try {
    console.log('Testando login...');
    
    // Tentar fazer login com credenciais padrão
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginData = {
       email: 'admin@cbmgo.gov.br',
       senha: 'admin123'
     };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    
    if (loginResponse.status !== 200) {
      console.error('Erro no login:', loginResponse.data);
      return;
    }
    
    console.log('Login bem-sucedido!');
    console.log('Token:', loginResponse.data.token.substring(0, 50) + '...');
    console.log('Usuário:', loginResponse.data.user.nome);
    
    const token = loginResponse.data.token;
    
    console.log('\nTestando API de templates por viatura...');
    
    // Testar a API que estava falhando
    const templatesOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/frota/checklist-templates/viatura/1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const templatesResponse = await makeRequest(templatesOptions);
    
    if (templatesResponse.status !== 200) {
      console.error('Erro ao buscar templates:', templatesResponse.data);
      return;
    }
    
    console.log('Templates encontrados:', templatesResponse.data.templates.length);
    console.log('Tipo da viatura:', templatesResponse.data.tipoViatura);
    
    templatesResponse.data.templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.nome} (${template.padrao ? 'Padrão' : 'Personalizado'})`);
    });
    
    console.log('\n✅ Teste concluído com sucesso! A API está funcionando corretamente.');
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testAuth();