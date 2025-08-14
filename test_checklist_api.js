const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function testChecklistAPI() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: process.env.DB_USER + '@bombeiros.gov.br',
      senha: process.env.DB_PASSWORD
    });
    
    const token = loginResponse.data.token;
    console.log('Login realizado com sucesso');
    
    // Buscar checklists pendentes
    const checklistsResponse = await axios.get('http://localhost:5000/api/frota/checklists/pendentes', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('=== CHECKLISTS PENDENTES ===');
    console.log('Total de checklists:', checklistsResponse.data.length);
    
    if (checklistsResponse.data.length > 0) {
      const checklist = checklistsResponse.data[0];
      console.log('\n=== PRIMEIRO CHECKLIST ===');
      console.log('ID:', checklist.id);
      console.log('Viatura:', checklist.viatura_prefixo);
      console.log('KM Inicial:', checklist.km_inicial);
      console.log('Combustível Inicial:', checklist.combustivel_inicial);
      console.log('Checklist Motorista:', checklist.checklist_motorista);
      console.log('Itens:', checklist.itens);
      
      // Buscar checklist específico por ID
      const checklistByIdResponse = await axios.get(`http://localhost:5000/api/frota/checklists/${checklist.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('\n=== CHECKLIST POR ID ===');
      const checklistById = checklistByIdResponse.data;
      console.log('ID:', checklistById.id);
      console.log('KM Inicial:', checklistById.km_inicial);
      console.log('Combustível Inicial:', checklistById.combustivel_inicial);
      console.log('Checklist Motorista:', checklistById.checklist_motorista);
      console.log('Itens:', checklistById.itens);
    }
    
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

testChecklistAPI();