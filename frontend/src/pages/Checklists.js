import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Fab,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Pagination,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  DirectionsCar as CarIcon,
  Assignment as ChecklistIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  LocalGasStation as FuelIcon,
  Speed as SpeedIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Description as TemplateIcon,
  Save as SaveIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { checklistService, frotaService, templateService } from '../services/api';
import ChecklistViatura from '../components/ChecklistViatura';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import TemplateBuilder from '../components/TemplateBuilder';

const Checklists = () => {
  const { currentUnit } = useTenant();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    const canAccessAdvancedTabs = ['Administrador','Chefe','Auxiliar'].includes(user?.perfil_nome);
    if (!canAccessAdvancedTabs && activeTab > 0) {
      setActiveTab(0);
    }
  }, [user, activeTab]);
  const [checklists, setChecklists] = useState([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [checklistsFilters, setChecklistsFilters] = useState({
    viatura_id: '',
    status: '',
    data_inicio: '',
    data_fim: '',
    tipo_checklist: '',
    ala_servico: '',
  });
  const [checklistsPage, setChecklistsPage] = useState(1);
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const qp = Number(params.get('page') || '1');
      if (!Number.isNaN(qp) && qp > 0 && qp !== checklistsPage) {
        setChecklistsPage(qp);
      }
    } catch (e) {}
  }, [location.search]);

  const setQueryParam = (key, value) => {
    const params = new URLSearchParams(location.search);
    if (value === null || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  const handleChecklistsPageChange = (page) => {
    setChecklistsPage(page);
    setQueryParam('page', page);
  };
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  // Prefill para iniciar a partir de uma solicitação
  const [prefillData, setPrefillData] = useState(null);
  const [startingSolicitacaoId, setStartingSolicitacaoId] = useState(null);
  
  // Solicitações pendentes
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [solicitacoesLoading, setSolicitacoesLoading] = useState(false);
  const [solicitacoesError, setSolicitacoesError] = useState('');
  const [criarSolicDialogOpen, setCriarSolicDialogOpen] = useState(false);
  const [novaSolicitacao, setNovaSolicitacao] = useState({
    viatura_id: '',
    tipo_checklist: 'Diário',
    ala_servico: '',
    observacoes: ''
  });
  
  // Estados do painel de automação (novo CRUD)
  const [viaturasDisponiveis, setViaturasDisponiveis] = useState([]);
  const [templatesDisponiveis, setTemplatesDisponiveis] = useState([]);
  const [automacoes, setAutomacoes] = useState([]);
  const [automacoesLoading, setAutomacoesLoading] = useState(false);
  const [automacaoDialogOpen, setAutomacaoDialogOpen] = useState(false);
  const [editingAutomacao, setEditingAutomacao] = useState(null);
  const [autoActionLoading, setAutoActionLoading] = useState(false);
  const [autoFilters, setAutoFilters] = useState({ nome: '', ativo: '', ala_servico: '', tipo_checklist: '' });

  const filteredAutomacoes = automacoes.filter((a) => {
    const byName = autoFilters.nome ? (a.nome || '').toLowerCase().includes(autoFilters.nome.toLowerCase()) : true;
    const byStatus = autoFilters.ativo !== '' ? String(!!a.ativo) === autoFilters.ativo : true;
    const byAla = autoFilters.ala_servico ? a.ala_servico === autoFilters.ala_servico : true;
    const byTipo = autoFilters.tipo_checklist ? a.tipo_checklist === autoFilters.tipo_checklist : true;
    return byName && byStatus && byAla && byTipo;
  });

  const [autoPage, setAutoPage] = useState(1);
  const autoPerPage = isMobile ? 5 : 8;
  const autoPages = Math.max(1, Math.ceil(filteredAutomacoes.length / autoPerPage));
  const paginatedAutomacoes = filteredAutomacoes.slice((autoPage - 1) * autoPerPage, autoPage * autoPerPage);
  const [autoError, setAutoError] = useState('');
  const [autoMessage, setAutoMessage] = useState('');
  const [automacaoForm, setAutomacaoForm] = useState({
    nome: '',
    ativo: true,
    horario: '07:00',
    dias_semana: [],
    ala_servico: 'Alpha',
    viatura_id: '',
    template_id: '',
    tipo_checklist: 'Diário',
  });
  const diasSemanaOptions = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // Estados para formulários
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  
  // Estado de debug (remover em produção)
  const [debugInfo, setDebugInfo] = useState({
    dialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    selectedItem: selectedItem?.id || null,
    dialogType
  });
  
  // Atualizar debug info quando estados mudarem
  useEffect(() => {
    setDebugInfo({
      dialogOpen,
      editDialogOpen,
      deleteDialogOpen,
      selectedItem: selectedItem?.id || null,
      dialogType
    });
  }, [dialogOpen, editDialogOpen, deleteDialogOpen, selectedItem, dialogType]);
  
  // Carregar checklists
  const loadChecklists = useCallback(async () => {
    try {
      setChecklistsLoading(true);
      console.log('🔍 Carregando checklists...');
      console.log('🏢 CurrentUnit:', currentUnit);
      
      // Preparar filtros incluindo unidade se disponível
      const filters = { ...checklistsFilters };
      if (currentUnit?.id) {
        filters.unidade_id = currentUnit.id;
        console.log('📍 Aplicando filtro de unidade:', currentUnit.id);
      } else {
        console.warn('⚠️ CurrentUnit não definido ou sem ID');
      }
      
      console.log('📤 Filtros da requisição:', filters);
      const response = await checklistService.getChecklists(filters);
      console.log('📥 Resposta da API:', response);
      
      const checklistsData = Array.isArray(response.checklists) ? response.checklists : [];
      console.log('📋 Checklists carregados:', checklistsData.length, checklistsData);
      
      setChecklists(checklistsData);
    } catch (err) {
      console.error('❌ Erro ao carregar checklists:', err);
      setError('❌ Erro ao carregar checklists');
    } finally {
      setChecklistsLoading(false);
    }
  }, [checklistsFilters, currentUnit]);

  // Carregar solicitações
  const loadSolicitacoes = useCallback(async () => {
    try {
      setSolicitacoesLoading(true);
      const params = {};
      if (currentUnit?.id) params.unidade_id = currentUnit.id;
      const data = await checklistService.getSolicitacoes(params);
      const lista = Array.isArray(data?.solicitacoes) ? data.solicitacoes : [];
      setSolicitacoes(lista);
      setSolicitacoesError('');
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
      setSolicitacoes([]);
      setSolicitacoesError('Erro ao carregar solicitações pendentes');
    } finally {
      setSolicitacoesLoading(false);
    }
  }, [currentUnit]);

  // useEffect para carregar dados iniciais
  useEffect(() => {
    loadChecklists();
    loadSolicitacoes();
  }, [loadChecklists, loadSolicitacoes]);

  // useEffect para recarregar dados quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadChecklists();
      loadSolicitacoes();
    }
  }, [currentUnit, loadChecklists, loadSolicitacoes]);

  useEffect(() => {
    setChecklistsPage(1);
    setQueryParam('page', 1);
  }, [checklistsFilters, isMobile]);

  // Polling para manter Solicitações atualizadas enquanto estiver na aba de Checklists
  useEffect(() => {
    if (activeTab !== 0) return;
    const interval = setInterval(() => {
      loadSolicitacoes();
    }, 30000); // a cada 30s
    return () => clearInterval(interval);
  }, [activeTab, loadSolicitacoes]);

  // Carregar dados da aba de Automações
  useEffect(() => {
    if (activeTab === 2) {
      // Viaturas
      frotaService.getViaturas({ limit: 100 })
        .then((res) => {
          const lista = res.data?.viaturas || res.viaturas || [];
          setViaturasDisponiveis(lista);
        })
        .catch((err) => {
          console.error('Erro ao carregar viaturas para automação:', err);
          setViaturasDisponiveis([]);
        });

      // Templates
      templateService.getTemplates(currentUnit?.id ? { unidade_id: currentUnit.id } : {})
        .then((res) => {
          const templates = Array.isArray(res) ? res : (res.templates || []);
          setTemplatesDisponiveis(templates);
        })
        .catch((err) => {
          console.error('Erro ao carregar templates para automação:', err);
          setTemplatesDisponiveis([]);
        });

      // Automações (backend)
      const loadAutomacoes = async () => {
        try {
          setAutomacoesLoading(true);
          const data = await checklistService.getAutomacoes();
          const lista = Array.isArray(data?.automacoes) ? data.automacoes : (Array.isArray(data) ? data : []);
          setAutomacoes(lista);
        } catch (e) {
          console.error('Erro ao carregar automações:', e);
          setAutomacoes([]);
        } finally {
          setAutomacoesLoading(false);
        }
      };
      loadAutomacoes();
    }
  }, [activeTab, currentUnit]);

  // Carregar Viaturas para filtros quando estiver na aba de Checklists
  useEffect(() => {
    if (activeTab === 0) {
      frotaService.getViaturas({ limit: 500 })
        .then((res) => {
          const lista = res.data?.viaturas || res.viaturas || [];
          setViaturasDisponiveis(lista);
        })
        .catch((err) => {
          console.error('Erro ao carregar viaturas para filtros:', err);
          setViaturasDisponiveis([]);
        });
    }
  }, [activeTab, currentUnit]);

  // Limpar template se não combinar com o tipo da viatura selecionada
  useEffect(() => {
    try {
      if (!automacaoForm.viatura_id || !automacaoForm.template_id) return;
      const v = viaturasDisponiveis.find(x => x.id === automacaoForm.viatura_id);
      const t = templatesDisponiveis.find(x => x.id === automacaoForm.template_id);
      const vTipo = v ? (v.tipo || v.viatura_tipo) : null;
      if (t && vTipo && t.tipo_viatura !== vTipo) {
        setAutomacaoForm(prev => ({ ...prev, template_id: '' }));
      }
    } catch (e) {
      // silencioso
    }
  }, [automacaoForm.viatura_id, automacaoForm.template_id, viaturasDisponiveis, templatesDisponiveis]);

  // Ações de automações
  const abrirNovaAutomacao = () => {
    setEditingAutomacao(null);
    setAutomacaoForm({
      nome: '',
      ativo: true,
      horario: '07:00',
      dias_semana: [],
      ala_servico: 'Alpha',
      viatura_id: '',
      template_id: '',
      tipo_checklist: 'Diário',
    });
    setAutomacaoDialogOpen(true);
    setAutoError('');
  };

  const abrirEditarAutomacao = (auto) => {
    setEditingAutomacao(auto);
    setAutomacaoForm({
      nome: auto.nome || '',
      ativo: !!auto.ativo,
      horario: auto.horario || '07:00',
      dias_semana: Array.isArray(auto.dias_semana) ? auto.dias_semana : [],
      ala_servico: auto.ala_servico || 'Alpha',
      viatura_id: (Array.isArray(auto.viaturas) && auto.viaturas.length > 0) ? auto.viaturas[0] : '',
      template_id: auto.template_id || '',
      tipo_checklist: auto.tipo_checklist || 'Diário',
    });
    setAutomacaoDialogOpen(true);
    setAutoError('');
  };

  const salvarAutomacao = async () => {
    try {
      setAutoActionLoading(true);
      setAutoError('');
      // validações simples
      if (!automacaoForm.horario || automacaoForm.dias_semana.length === 0 || !automacaoForm.viatura_id) {
        setAutoError('Informe horário, ao menos um dia e a viatura.');
        setAutoActionLoading(false);
        return;
      }
      const payload = { ...automacaoForm, viaturas: [automacaoForm.viatura_id] };
      delete payload.viatura_id;
      if (editingAutomacao?.id) {
        await checklistService.updateAutomacao(editingAutomacao.id, payload);
        setAutoMessage('Automação atualizada com sucesso.');
      } else {
        await checklistService.createAutomacao(payload);
        setAutoMessage('Automação criada com sucesso.');
      }
      setAutomacaoDialogOpen(false);
      // reload
      const data = await checklistService.getAutomacoes();
      const lista = Array.isArray(data?.automacoes) ? data.automacoes : (Array.isArray(data) ? data : []);
      setAutomacoes(lista);
    } catch (e) {
      console.error('Erro ao salvar automação:', e);
      setAutoError('Falha ao salvar automação.');
    } finally {
      setAutoActionLoading(false);
      setTimeout(() => setAutoMessage(''), 4000);
    }
  };

  const alternarAutomacao = async (auto) => {
    try {
      setAutoActionLoading(true);
      await checklistService.toggleAutomacao(auto.id, !auto.ativo);
      const data = await checklistService.getAutomacoes();
      const lista = Array.isArray(data?.automacoes) ? data.automacoes : (Array.isArray(data) ? data : []);
      setAutomacoes(lista);
    } catch (e) {
      console.error('Erro ao alternar automação:', e);
      setAutoError('Falha ao ativar/desativar.');
    } finally {
      setAutoActionLoading(false);
    }
  };

  const excluirAutomacao = async (auto) => {
    try {
      setAutoActionLoading(true);
      await checklistService.deleteAutomacao(auto.id);
      const data = await checklistService.getAutomacoes();
      const lista = Array.isArray(data?.automacoes) ? data.automacoes : (Array.isArray(data) ? data : []);
      setAutomacoes(lista);
    } catch (e) {
      console.error('Erro ao excluir automação:', e);
      setAutoError('Falha ao excluir.');
    } finally {
      setAutoActionLoading(false);
    }
  };

  // Confirmação antes de excluir automação (igual ao padrão usado em cancelamento de solicitações)
  const confirmarExcluirAutomacao = async (auto) => {
    const confirmar = window.confirm('Confirmar exclusão desta automação?');
    if (!confirmar) return;
    await excluirAutomacao(auto);
  };

  const gerarSolicitacoesAgora = async (auto) => {
    try {
      setAutoActionLoading(true);
      await checklistService.gerarSolicitacoesAutomacao(auto.id);
      setAutoMessage('Solicitações geradas com sucesso.');
      await loadSolicitacoes();
    } catch (e) {
      console.error('Erro ao gerar solicitações:', e);
      setAutoError('Falha ao gerar solicitações.');
    } finally {
      setAutoActionLoading(false);
      setTimeout(() => setAutoMessage(''), 4000);
    }
  };

  const abrirCriarSolicitacao = () => {
    setNovaSolicitacao({ viatura_id: '', tipo_checklist: 'diario', ala_servico: '', observacoes: '' });
    setCriarSolicDialogOpen(true);
  };

  const fecharCriarSolicitacao = () => {
    setCriarSolicDialogOpen(false);
  };

  const handleCriarSolicitacao = async () => {
    try {
      setActionLoading(true);
      setError('');
      const payload = {
        viatura_id: novaSolicitacao.viatura_id,
        tipo_checklist: novaSolicitacao.tipo_checklist,
        ala_servico: novaSolicitacao.ala_servico,
        observacoes: novaSolicitacao.observacoes,
      };
      const res = await checklistService.createSolicitacao(payload);
      // Recarregar lista
      await loadSolicitacoes();
      setCriarSolicDialogOpen(false);
      setActionLoading(false);
    } catch (err) {
      console.error('Falha ao criar solicitação:', err);
      setError('Falha ao criar solicitação');
      setActionLoading(false);
    }
  };

  // Cancelar solicitação: muda status para 'cancelada'
  const handleCancelarSolicitacao = async (id) => {
    try {
      const confirmar = window.confirm('Confirmar cancelamento desta solicitação?');
      if (!confirmar) return;
      setActionLoading(true);
      await checklistService.cancelarSolicitacao(id);
      await loadSolicitacoes();
      setSolicitacoesError('');
    } catch (err) {
      console.error('Erro ao cancelar solicitação:', err);
      setSolicitacoesError('Falha ao cancelar a solicitação.');
    } finally {
      setActionLoading(false);
    }
  };

  // Excluir solicitação pendente (apenas Admin/Chefe). Usa DELETE para persistência real.
  const handleExcluirSolicitacao = async (id) => {
    try {
      const confirmar = window.confirm('Confirmar exclusão definitiva desta solicitação?');
      if (!confirmar) return;
      setActionLoading(true);
      await checklistService.deleteSolicitacao(id);
      await loadSolicitacoes();
      setSolicitacoesError('');
    } catch (err) {
      console.error('Erro ao excluir solicitação:', err);
      setSolicitacoesError('Falha ao excluir a solicitação. Verifique suas permissões.');
    } finally {
      setActionLoading(false);
    }
  };

  // Removido: handler legado de automação baseado em localStorage

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedItem(null);
    setFormData({});
    setFormErrors({});
  };

  const handleMenuOpen = (event, item) => {
    console.log('📋 Abrindo menu para item:', item);
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
    console.log('✅ Menu aberto, item selecionado:', item?.id);
  };

  const handleMenuClose = () => {
    console.log('❌ Fechando menu');
    setAnchorEl(null);
    // Não limpar selectedItem aqui para preservar durante as ações
  };

  const handleMenuAction = async (action) => {
    console.log('🎯 Ação do menu:', action, 'Item selecionado:', selectedItem);
    
    if (!selectedItem) {
      console.error('❌ Nenhum item selecionado');
      return;
    }

    // Preservar o item selecionado para as ações
    const itemToProcess = selectedItem;
    
    try {
      if (action === 'view') {
        console.log('👁️ Executando ação de visualizar');
        await handleViewChecklist(itemToProcess);
      } else if (action === 'edit') {
        console.log('✏️ Executando ação de editar');
        handleEditChecklist(itemToProcess);
      } else if (action === 'delete') {
        console.log('🗑️ Executando ação de excluir');
        // Preservar o item para a exclusão
        setSelectedItem(itemToProcess);
        setDeleteDialogOpen(true);
        console.log('✅ Diálogo de exclusão aberto');
      }
    } catch (err) {
      console.error('❌ Erro ao executar ação:', err);
      setError(`Erro ao executar ação: ${err.message}`);
    } finally {
      handleMenuClose();
    }
  };

  // Função para visualizar checklist com dados completos
  const handleViewChecklist = async (checklist) => {
    try {
      setActionLoading(true);
      console.log('🔍 Carregando detalhes do checklist:', checklist.id);
      const response = await checklistService.getChecklist(checklist.id);
      console.log('📥 Dados completos do checklist:', response);
      
      // Garantir que temos os dados corretos
      const fullChecklist = response.checklist || response;
      setSelectedItem(fullChecklist);
      setDialogType('view');
      setDialogOpen(true);
      
      console.log('✅ Diálogo de visualização aberto');
    } catch (err) {
      console.error('❌ Erro ao carregar checklist:', err);
      setError('Erro ao carregar detalhes do checklist');
    } finally {
      setActionLoading(false);
    }
  };

  // Função para editar checklist
  const handleEditChecklist = (checklist) => {
    console.log('✏️ Abrindo diálogo de edição para:', checklist);
    setSelectedItem(checklist);
    setFormData({
      km_inicial: checklist.km_inicial || '',
      combustivel_percentual: checklist.combustivel_percentual || '',
      observacoes_gerais: checklist.observacoes_gerais || '',
      status: checklist.status || 'em_andamento'
    });
    setEditDialogOpen(true);
    console.log('✅ Diálogo de edição aberto');
  };

  // Função para confirmar cancelamento
  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    if (!cancelReason || !cancelReason.trim()) {
      setError('Informe o motivo para cancelar o checklist.');
      return;
    }
    try {
      setActionLoading(true);
      await checklistService.cancelarChecklist(selectedItem.id, cancelReason.trim());
      setDeleteDialogOpen(false);
      setCancelReason('');
      setSelectedItem(null);
      await loadChecklists();
      setError('');
    } catch (err) {
      console.error('Erro ao cancelar checklist:', err);
      setError('Erro ao cancelar checklist. Verifique suas permissões.');
    } finally {
      setActionLoading(false);
    }
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    
    try {
      setActionLoading(true);
      await checklistService.updateChecklist(selectedItem.id, formData);
      setEditDialogOpen(false);
      setSelectedItem(null);
      setFormData({});
      await loadChecklists();
      setError('');
    } catch (err) {
      console.error('Erro ao atualizar checklist:', err);
      setError('Erro ao atualizar checklist');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFabClick = () => {
    if (activeTab === 0) {
      // Aba de Checklists - abrir diálogo de checklist
      setPrefillData(null);
      setChecklistDialogOpen(true);
    } else if (activeTab === 1) {
      // Aba de Templates - o TemplateBuilder tem seu próprio botão
      // Não fazemos nada aqui pois o TemplateBuilder gerencia seus próprios diálogos
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'finalizado':
        return 'success';
      case 'pendente':
        return 'warning';
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleStartSolicitacao = async (s) => {
    try {
      // Guardar ID da solicitação em andamento para marcar como atendida após finalizar
      setStartingSolicitacaoId(s.id);
      // Não marcar como atendida agora; abrir formulário com prefill local
      const tipoNorm = (s.tipo_checklist === 'diario' || s.tipo_checklist === 'Diario') ? 'Diário' : (s.tipo_checklist || 'Diário');
      setPrefillData({
        viatura_id: s.viatura_id,
        template_id: s.template_id,
        tipo_checklist: tipoNorm,
        ala_servico: s.ala_servico,
      });
      setChecklistDialogOpen(true);
    } catch (err) {
      console.error('Erro ao iniciar solicitação:', err);
      setSolicitacoesError('Erro ao iniciar a solicitação. Tente novamente.');
    } finally {
      // Mantém startingSolicitacaoId para uso em onSuccess
    }
  };

  // Função para renderizar o conteúdo da aba de Modelos de Checklists
  const renderModelosTab = () => (
    <TemplateBuilder />
  );

  const checklistsPerPage = isMobile ? 5 : 10;
  const checklistsPages = Math.max(1, Math.ceil(checklists.length / checklistsPerPage));
  const paginatedChecklists = checklists.slice((checklistsPage - 1) * checklistsPerPage, checklistsPage * checklistsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header com Abas */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChecklistIcon sx={{ color: 'primary.main' }} />
          Checklists
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Gerencie checklists e modelos de checklists das viaturas
        </Typography>
        
        {/* Abas */}
        <Tabs 
          value={activeTab} 
          onChange={(event, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="Checklists de Viaturas" 
            icon={<ChecklistIcon />} 
            iconPosition="start"
          />
          {(['Administrador','Chefe','Auxiliar'].includes(user?.perfil_nome)) && (
            <Tab 
              label="Modelos de Checklists" 
              icon={<TemplateIcon />} 
              iconPosition="start"
            />
          )}
          {(['Administrador','Chefe','Auxiliar'].includes(user?.perfil_nome)) && (
            <Tab 
              label="Automação de Checklists" 
              icon={<ScheduleIcon />} 
              iconPosition="start"
            />
          )}
        </Tabs>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Faixa de debug removida conforme solicitação do usuário */}

      {/* Conteúdo das Abas */}
      {activeTab === 0 && (
        <>
          {/* Painel de Solicitações Pendentes */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Solicitações pendentes de preenchimento
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {solicitacoesLoading && <CircularProgress size={20} />}
                </Box>
              </Box>
              {solicitacoesError && (
                <Alert severity="warning" sx={{ mt: 2 }}>{solicitacoesError}</Alert>
              )}
              {(!solicitacoesLoading && solicitacoes.length === 0) ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Nenhuma solicitação pendente.
                </Typography>
              ) : (
                <Box>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {solicitacoes.map((s) => (
                    <Grid item xs={12} md={6} key={s.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <ChecklistIcon sx={{ color: 'primary.main' }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {s.tipo_checklist || 'Checklist'} • {s.ala_servico || 'Ala'}
                            </Typography>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="text.secondary">Viatura</Typography>
                              <Typography variant="body2">{s.viatura_prefixo || s.placa || `#${s.viatura_id}`}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="text.secondary">Data prevista</Typography>
                              <Typography variant="body2">{s.data_prevista ? new Date(s.data_prevista).toLocaleString('pt-BR') : '-'}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button size="small" variant="contained" onClick={() => handleStartSolicitacao(s)} disabled={startingSolicitacaoId === s.id}>
                                  Iniciar Preenchimento
                                </Button>
                                {user?.perfil_nome !== 'Operador' && (
                                  <Button size="small" color="warning" variant="outlined" onClick={() => handleCancelarSolicitacao(s.id)}>
                                    Cancelar
                                  </Button>
                                )}
                                {/* Botão Excluir removido dos cards de solicitações pendentes */}
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Dialogo para criar nova solicitação - removido conforme feedback do usuário */}

          {/* Filtros */}
          {isMobile ? (
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterIcon /> Filtros de Pesquisa
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Viatura</InputLabel>
              <Select
                value={checklistsFilters.viatura_id || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                label="Viatura"
              >
                <MenuItem key="todas-viaturas-checklist" value="">Todas</MenuItem>
                {viaturasDisponiveis.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {(v.prefixo || v.placa || v.viatura_prefixo || v.viatura_placa || `#${v.id}`)}{v.modelo || v.viatura_modelo ? ` - ${v.modelo || v.viatura_modelo}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Status</InputLabel>
              <Select
                value={checklistsFilters.status || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem key="todos-status-checklist" value="">Todos</MenuItem>
                <MenuItem key="pendente-checklist" value="pendente">Pendente</MenuItem>
                <MenuItem key="finalizado-checklist" value="finalizado">Finalizado</MenuItem>
                <MenuItem key="cancelado-checklist" value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={checklistsFilters.data_inicio}
              onChange={(e) => setChecklistsFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              size={isMobile ? 'small' : 'medium'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={checklistsFilters.data_fim}
              onChange={(e) => setChecklistsFilters(prev => ({ ...prev, data_fim: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              size={isMobile ? 'small' : 'medium'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Tipo de Checklist</InputLabel>
              <Select
                value={checklistsFilters.tipo_checklist || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, tipo_checklist: e.target.value }))}
                label="Tipo de Checklist"
              >
                <MenuItem key="todos-tipos-checklist" value="">Todos</MenuItem>
                <MenuItem key="diario-checklist" value="Diário">Diário</MenuItem>
                <MenuItem key="semanal-checklist" value="Semanal">Semanal</MenuItem>
                <MenuItem key="mensal-checklist" value="Mensal">Mensal</MenuItem>
                <MenuItem key="pre-operacional-checklist" value="Pré-Operacional">Pré-Operacional</MenuItem>
                <MenuItem key="pos-operacional-checklist" value="Pós-Operacional">Pós-Operacional</MenuItem>
                <MenuItem key="manutencao-preventiva-checklist" value="Manutenção Preventiva">Manutenção Preventiva</MenuItem>
                <MenuItem key="inspecao-seguranca-checklist" value="Inspeção de Segurança">Inspeção de Segurança</MenuItem>
                <MenuItem key="vistoria-tecnica-checklist" value="Vistoria Técnica">Vistoria Técnica</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Ala</InputLabel>
              <Select
                value={checklistsFilters.ala_servico || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, ala_servico: e.target.value }))}
                label="Ala"
              >
                <MenuItem key="todas-alas-checklist" value="">Todas</MenuItem>
                <MenuItem key="alpha-ala" value="Alpha">Alpha</MenuItem>
                <MenuItem key="bravo-ala" value="Bravo">Bravo</MenuItem>
                <MenuItem key="charlie-ala" value="Charlie">Charlie</MenuItem>
                <MenuItem key="delta-ala" value="Delta">Delta</MenuItem>
                <MenuItem key="adm-ala" value="ADM">ADM</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setChecklistsFilters({
              viatura_id: '',
              status: '',
              data_inicio: '',
              data_fim: '',
              tipo_checklist: '',
              ala_servico: '',
            })}
            startIcon={<FilterIcon />}
          >
            Limpar Filtros
          </Button>
        </Box>
              </AccordionDetails>
            </Accordion>
          ) : (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon /> Filtros de Pesquisa
            </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Viatura</InputLabel>
              <Select
                value={checklistsFilters.viatura_id || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                label="Viatura"
              >
                <MenuItem key="todas-viaturas-checklist" value="">Todas</MenuItem>
                {viaturasDisponiveis.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {(v.prefixo || v.placa || v.viatura_prefixo || v.viatura_placa || `#${v.id}`)}{v.modelo || v.viatura_modelo ? ` - ${v.modelo || v.viatura_modelo}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Status</InputLabel>
              <Select
                value={checklistsFilters.status || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem key="todos-status-checklist" value="">Todos</MenuItem>
                <MenuItem key="pendente-checklist" value="pendente">Pendente</MenuItem>
                <MenuItem key="finalizado-checklist" value="finalizado">Finalizado</MenuItem>
                <MenuItem key="cancelado-checklist" value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={checklistsFilters.data_inicio}
              onChange={(e) => setChecklistsFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              size={isMobile ? 'small' : 'medium'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={checklistsFilters.data_fim}
              onChange={(e) => setChecklistsFilters(prev => ({ ...prev, data_fim: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              size={isMobile ? 'small' : 'medium'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Tipo de Checklist</InputLabel>
              <Select
                value={checklistsFilters.tipo_checklist || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, tipo_checklist: e.target.value }))}
                label="Tipo de Checklist"
              >
                <MenuItem key="todos-tipos-checklist" value="">Todos</MenuItem>
                <MenuItem key="diario-checklist" value="Diário">Diário</MenuItem>
                <MenuItem key="semanal-checklist" value="Semanal">Semanal</MenuItem>
                <MenuItem key="mensal-checklist" value="Mensal">Mensal</MenuItem>
                <MenuItem key="pre-operacional-checklist" value="Pré-Operacional">Pré-Operacional</MenuItem>
                <MenuItem key="pos-operacional-checklist" value="Pós-Operacional">Pós-Operacional</MenuItem>
                <MenuItem key="manutencao-preventiva-checklist" value="Manutenção Preventiva">Manutenção Preventiva</MenuItem>
                <MenuItem key="inspecao-seguranca-checklist" value="Inspeção de Segurança">Inspeção de Segurança</MenuItem>
                <MenuItem key="vistoria-tecnica-checklist" value="Vistoria Técnica">Vistoria Técnica</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
              <InputLabel>Ala</InputLabel>
              <Select
                value={checklistsFilters.ala_servico || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, ala_servico: e.target.value }))}
                label="Ala"
              >
                <MenuItem key="todas-alas-checklist" value="">Todas</MenuItem>
                <MenuItem key="alpha-ala" value="Alpha">Alpha</MenuItem>
                <MenuItem key="bravo-ala" value="Bravo">Bravo</MenuItem>
                <MenuItem key="charlie-ala" value="Charlie">Charlie</MenuItem>
                <MenuItem key="delta-ala" value="Delta">Delta</MenuItem>
                <MenuItem key="adm-ala" value="ADM">ADM</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setChecklistsFilters({
              viatura_id: '',
              status: '',
              data_inicio: '',
              data_fim: '',
              tipo_checklist: '',
              ala_servico: '',
            })}
            startIcon={<FilterIcon />}
          >
            Limpar Filtros
          </Button>
        </Box>
      </Box>
          )}

      {/* Lista de resultados */}
      {!isMobile && (
        <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Viatura</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Ala</TableCell>
              <TableCell>KM Inicial</TableCell>
              <TableCell>Combustível</TableCell>
              <TableCell>Situação</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Usuário</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {checklistsLoading ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : checklists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  Nenhum checklist encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginatedChecklists.map((checklist) => (
                <TableRow 
                  key={checklist.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleViewChecklist(checklist)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CarIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {checklist.placa || checklist.viatura_prefixo || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {checklist.modelo || checklist.viatura_modelo || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(checklist.data_checklist)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.tipo_checklist || 'N/A'}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.ala_servico || 'N/A'}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SpeedIcon sx={{ color: 'info.main', fontSize: 16 }} />
                      <Typography variant="body2">
                        {checklist.km_inicial ? `${Number(checklist.km_inicial).toLocaleString('pt-BR')} km` : '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FuelIcon sx={{ 
                        color: checklist.combustivel_percentual > 50 ? 'success.main' : 
                               checklist.combustivel_percentual > 25 ? 'warning.main' : 'error.main',
                        fontSize: 16 
                      }} />
                      <Typography variant="body2">
                        {checklist.combustivel_percentual}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.situacao || 'Sem Alteração'}
                      color={checklist.situacao === 'Com Alteração' ? 'warning' : 'success'}
                      size="small"
                      icon={checklist.situacao === 'Com Alteração' ? <WarningIcon /> : <CheckCircleIcon />}
                      sx={{
                        fontWeight: checklist.situacao === 'Com Alteração' ? 'bold' : 'normal',
                        '& .MuiChip-label': {
                          color: checklist.situacao === 'Com Alteração' ? 'warning.contrastText' : 'success.contrastText'
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.status}
                      color={getStatusColor(checklist.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                      <Typography variant="body2">
                        {checklist.usuario_nome}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, checklist); }}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
            </TableContainer>
            {checklistsPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={checklistsPages}
                  page={checklistsPage}
                  onChange={(e, page) => handleChecklistsPageChange(page)}
                  color="primary"
                />
              </Box>
            )}
        </>
      )}
      {isMobile && (
        <Box>
          {checklistsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : checklists.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              Nenhum checklist encontrado
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {paginatedChecklists.map((checklist) => (
                <Grid item xs={12} key={checklist.id}>
                  <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => handleViewChecklist(checklist)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CarIcon sx={{ color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {checklist.placa || checklist.viatura_prefixo || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(checklist.data_checklist)}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip label={checklist.status} color={getStatusColor(checklist.status)} size="small" />
                      </Box>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={checklist.tipo_checklist || 'N/A'} size="small" variant="outlined" />
                        <Chip label={checklist.ala_servico || 'N/A'} size="small" variant="outlined" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          {checklistsPages > 1 && (
            <Box display="flex" justifyContent="center" mt={1}>
              <Pagination
                count={checklistsPages}
                page={checklistsPage}
                onChange={(e, page) => handleChecklistsPageChange(page)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}
        </>
      )}

      {/* Aba de Templates */}
      {(['Administrador','Chefe','Auxiliar'].includes(user?.perfil_nome)) && activeTab === 1 && renderModelosTab()}

      {/* Aba de Automação de Checklists */}
      {(['Administrador','Chefe','Auxiliar'].includes(user?.perfil_nome)) && activeTab === 2 && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 2 : 0 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Automações de Checklists
                </Typography>
                {(user?.perfil_nome === 'Administrador' || user?.perfil_nome === 'Chefe') && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNovaAutomacao} fullWidth={isMobile}>
                    Nova Automação
                  </Button>
                )}
              </Box>
              <Accordion defaultExpanded={!isMobile} sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Filtros</AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField fullWidth label="Buscar por nome" value={autoFilters.nome} onChange={(e) => setAutoFilters(prev => ({ ...prev, nome: e.target.value }))} size={isMobile ? 'small' : 'medium'} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                        <InputLabel>Status</InputLabel>
                        <Select value={autoFilters.ativo} onChange={(e) => setAutoFilters(prev => ({ ...prev, ativo: e.target.value }))} label="Status">
                          <MenuItem value="">Todos</MenuItem>
                          <MenuItem value="true">Ativo</MenuItem>
                          <MenuItem value="false">Desativado</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                        <InputLabel>Ala</InputLabel>
                        <Select value={autoFilters.ala_servico} onChange={(e) => setAutoFilters(prev => ({ ...prev, ala_servico: e.target.value }))} label="Ala">
                          <MenuItem value="">Todas</MenuItem>
                          <MenuItem value="Alpha">Alpha</MenuItem>
                          <MenuItem value="Bravo">Bravo</MenuItem>
                          <MenuItem value="Charlie">Charlie</MenuItem>
                          <MenuItem value="Delta">Delta</MenuItem>
                          <MenuItem value="ADM">ADM</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                        <InputLabel>Tipo</InputLabel>
                        <Select value={autoFilters.tipo_checklist} onChange={(e) => setAutoFilters(prev => ({ ...prev, tipo_checklist: e.target.value }))} label="Tipo">
                          <MenuItem value="">Todos</MenuItem>
                          <MenuItem value="Diário">Diário</MenuItem>
                          <MenuItem value="Semanal">Semanal</MenuItem>
                          <MenuItem value="Mensal">Mensal</MenuItem>
                          <MenuItem value="Pré-Operacional">Pré-Operacional</MenuItem>
                          <MenuItem value="Pós-Operacional">Pós-Operacional</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <Button fullWidth variant="text" onClick={() => setAutoFilters({ nome: '', ativo: '', ala_servico: '', tipo_checklist: '' })}>Limpar</Button>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
              {autoError && (
                <Alert severity="error" sx={{ mt: 2 }}>{autoError}</Alert>
              )}
              {autoMessage && (
                <Alert severity="success" sx={{ mt: 2 }}>{autoMessage}</Alert>
              )}
              {automacoesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : automacoes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Nenhuma automação cadastrada.
                </Typography>
              ) : (
                <Box>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {paginatedAutomacoes.map((auto) => {
                    const template = templatesDisponiveis.find(t => t.id === auto.template_id);
                    const primeiraViaturaId = Array.isArray(auto.viaturas) && auto.viaturas.length > 0 ? auto.viaturas[0] : null;
                    const viatura = viaturasDisponiveis.find(v => v.id === primeiraViaturaId);
                    return (
                      <Grid item xs={12} md={6} key={auto.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {auto.nome || 'Automação'}
                              </Typography>
                              <Chip label={auto.ativo ? 'Ativo' : 'Desativado'} color={auto.ativo ? 'success' : 'default'} size="small" />
                            </Box>
                            {isMobile ? (
                              <Box sx={{ mt: 1, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                <Chip label={`Horário: ${auto.horario || '-'}`} size="small" variant="outlined" />
                                <Chip label={`Dias: ${Array.isArray(auto.dias_semana) ? auto.dias_semana.join(', ') : '-'}`} size="small" variant="outlined" />
                                <Chip label={`Ala: ${auto.ala_servico || '-'}`} size="small" variant="outlined" />
                                <Chip label={`Tipo: ${auto.tipo_checklist || '-'}`} size="small" variant="outlined" />
                                <Chip label={`Modelo: ${template ? (template.nome || `#${template.id}`) : (auto.template_id ? `#${auto.template_id}` : '-' )}`} size="small" variant="outlined" />
                                <Chip label={`Viatura: ${viatura ? (viatura.prefixo || viatura.placa || `#${viatura.id}`) : '-'}`} size="small" variant="outlined" />
                              </Box>
                            ) : (
                              <Grid container spacing={1} sx={{ mt: 1 }}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Horário</Typography>
                                  <Typography variant="body2">{auto.horario}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Dias</Typography>
                                  <Typography variant="body2">{Array.isArray(auto.dias_semana) ? auto.dias_semana.join(', ') : '-'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Ala</Typography>
                                  <Typography variant="body2">{auto.ala_servico || '-'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Tipo</Typography>
                                  <Typography variant="body2">{auto.tipo_checklist || '-'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Modelo</Typography>
                                  <Typography variant="body2">{template ? (template.nome || `#${template.id}`) : (auto.template_id ? `#${auto.template_id}` : '-')}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Viatura</Typography>
                                  <Typography variant="body2">{viatura ? (viatura.prefixo || viatura.placa || `#${viatura.id}`) : '-'}</Typography>
                                </Grid>
                              </Grid>
                            )}
                            {(user?.perfil_nome === 'Administrador' || user?.perfil_nome === 'Chefe') && (
                              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => abrirEditarAutomacao(auto)}>Editar</Button>
                                <Button size="small" variant="outlined" onClick={() => alternarAutomacao(auto)}>{auto.ativo ? 'Desativar' : 'Ativar'}</Button>
                                <Button size="small" variant="contained" onClick={() => gerarSolicitacoesAgora(auto)}>Gerar Solicitações Agora</Button>
                                <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => confirmarExcluirAutomacao(auto)}>Excluir</Button>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                {autoPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={3} width="100%">
                    <Pagination
                      count={autoPages}
                      page={autoPage}
                      onChange={(e, page) => setAutoPage(page)}
                      color="primary"
                    />
                  </Box>
                )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Diálogo de criação/edição de automação */}
          <Dialog open={automacaoDialogOpen} onClose={() => setAutomacaoDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
            <DialogTitle>{editingAutomacao ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
            <DialogContent dividers sx={{ p: isMobile ? 1.5 : 3 }}>
              {autoError && <Alert severity="error" sx={{ mb: 2 }}>{autoError}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Nome" value={automacaoForm.nome} onChange={(e) => setAutomacaoForm(prev => ({ ...prev, nome: e.target.value }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel control={<Switch checked={automacaoForm.ativo} onChange={(e) => setAutomacaoForm(prev => ({ ...prev, ativo: e.target.checked }))} />} label="Ativo" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Horário" type="time" value={automacaoForm.horario} onChange={(e) => setAutomacaoForm(prev => ({ ...prev, horario: e.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }} />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Dias da semana</InputLabel>
                    <Select multiple value={automacaoForm.dias_semana} onChange={(e) => setAutomacaoForm(prev => ({ ...prev, dias_semana: e.target.value }))} label="Dias da semana" renderValue={(selected) => selected.join(', ')}>
                      {diasSemanaOptions.map((dia) => (
                        <MenuItem key={dia} value={dia}>{dia}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Ala de serviço</InputLabel>
                    <Select value={automacaoForm.ala_servico} onChange={(e) => setAutomacaoForm(prev => ({ ...prev, ala_servico: e.target.value }))} label="Ala de serviço">
                      <MenuItem value="Alpha">Alpha</MenuItem>
                      <MenuItem value="Bravo">Bravo</MenuItem>
                      <MenuItem value="Charlie">Charlie</MenuItem>
                      <MenuItem value="Delta">Delta</MenuItem>
                      <MenuItem value="ADM">ADM</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Checklist</InputLabel>
                    <Select value={automacaoForm.tipo_checklist} onChange={(e) => setAutomacaoForm(prev => ({ ...prev, tipo_checklist: e.target.value }))} label="Tipo de Checklist">
                      <MenuItem value="Diário">Diário</MenuItem>
                      <MenuItem value="Semanal">Semanal</MenuItem>
                      <MenuItem value="Mensal">Mensal</MenuItem>
                      <MenuItem value="Pré-Operacional">Pré-Operacional</MenuItem>
                      <MenuItem value="Pós-Operacional">Pós-Operacional</MenuItem>
                      <MenuItem value="Manutenção Preventiva">Manutenção Preventiva</MenuItem>
                      <MenuItem value="Inspeção de Segurança">Inspeção de Segurança</MenuItem>
                      <MenuItem value="Vistoria Técnica">Vistoria Técnica</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Viatura</InputLabel>
                    <Select value={automacaoForm.viatura_id} onChange={(e) => setAutomacaoForm(prev => ({ ...prev, viatura_id: e.target.value }))} label="Viatura" renderValue={(selected) => {
                      const v = viaturasDisponiveis.find((x) => x.id === selected);
                      return v ? (v.prefixo || v.placa || `#${selected}`) : `#${selected}`;
                    }}>
                      {viaturasDisponiveis.map((v) => (
                        <MenuItem key={v.id} value={v.id}>
                          {(v.prefixo || v.placa || v.viatura_prefixo || v.viatura_placa || `#${v.id}`)}{v.modelo || v.viatura_modelo ? ` - ${v.modelo || v.viatura_modelo}` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Modelo de Checklist</InputLabel>
                    <Select value={automacaoForm.template_id} onChange={(e) => setAutomacaoForm(prev => ({ ...prev, template_id: e.target.value }))} label="Modelo de Checklist" renderValue={(val) => {
                      const t = templatesDisponiveis.find(x => x.id === val);
                      return t ? (t.nome || `#${t.id}`) : '';
                    }}>
                      {(function() {
                        const v = viaturasDisponiveis.find(x => x.id === automacaoForm.viatura_id);
                        const tipo = v ? (v.tipo || v.viatura_tipo) : null;
                        const lista = tipo ? templatesDisponiveis.filter(t => t.tipo_viatura === tipo) : templatesDisponiveis;
                        return lista;
                      })().map((t) => (
                        <MenuItem key={t.id} value={t.id}>{t.nome || `#${t.id}`}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
              <Button onClick={() => setAutomacaoDialogOpen(false)}>Cancelar</Button>
              <Button variant="contained" onClick={salvarAutomacao} disabled={autoActionLoading}>{autoActionLoading ? 'Salvando...' : 'Salvar'}</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* FAB */}
      {activeTab === 0 && (user?.perfil_nome === 'Administrador' || user?.perfil_nome === 'Chefe') && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleFabClick}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem key="view-checklist" onClick={() => handleMenuAction('view')}>
          <ViewIcon sx={{ mr: 1 }} /> Visualizar
        </MenuItem>
        {/* Cancelar: Administrador, Chefe e Comandante */}
        {(user?.perfil_nome === 'Administrador' || user?.perfil_nome === 'Chefe' || user?.perfil_nome === 'Comandante') && (
          <MenuItem key="cancel-checklist" onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}>
            <WarningIcon sx={{ mr: 1 }} /> Cancelar Checklist
          </MenuItem>
        )}
      </Menu>

      {/* Diálogo de visualização */}
      <Dialog open={dialogOpen && dialogType === 'view'} onClose={handleCloseDialog} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ bgcolor: 'primary.50', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
              Visualizar Checklist
            </Typography>
            {selectedItem && (selectedItem.placa || selectedItem.viatura_prefixo) && (
              <Chip 
                label={selectedItem.placa || selectedItem.viatura_prefixo} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ ml: 1, fontWeight: 'bold' }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
          {selectedItem ? (
            <Box sx={{ mt: 2 }}>
              {console.log('🔍 Renderizando diálogo de visualização com dados:', selectedItem) || null}
              {/* Informações do Checklist */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: 'grey.700' }}>
                📋 Informações do Checklist
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Data do Checklist</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {formatDate(selectedItem.data_checklist)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Tipo</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {selectedItem.tipo_checklist || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">KM Inicial</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {selectedItem.km_inicial ? `${Number(selectedItem.km_inicial).toLocaleString('pt-BR')} km` : 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Combustível</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {selectedItem.combustivel_percentual}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Observações Gerais */}
              {selectedItem.observacoes_gerais && (
                <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Observações Gerais:</strong> {selectedItem.observacoes_gerais}
                  </Typography>
                </Alert>
              )}

              {/* Observações por Item */}
              {selectedItem.itens?.filter(item => item.observacoes).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: '#856404' }}>
                    Observações por Item:
                  </Typography>
                  {selectedItem.itens
                    .filter(item => item.observacoes)
                    .map((item, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, bgcolor: '#fff', borderRadius: 1, border: '1px solid #f0f0f0' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#495057' }}>
                          <strong>{item.nome_item}:</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                          {item.observacoes}
                        </Typography>
                      </Box>
                    ))
                  }
                </Box>
              )}
            </Box>
            ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Nenhum checklist selecionado para edição
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
          <Button onClick={handleCloseDialog}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo do ChecklistViatura */}
      <ChecklistViatura
        open={checklistDialogOpen}
        onClose={() => { setChecklistDialogOpen(false); setStartingSolicitacaoId(null); loadChecklists(); }}
        onSuccess={() => {
          setChecklistDialogOpen(false);
          loadChecklists();
          // Marcar a solicitação como atendida após concluir o checklist
          if (startingSolicitacaoId) {
            checklistService.iniciarSolicitacao(startingSolicitacaoId)
              .catch((err) => console.error('Erro ao marcar solicitação como atendida:', err))
              .finally(() => {
                loadSolicitacoes();
              });
          } else {
            loadSolicitacoes();
          }
          // Limpa ID
          setStartingSolicitacaoId(null);
        }}
        prefill={prefillData}
      />

      {/* Diálogo de confirmação de cancelamento */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setCancelReason(''); }} fullScreen={isMobile}>
        <DialogTitle sx={{ color: 'warning.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            Confirmar Cancelamento
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
          <Typography>
            Tem certeza que deseja cancelar este checklist?
          </Typography>
          {selectedItem && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Viatura:</strong> {selectedItem.viatura_prefixo || selectedItem.placa}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Data:</strong> {formatDate(selectedItem.data_checklist)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Tipo:</strong> {selectedItem.tipo_checklist}
              </Typography>
            </Box>
          )}
          <TextField
            label="Motivo do cancelamento"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            required
            sx={{ mt: 2 }}
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita!
          </Alert>
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
          <Button onClick={() => { setDeleteDialogOpen(false); setCancelReason(''); }} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="warning" 
            variant="contained"
            disabled={actionLoading || !cancelReason.trim()}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <WarningIcon />}
          >
            {actionLoading ? 'Cancelando...' : 'Cancelar Checklist'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de edição */}
      <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ bgcolor: 'warning.50', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon sx={{ color: 'warning.main' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
              Editar Checklist
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
          {selectedItem ? (
            <>
              {console.log('✏️ Renderizando diálogo de edição com dados:', selectedItem) || null}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Viatura:</strong> {selectedItem.placa || selectedItem.viatura_prefixo || 'N/A'} - {selectedItem.modelo || selectedItem.viatura_modelo || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Data:</strong> {formatDate(selectedItem.data_checklist)}
                </Typography>
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="KM Inicial"
                    type="number"
                    value={formData.km_inicial || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, km_inicial: parseInt(e.target.value) || 0 }))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Combustível (%)"
                    type="number"
                    value={formData.combustivel_percentual || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, combustivel_percentual: parseInt(e.target.value) || 0 }))}
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status || 'em_andamento'}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      label="Status"
                    >
                      <MenuItem key="em-andamento-status" value="em_andamento">Em Andamento</MenuItem>
                      <MenuItem key="finalizado-status" value="finalizado">Finalizado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observações Gerais"
                    multiline
                    rows={3}
                    value={formData.observacoes_gerais || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes_gerais: e.target.value }))}
                  />
                </Grid>
              </Grid>
              </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Nenhum checklist selecionado para edição
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={actionLoading} startIcon={actionLoading ? <CircularProgress size={16} /> : <SaveIcon />}>{actionLoading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Checklists;
