import axios from 'axios';

// Configuração base da API
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 segundos
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
export const userService = {
  getUsers: (params) => api.get('/usuarios', { params }),
  getUsersForAutocomplete: () => api.get('/usuarios/autocomplete'),
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
};

// Serviços de frota
export const frotaService = {
  // Viaturas
  getViaturas: (params) => api.get('/frota/viaturas', { params }),
  getViaturaById: (id) => api.get(`/frota/viaturas/${id}`),
  createViatura: (viaturaData) => api.post('/frota/viaturas', viaturaData),
  updateViatura: (id, viaturaData) => api.put(`/frota/viaturas/${id}`, viaturaData),
  
  // Checklists
  getChecklists: (params) => api.get('/frota/checklists', { params }),
  createChecklist: (checklistData) => api.post('/frota/checklists', checklistData),
  deleteChecklist: (id) => api.delete(`/frota/checklists/${id}`),
  deleteAllChecklists: () => api.delete('/frota/checklists'),
  
  // Manutenções
  getManutencoes: (params) => api.get('/frota/manutencoes', { params }),
  createManutencao: (manutencaoData) => api.post('/frota/manutencoes', manutencaoData),
  updateManutencao: (id, status) => api.put(`/frota/manutencoes/${id}`, { status }),
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
  getMetricas: (periodo) => api.get('/dashboard/metricas', { params: { periodo } }),
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

export default api;