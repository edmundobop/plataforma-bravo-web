import axios from 'axios';

// Configuração base da API
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Adicionar cabeçalho X-Tenant-ID se disponível
    const currentUnitId = localStorage.getItem('currentUnitId');
    if (currentUnitId) {
      config.headers['X-Tenant-ID'] = currentUnitId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se o token expirou ou é inválido
    if (error.response?.status === 401) {
      // Remover token inválido
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      
      // Redirecionar para login se não estiver na página de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Serviços de militares (agora usando endpoints de usuarios com filtro tipo=militar)
export const militaresService = {
  // Listar militares com filtros e paginação
  getMilitares: (params) => {
    const militarParams = { ...params, tipo: 'militar' };
    return api.get('/usuarios', { params: militarParams });
  },
  
  // Buscar militar por ID
  getMilitarById: (id) => api.get(`/usuarios/${id}`),
  
  // Criar novo militar
  createMilitar: (militarData) => {
    const userData = { ...militarData, tipo: 'militar' };
    return api.post('/usuarios', userData);
  },
  
  // Atualizar militar
  updateMilitar: (id, militarData) => {
    const userData = { ...militarData, tipo: 'militar' };
    return api.put(`/usuarios/${id}`, userData);
  },
  
  // Excluir militar
  deleteMilitar: (id) => api.delete(`/usuarios/${id}`),
  
  // Buscar militares para autocomplete
  getMilitaresForAutocomplete: () => api.get('/usuarios/autocomplete', { params: { tipo: 'militar' } }),
  
  // Buscar unidades disponíveis (com autenticação)
  getUnidades: () => api.get('/usuarios/data/unidades'),
  
  // Buscar unidades públicas (sem autenticação)
  getUnidadesPublicas: () => {
    const publicApi = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return publicApi.get('/usuarios/unidades-publicas');
  },
  
  // Buscar setores disponíveis
  getSetores: () => api.get('/usuarios/data/setores'),
  
  // Buscar funções disponíveis
  getFuncoes: () => api.get('/usuarios/data/funcoes'),
  
  // Buscar postos e graduações
  getPostosGraduacoes: () => api.get('/usuarios/postos-graduacoes'),
  
  // Validar CPF único
  validateCPF: (cpf, excludeId = null) => api.post('/usuarios/validate-cpf', { cpf, excludeId }),
  
  // Validar identidade militar única
  validateIdentidadeMilitar: (identidade, excludeId = null) => 
    api.post('/usuarios/validate-identidade', { identidade_militar: identidade, excludeId }),
  
  // Buscar estatísticas de militares
  getEstatisticas: () => api.get('/usuarios/estatisticas', { params: { tipo: 'militar' } }),
  
  // Exportar dados de militares
  exportMilitares: (params) => {
    const militarParams = { ...params, tipo: 'militar' };
    return api.get('/usuarios/export', { 
      params: militarParams,
      responseType: 'blob'
    });
  },
  
  // Importar dados de militares
  importMilitares: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', 'militar');
    
    return api.post('/usuarios/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Método público para solicitação de cadastro (sem autenticação)
  solicitarCadastro: (dadosMilitar) => {
    // Criar uma instância separada sem interceptors de autenticação
    const publicApi = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const dadosComTipo = { ...dadosMilitar, tipo: 'militar' };
    if (!dadosComTipo.matricula && dadosComTipo.identidade_militar) {
      dadosComTipo.matricula = dadosComTipo.identidade_militar;
    }
    return publicApi.post('/usuarios/solicitar-cadastro', dadosComTipo);
  },

  // Métodos para administração de solicitações
  getSolicitacoesPendentes: (params = {}) => {
    const militarParams = { ...params, tipo: 'militar' };
    return api.get('/usuarios/solicitacoes-pendentes', { params: militarParams });
  },

  aprovarCadastro: (id, acao, observacoes_aprovacao = '', setor = '', funcao = '', role = '') => {
    const data = {
      acao, // 'aprovar' ou 'rejeitar'
      observacoes_aprovacao
    };
    
    // Adicionar campos obrigatórios se for aprovação
    if (acao === 'aprovar') {
      data.setor = setor;
      data.funcao = funcao;
      data.role = role;
    }
    
    return api.post(`/usuarios/aprovar-cadastro/${id}`, data);
  },
};

export default militaresService;
