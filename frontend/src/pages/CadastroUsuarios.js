// =====================================================
// CADASTRO UNIFICADO DE USUÁRIOS - PLATAFORMA BRAVO
// =====================================================
//
// Este componente substitui o antigo CadastroMilitares.js
// e permite o cadastro unificado de usuários militares e civis
// em uma única interface moderna e intuitiva.
//
// FUNCIONALIDADES:
// - Cadastro de militares e civis
// - Gestão de perfis (Administrador, Comandante, etc.)
// - Filtros avançados e busca
// - Aprovação de solicitações pendentes
// - Interface responsiva e acessível
//
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Fab,
  Tooltip,
  Avatar,
  useTheme,
  useMediaQuery,
  Pagination,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  RadioGroup,
  Radio,
  FormLabel,
  Tabs,
  Tab,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PersonOff as PersonOffIcon,
  PersonAdd as PersonAddIcon,
  Lock as LockIcon,
  Shield as MilitaryIcon,
  ContactMail as ContactMailIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { usuariosService, userService } from '../services/api';
import { militaresService } from '../services/militaresService';
import { 
  validateUsuarioForm, 
  sanitizeUsuarioData, 
  formatCPF, 
  formatPhone 
} from '../utils/validations';

// REGRA DE TENANCY/LOTAÇÃO:
// A listagem de usuários nesta tela deve mostrar SOMENTE os usuários lotados
// (u.unidade_id) na unidade selecionada no seletor (TenantContext.currentUnit).
// O seletor define o cabeçalho `X-Tenant-ID` via TenantContext e, além disso,
// propagamos `filters.unidade_id = currentUnit.id` e recarregamos a lista ao
// trocar de unidade, garantindo coerência entre UI e backend.
const CadastroUsuarios = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, hasRole } = useAuth();
  const { availableUnits, currentUnit } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Helper para normalizar datas para inputs type="date" (YYYY-MM-DD)
  const toInputDate = (v) => {
    if (!v) return '';
    if (typeof v === 'string') {
      // ISO ou semelhante -> pegar os 10 primeiros caracteres
      if (v.includes('-')) return v.substring(0, 10);
      // Formato brasileiro DD/MM/AAAA
      if (v.includes('/')) {
        const [d, m, y] = v.split('/');
        if (d && m && y) {
          return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }
    }
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  };

  // Estados para usuários
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState([]);
  const [tabValue, setTabValue] = useState(0); // 0: Usuários, 1: Solicitações
  
  const [filters, setFilters] = useState({
    search: '',
    tipo: '', // 'militar' ou 'civil'
    perfil: '',
    unidade_id: '',
    setor_id: '',
    ativo: '',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'create', 'edit', 'view', 'approve'
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulários
  const [formData, setFormData] = useState({
    // Dados básicos
    nome_completo: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    tipo: 'militar', // 'militar' ou 'civil'
    
    // Dados militares (condicionais)
    posto_graduacao: '',
    nome_guerra: '',
    matricula: '',
    data_incorporacao: '',
    antiguidade: '',
    
    // Organização
    // unidades_ids: lista de unidades às quais o usuário terá acesso (membros_unidade)
    unidades_ids: [],
    // unidade_lotacao_id: unidade de lotação oficial do usuário (coluna usuarios.unidade_lotacao_id)
    unidade_lotacao_id: '',
    setor: '',
    categoria_cnh: '',
    funcoes: [],
    perfil_id: 5, // Operador por padrão
    
    // Controle
    ativo: true,
    senha: '',
    confirmar_senha: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para dados auxiliares
  const [perfis, setPerfis] = useState([]);
  const [postosGraduacoes, setPostosGraduacoes] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [setores, setSetores] = useState([]);
  const [funcoes, setFuncoes] = useState([]);

  // =====================================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // =====================================================

  useEffect(() => {
    loadUsuarios();
    loadSolicitacoesPendentes();
    loadDadosAuxiliares();
  }, []);

  useEffect(() => {
    if (tabValue === 0) {
      loadUsuarios();
    } else {
      loadSolicitacoesPendentes();
    }
  }, [filters.page, tabValue]);

  // Ao trocar de unidade atual (seletor/tenant), sincronizamos `filters.unidade_id`
  // com `currentUnit.id` e recarregamos a listagem. Isso assegura que a UI
  // reflita somente usuários lotados na unidade ativa.
  useEffect(() => {
    if (currentUnit?.id) {
      setFilters((prev) => ({
        ...prev,
        unidade_id: currentUnit.id,
        page: 1,
      }));
      // Recarregar usuários para refletir a unidade selecionada
      loadUsuarios();
    }
  }, [currentUnit]);

  const loadUsuarios = async () => {
    try {
      setUsuariosLoading(true);
      // Mapear filtros para os parâmetros esperados pela API e omitir valores vazios
      // Observação importante: aplicamos `unidade_id` do tenant (currentUnit).
      // Mesmo se não enviarmos `unidade_id`, o backend usa `X-Tenant-ID` e filtra
      // por `u.unidade_id` (lotação). Mantemos ambos para maior clareza.
      const params = {};
      if (filters.search && filters.search.trim()) params.busca = filters.search.trim();
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.perfil) params.perfil = filters.perfil;
      if (filters.unidade_id) params.unidade_id = filters.unidade_id;
      if (filters.setor_id) params.setor_id = filters.setor_id;
      if (filters.ativo === 'true' || filters.ativo === 'false') params.ativo = filters.ativo;
      params.page = filters.page || 1;
      params.limit = filters.limit || 20;

      const response = await usuariosService.getUsuarios(params);
      setUsuarios(response.data.usuarios || []);
      setPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Erro ao carregar usuários');
      setUsuarios([]);
    } finally {
      setUsuariosLoading(false);
    }
  };

  const loadSolicitacoesPendentes = async () => {
    try {
      const response = await usuariosService.getSolicitacoesPendentes();
      setSolicitacoesPendentes(response.data.solicitacoes || []);
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
      setSolicitacoesPendentes([]);
    }
  };

  const loadDadosAuxiliares = async () => {
    try {
      // Carregar perfis
      const perfisResponse = await usuariosService.getPerfis();
      setPerfis(perfisResponse.data.data || [
        { id: 1, nome: 'Administrador', nivel_hierarquia: 1 },
        { id: 2, nome: 'Comandante', nivel_hierarquia: 2 },
        { id: 3, nome: 'Chefe', nivel_hierarquia: 3 },
        { id: 4, nome: 'Auxiliar', nivel_hierarquia: 4 },
        { id: 5, nome: 'Operador', nivel_hierarquia: 5 }
      ]);

      // Carregar unidades (preferir todas as unidades da tabela)
      try {
        console.log('🔍 [DEBUG][CadastroUsuarios] Carregando unidades', 'hasRole(Admin/Comandante):', hasRole(['Administrador', 'Comandante']), 'availableUnits:', Array.isArray(availableUnits) ? availableUnits.length : 0);
        // Tenta endpoint de todas as unidades (requer perfil administrador)
        const todasResponse = await usuariosService.getTodasUnidades();
        const allUnits = todasResponse.data?.units || [];
        console.log('🔍 [DEBUG][CadastroUsuarios] Unidades via getTodasUnidades:', allUnits);
        const mapped = allUnits.map(u => ({ id: u.id, nome: u.nome, sigla: u.sigla || null }));
        console.log('🔍 [DEBUG][CadastroUsuarios] Unidades mapeadas:', mapped);
        if (mapped.length > 0) {
          setUnidades(mapped);
        } else {
          // Fallback para endpoint filtrado por acesso do usuário
          const unidadesResponse = await usuariosService.getUnidades();
          const apiUnidades = unidadesResponse.data.unidades || unidadesResponse.data.units || [];
          console.log('🔍 [DEBUG][CadastroUsuarios] Unidades via getUnidades (fallback):', apiUnidades);
          const norm = apiUnidades.map(u => ({ id: u.id, nome: u.nome }));
          setUnidades(norm);
        }
      } catch (errUnidades) {
        console.log('🔍 [DEBUG][CadastroUsuarios] Falha ao carregar todas unidades, tentando fallback:', errUnidades?.message);
        // Fallbacks: primeiro tentar unidades disponíveis via acesso; depois `availableUnits`
        try {
          const unidadesResponse = await usuariosService.getUnidades();
          const apiUnidades = unidadesResponse.data.unidades || unidadesResponse.data.units || [];
          console.log('🔍 [DEBUG][CadastroUsuarios] Unidades via getUnidades (fallback 2):', apiUnidades);
          if (apiUnidades.length > 0) {
            const norm = apiUnidades.map(u => ({ id: u.id, nome: u.nome }));
            setUnidades(norm);
          } else if (availableUnits && availableUnits.length > 0) {
            const fallbackUnits = availableUnits.map(u => ({ id: u.id, nome: u.nome }));
            console.log('🔍 [DEBUG][CadastroUsuarios] Aplicando fallback TenantContext.availableUnits:', fallbackUnits);
            setUnidades(fallbackUnits);
          } else {
            setUnidades([]);
          }
        } catch (errFallback) {
          console.warn('Falha ao carregar unidades. Aplicando fallback.', errFallback);
          if (availableUnits && availableUnits.length > 0) {
            const fallbackUnits = availableUnits.map(u => ({ id: u.id, nome: u.nome }));
            console.log('🔍 [DEBUG][CadastroUsuarios] Fallback final TenantContext.availableUnits:', fallbackUnits);
            setUnidades(fallbackUnits);
          } else {
            setUnidades([]);
          }
        }
      }

      // Carregar setores (lista de strings)
      try {
        const setoresResponse = await usuariosService.getSetores();
        const setoresList = setoresResponse.data.setores || [];
        setSetores(Array.isArray(setoresList) ? setoresList : []);
      } catch (errSetores) {
        console.warn('Falha ao carregar setores do servidor, usando lista padrão.', errSetores);
        const setoresPadrao = [
          'Comando',
          'Subcomando', 
          'SAAD',
          'SOP',
          'SEC',
          'SAT',
          'PROEBOM',
          'Operacional',
        ];
        setSetores(setoresPadrao);
      }

      // Carregar funções (lista de strings)
      try {
        const funcoesResponse = await usuariosService.getFuncoes();
        const funcoesList = funcoesResponse.data.funcoes || [];
        const normFuncoes = Array.isArray(funcoesList)
          ? funcoesList.map((item) => (typeof item === 'string' ? item : (item?.nome ?? String(item))))
          : [];
        setFuncoes(normFuncoes);
      } catch (errFuncoes) {
        console.warn('Falha ao carregar funcoes, usando lista padrão.', errFuncoes);
        const funcoesPadrao = ['Operador', 'Auxiliar', 'Chefe', 'Comandante'];
        setFuncoes(funcoesPadrao);
      }

      // Carregar Postos/Graduações padronizados
      try {
        const postosRes = await militaresService.getPostosGraduacoes();
        const postosData = postosRes?.data?.postos || postosRes?.data?.data || postosRes?.data || [];
        if (Array.isArray(postosData) && postosData.length > 0) {
          setPostosGraduacoes(postosData);
        } else {
          setPostosGraduacoes([
            'Coronel', 'Tenente-Coronel', 'Major',
            'Capitão', '1º Tenente', '2º Tenente', 'Aspirante a Oficial',
            'Subtenente', '1º Sargento', '2º Sargento', '3º Sargento',
            'Cabo', 'Soldado'
          ]);
        }
      } catch (errPostos) {
        console.warn('Falha ao carregar postos/graduações, usando lista padrão.', errPostos);
        setPostosGraduacoes([
          'Coronel', 'Tenente-Coronel', 'Major',
          'Capitão', '1º Tenente', '2º Tenente', 'Aspirante a Oficial',
          'Subtenente', '1º Sargento', '2º Sargento', '3º Sargento',
          'Cabo', 'Soldado'
        ]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err);
    }
  };

  // =====================================================
  // MANIPULADORES DE EVENTOS
  // =====================================================

  const handleOpenDialog = async (type, usuario = null) => {
    console.log('🔍 [DEBUG][CadastroUsuarios] handleOpenDialog:', { type, usuarioId: usuario?.id, unidadesDisponiveis: Array.isArray(unidades) ? unidades.length : 0 });
    setDialogType(type);
    setSelectedUsuario(usuario);
    
    if ((type === 'edit' || type === 'view') && usuario) {
      const funcoesFromUsuario = Array.isArray(usuario.funcoes)
        ? usuario.funcoes
        : (Array.isArray(usuario.funcao_nome) ? usuario.funcao_nome : (usuario.funcao_nome ? [usuario.funcao_nome] : []));
      const tipoDetectado = usuario.tipo ?? ((usuario.matricula || usuario.posto_graduacao || usuario.data_incorporacao) ? 'militar' : 'civil');

      let userData = usuario;
      if ((!Array.isArray(userData.unidades_ids) || userData.unidades_ids.length === 0) && !userData.unidade_lotacao_id && !userData.unidade_id) {
        try {
          const resp = await usuariosService.getUsuarioById(userData.id);
          userData = resp.data?.usuario || resp.data?.user || resp.data || userData;
          console.log('🔍 [DEBUG][CadastroUsuarios] Dados completos do usuário:', userData);
        } catch (e) {
          console.warn('Falha ao buscar detalhes do usuário', e);
        }
      }

      // Resolver IDs de Unidade e Setor com tipos coerentes (string), tentando por id e por nome
      const unidadeNome = userData.unidade_nome || userData.unidade;
      const setorNome = userData.setor_nome || userData.setor;
      const unidadeMatch = (unidades || []).find(u => u.id === userData.unidade_id) || (unidades || []).find(u => u.nome === unidadeNome);
      const unidadeIdResolved = unidadeMatch ? String(unidadeMatch.id) : (userData.unidade_id ? String(userData.unidade_id) : '');
      const setorResolved = setorNome || '';

      // Garantir que o valor atual de setor esteja presente nas opções
      // Isso evita que o Select mostre vazio quando o valor não está na lista fixa
      if (setorResolved) {
        setSetores((prev) => {
          const lista = Array.isArray(prev) ? prev : [];
          return lista.includes(setorResolved) ? lista : [setorResolved, ...lista];
        });
      }

      const unidadesIdsResolved = Array.isArray(userData.unidades_ids)
        ? userData.unidades_ids.map(String)
        : (Array.isArray(userData.unidades)
            ? userData.unidades.map(u => String(u.id ?? u.unidade_id)).filter(Boolean)
            : (userData.unidade_id ? [String(userData.unidade_id)] : []));
      const unidadeLotacaoResolved = userData.unidade_lotacao_id
        ? String(userData.unidade_lotacao_id)
        : (userData.lotacao_id ? String(userData.lotacao_id) : (userData.unidade_id ? String(userData.unidade_id) : ''));
      const unidadesIdsComLotacao = unidadeLotacaoResolved && !unidadesIdsResolved.includes(unidadeLotacaoResolved)
        ? [...unidadesIdsResolved, unidadeLotacaoResolved]
        : unidadesIdsResolved;
      console.log('🔍 [DEBUG][CadastroUsuarios] Resolução de unidades:', { unidadesIdsResolved, unidadeLotacaoResolved, unidadesIdsComLotacao });

      // Normalizador para postos/graduações canônicos
      const normalizePosto = (valor) => {
        if (!valor) return '';
        const map = {
          'Terceiro Sargento': '3º Sargento',
          'Segundo Sargento': '2º Sargento',
          'Primeiro Sargento': '1º Sargento',
          'Primeiro Tenente': '1º Tenente',
          'Segundo Tenente': '2º Tenente',
          'Tenente Coronel': 'Tenente-Coronel',
          'Aspirante': 'Aspirante a Oficial',
          'Aspirante Oficial': 'Aspirante a Oficial',
        };
        return map[valor] || valor;
      };

      const postoResolvido = normalizePosto(userData.posto_graduacao || '');

      setFormData({
        nome_completo: userData.nome_completo || '',
        email: userData.email || '',
        cpf: userData.cpf || '',
        telefone: userData.telefone || '',
        data_nascimento: toInputDate(userData.data_nascimento) || '',
        tipo: tipoDetectado,
        posto_graduacao: postoResolvido,
        nome_guerra: userData.nome_guerra || '',
        categoria_cnh: userData.categoria_cnh || '',
        matricula: userData.matricula || '',
        data_incorporacao: toInputDate(userData.data_incorporacao) || '',
        antiguidade: userData.antiguidade ?? '',
        unidades_ids: unidadesIdsComLotacao,
        unidade_lotacao_id: unidadeLotacaoResolved,
        setor: setorResolved,
        funcoes: funcoesFromUsuario,
        perfil_id: userData.perfil_id || 5,
        ativo: userData.ativo !== false,
        senha: '',
        confirmar_senha: '',
      });
    } else if (type === 'create') {
      setFormData({
        nome_completo: '',
        email: '',
        cpf: '',
        telefone: '',
        data_nascimento: '',
        tipo: 'militar',
        posto_graduacao: '',
        nome_guerra: '',
        matricula: '',
        data_incorporacao: '',
        antiguidade: '',
        unidades_ids: [],
        unidade_lotacao_id: '',
        setor: '',
        funcoes: [],
        perfil_id: 5,
        ativo: true,
        senha: '',
        confirmar_senha: '',
      });
    }
    
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUsuario(null);
    setFormData({
      nome_completo: '',
      email: '',
      cpf: '',
      telefone: '',
      data_nascimento: '',
      tipo: 'militar',
      posto_graduacao: '',
      nome_guerra: '',
      matricula: '',
      data_incorporacao: '',
      unidades_ids: [],
      unidade_lotacao_id: '',
      setor: '',
      funcoes: [],
      perfil_id: 5,
      ativo: true,
      senha: '',
      confirmar_senha: '',
    });
    setFormErrors({});
    setShowPassword(false);
  };

  const handleInputChange = (field, value) => {
    // Garantir array para multiseleção de funções
    if (field === 'funcoes') {
      const next = Array.isArray(value) ? value : (value ? [value] : []);
      setFormData(prev => ({ ...prev, funcoes: next }));
      if (formErrors.funcoes) {
        setFormErrors(prev => ({ ...prev, funcoes: '' }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Formatação automática
    if (field === 'cpf') {
      setFormData(prev => ({ ...prev, cpf: formatCPF(value) }));
    } else if (field === 'telefone') {
      setFormData(prev => ({ ...prev, telefone: formatPhone(value) }));
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ 
      ...prev, 
      [field]: value,
      page: 1 // Reset para primeira página ao filtrar
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Preparar dados para validação (senha apenas na criação)
      const dataForValidation = dialogType === 'create' 
        ? formData 
        : (() => { 
            const { senha, confirmar_senha, ...rest } = formData; 
            return rest; 
          })();
      
      // Validar formulário
      const validation = validateUsuarioForm(dataForValidation);
      if (!validation.isValid) {
        setFormErrors(validation.errors);
        setError('Corrija os campos destacados e tente novamente.');
        console.warn('Formulário de usuário inválido:', validation.errors);
        return;
      }
      
      // Sanitizar dados
      const sanitizedData = sanitizeUsuarioData(formData);
      console.log('Enviando dados do usuário:', sanitizedData);
      
      if (dialogType === 'create') {
        await usuariosService.createUsuario(sanitizedData);
        setSuccess('Usuário criado com sucesso!');
      } else if (dialogType === 'edit') {
        // Se forneceu nova senha no formulário de edição, usar rota dedicada
        if (sanitizedData.senha && sanitizedData.senha.length >= 6) {
          try {
            // Admin/Comandante pode alterar sem senha atual
            await userService.changePassword(selectedUsuario.id, null, sanitizedData.senha);
            setSuccess('Senha do usuário atualizada com sucesso!');
          } catch (errPwd) {
            console.error('Erro ao alterar senha do usuário:', errPwd);
            // Não bloquear a atualização de outros campos se senha falhar
            setError(errPwd.response?.data?.error || 'Erro ao alterar senha do usuário');
          }
        }

        // Remover campos de senha do payload principal para evitar ignorância pelo backend
        const { senha, confirmar_senha, ...restUpdate } = sanitizedData;
        await usuariosService.updateUsuario(selectedUsuario.id, restUpdate);
        setSuccess('Usuário atualizado com sucesso!');
      }
      
      handleCloseDialog();
      if (hasRole(['Administrador', 'Comandante', 'Chefe'])) {
        loadUsuarios();
      }
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      // Mostrar mensagem específica do backend quando disponível
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Erro ao salvar usuário'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarSolicitacao = async (solicitacaoId, aprovado = true) => {
    try {
      setLoading(true);
      await usuariosService.aprovarSolicitacao(solicitacaoId, { aprovado });
      setSuccess(`Solicitação ${aprovado ? 'aprovada' : 'rejeitada'} com sucesso!`);
      loadSolicitacoesPendentes();
      if (hasRole(['Administrador', 'Comandante', 'Chefe'])) {
        loadUsuarios();
      }
    } catch (err) {
      console.error('Erro ao processar solicitação:', err);
      setError('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (usuarioId, ativo) => {
    try {
      await usuariosService.updateUsuario(usuarioId, { ativo });
      setSuccess(`Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso!`);
      if (hasRole(['Administrador', 'Comandante', 'Chefe'])) {
        loadUsuarios();
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      setError('Erro ao alterar status do usuário');
    }
  };

  // =====================================================
  // COMPONENTES DE RENDERIZAÇÃO
  // =====================================================

  const renderUsuarioCard = (usuario) => {
    const isAtivo = usuario.ativo;
    const isMilitar = usuario.tipo === 'militar';
    
    return (
      <Card 
        key={usuario.id} 
        sx={{ 
          mb: 2, 
          opacity: isAtivo ? 1 : 0.7,
          border: isAtivo ? 'none' : '1px solid #ccc',
          cursor: 'pointer'
        }}
        onClick={() => handleOpenDialog('view', usuario)}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: isMilitar ? theme.palette.primary.main : theme.palette.secondary.main }}>
                {isMilitar ? <MilitaryIcon /> : <PersonIcon />}
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  {usuario.nome_completo}
                  {isMilitar && usuario.nome_guerra && (
                    <Typography variant="body2" color="text.secondary" component="span">
                      {` (${usuario.nome_guerra})`}
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {usuario.email}
                </Typography>
                {isMilitar && (
                  <Typography variant="body2" color="text.secondary">
                    {usuario.posto_graduacao} - Mat: {usuario.matricula}
                  </Typography>
                )}
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                label={usuario.perfil_nome || 'Operador'}
                color="primary"
                size="small"
              />
              <Chip 
                label={isMilitar ? 'Militar' : 'Civil'}
                color={isMilitar ? 'success' : 'info'}
                size="small"
              />
              <Chip 
                label={isAtivo ? 'Ativo' : 'Inativo'}
                color={isAtivo ? 'success' : 'error'}
                size="small"
              />
              
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setAnchorEl(e.currentTarget);
                  setSelectedUsuario(usuario);
                }}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Box mt={2} display="flex" gap={2} flexWrap="wrap">
            {usuario.unidade_nome && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <BusinessIcon fontSize="small" color="action" />
                <Typography variant="body2">{usuario.unidade_nome}</Typography>
              </Box>
            )}
            {usuario.setor_nome && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <WorkIcon fontSize="small" color="action" />
                <Typography variant="body2">{usuario.setor_nome}</Typography>
              </Box>
            )}
            {usuario.telefone && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="body2">{usuario.telefone}</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderSolicitacaoCard = (solicitacao) => {
    const isMilitar = solicitacao.tipo === 'militar';
    
    return (
      <Card key={solicitacao.id} sx={{ mb: 2, border: '1px solid #orange' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'orange' }}>
                <PendingIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  {solicitacao.nome_completo}
                  {isMilitar && solicitacao.nome_guerra && (
                    <Typography variant="body2" color="text.secondary" component="span">
                      {` (${solicitacao.nome_guerra})`}
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {solicitacao.email}
                </Typography>
                {isMilitar && (
                  <Typography variant="body2" color="text.secondary">
                    {solicitacao.posto_graduacao} - Mat: {solicitacao.matricula}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Solicitado em: {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleAprovarSolicitacao(solicitacao.id, true)}
                disabled={loading}
              >
                Aprovar
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<CancelIcon />}
                onClick={() => handleAprovarSolicitacao(solicitacao.id, false)}
                disabled={loading}
              >
                Rejeitar
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderFormDialog = () => {
    const isMilitar = formData.tipo === 'militar';
    const isEdit = dialogType === 'edit';
    const isView = dialogType === 'view';
    
    return (
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {dialogType === 'create' ? 'Criar Novo Usuário' : (isEdit ? 'Editar Usuário' : 'Visualizar Usuário')}
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
          <Box sx={{ pt: 2 }}>
            {/* Campo disabled em modo Visualizar */}
            <fieldset disabled={isView} style={{ border: 0, padding: 0, margin: 0 }}>
            {/* Tipo de Usuário */}
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Tipo de Usuário</FormLabel>
              <RadioGroup
                row
                value={formData.tipo}
                onChange={(e) => handleInputChange('tipo', e.target.value)}
              >
                <FormControlLabel value="militar" control={<Radio />} label="Militar" />
                <FormControlLabel value="civil" control={<Radio />} label="Civil" />
              </RadioGroup>
            </FormControl>
            
            <Grid container spacing={2}>
              {/* Dados Básicos */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Dados Pessoais</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome Completo"
                  value={formData.nome_completo}
                  onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                  error={!!formErrors.nome_completo}
                  helperText={formErrors.nome_completo}
                  size={isMobile ? 'small' : 'medium'}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  size={isMobile ? 'small' : 'medium'}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CPF"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  error={!!formErrors.cpf}
                  helperText={formErrors.cpf}
                  inputProps={{ maxLength: 14 }}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  error={!!formErrors.telefone}
                  helperText={formErrors.telefone}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Data de Nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>
              
              {/* Dados Militares (condicionais) */}
              {isMilitar && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Dados Militares</Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={!!formErrors.posto_graduacao} size={isMobile ? 'small' : 'medium'}>
                      <InputLabel>Posto/Graduação *</InputLabel>
                      <Select
                        value={formData.posto_graduacao}
                        onChange={(e) => handleInputChange('posto_graduacao', e.target.value)}
                        label="Posto/Graduação *"
                      >
                        {postosGraduacoes.map((posto) => (
                          <MenuItem key={posto} value={posto}>{posto}</MenuItem>
                        ))}
                      </Select>
                      {formErrors.posto_graduacao && (
                        <Typography variant="caption" color="error">
                          {formErrors.posto_graduacao}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nome de Guerra"
                      value={formData.nome_guerra}
                      onChange={(e) => handleInputChange('nome_guerra', e.target.value)}
                      error={!!formErrors.nome_guerra}
                      helperText={formErrors.nome_guerra}
                      size={isMobile ? 'small' : 'medium'}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Matrícula *"
                      value={formData.matricula}
                      onChange={(e) => handleInputChange('matricula', e.target.value)}
                      error={!!formErrors.matricula}
                      helperText={formErrors.matricula}
                      size={isMobile ? 'small' : 'medium'}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Data de Incorporação"
                      type="date"
                      value={formData.data_incorporacao}
                      onChange={(e) => handleInputChange('data_incorporacao', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size={isMobile ? 'small' : 'medium'}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Antiguidade (ranking)"
                      type="number"
                      value={formData.antiguidade}
                      onChange={(e) => handleInputChange('antiguidade', e.target.value)}
                      error={!!formErrors.antiguidade}
                      helperText={formErrors.antiguidade}
                      inputProps={{ min: 1, step: 1 }}
                      size={isMobile ? 'small' : 'medium'}
                    />
                  </Grid>
                </>
              )}
              
              {/* Organização */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Organização</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              {/* Unidades (multi) */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Unidades CBMGO</InputLabel>
                  <Select
                    multiple
                    value={Array.isArray(formData.unidades_ids) ? formData.unidades_ids : []}
                    onChange={(e) => handleInputChange('unidades_ids', Array.isArray(e.target.value) ? e.target.value : (e.target.value ? [e.target.value] : []))}
                    label="Unidades CBMGO"
                    renderValue={(selected) => {
                      const ids = Array.isArray(selected) ? selected.map(String) : [];
                      const nomes = (unidades || [])
                        .filter(u => ids.includes(String(u.id)))
                        .map(u => u.nome);
                      return nomes.join(', ');
                    }}
                  >
                    {unidades.map((unidade) => (
                      <MenuItem key={unidade.id} value={String(unidade.id)}>
                        {unidade.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Unidade de Lotação (single) */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Unidade de Lotação</InputLabel>
                  <Select
                    value={formData.unidade_lotacao_id}
                    onChange={(e) => handleInputChange('unidade_lotacao_id', e.target.value)}
                    label="Unidade de Lotação"
                  >
                    {unidades.map((unidade) => (
                      <MenuItem key={unidade.id} value={String(unidade.id)}>
                        {unidade.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Setor */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Setor</InputLabel>
                  <Select
                    value={formData.setor}
                    onChange={(e) => handleInputChange('setor', e.target.value)}
                    label="Setor"
                  >
                    {setores.map((nome) => (
                      <MenuItem key={nome} value={nome}>
                        {nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Categoria CNH</InputLabel>
                  <Select
                    value={formData.categoria_cnh}
                    onChange={(e) => handleInputChange('categoria_cnh', e.target.value)}
                    label="Categoria CNH"
                  >
                    {['A','B','AB','C','D','E'].map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Funções */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Funções</InputLabel>
                  <Select
                    multiple
                    value={Array.isArray(formData.funcoes) ? formData.funcoes : []}
                    onChange={(e) => handleInputChange('funcoes', Array.isArray(e.target.value) ? e.target.value : (e.target.value ? [e.target.value] : []))}
                    label="Funções"
                    renderValue={(selected) => (Array.isArray(selected) ? selected.join(', ') : '')}
                  >
                    {funcoes.map((nome) => (
                      <MenuItem key={nome} value={nome}>
                        {nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Controle de Acesso */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Controle de Acesso</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.perfil_id} size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Perfil de Acesso *</InputLabel>
                  <Select
                    value={formData.perfil_id}
                    onChange={(e) => handleInputChange('perfil_id', e.target.value)}
                    label="Perfil de Acesso *"
                  >
                    {perfis.map((perfil) => (
                      <MenuItem key={perfil.id} value={perfil.id}>
                        {perfil.nome} (Nível {perfil.nivel_hierarquia})
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.perfil_id && (
                    <Typography variant="caption" color="error">
                      {formErrors.perfil_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.ativo}
                      onChange={(e) => handleInputChange('ativo', e.target.checked)}
                    />
                  }
                  label="Usuário Ativo"
                />
              </Grid>
              
              {/* Senha (apenas para criação) */}
              {(dialogType === 'create' || dialogType === 'edit') && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Senha *"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.senha}
                      onChange={(e) => handleInputChange('senha', e.target.value)}
                      error={!!formErrors.senha}
                      helperText={formErrors.senha}
                      required={dialogType === 'create'}
                      size={isMobile ? 'small' : 'medium'}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Confirmar Senha *"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmar_senha}
                      onChange={(e) => handleInputChange('confirmar_senha', e.target.value)}
                      error={!!formErrors.confirmar_senha}
                      helperText={formErrors.confirmar_senha}
                      required={dialogType === 'create'}
                      size={isMobile ? 'small' : 'medium'}
                    />
                  </Grid>
                </>
              )}
            </Grid>
            </fieldset>
          </Box>
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
          <Button onClick={handleCloseDialog}>{isView ? 'Fechar' : 'Cancelar'}</Button>
          {!isView && (
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {dialogType === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  };

  // =====================================================
  // RENDERIZAÇÃO PRINCIPAL
  // =====================================================

  return (
    <Box sx={{ p: 3 }}>
      {/* Cabeçalho */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestão de Usuários
        </Typography>
        
        {hasRole(['Administrador', 'Comandante']) && (
          <Fab
            color="primary"
            onClick={() => handleOpenDialog('create')}
            sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab 
            label="Usuários Ativos" 
            icon={<GroupIcon />} 
            iconPosition="start"
          />
          <Tab 
            label={
              <Badge badgeContent={solicitacoesPendentes.length} color="error">
                Solicitações Pendentes
              </Badge>
            }
            icon={<PendingIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Filtros */}
      {tabValue === 0 && (
        isMobile ? (
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<FilterIcon />}>Filtros</AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Buscar usuários"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    size={isMobile ? 'small' : 'medium'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={filters.tipo}
                      onChange={(e) => handleFilterChange('tipo', e.target.value)}
                      label="Tipo"
                    >
                      <MenuItem key="todos-tipo" value="">Todos</MenuItem>
                      <MenuItem key="militar" value="militar">Militar</MenuItem>
                      <MenuItem key="civil" value="civil">Civil</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                    <InputLabel>Perfil</InputLabel>
                    <Select
                      value={filters.perfil}
                      onChange={(e) => handleFilterChange('perfil', e.target.value)}
                      label="Perfil"
                    >
                      <MenuItem key="todos-perfil" value="">Todos</MenuItem>
                      {perfis.map((perfil) => (
                        <MenuItem key={perfil.id} value={perfil.nome}>
                          {perfil.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.ativo}
                      onChange={(e) => handleFilterChange('ativo', e.target.value)}
                      label="Status"
                    >
                      <MenuItem key="todos-status" value="">Todos</MenuItem>
                      <MenuItem key="ativo" value="true">Ativo</MenuItem>
                      <MenuItem key="inativo" value="false">Inativo</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterIcon />}
                    onClick={loadUsuarios}
                    disabled={usuariosLoading}
                  >
                    Filtrar
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ) : (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Buscar usuários"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    size={isMobile ? 'small' : 'medium'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={filters.tipo}
                      onChange={(e) => handleFilterChange('tipo', e.target.value)}
                      label="Tipo"
                    >
                      <MenuItem key="todos-tipo" value="">Todos</MenuItem>
                      <MenuItem key="militar" value="militar">Militar</MenuItem>
                      <MenuItem key="civil" value="civil">Civil</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                    <InputLabel>Perfil</InputLabel>
                    <Select
                      value={filters.perfil}
                      onChange={(e) => handleFilterChange('perfil', e.target.value)}
                      label="Perfil"
                    >
                      <MenuItem key="todos-perfil" value="">Todos</MenuItem>
                      {perfis.map((perfil) => (
                        <MenuItem key={perfil.id} value={perfil.nome}>
                          {perfil.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.ativo}
                      onChange={(e) => handleFilterChange('ativo', e.target.value)}
                      label="Status"
                    >
                      <MenuItem key="todos-status" value="">Todos</MenuItem>
                      <MenuItem key="ativo" value="true">Ativo</MenuItem>
                      <MenuItem key="inativo" value="false">Inativo</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterIcon />}
                    onClick={loadUsuarios}
                    disabled={usuariosLoading}
                  >
                    Filtrar
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      )}

      {/* Conteúdo Principal */}
      {tabValue === 0 ? (
        // Lista de Usuários
        <>
          {usuariosLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : usuarios.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" align="center" color="text.secondary">
                  Nenhum usuário encontrado
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <>
              {usuarios.map(renderUsuarioCard)}
              
              {/* Paginação */}
              {pagination.total_pages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={pagination.total_pages}
                    page={pagination.current_page}
                    onChange={(e, page) => handleFilterChange('page', page)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </>
      ) : (
        // Lista de Solicitações Pendentes
        <>
          {solicitacoesPendentes.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" align="center" color="text.secondary">
                  Nenhuma solicitação pendente
                </Typography>
              </CardContent>
            </Card>
          ) : (
            solicitacoesPendentes.map(renderSolicitacaoCard)
          )}
        </>
      )}

      {/* Menu de Ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem key="view-usuario" onClick={() => {
          handleOpenDialog('view', selectedUsuario);
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} /> Visualizar
        </MenuItem>
        
        {hasRole(['Administrador', 'Comandante']) && (
          <MenuItem key="edit-usuario" onClick={() => {
            handleOpenDialog('edit', selectedUsuario);
            setAnchorEl(null);
          }}>
            <EditIcon sx={{ mr: 1 }} /> Editar
          </MenuItem>
        )}
        
        {hasRole(['Administrador']) && (
          <MenuItem key="toggle-ativo" onClick={() => {
            handleToggleAtivo(selectedUsuario.id, !selectedUsuario.ativo);
            setAnchorEl(null);
          }}>
            {selectedUsuario?.ativo ? (
              <><PersonOffIcon sx={{ mr: 1 }} /> Desativar</>
            ) : (
              <><PersonAddIcon sx={{ mr: 1 }} /> Ativar</>
            )}
          </MenuItem>
        )}
      </Menu>

      {/* Dialog de Formulário */}
      {renderFormDialog()}
    </Box>
  );
};

export default CadastroUsuarios;

// =====================================================
// DOCUMENTAÇÃO DE USO
// =====================================================
//
// FUNCIONALIDADES IMPLEMENTADAS:
//
// 1. CADASTRO UNIFICADO:
//    - Militares e civis em uma única interface
//    - Campos condicionais baseados no tipo
//    - Validação específica por tipo
//
// 2. GESTÃO DE PERFIS:
//    - 5 níveis hierárquicos
//    - Controle de acesso baseado em perfis
//    - Permissões granulares
//
// 3. APROVAÇÃO DE SOLICITAÇÕES:
//    - Visualização de solicitações pendentes
//    - Aprovação/rejeição com um clique
//    - Notificações de status
//
// 4. FILTROS E BUSCA:
//    - Busca por nome, email, matrícula
//    - Filtros por tipo, perfil, status
//    - Paginação eficiente
//
// 5. INTERFACE RESPONSIVA:
//    - Design moderno com Material-UI
//    - Adaptável a diferentes tamanhos de tela
//    - Acessibilidade implementada
//
// =====================================================
