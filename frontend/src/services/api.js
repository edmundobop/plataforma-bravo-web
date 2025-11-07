import axios from 'axios';

// Configuração base da API
// Permitir configurar a API pelo ambiente e evitar dependência do proxy do dev server
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// Logar base URL para depuração em ambiente de desenvolvimento
console.log('🔧 API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Evitar redirecionamento infinito em 401
const unauthorizedRedirectState = { lastRedirectTs: 0 };
const redirectToLoginOnce = () => {
  const now = Date.now();
  if (window.location.pathname !== '/login' && now - unauthorizedRedirectState.lastRedirectTs > 5000) {
    unauthorizedRedirectState.lastRedirectTs = now;
    window.location.href = '/login';
  }
};

// Interceptor para adicionar token de autenticação e cabeçalho X-Tenant-ID
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
    if (error.code === 'ERR_NETWORK') {
      console.warn('⚠️ ERRO DE REDE: Backend indisponível ou conexão recusada.', {
        url: error.config?.url,
        baseURL: error.config?.baseURL || API_BASE_URL,
        message: error.message
      });
    }
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
      // Verificar se é um erro de autenticação do checklist (não redirecionar)
      const isChecklistAuth = (error.config?.url?.includes('/checklist/viaturas/') && 
                              error.config?.url?.includes('/finalizar')) ||
                              error.config?.url?.includes('/checklist/validar-credenciais');
      
      if (!isChecklistAuth) {
        // Remover token inválido
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        
        // Redirecionar para login se não estiver na página de login
        redirectToLoginOnce();
      }
    }
    
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
  changePassword: (senhaAtual, novaSenha) => 
    api.put('/auth/alterar-senha', { senha_atual: senhaAtual, nova_senha: novaSenha }),
};

// Serviços de usuários
// Instância separada para rotas públicas (sem interceptor de auth)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userService = {
  getUsers: (params) => api.get('/usuarios', { params }),
  getUsersForAutocomplete: () => publicApi.get('/usuarios/autocomplete'),
  getUserById: (id) => api.get(`/usuarios/${id}`),
  createUser: (userData) => api.post('/usuarios', userData),
  updateUser: (id, userData) => api.put(`/usuarios/${id}`, userData),
  deleteUser: (id) => api.delete(`/usuarios/${id}`),
  changePassword: (id, senhaAtual, novaSenha) => 
    api.put(`/usuarios/${id}/senha`, { senha_atual: senhaAtual, nova_senha: novaSenha }),
  getProfile: () => api.get('/usuarios/me/perfil'),
  getSectors: () => api.get('/usuarios/config/setores'),
};

// Alias para compatibilidade
export const usuariosService = {
  getUsuarios: (params) => api.get('/usuarios', { params }),
  getUsuarioById: (id) => api.get(`/usuarios/${id}`),
  createUsuario: (userData) => api.post('/usuarios', userData),
  updateUsuario: (id, userData) => api.put(`/usuarios/${id}`, userData),
  deleteUsuario: (id) => api.delete(`/usuarios/${id}`),
  changePassword: (id, passwordData) => 
    api.put(`/usuarios/${id}/senha`, passwordData),
  getPerfil: () => api.get('/usuarios/me/perfil'),
  getSetores: () => api.get('/usuarios/config/setores'),
  toggleStatus: (id) => api.put(`/usuarios/${id}/toggle-status`),
  
  // Funções adicionais para solicitações e perfis
  getSolicitacoesPendentes: (params = {}) => {
    return api.get('/usuarios/solicitacoes-pendentes', { params });
  },
  
  getPerfis: () => {
    return api.get('/usuarios/perfis');
  },
  
  // Buscar unidades disponíveis
  getUnidades: () => {
    return api.get('/usuarios/config/unidades');
  },
  
  // Buscar todas as unidades (admin)
  getTodasUnidades: () => {
    return api.get('/tenant/all-units');
  },
  
  // Buscar funções disponíveis
  getFuncoes: () => {
    return api.get('/usuarios/data/funcoes');
  },

  // Aprovar/Rejeitar solicitação de cadastro
  aprovarSolicitacao: (id, { aprovado, observacoes, setor, funcao, role } = {}) => {
    const acao = aprovado ? 'aprovar' : 'rejeitar';
    return api.post(`/usuarios/aprovar-cadastro/${id}`, {
      acao,
      observacoes_aprovacao: observacoes,
      setor,
      funcao,
      role,
    });
  },
};

