import api from './api';

const checklistTemplateService = {
  // Listar todos os templates
  getTemplates: () => {
    return api.get('/frota/checklist-templates');
  },

  // Buscar template por ID
  getTemplateById: (id) => {
    return api.get(`/frota/checklist-templates/${id}`);
  },

  // Buscar template por tipo de viatura
  getTemplateByTipo: (tipo) => {
    return api.get(`/frota/checklist-templates/tipo/${tipo}`);
  },

  // Buscar templates por viatura específica
  getTemplatesByViatura: (viaturaId) => {
    return api.get(`/frota/checklist-templates/viatura/${viaturaId}`);
  },

  // Criar novo template
  createTemplate: (templateData) => {
    return api.post('/frota/checklist-templates', templateData);
  },

  // Atualizar template
  updateTemplate: (id, templateData) => {
    return api.put(`/frota/checklist-templates/${id}`, templateData);
  },

  // Excluir template
  deleteTemplate: (id) => {
    return api.delete(`/frota/checklist-templates/${id}`);
  },

  // Duplicar template
  duplicateTemplate: (id, newName) => {
    return api.post(`/frota/checklist-templates/${id}/duplicate`, { nome: newName });
  },

  // Definir template padrão para um tipo de viatura
  setDefaultTemplate: (templateId, tipoViatura) => {
    return api.post(`/frota/checklist-templates/${templateId}/set-default`, { tipo_viatura: tipoViatura });
  }
};

export default checklistTemplateService;