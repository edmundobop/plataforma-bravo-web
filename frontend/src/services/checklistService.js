import api from './api';

const checklistService = {
  // Buscar checklists pendentes do dia
  getChecklistsPendentes: (dataChecklist) => {
    const params = dataChecklist ? { data_checklist: dataChecklist } : {};
    return api.get('/frota/checklists/pendentes', { params });
  },

  // Gerar checklists diários
  gerarChecklistsDiarios: (dataChecklist) => {
    return api.post('/frota/checklists/gerar-diarios', { data_checklist: dataChecklist });
  },

  // Buscar checklist por ID
  getChecklistById: (id) => {
    return api.get(`/frota/checklists/${id}`);
  },

  // Atualizar checklist
  updateChecklist: (id, data) => {
    return api.put(`/frota/checklists/${id}`, data);
  },

  // Finalizar checklist com assinatura
  finalizarChecklist: (id, assinaturaData) => {
    return api.post(`/frota/checklists/${id}/finalizar`, assinaturaData);
  },

  // Upload de foto
  uploadFoto: (file) => {
    const formData = new FormData();
    formData.append('foto', file);
    return api.post('/upload/foto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

export default checklistService;