// Serviços de frota
export const frotaService = {
  // Viaturas
  getViaturas: (params) => api.get('/frota/viaturas', { params }),
  getViaturaById: (id) => api.get(`/frota/viaturas/${id}`),
  createViatura: (viaturaData) => api.post('/frota/viaturas', viaturaData),
  updateViatura: (id, viaturaData) => api.put(`/frota/viaturas/${id}`, viaturaData),
  deleteViatura: (id, data) => api.delete(`/frota/viaturas/${id}`, { data }),
  
  
  // Manutenções
  getManutencoes: (params) => api.get('/frota/manutencoes', { params }),
  createManutencao: (manutencaoData) => api.post('/frota/manutencoes', manutencaoData),
  updateManutencao: (id, status) => api.put(`/frota/manutencoes/${id}`, { status }),
  deleteManutencao: (id) => api.delete(`/frota/manutencoes/${id}`),
};

// Serviços de almoxarifado
export const almoxarifadoService = {
  // Categorias
  getCategorias: () => api.get('/almoxarifado/categorias'),
  createCategoria: (categoriaData) => api.post('/almoxarifado/categorias', categoriaData),
  
  // Produtos
  getProdutos: (params) => api.get('/almoxarifado/produtos', { params }),
  getProdutoById: (id) => api.get(`/almoxarifado/produtos/${id}`),
  createProduto: (produtoData) => api.post('/almoxarifado/produtos', produtoData),
  
  // Movimentações
  getMovimentacoes: (params) => api.get('/almoxarifado/movimentacoes', { params }),
  createMovimentacao: (movimentacaoData) => api.post('/almoxarifado/movimentacoes', movimentacaoData),
  
  // Relatórios
  getRelatorioEstoque: (params) => api.get('/almoxarifado/relatorio', { params }),
};

// Serviços de cautelas
export const emprestimosService = {
  // Equipamentos
  getEquipamentos: (params) => api.get('/emprestimos/equipamentos', { params }),
  getEquipamentoById: (id) => api.get(`/emprestimos/equipamentos/${id}`),
  createEquipamento: (equipamentoData) => api.post('/emprestimos/equipamentos', equipamentoData),
  
  // Cautelas
  getEmprestimos: (params) => api.get('/emprestimos', { params }),
  getEmprestimoById: (id) => api.get(`/emprestimos/${id}`),
  createEmprestimo: (emprestimoData) => api.post('/emprestimos', emprestimoData),
  devolverEmprestimo: (id, observacoes) => 
    api.put(`/emprestimos/${id}/devolver`, { observacoes }),
  
  // Relatórios
  getRelatorioEmprestimos: () => api.get('/emprestimos/relatorio'),
};

// Serviços operacionais
export const operacionalService = {
  // Escalas
  getEscalas: (params) => api.get('/operacional/escalas', { params }),
  getEscalaById: (id) => api.get(`/operacional/escalas/${id}`),
  createEscala: (escalaData) => api.post('/operacional/escalas', escalaData),
  addUsuarioEscala: (id, usuarioData) => api.post(`/operacional/escalas/${id}/usuarios`, usuarioData),
  
  // Trocas de serviço
  getTrocas: (params) => api.get('/operacional/trocas', { params }),
  solicitarTroca: (trocaData) => api.post('/operacional/trocas', trocaData),
  responderTroca: (id, resposta, observacoes) => 
    api.put(`/operacional/trocas/${id}/responder`, { resposta, observacoes }),
  
  // Serviços extra
  getServicosExtra: (params) => api.get('/operacional/extras', { params }),
  registrarExtra: (extraData) => api.post('/operacional/extras', extraData),
  aprovarExtra: (id, aprovado, observacoes) => 
    api.put(`/operacional/extras/${id}/aprovar`, { aprovado, observacoes }),
  
  // Usuários
  getUsuarios: (params) => api.get('/usuarios', { params }),
  
  // Relatórios
  getRelatorioOperacional: () => api.get('/operacional/relatorio'),
};

// Serviços de notificações
export const notificacoesService = {
  getNotificacoes: (params) => api.get('/notificacoes', { params }),
  getNotificacaoById: (id) => api.get(`/notificacoes/${id}`),
  markAsRead: (id) => api.put(`/notificacoes/${id}/lida`),
  markAsUnread: (id) => api.put(`/notificacoes/${id}/nao-lida`),
  markAllAsRead: () => api.put('/notificacoes/todas/lidas'),
  deleteNotificacao: (id) => api.delete(`/notificacoes/${id}`),
  deleteReadNotificacoes: () => api.delete('/notificacoes/lidas'),
  createNotificacao: (notificacaoData) => api.post('/notificacoes', notificacaoData),
  getEstatisticas: () => api.get('/notificacoes/estatisticas'),
};

// Serviços de dashboard
export const dashboardService = {
  getDashboardGeral: () => api.get('/dashboard/geral'),
  getDashboardFrota: () => api.get('/dashboard/frota'),
  getDashboardAlmoxarifado: () => api.get('/dashboard/almoxarifado'),
  getDashboardEmprestimos: () => api.get('/dashboard/emprestimos'),
  getDashboardOperacional: () => api.get('/dashboard/operacional'),
  getMetricas: (periodo = 30) => api.get(`/dashboard/metricas?periodo=${periodo}`)
};

// Serviço de Checklist
export const checklistService = {
  getChecklists: (params) => api.get('/checklist/viaturas', { params }).then(res => res.data),
  getChecklist: (id) => api.get(`/checklist/viaturas/${id}`).then(res => res.data),
  createChecklist: (data) => api.post('/checklist/viaturas', data).then(res => res.data),
  updateChecklist: (id, data) => api.put(`/checklist/viaturas/${id}`, data).then(res => res.data),
  deleteChecklist: (id) => api.delete(`/checklist/viaturas/${id}`).then(res => res.data),
  cancelarChecklist: (id, motivo) => api.put(`/checklist/viaturas/${id}/cancelar`, { motivo }).then(res => res.data),
  finalizarChecklist: (id, authData) => api.post(`/checklist/viaturas/${id}/finalizar`, authData).then(res => res.data),
  validarCredenciais: (authData) => api.post('/checklist/validar-credenciais', authData).then(res => res.data),
  searchUsuarios: (query) => api.get('/checklist/usuarios/search', { params: { q: query } }).then(res => res.data),
  
  // Solicitações de checklist (a API pode não existir ainda; retorna vazio se falhar)
  getSolicitacoes: async (params = {}) => {
    try {
      const res = await api.get('/checklist/solicitacoes', { params });
      return res.data;
    } catch (err) {
      console.warn('ChecklistService.getSolicitacoes: API não disponível, retornando lista vazia');
      return { solicitacoes: [] };
    }
  },

  // Criar uma nova solicitação de checklist
  createSolicitacao: async (data) => {
    try {
      const res = await api.post('/checklist/solicitacoes', data);
      return res.data;
    } catch (err) {
      console.error('Erro ao criar solicitação de checklist:', err);
      throw err;
    }
  },

  // Iniciar uma solicitação e obter prefill seguro
  iniciarSolicitacao: async (id) => {
    const res = await api.post(`/checklist/solicitacoes/${id}/iniciar`);
    return res.data;
  },

  // Cancelar uma solicitação
  cancelarSolicitacao: async (id) => {
    const res = await api.put(`/checklist/solicitacoes/${id}/cancelar`);
    return res.data;
  },

  // Excluir uma solicitação definitivamente (Admin/Chefe)
  deleteSolicitacao: async (id) => {
    const res = await api.delete(`/checklist/solicitacoes/${id}`);
    return res.data;
  },

  // Automações
  getAutomacoes: async (params = {}) => {
    const res = await api.get('/checklist/automacoes', { params });
    return res.data;
  },
  createAutomacao: async (data) => {
    const res = await api.post('/checklist/automacoes', data);
    return res.data;
  },
  updateAutomacao: async (id, data) => {
    const res = await api.put(`/checklist/automacoes/${id}`, data);
    return res.data;
  },
  toggleAutomacao: async (id, ativo) => {
    const res = await api.put(`/checklist/automacoes/${id}/ativar`, { ativo });
    return res.data;
  },
  deleteAutomacao: async (id) => {
    const res = await api.delete(`/checklist/automacoes/${id}`);
    return res.data;
  },
  gerarSolicitacoesAutomacao: async (id) => {
    const res = await api.post(`/checklist/automacoes/${id}/gerar-solicitacoes`);
    return res.data;
  },
};

// Utilitários para upload de arquivos
export const uploadService = {
  uploadFile: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
  
  // Upload de foto única
  uploadFoto: (file, onProgress) => {
    const formData = new FormData();
    formData.append('foto', file);
    
    return api.post('/upload/foto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
  
  // Upload de múltiplas fotos
  uploadFotos: (files, onProgress) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('fotos', file);
    });
    
    return api.post('/upload/fotos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
};

// Utilitários para formatação de dados
export const formatters = {
  currency: (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  },
  
  date: (date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  },
  
  datetime: (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  },
  
  number: (value) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  },
};

// Adicionar ao final do arquivo, antes da exportação
export const templateService = {
  // Listar templates
  getTemplates: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const response = await api.get(`/templates?${params}`);
    return response.data;
  },

  // Buscar template por ID
  getTemplate: async (id) => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  // Criar template
  createTemplate: async (templateData) => {
    const response = await api.post('/templates', templateData);
    return response.data;
  },

  // Atualizar template
  updateTemplate: async (id, templateData) => {
    const response = await api.put(`/templates/${id}`, templateData);
    return response.data;
  },

  // Excluir template
  deleteTemplate: async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  }
};

export default api;