import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  LinearProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Badge,
  useTheme,
  Pagination,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Snackbar,
  useMediaQuery,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  SwapHoriz as SwapIcon,
  WorkOff as ExtraIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  ViewList as ViewListIcon,
  CalendarMonth as CalendarMonthIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  DriveEta as DriveEtaIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTenant } from '../contexts/TenantContext';
import { notificacoesService, usuariosService, operacionalService } from '../services/api';
import {
  format,
  parseISO,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const VALID_ALAS = ['Alfa', 'Bravo', 'Charlie', 'Delta'];
const ALA_STYLES = {
  Alfa: { border: '#2e7d32', bg: 'rgba(46, 125, 50, 0.08)' },
  Bravo: { border: '#0277bd', bg: 'rgba(2, 119, 189, 0.08)' },
  Charlie: { border: '#f9a825', bg: 'rgba(249, 168, 37, 0.15)' },
  Delta: { border: '#d32f2f', bg: 'rgba(211, 47, 47, 0.12)' },
};
const DRIVER_CATEGORIES = new Set(['C', 'D', 'E']);

const INITIAL_ALA_BOARD = {
  pool: [],
  Alfa: [],
  Bravo: [],
  Charlie: [],
  Delta: [],
};

const buildAlaSignature = (board) => JSON.stringify(
  VALID_ALAS.reduce((acc, ala) => {
    acc[ala] = [...(board[ala] || [])].map(Number).sort((a, b) => a - b);
    return acc;
  }, {})
);

const hasDriverLicense = (categoria) => {
  if (!categoria) return false;
  return categoria
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .some((cat) => DRIVER_CATEGORIES.has(cat));
};

const Operacional = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const { user } = useAuth();
  const { markAsRead, markAllAsRead } = useNotifications();
  const { currentUnit } = useTenant();
  const isAdmin = user?.perfil_nome === 'Administrador';
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para escalas
  const [escalas, setEscalas] = useState([]);
  const [escalasLoading, setEscalasLoading] = useState(false);
  const [escalasFilters, setEscalasFilters] = useState({
    data_inicio: '',
    data_fim: '',
    page: 1,
    limit: 10,
  });
  const [escalasPagination, setEscalasPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  
  // Estados para trocas de serviço
  const [trocas, setTrocas] = useState([]);
  const [trocasLoading, setTrocasLoading] = useState(false);
  const [trocasFilters, setTrocasFilters] = useState({
    status: '',
    solicitante_id: '',
    destinatario_id: '',
    page: 1,
    limit: 10,
  });
  const [trocasPagination, setTrocasPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  const [trocaActionLoading, setTrocaActionLoading] = useState(null);
  const [decisionDialog, setDecisionDialog] = useState({
    open: false,
    troca: null,
    status: 'aprovada',
    observacoes: '',
  });
  
  // Estados para serviços extras
  const [extras, setExtras] = useState([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasFilters, setExtrasFilters] = useState({
    status: '',
    solicitante_id: '',
    data_inicio: '',
    data_fim: '',
    page: 1,
    limit: 10,
  });
  const [extrasPagination, setExtrasPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  const [pdfLoadingDate, setPdfLoadingDate] = useState('');
  const [pdfFeedback, setPdfFeedback] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Estados para usuários operacionais / alas
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosMap, setUsuariosMap] = useState({});
  const [alaBoard, setAlaBoard] = useState(() => ({ ...INITIAL_ALA_BOARD }));
  const [savedAlaSignature, setSavedAlaSignature] = useState(() => buildAlaSignature(INITIAL_ALA_BOARD));
  const [alasLoading, setAlasLoading] = useState(false);
  const [alasSaving, setAlasSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [dragInfo, setDragInfo] = useState({ id: null, from: null });
  const [escalaViewMode, setEscalaViewMode] = useState('calendar');
  const [selectedAlas, setSelectedAlas] = useState([...VALID_ALAS]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedColleagueId, setSelectedColleagueId] = useState(null);
  const [colleagueShifts, setColleagueShifts] = useState([]);
  const [pagarAgora, setPagarAgora] = useState(false);
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'escala', 'troca', 'extra'
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [calendarActionMenu, setCalendarActionMenu] = useState({
    anchorEl: null,
    dateKey: '',
    escalas: [],
  });
  const [mobileCalendarDialog, setMobileCalendarDialog] = useState({
    open: false,
    dateKey: '',
    touchStartX: null,
  });
  
  // Estados para formulários
  const [formData, setFormData] = useState({
    data_servico_substituto: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, currentUnit?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const tabMap = {
      alas: 0,
      escalas: 1,
      trocas: 2,
      extras: 3,
    };
    if (tab && Object.prototype.hasOwnProperty.call(tabMap, tab)) {
      setActiveTab(tabMap[tab]);
    }
  }, [location.search]);

  useEffect(() => {
    const hasUnsavedAlas = isAdmin && buildAlaSignature(alaBoard) !== savedAlaSignature;
    if (!hasUnsavedAlas) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [alaBoard, isAdmin, savedAlaSignature]);

  const loadData = () => {
    if (!currentUnit?.id) {
      setError('Selecione uma unidade para carregar o operacional');
      return;
    }
    switch (activeTab) {
      case 0:
        loadAlas();
        break;
      case 1:
        loadEscalas();
        break;
      case 2:
        loadTrocas();
        break;
      case 3:
        loadExtras();
        break;
      default:
        break;
    }
  };

  const buildEscalasRequestParams = (filters = escalasFilters) => {
    if (escalaViewMode !== 'calendar') {
      return filters;
    }

    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 });

    return {
      ...filters,
      data_inicio: filters.data_inicio || format(start, 'yyyy-MM-dd'),
      data_fim: filters.data_fim || format(end, 'yyyy-MM-dd'),
      page: 1,
      limit: Math.max(Number(filters.limit) || 0, 200),
    };
  };

  const loadEscalas = async () => {
    if (!currentUnit?.id) {
      setError('Selecione uma unidade para carregar as escalas');
      return;
    }
    try {
      setEscalasLoading(true);
      const response = await operacionalService.getEscalas(buildEscalasRequestParams());
      const data = response.data || {};
      const lista = Array.isArray(data) ? data : (data.escalas || []);
      setEscalasPagination(data.pagination || {});

      const enriched = await Promise.all(
        lista.map(async (escala) => {
          try {
            const detalhes = await operacionalService.getEscalaById(escala.id);
            const participantes = detalhes?.data?.usuarios || [];
            return { ...escala, participantes };
          } catch (error) {
            console.warn('Não foi possível obter participantes da escala', escala.id, error);
            return { ...escala, participantes: [] };
          }
        })
      );

      setEscalas(enriched);
    } catch (err) {
      console.error('Erro ao carregar escalas:', err);
      setError('Erro ao carregar escalas');
    } finally {
      setEscalasLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 1 && currentUnit?.id && escalaViewMode === 'calendar') {
      loadEscalas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMonth, escalaViewMode]);

  const handleExportDayPdf = async (dateKey) => {
    if (!dateKey) return;
    try {
      setPdfLoadingDate(dateKey);
      const response = await operacionalService.exportEscalaPdf({ data_servico: dateKey });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `escala-${dateKey}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setPdfFeedback({
        open: true,
        message: `PDF de ${format(parseISO(dateKey), "dd/MM/yyyy", { locale: ptBR })} gerado`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      const message = err.response?.data?.error || 'Não foi possível gerar o PDF';
      setPdfFeedback({ open: true, message, severity: 'error' });
    } finally {
      setPdfLoadingDate('');
    }
  };

  const loadTrocas = async () => {
    if (!currentUnit?.id) {
      setError('Selecione uma unidade para carregar as trocas');
      return;
    }
    try {
      setTrocasLoading(true);
      const response = await operacionalService.getTrocas(trocasFilters);
      const trocasResponse = response.data || [];
      const lista = Array.isArray(trocasResponse) ? trocasResponse : (trocasResponse.trocas || []);
      setTrocas(lista);
      const limit = Number(trocasFilters.limit) || 10;
      const pages = Math.max(1, Math.ceil(lista.length / limit));
      setTrocasPagination({
        total: lista.length,
        pages,
        current_page: trocasFilters.page || 1,
        nao_lidas: 0
      });
    } catch (err) {
      console.error('Erro ao carregar trocas:', err);
      setError('Erro ao carregar trocas de serviço');
    } finally {
      setTrocasLoading(false);
    }
  };

  const loadExtras = async () => {
    if (!currentUnit?.id) {
      setError('Selecione uma unidade para carregar os serviços extras');
      return;
    }
    try {
      setExtrasLoading(true);
      const response = await operacionalService.getServicosExtra(extrasFilters);
      setExtras(response.data.extras || []);
      setExtrasPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar serviços extras:', err);
      setError('Erro ao carregar serviços extras');
    } finally {
      setExtrasLoading(false);
    }
  };

  const loadAlas = async () => {
    if (!currentUnit?.id) {
      setError('Selecione uma unidade para carregar as alas');
      return;
    }
    try {
      setAlasLoading(true);
      setError('');
      setSuccessMessage('');
      const response = await operacionalService.getAlasConfiguracao();
      const dados = response.data || {};
      const usuariosLista = dados.usuarios || [];
      const alasServidor = dados.alas || {};
      const mapaUsuarios = {};
      usuariosLista.forEach((usuario) => {
        mapaUsuarios[usuario.id] = usuario;
      });

      const novoBoard = {
        pool: [],
        Alfa: [],
        Bravo: [],
        Charlie: [],
        Delta: [],
      };

      VALID_ALAS.forEach((ala) => {
        novoBoard[ala] = (alasServidor[ala] || []).filter((id) => mapaUsuarios[id]);
      });

      const atribuídos = new Set(VALID_ALAS.flatMap((ala) => novoBoard[ala]));
      novoBoard.pool = usuariosLista
        .filter((usuario) => !atribuídos.has(usuario.id))
        .map((usuario) => usuario.id);

      setUsuarios(usuariosLista);
      setUsuariosMap(mapaUsuarios);
      setAlaBoard(novoBoard);
      setSavedAlaSignature(buildAlaSignature(novoBoard));
    } catch (err) {
      console.error('Erro ao carregar alas operacionais:', err);
      const message = err.response?.data?.error || 'Erro ao carregar alas operacionais';
      setError(message);
    } finally {
      setAlasLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    if (
      activeTab === 0 &&
      isAdmin &&
      buildAlaSignature(alaBoard) !== savedAlaSignature &&
      !window.confirm('Existem alterações não salvas na distribuição das alas. Deseja sair sem salvar?')
    ) {
      return;
    }
    setActiveTab(newValue);
    setError('');
  };

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    setFormData(item || {});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setSelectedItem(null);
    setFormData({});
  };

  const handlePdfFeedbackClose = () => {
    setPdfFeedback((prev) => ({ ...prev, open: false }));
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (dialogType === 'escala') {
        if (selectedItem) {
          // Atualizar escala (implementar quando necessário)
        } else {
          await operacionalService.createEscala(formData);
        }
        loadEscalas();
      } else if (dialogType === 'troca') {
        if (selectedItem) {
          await operacionalService.updateTroca(selectedItem.id, formData);
        } else {
          await operacionalService.createTroca(formData);
        }
        loadTrocas();
      } else if (dialogType === 'swap') {
        if (!formData.escala_original_id || !formData.substituto_id) {
          throw new Error('Dados da troca incompletos');
        }
        const swapPayload = {
          escala_original_id: formData.escala_original_id,
          usuario_substituto_id: formData.substituto_id,
          data_servico_original: formData.data_servico_original,
          data_servico_troca: formData.data_servico_troca,
          motivo: formData.observacoes || 'Troca solicitada via calendário'
        };
        if (formData.data_servico_compensacao) {
          swapPayload.data_servico_compensacao = formData.data_servico_compensacao;
        }
        await operacionalService.solicitarTroca(swapPayload);
        setSuccessMessage('Solicitação de troca registrada. Aguarde resposta do colega.');
        loadEscalas();
      } else if (dialogType === 'extra') {
        if (selectedItem) {
          await operacionalService.updateExtra(selectedItem.id, formData);
        } else {
          await operacionalService.createExtra(formData);
        }
        loadExtras();
      }

      handleCloseDialog();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      const errorMessage = err.response?.data?.error || 'Erro ao salvar dados';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarRejeitar = async (tipo, id, novoStatus) => {
    try {
      setLoading(true);
      setError('');
      if (tipo === 'extra') {
        const aprovado = String(novoStatus).toLowerCase() === 'aprovado';
        await operacionalService.aprovarExtra(id, aprovado, '');
        setSuccessMessage(aprovado ? 'Serviço extra aprovado.' : 'Serviço extra rejeitado.');
        await loadExtras();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError(err.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const handleTrocaAction = async (troca, action) => {
    try {
      setTrocaActionLoading(troca.id);
      setError('');
      if (action === 'accept') {
        await operacionalService.responderTroca(troca.id, { resposta: 'aceitar' });
      } else {
        await operacionalService.responderTroca(troca.id, { resposta: 'rejeitar' });
      }
      setSuccessMessage(action === 'accept' ? 'Troca aceita. Agora aguarda análise administrativa.' : 'Troca rejeitada com sucesso.');
      loadTrocas();
    } catch (err) {
      console.error('Erro ao responder troca:', err);
      setError(err.response?.data?.error || 'Erro ao processar a troca');
    } finally {
      setTrocaActionLoading(null);
    }
  };

  const openDecisionDialog = (troca, status) => {
    setDecisionDialog({ open: true, troca, status, observacoes: '' });
  };

  const closeDecisionDialog = () => {
    setDecisionDialog({ open: false, troca: null, status: 'aprovada', observacoes: '' });
  };

  const handleAdminTrocaDecision = async () => {
    if (!decisionDialog.troca) return;
    try {
      setTrocaActionLoading(decisionDialog.troca.id);
      setError('');
      await operacionalService.analisarTroca(decisionDialog.troca.id, {
        status: decisionDialog.status,
        observacoes: decisionDialog.observacoes,
      });
      setSuccessMessage(decisionDialog.status === 'aprovada' ? 'Troca aprovada com sucesso.' : 'Troca rejeitada com sucesso.');
      closeDecisionDialog();
      loadTrocas();
    } catch (err) {
      console.error('Erro ao analisar troca:', err);
      setError(err.response?.data?.error || 'Erro ao analisar a troca');
    } finally {
      setTrocaActionLoading(null);
    }
  };

  const handleOpenCalendarActionMenu = (event, dateKey, dayEscalas) => {
    if (isMobile) {
      setMobileCalendarDialog({
        open: true,
        dateKey,
        touchStartX: null,
      });
      return;
    }

    setCalendarActionMenu({
      anchorEl: event.currentTarget,
      dateKey,
      escalas: dayEscalas || [],
    });
  };

  const handleCloseCalendarActionMenu = () => {
    setCalendarActionMenu({ anchorEl: null, dateKey: '', escalas: [] });
  };

  const handleCloseMobileCalendarDialog = () => {
    setMobileCalendarDialog({ open: false, dateKey: '', touchStartX: null });
  };

  const handleCalendarPdfAction = async () => {
    const dateKey = calendarActionMenu.dateKey;
    handleCloseCalendarActionMenu();
    await handleExportDayPdf(dateKey);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ativa':
      case 'aprovado':
      case 'aprovada':
        return 'success';
      case 'pendente':
      case 'aguardando_aprovacao':
        return 'warning';
      case 'rejeitado':
      case 'rejeitada':
      case 'cancelado':
        return 'error';
      case 'finalizada':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTrocaStatusLabel = (status) => {
    if (!status) return 'Sem status';
    const cleaned = status.toLowerCase().replace(/_/g, ' ');
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const dateOnly = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
  };

  const getTodayDateKey = () => format(new Date(), 'yyyy-MM-dd');

  const isRetroactiveDate = (dateKey) => Boolean(dateKey) && dateKey < getTodayDateKey();

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR');
  };

  const getTrocaTimelineSteps = (troca) => {
    const status = troca.status?.toLowerCase();
    const foiAceitaPeloColega = Boolean(troca.aceito_substituto_em) || ['aguardando_aprovacao', 'aprovada'].includes(status);
    const rejeitada = status === 'rejeitada';

    const steps = [
      { key: 'solicitada', label: 'Solicitada', state: 'completed' },
      { key: 'colega', label: 'Aceita pelo colega', state: 'future' },
      { key: 'analise', label: 'Análise administrativa', state: 'future' },
      { key: 'decisao', label: 'Decisão', state: 'future' },
    ];

    if (status === 'pendente') {
      steps[1].state = 'current';
      return steps;
    }

    if (status === 'aguardando_aprovacao') {
      steps[1].state = 'completed';
      steps[2].state = 'current';
      return steps;
    }

    if (status === 'aprovada') {
      steps[1].state = 'completed';
      steps[2].state = 'completed';
      steps[3] = { ...steps[3], label: 'Aprovada', state: 'completed' };
      return steps;
    }

    if (rejeitada && foiAceitaPeloColega) {
      steps[1].state = 'completed';
      steps[2].state = 'completed';
      steps[3] = { ...steps[3], label: 'Rejeitada', state: 'rejected' };
      return steps;
    }

    if (rejeitada) {
      steps[1] = { ...steps[1], label: 'Recusada pelo colega', state: 'rejected' };
      return steps;
    }

    steps[0].state = 'current';
    return steps;
  };

  const getTimelineStepStyle = (state) => {
    switch (state) {
      case 'completed':
        return {
          color: theme.palette.success.main,
          bgcolor: theme.palette.success.light,
          borderColor: theme.palette.success.main,
          icon: <CheckIcon fontSize="inherit" />,
        };
      case 'current':
        return {
          color: theme.palette.warning.dark,
          bgcolor: theme.palette.warning.light,
          borderColor: theme.palette.warning.main,
          icon: <TimeIcon fontSize="inherit" />,
        };
      case 'rejected':
        return {
          color: theme.palette.error.main,
          bgcolor: theme.palette.error.light,
          borderColor: theme.palette.error.main,
          icon: <CloseIcon fontSize="inherit" />,
        };
      default:
        return {
          color: theme.palette.text.secondary,
          bgcolor: theme.palette.action.hover,
          borderColor: theme.palette.divider,
          icon: <TimeIcon fontSize="inherit" />,
        };
    }
  };

  const renderTrocaTimeline = (troca) => {
    const steps = getTrocaTimelineSteps(troca);
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' },
          gap: 1,
          mt: 0.5,
        }}
      >
        {steps.map((step) => {
          const stepStyle = getTimelineStepStyle(step.state);
          return (
            <Box
              key={step.key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                p: 1,
                border: '1px solid',
                borderColor: stepStyle.borderColor,
                borderRadius: 1,
                bgcolor: stepStyle.bgcolor,
                color: stepStyle.color,
                minHeight: 40,
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '1px solid',
                  borderColor: stepStyle.borderColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: theme.palette.background.paper,
                  flex: '0 0 auto',
                  fontSize: 14,
                }}
              >
                {stepStyle.icon}
              </Box>
              <Typography variant="caption" fontWeight={step.state === 'current' ? 700 : 600}>
                {step.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  const canAnalyzeTrocas = isAdmin || (
    String(user?.setor || user?.setor_nome || '').toLowerCase() !== 'operacional' &&
    Number(user?.perfil_id) >= 2 &&
    Number(user?.perfil_id) <= 5
  );

  const getUsuarioAla = (usuarioId) => {
    const usuario = usuariosMap[usuarioId];
    if (usuario?.ala) return usuario.ala;
    return VALID_ALAS.find((ala) => (
      (alaBoard[ala] || []).some((id) => Number(id) === Number(usuarioId))
    )) || null;
  };

  const getCurrentUserAla = () => user?.ala || getUsuarioAla(user?.id);

  const isEligibleSwapTarget = (participante, escala = null) => {
    if (!participante || Number(participante.usuario_id) === Number(user?.id)) return false;
    const userAla = getCurrentUserAla();
    const targetAla = participante.ala || getUsuarioAla(participante.usuario_id) || escala?.ala;
    if (userAla && targetAla && userAla === targetAla) return false;
    return true;
  };

  const getEligibleSwapEntries = (escalas = []) => (
    escalas.flatMap((escala) => (
      (escala.participantes || [])
        .filter((participante) => isEligibleSwapTarget(participante, escala))
        .map((participante) => ({ escala, participante }))
    ))
  );

  const canRequestSwapForDate = (dateKey, escalasDia = []) => (
    !isRetroactiveDate(dateKey) &&
    getEligibleSwapEntries(escalasDia).length > 0
  );

  const canRequestSwapFromCalendarMenu = () => (
    canRequestSwapForDate(calendarActionMenu.dateKey, calendarActionMenu.escalas)
  );

  const getCalendarSwapActionLabel = (
    dateKey = calendarActionMenu.dateKey,
    escalasDia = calendarActionMenu.escalas
  ) => {
    if (isRetroactiveDate(dateKey)) {
      return 'Solicitar troca (data retroativa bloqueada)';
    }
    if (escalasDia.length > 0 && getEligibleSwapEntries(escalasDia).length === 0) {
      return 'Solicitar troca (mesma ala bloqueada)';
    }
    return 'Solicitar troca';
  };

  const getTrocaBg = (status) => {
    switch (status?.toLowerCase()) {
      case 'pendente':
        return theme.palette.warning.light;
      case 'aprovado':
      case 'aprovada':
        return theme.palette.success.light;
      case 'rejeitado':
      case 'rejeitada':
      case 'cancelado':
        return theme.palette.error.light;
      default:
        return theme.palette.background.paper;
    }
  };

  const buildAlaPayload = () => {
    const payload = {};
    VALID_ALAS.forEach((ala) => {
      payload[ala] = alaBoard[ala] || [];
    });
    return payload;
  };

  const handleDragStart = (userId, fromColumn) => {
    if (!isAdmin) return;
    setDragInfo({ id: userId, from: fromColumn });
  };

  const handleDragEnd = () => {
    setDragInfo({ id: null, from: null });
  };

  const handleDropOnColumn = (columnKey) => {
    if (!isAdmin || !dragInfo.id || !columnKey) return;
    setAlaBoard((prev) => {
      if (!prev[dragInfo.from] || !prev[columnKey]) {
        const fallback = prev[columnKey] || [];
        return {
          ...prev,
          [dragInfo.from]: prev[dragInfo.from] ? prev[dragInfo.from].filter((id) => id !== dragInfo.id) : [],
          [columnKey]: fallback.includes(dragInfo.id) ? fallback : [...fallback, dragInfo.id]
        };
      }
      if (dragInfo.from === columnKey) {
        return prev;
      }
      const next = {
        ...prev,
        [dragInfo.from]: prev[dragInfo.from].filter((id) => id !== dragInfo.id),
      };
      const currentTarget = next[columnKey] || [];
      if (!currentTarget.includes(dragInfo.id)) {
        next[columnKey] = [...currentTarget, dragInfo.id];
      } else {
        next[columnKey] = currentTarget;
      }
      return next;
    });
    setDragInfo({ id: null, from: null });
  };

  const handleQuickMove = (userId, fromColumn, toColumn) => {
    if (!isAdmin || fromColumn === toColumn) return;
    setAlaBoard((prev) => {
      const targetList = prev[toColumn] || [];
      const next = {
        ...prev,
        [fromColumn]: prev[fromColumn] ? prev[fromColumn].filter((id) => id !== userId) : [],
      };
      if (!targetList.includes(userId)) {
        next[toColumn] = [...targetList, userId];
      } else {
        next[toColumn] = targetList;
      }
      return next;
    });
  };

  const handleSaveAlas = async () => {
    if (!isAdmin) return;
    try {
      setAlasSaving(true);
      setError('');
      setSuccessMessage('');
      const payload = buildAlaPayload();
      const response = await operacionalService.salvarAlas({ alas: payload });
      setSavedAlaSignature(buildAlaSignature({ ...payload, pool: alaBoard.pool || [] }));
      const automacao = response.data?.automacao;
      const resumo = automacao
        ? ` Escalas ${automacao.year}: ${automacao.criadas} criadas, ${automacao.atualizadas} atualizadas, ${automacao.preservadas} preservadas e ${automacao.conflitos || 0} conflito(s).`
        : '';
      setSuccessMessage(`Alas atualizadas com sucesso.${resumo}`);
    } catch (err) {
      console.error('Erro ao salvar alas:', err);
      const message = err.response?.data?.error || 'Erro ao salvar as alas';
      setError(message);
    } finally {
      setAlasSaving(false);
    }
  };

  const handleColleagueChange = (participantId) => {
    const entry = selectedItem?.escala?.participantes?.find((p) => Number(p.id) === Number(participantId));
    if (!entry) return;
    if (Number(entry.usuario_id) === Number(user?.id)) {
      setError('Você não pode solicitar troca consigo mesmo.');
      return;
    }
    if (!isEligibleSwapTarget(entry, selectedItem?.escala)) {
      setError('Não é permitido solicitar troca com militar da mesma ala.');
      return;
    }
    const dataSelecionada = getDateKey(entry.data_servico || selectedItem.escala.data_inicio) || '';
    setSelectedColleagueId(participantId);
    setFormData((prev) => ({
      ...prev,
      substituto_nome: entry.nome,
      substituto_id: entry.usuario_id,
      escala_original_id: entry.id,
      data_servico_original: dataSelecionada,
      data_servico_troca: dataSelecionada,
    }));
  };

  const sortShiftsByDate = (shifts) => (
    [...(shifts || [])].sort((a, b) => String(a.data_servico).localeCompare(String(b.data_servico)))
  );

  const handleOpenSwapDialog = (participante, escala) => {
    if (!participante || !escala) return;
    setError('');
    const dataSelecionada = getDateKey(participante.data_servico || escala.data_inicio) || escala.dataKey || '';
    if (isRetroactiveDate(dataSelecionada)) {
      setError('Não é possível solicitar troca para uma data retroativa. Selecione uma escala de hoje ou futura. Apenas o pagamento pode ser retroativo.');
      return;
    }
    if (Number(participante.usuario_id) === Number(user?.id)) {
      setError('Você não pode solicitar troca consigo mesmo.');
      return;
    }
    if (!isEligibleSwapTarget(participante, escala)) {
      setError('Não é permitido solicitar troca com militar da mesma ala.');
      return;
    }
    setDialogType('swap');
    setSelectedItem({ participante, escala });
    setColleagueShifts(sortShiftsByDate(userShifts));
    setSelectedColleagueId(participante.id);
    setFormData({
      solicitante_nome: user?.nome || '',
      solicitante_id: user?.id,
      escala_original_id: participante.id,
      substituto_nome: participante.nome,
      substituto_id: participante.usuario_id,
      data_servico_original: dataSelecionada,
      data_servico_troca: dataSelecionada,
      data_servico_substituto: dataSelecionada,
      data_servico_compensacao: '',
      observacoes: ''
    });
    setPagarAgora(false);
    setDialogOpen(true);
  };

  const handleOpenSwapFromCalendarMenu = () => {
    if (isRetroactiveDate(calendarActionMenu.dateKey)) {
      setError('Não é possível solicitar troca para uma data retroativa. Selecione uma escala de hoje ou futura. Apenas o pagamento pode ser retroativo.');
      handleCloseCalendarActionMenu();
      return;
    }

    const [entry] = getEligibleSwapEntries(calendarActionMenu.escalas);
    if (!entry) {
      setError('Não há militares de outra ala disponíveis nesse dia para solicitar uma troca.');
      handleCloseCalendarActionMenu();
      return;
    }

    handleCloseCalendarActionMenu();
    handleOpenSwapDialog(entry.participante, entry.escala);
  };

  const handleOpenSwapFromCalendarDay = (dateKey, escalasDia = []) => {
    if (isRetroactiveDate(dateKey)) {
      setError('Não é possível solicitar troca para uma data retroativa. Selecione uma escala de hoje ou futura. Apenas o pagamento pode ser retroativo.');
      handleCloseMobileCalendarDialog();
      return;
    }

    const [entry] = getEligibleSwapEntries(escalasDia);
    if (!entry) {
      setError('Não há militares de outra ala disponíveis nesse dia para solicitar uma troca.');
      handleCloseMobileCalendarDialog();
      return;
    }

    handleCloseMobileCalendarDialog();
    handleOpenSwapDialog(entry.participante, entry.escala);
  };

  const parseDateValue = (value) => {
    if (!value) return null;
    try {
      if (value instanceof Date) return value;
      return parseISO(String(value));
    } catch {
      return null;
    }
  };

  const getDateKey = (value) => {
    const parsed = parseDateValue(value);
    return parsed ? format(parsed, 'yyyy-MM-dd') : null;
  };

  const parseAlaFromName = (name) => {
    if (!name) return null;
    const byAla = name.match(/Ala\s+([A-Za-z]+)/i);
    if (byAla) {
      const candidate = byAla[1].charAt(0).toUpperCase() + byAla[1].slice(1).toLowerCase();
      if (VALID_ALAS.includes(candidate)) {
        return candidate;
      }
    }
    const byDash = name.match(/-\s*([A-Za-z]+)\s*-/);
    if (byDash) {
      const candidate = byDash[1].charAt(0).toUpperCase() + byDash[1].slice(1).toLowerCase();
      if (VALID_ALAS.includes(candidate)) {
        return candidate;
      }
    }
    return null;
  };

  const getEscalaAla = (escala) => {
    if (escala.ala && VALID_ALAS.includes(escala.ala)) {
      return escala.ala;
    }
    const parsed = parseAlaFromName(escala.nome);
    if (parsed) return parsed;
    const participantes = escala.participantes || [];
    for (const participante of participantes) {
      const referencia = usuariosMap[participante.usuario_id];
      if (referencia?.ala && VALID_ALAS.includes(referencia.ala)) {
        return referencia.ala;
      }
      if (participante.ala && VALID_ALAS.includes(participante.ala)) {
        return participante.ala;
      }
    }
    return VALID_ALAS[0];
  };

  const isApprovedTrocaParticipant = (participante) => participante.troca_status === 'aprovada';

  const isMainSwapParticipant = (participante) => (
    isApprovedTrocaParticipant(participante) &&
    Number(participante.usuario_id) === Number(participante.usuario_solicitante_id) &&
    getDateKey(participante.data_servico) === getDateKey(participante.data_servico_original)
  );

  const isPaymentSwapParticipant = (participante) => (
    isApprovedTrocaParticipant(participante) &&
    Boolean(participante.data_servico_compensacao) &&
    Number(participante.usuario_id) === Number(participante.usuario_substituto_id) &&
    getDateKey(participante.data_servico) === getDateKey(participante.data_servico_compensacao)
  );

  const isSwappedParticipant = (participante) => (
    isMainSwapParticipant(participante) || isPaymentSwapParticipant(participante)
  );

  const getSwapParticipantLabel = (participante) => {
    if (isMainSwapParticipant(participante)) {
      const worker = participante.troca_solicitante_nome || participante.nome;
      const original = participante.troca_substituto_nome;
      return original ? `${worker} trabalhando para ${original}` : participante.nome;
    }
    if (isPaymentSwapParticipant(participante)) {
      const worker = participante.troca_substituto_nome || participante.nome;
      const original = participante.troca_solicitante_nome;
      return original ? `Pagamento: ${worker} trabalhando para ${original}` : participante.nome;
    }
    return participante.nome;
  };

  const handleToggleViewMode = (event, newValue) => {
    if (newValue) {
      setEscalaViewMode(newValue);
    }
  };

  const handleToggleAlaFilter = (ala, checked) => {
    setSelectedAlas((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ala]));
      }
      return prev.filter((item) => item !== ala);
    });
  };

  const handleCalendarMonthChange = (direction) => {
    setCalendarMonth((prev) => addMonths(prev, direction));
  };

  const decorateEscalas = useMemo(() => (
    escalas.map((escala) => {
      const ala = getEscalaAla(escala);
      const dataKey = getDateKey(escala.data_inicio) || getDateKey(escala.data_servico);
      return {
        ...escala,
        ala,
        dataKey,
      };
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [escalas, usuariosMap]);

  const userShifts = useMemo(() => {
    if (!user?.id) return [];
    const shifts = [];
    decorateEscalas.forEach((escala) => {
      const participantes = escala.participantes || [];
      participantes.forEach((participante) => {
        if (participante.usuario_id !== user.id) return;
        const data = getDateKey(participante.data_servico || escala.data_inicio) || escala.dataKey;
        if (!data) return;
        shifts.push({
          escala_usuario_id: participante.id,
          escala_id: escala.id,
          data_servico: data,
          label: `${format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR })} · Ala ${escala.ala}`,
        });
      });
    });
    return shifts;
  }, [decorateEscalas, user]);

  const filteredEscalas = useMemo(() => (
    decorateEscalas.filter((escala) => selectedAlas.includes(escala.ala))
  ), [decorateEscalas, selectedAlas]);

  const escalasByDate = useMemo(() => {
    const mapa = {};
    filteredEscalas.forEach((escala) => {
      if (!escala.dataKey) return;
      if (!mapa[escala.dataKey]) {
        mapa[escala.dataKey] = [];
      }
      mapa[escala.dataKey].push(escala);
    });
    return mapa;
  }, [filteredEscalas]);

  const calendarInterval = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [calendarMonth]);

  const handleMobileCalendarDayChange = (direction) => {
    if (!mobileCalendarDialog.dateKey) return;
    const nextDay = addDays(parseISO(mobileCalendarDialog.dateKey), direction);
    const nextDateKey = format(nextDay, 'yyyy-MM-dd');

    setMobileCalendarDialog((prev) => ({
      ...prev,
      dateKey: nextDateKey,
      touchStartX: null,
    }));

    if (!isSameMonth(nextDay, calendarMonth)) {
      setCalendarMonth(nextDay);
    }
  };

  const handleMobileCalendarTouchStart = (event) => {
    setMobileCalendarDialog((prev) => ({
      ...prev,
      touchStartX: event.touches?.[0]?.clientX ?? null,
    }));
  };

  const handleMobileCalendarTouchEnd = (event) => {
    if (mobileCalendarDialog.touchStartX == null) return;
    const endX = event.changedTouches?.[0]?.clientX;
    if (endX == null) return;
    const delta = endX - mobileCalendarDialog.touchStartX;
    if (Math.abs(delta) < 50) {
      setMobileCalendarDialog((prev) => ({ ...prev, touchStartX: null }));
      return;
    }
    handleMobileCalendarDayChange(delta > 0 ? -1 : 1);
  };

  const renderMobileCalendarDialog = () => {
    const dateKey = mobileCalendarDialog.dateKey;
    const dayEscalas = escalasByDate[dateKey] || [];
    const parsedDate = dateKey ? parseISO(dateKey) : null;

    return (
      <Dialog
        open={mobileCalendarDialog.open}
        onClose={handleCloseMobileCalendarDialog}
        fullScreen
      >
        <DialogTitle sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <IconButton onClick={() => handleMobileCalendarDayChange(-1)} edge="start">
              <ChevronLeftIcon />
            </IconButton>
            <Box textAlign="center" minWidth={0}>
              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                {parsedDate ? format(parsedDate, "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Escala'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {parsedDate ? format(parsedDate, 'yyyy', { locale: ptBR }) : ''}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <IconButton onClick={() => handleMobileCalendarDayChange(1)}>
                <ChevronRightIcon />
              </IconButton>
              <IconButton onClick={handleCloseMobileCalendarDialog} edge="end">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent
          dividers
          onTouchStart={handleMobileCalendarTouchStart}
          onTouchEnd={handleMobileCalendarTouchEnd}
          sx={{ p: 2, bgcolor: 'background.default' }}
        >
          {escalasLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : dayEscalas.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Sem escala
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Não há serviço registrado para este dia.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {dayEscalas.map((escala) => {
                const style = ALA_STYLES[escala.ala] || { border: theme.palette.primary.main, bg: 'transparent' };
                const hasApprovedSwap = escala.participantes?.some((p) => p.troca_status === 'aprovada');
                return (
                  <Paper
                    key={`mobile-dia-${escala.id}`}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: style.border,
                      bgcolor: style.bg,
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} mb={1.5}>
                      <Chip
                        label={`Ala ${escala.ala}`}
                        sx={{ bgcolor: style.border, color: '#fff', fontWeight: 700 }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        {(escala.participantes || []).length} militar(es)
                      </Typography>
                    </Box>

                    {hasApprovedSwap && (
                      <Alert severity="info" sx={{ mb: 1.5 }}>
                        Troca confirmada
                      </Alert>
                    )}

                    <Stack spacing={1}>
                      {(escala.participantes || []).map((participante) => (
                        <Button
                          key={`${escala.id}-${participante.usuario_id}`}
                          variant="outlined"
                          fullWidth
                          onClick={() => {
                            handleCloseMobileCalendarDialog();
                            handleOpenSwapDialog(participante, escala);
                          }}
                          disabled={
                            isRetroactiveDate(escala.dataKey) ||
                            !isEligibleSwapTarget(participante, escala)
                          }
                          sx={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            textTransform: 'none',
                            borderColor: style.border,
                            color: style.border,
                            bgcolor: 'background.paper',
                          }}
                        >
                          {isSwappedParticipant(participante)
                            ? getSwapParticipantLabel(participante)
                            : participante.nome}
                        </Button>
                      ))}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5, gap: 1, justifyContent: 'space-between' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={() => handleExportDayPdf(dateKey)}
            disabled={!dateKey || pdfLoadingDate === dateKey}
          >
            Baixar PDF
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<SwapIcon />}
            onClick={() => handleOpenSwapFromCalendarDay(dateKey, dayEscalas)}
            disabled={!canRequestSwapForDate(dateKey, dayEscalas)}
          >
            Solicitar troca
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderCalendarView = () => {
    if (escalasLoading) {
      return (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Card>
        <CardContent sx={{ p: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <IconButton onClick={() => handleCalendarMonthChange(-1)}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} textTransform="capitalize" fontWeight={isMobile ? 700 : 400}>
              {format(calendarMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>
            <IconButton onClick={() => handleCalendarMonthChange(1)}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Grid container columns={7} spacing={isMobile ? 0.5 : 1} sx={{ textTransform: 'uppercase', mb: 1 }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <Grid item xs={1} key={day}>
                <Typography variant="caption" color="textSecondary" textAlign="center" display="block">
                  {isMobile ? day.charAt(0) : day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {calendarInterval.map((week, index) => (
            <Grid container columns={7} spacing={isMobile ? 0.5 : 1} key={`week-${index}`} sx={{ mb: isMobile ? 0.5 : 1 }}>
              {week.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEscalas = escalasByDate[dateKey] || [];
                const hasEscala = dayEscalas.length > 0;
                const ala = hasEscala ? dayEscalas[0].ala : null;
                const style = ala ? ALA_STYLES[ala] : { border: theme.palette.divider, bg: theme.palette.background.default };
                const approvedSwap = dayEscalas.some((escala) =>
                  escala.participantes?.some((p) => p.troca_status === 'aprovada')
                );
                const alaLetter = ala ? ala.charAt(0) : '';

                return (
                  <Grid item xs={1} key={dateKey}>
                    <Paper
                      onClick={(event) => handleOpenCalendarActionMenu(event, dateKey, dayEscalas)}
                      sx={{
                        minHeight: { xs: 48, sm: 140 },
                        aspectRatio: { xs: '1 / 1', sm: 'auto' },
                        p: { xs: 0.5, sm: 1 },
                        bgcolor: hasEscala ? style.bg : 'background.default',
                        border: '1px solid',
                        borderColor: hasEscala ? style.border : 'divider',
                        opacity: isSameMonth(day, calendarMonth) ? 1 : 0.4,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        position: 'relative',
                        transition: 'border-color 0.2s',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                        },
                      }}
                    >
                      {pdfLoadingDate === dateKey && (
                        <LinearProgress
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            borderRadius: 0,
                          }}
                        />
                      )}
                      <Typography variant="subtitle2" fontWeight="bold">
                        {format(day, 'd')}
                      </Typography>
                      {isMobile ? (
                        hasEscala ? (
                          <Box
                            sx={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              sx={{ color: style.border, lineHeight: 1 }}
                            >
                              {alaLetter}
                            </Typography>
                          </Box>
                        ) : null
                      ) : hasEscala ? (
                        dayEscalas.map((escala) => (
                          <Box key={escala.id}>
                            <Chip
                              label={`Ala ${escala.ala}`}
                              size="small"
                              sx={{
                                mb: 0.5,
                                bgcolor: 'transparent',
                                color: style.border,
                                borderColor: style.border,
                              }}
                              variant="outlined"
                            />
                            {(escala.participantes || []).map((participante) => (
                              <Typography
                                key={`${escala.id}-${participante.usuario_id}`}
                                variant="caption"
                                display="block"
                              >
                                {isSwappedParticipant(participante) ? (
                                  <Box component="span" display="inline-flex" alignItems="center" gap={0.25}>
                                    <span aria-hidden="true">🔁</span>
                                    {getSwapParticipantLabel(participante)}
                                  </Box>
                                ) : (
                                  participante.nome
                                )}
                              </Typography>
                            ))}
                    {approvedSwap && (
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{
                          mt: 0.5,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <span aria-hidden="true">🔁</span>
                        Troca confirmada
                      </Typography>
                    )}
                          </Box>
                        ))
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          Sem escala
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderListView = () => {
    if (escalasLoading) {
      return (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (filteredEscalas.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            Nenhuma escala encontrada para os filtros selecionados
          </Typography>
        </Paper>
      );
    }

    const agrupadas = filteredEscalas.reduce((acc, escala) => {
      if (!escala.dataKey) return acc;
      if (!acc[escala.dataKey]) acc[escala.dataKey] = [];
      acc[escala.dataKey].push(escala);
      return acc;
    }, {});

    const diasOrdenados = Object.keys(agrupadas).sort();

    return (
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" color="textSecondary">
            {filteredEscalas.length} turno(s) visíveis
          </Typography>
        </Box>
        {diasOrdenados.map((dia) => (
          <Card key={`lista-${dia}`}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" flexWrap="wrap" alignItems="center" mb={1}>
                <Typography variant="h6">
                  {format(parseISO(dia), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {agrupadas[dia].length} turno(s)
                </Typography>
              </Box>

              {agrupadas[dia].map((escala) => {
                const style = ALA_STYLES[escala.ala] || { border: theme.palette.primary.main, bg: 'transparent' };
                const hasApprovedSwap = escala.participantes?.some((p) => p.troca_status === 'aprovada');
                return (
                  <Box key={`escala-lista-${escala.id}`} mb={2}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        bgcolor: style.border,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        mb: 1,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      }}
                    >
                      {`Ala ${escala.ala}`}
                    </Box>
                    {hasApprovedSwap && (
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mt: 1,
                        }}
                      >
                        <span aria-hidden="true">🔁</span>
                        Troca confirmada
                      </Typography>
                    )}
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {(escala.participantes || []).map((participante) => (
                        <Button
                          key={`${escala.id}-${participante.usuario_id}`}
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenSwapDialog(participante, escala)}
                          disabled={
                            isRetroactiveDate(escala.dataKey) ||
                            !isEligibleSwapTarget(participante, escala)
                          }
                          sx={{
                            textTransform: 'none',
                            borderColor: style.border,
                            color: style.border,
                          }}
                        >
                          {isSwappedParticipant(participante) ? (
                            <Box display="inline-flex" alignItems="center" gap={0.25}>
                              <span aria-hidden="true">🔁</span>
                              {getSwapParticipantLabel(participante)}
                            </Box>
                          ) : (
                            participante.nome
                          )}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  const renderEscalasTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={escalasFilters.data_inicio}
                onChange={(e) => setEscalasFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={escalasFilters.data_fim}
                onChange={(e) => setEscalasFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadEscalas}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <ToggleButtonGroup
                value={escalaViewMode}
                exclusive
                onChange={handleToggleViewMode}
                size="small"
                color="primary"
              >
                <ToggleButton value="calendar">
                  <CalendarMonthIcon sx={{ mr: 1 }} fontSize="small" />
                  Calendário
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewListIcon sx={{ mr: 1 }} fontSize="small" />
                  Lista
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormGroup row>
                {VALID_ALAS.map((ala) => (
                  <FormControlLabel
                    key={`filtro-${ala}`}
                    control={(
                      <Checkbox
                        checked={selectedAlas.includes(ala)}
                        onChange={(e) => handleToggleAlaFilter(ala, e.target.checked)}
                        sx={{
                          color: ALA_STYLES[ala].border,
                          '&.Mui-checked': { color: ALA_STYLES[ala].border },
                        }}
                      />
                    )}
                    label={ala}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {escalaViewMode === 'calendar' ? renderCalendarView() : renderListView()}

      {escalaViewMode === 'list' && escalasPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={escalasPagination.pages}
            page={escalasPagination.current_page || 1}
            onChange={(e, page) => {
              setEscalasFilters(prev => ({ ...prev, page }));
              loadEscalas();
            }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );

  const renderTrocasTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={trocasFilters.status}
                  onChange={(e) => setTrocasFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="aguardando_aprovacao">Aguardando aprovação</MenuItem>
                  <MenuItem value="aprovada">Aprovada</MenuItem>
                  <MenuItem value="rejeitada">Rejeitada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadTrocas}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {trocasLoading ? (
        <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Paper>
      ) : trocas.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="textSecondary">
            Nenhuma troca de serviço encontrada
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {trocas.map((troca) => {
              const statusLabel = formatTrocaStatusLabel(troca.status);
              const isPending = troca.status?.toLowerCase() === 'pendente';
              const isAwaitingAdmin = troca.status?.toLowerCase() === 'aguardando_aprovacao';
              const isApproved = troca.status?.toLowerCase() === 'aprovada';
              const solicitante = troca.solicitante_nome || 'Solicitante';
              const substituto = troca.substituto_nome || 'Substituto';
              const statusColor = getStatusColor(troca.status);
              const statusPalette = theme.palette[statusColor] || theme.palette.grey;
              const accentColor = statusPalette.main || theme.palette.grey[500];
              const accentBg = statusPalette.light || theme.palette.action.hover;
              const accentText = statusPalette.dark || accentColor;
              return (
                <Paper
                  key={troca.id}
                  elevation={1}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    border: '1px solid',
                    borderColor: 'divider',
                    borderLeft: '6px solid',
                    borderLeftColor: accentColor,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1,
                      }}
                    >
                      <Box display="flex" alignItems="flex-start" gap={1.25}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: accentBg,
                            color: accentText,
                          }}
                        >
                          <SwapIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.25}>
                            {solicitante} trabalha para {substituto}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Solicitação efetuada em {formatDateTime(troca.data_solicitacao)}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={statusLabel}
                        color={statusColor}
                        size="small"
                        sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                        gap: 1,
                      }}
                    >
                      <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                        <Typography variant="caption" color="textSecondary">
                          Quem folga
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {substituto}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Serviço de {formatDate(troca.data_servico_original)}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                        <Typography variant="caption" color="textSecondary">
                          Quem trabalha
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {solicitante}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Referência da troca: {formatDate(troca.data_servico_troca)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: getTrocaBg(troca.status) }}>
                      <Typography variant="body2" fontWeight={600}>
                        {solicitante} irá trabalhar no serviço de {substituto} em {formatDate(troca.data_servico_original)}.
                      </Typography>
                    </Box>

                    {renderTrocaTimeline(troca)}

                    {troca.data_servico_compensacao && (
                      <Alert severity="info" sx={{ py: 0.75 }}>
                        Pagamento: {substituto} trabalha para {solicitante} em {formatDate(troca.data_servico_compensacao)}.
                      </Alert>
                    )}

                    {(troca.motivo || troca.observacoes_decisao || (isApproved && troca.aprovado_por_nome)) && (
                      <Stack spacing={0.5}>
                        {troca.motivo && (
                          <Typography variant="body2" color="textSecondary">
                            Motivo: {troca.motivo}
                          </Typography>
                        )}
                        {troca.observacoes_decisao && (
                          <Typography variant="body2" color="textSecondary">
                            Observações da decisão: {troca.observacoes_decisao}
                          </Typography>
                        )}
                        {isApproved && troca.aprovado_por_nome && (
                          <Typography variant="caption" color="textSecondary">
                            Aprovado por {troca.aprovado_por_nome} em {formatDateTime(troca.data_aprovacao)}
                          </Typography>
                        )}
                      </Stack>
                    )}

                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        pt: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        justifyContent: { xs: 'stretch', sm: 'flex-end' },
                        '& .MuiButton-root': {
                          width: { xs: '100%', sm: 'auto' },
                        },
                      }}
                    >
                      {isPending && user?.id === troca.usuario_substituto_id && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleTrocaAction(troca, 'accept')}
                            disabled={trocaActionLoading === troca.id}
                          >
                            Aceitar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleTrocaAction(troca, 'reject')}
                            disabled={trocaActionLoading === troca.id}
                          >
                            Rejeitar
                          </Button>
                        </>
                      )}
                      {isPending && canAnalyzeTrocas && (
                        <Typography variant="caption" color="textSecondary">
                          Aguarda confirmação do substituto
                        </Typography>
                      )}
                      {isAwaitingAdmin && canAnalyzeTrocas && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => openDecisionDialog(troca, 'aprovada')}
                            disabled={trocaActionLoading === troca.id}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => openDecisionDialog(troca, 'rejeitada')}
                            disabled={trocaActionLoading === troca.id}
                          >
                            Rejeitar
                          </Button>
                        </>
                      )}
                      {isAwaitingAdmin && !canAnalyzeTrocas && (
                        <Typography variant="caption" color="textSecondary">
                          Aguarda análise administrativa
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
        </Stack>
      )}

      {trocasPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={trocasPagination.pages}
            page={trocasPagination.current_page}
            onChange={(e, page) => {
              setTrocasFilters(prev => ({ ...prev, page }));
              loadTrocas();
            }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );

  const renderExtrasTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={extrasFilters.status}
                  onChange={(e) => setExtrasFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem key="todos-status-extra" value="">Todos</MenuItem>
                  <MenuItem key="pendente-extra" value="pendente">Pendente</MenuItem>
                  <MenuItem key="aprovado-extra" value="aprovado">Aprovado</MenuItem>
                  <MenuItem key="rejeitado-extra" value="rejeitado">Rejeitado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={extrasFilters.data_inicio}
                onChange={(e) => setExtrasFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={extrasFilters.data_fim}
                onChange={(e) => setExtrasFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadExtras}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de serviços extras */}
      <Paper>
        <List>
          {extrasLoading ? (
            <ListItem>
              <Box display="flex" justifyContent="center" width="100%">
                <CircularProgress />
              </Box>
            </ListItem>
          ) : extras.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Nenhum serviço extra encontrado"
                sx={{ textAlign: 'center' }}
              />
            </ListItem>
          ) : (
            extras.map((extra, index) => (
              <React.Fragment key={extra.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <ExtraIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {extra.usuario_nome}
                        </Typography>
                        <Chip
                          label={extra.status}
                          color={getStatusColor(extra.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Data: {formatDate(extra.data_servico)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Horário: {extra.hora_inicio} - {extra.hora_fim}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Tipo: {extra.tipo_servico}
                        </Typography>
                        {extra.descricao && (
                          <Typography variant="body2" color="textSecondary">
                            Descrição: {extra.descricao}
                          </Typography>
                        )}
                        <Typography variant="caption" color="textSecondary">
                          Solicitado em: {formatDateTime(extra.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box display="flex" gap={1}>
                    {extra.status === 'pendente' && (
                      <>
                        <IconButton
                          color="success"
                          onClick={() => handleAprovarRejeitar('extra', extra.id, 'aprovado')}
                          disabled={loading}
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleAprovarRejeitar('extra', extra.id, 'rejeitado')}
                          disabled={loading}
                        >
                          <CloseIcon />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      onClick={() => handleOpenDialog('extra', extra)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Box>
                </ListItem>
                {index < extras.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      {/* Paginação */}
      {extrasPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={extrasPagination.pages}
            page={extrasPagination.current_page}
            onChange={(e, page) => {
              setExtrasFilters(prev => ({ ...prev, page }));
              loadExtras();
            }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );

  const renderAlasTab = () => {
    const alaStyles = {
      Alfa: { bg: theme.palette.success.light, border: theme.palette.success.main },
      Bravo: { bg: theme.palette.info.light, border: theme.palette.info.main },
      Charlie: { bg: theme.palette.warning.light, border: theme.palette.warning.main },
      Delta: { bg: theme.palette.error.light, border: theme.palette.error.main },
    };

    const renderUserCard = (userId, columnKey) => {
      const usuario = usuariosMap[userId];
      if (!usuario) return null;
      const showDriverBadge = hasDriverLicense(usuario.categoria_cnh);
      return (
        <Paper
          key={`${columnKey}-${userId}`}
          draggable={isAdmin}
          onDragStart={() => handleDragStart(userId, columnKey)}
          onDragEnd={handleDragEnd}
          onDoubleClick={() => {
            if (!isAdmin || columnKey === 'pool') return;
            handleQuickMove(userId, columnKey, 'pool');
          }}
          sx={{
            p: 1.5,
            mb: 1,
            cursor: isAdmin ? 'grab' : 'default',
            border: '1px solid',
            borderColor: columnKey === 'pool' ? 'divider' : alaStyles[columnKey]?.border || 'divider',
            bgcolor: columnKey === 'pool' ? 'background.paper' : alaStyles[columnKey]?.bg || 'background.paper',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="subtitle2">{usuario.nome}</Typography>
              {showDriverBadge && (
                <Tooltip title={`Categoria CNH: ${usuario.categoria_cnh}`} placement="top">
                  <Box
                    sx={{
                      bgcolor: theme.palette.info.dark,
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <DriveEtaIcon fontSize="small" sx={{ color: '#fff' }} />
                  </Box>
                </Tooltip>
              )}
            </Box>
            <Typography variant="caption" color="textSecondary">
              {usuario.matricula || 'Sem matrícula'}
            </Typography>
          </Box>
          {isAdmin && columnKey !== 'pool' && (
            <IconButton size="small" onClick={() => handleQuickMove(userId, columnKey, 'pool')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Paper>
      );
    };

    if (alasLoading) {
      return (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (usuarios.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Nenhum militar operacional encontrado
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Cadastre usuários com o setor Operacional para montar as alas.
          </Typography>
        </Paper>
      );
    }

    const poolIds = alaBoard.pool || [];
    const hasUnsavedAlaChanges = buildAlaSignature(alaBoard) !== savedAlaSignature;

    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card
              onDragOver={(e) => {
                if (isAdmin) e.preventDefault();
              }}
              onDrop={(e) => {
                if (isAdmin) {
                  e.preventDefault();
                  handleDropOnColumn('pool');
                }
              }}
            >
              <CardContent>
                <Typography variant="h6">Militares Disponíveis</Typography>
                <Typography variant="body2" color="textSecondary" mb={2}>
                  Arraste para uma ala para compor a escala
                </Typography>
                {poolIds.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Todos os militares estão alocados
                  </Typography>
                ) : (
                  poolIds.map((id) => renderUserCard(id, 'pool'))
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              {VALID_ALAS.map((ala) => (
                <Grid item xs={12} sm={6} md={3} key={ala}>
                  <Card
                    sx={{
                      borderTop: `4px solid ${alaStyles[ala]?.border || theme.palette.primary.main}`,
                      minHeight: 280,
                    }}
                    onDragOver={(e) => {
                      if (isAdmin) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (isAdmin) {
                        e.preventDefault();
                        handleDropOnColumn(ala);
                      }
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6">{`Ala ${ala}`}</Typography>
                        <Chip label={`${alaBoard[ala]?.length || 0} militares`} size="small" />
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        Cada ala deve ter pelo menos 5 militares
                      </Typography>
                      <Box mt={2}>
                        {(alaBoard[ala] || []).length === 0 ? (
                          <Typography variant="body2" color="textSecondary">
                            Arraste militares para cá
                          </Typography>
                        ) : (
                          alaBoard[ala].map((id) => renderUserCard(id, ala))
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {isAdmin && (
          <>
            <Box mt={3} display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <Button
                variant="contained"
                color="success"
                size="large"
                onClick={handleSaveAlas}
                disabled={alasSaving || alasLoading || !hasUnsavedAlaChanges}
                startIcon={alasSaving ? <CircularProgress size={16} /> : <CheckIcon />}
                sx={{ fontWeight: 700, px: 3, boxShadow: 2 }}
              >
                Salvar Distribuição
              </Button>
              <Typography variant="body2" color="textSecondary">
                {hasUnsavedAlaChanges
                  ? 'Ao salvar, as escalas automáticas de 2026 são sincronizadas pela referência 01/01/2026 = Ala Delta.'
                  : 'Distribuição sem alterações para salvar.'}
              </Typography>
            </Box>

          </>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Gestão Operacional
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Escalas, trocas de serviço e serviços extras
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Snackbar
        open={pdfFeedback.open}
        autoHideDuration={4000}
        onClose={handlePdfFeedbackClose}
      >
        <Alert
          onClose={handlePdfFeedbackClose}
          severity={pdfFeedback.severity}
          sx={{ width: '100%' }}
        >
          {pdfFeedback.message}
        </Alert>
      </Snackbar>

      {pdfLoadingDate && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {!currentUnit && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Selecione uma unidade no topo da tela para carregar o conteúdo do operacional.
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={
              <Badge 
                badgeContent={usuarios.filter((u) => u.ativo !== false).length} 
                color="primary"
              >
                <PeopleIcon />
              </Badge>
            } 
            label="Alas"
          />
          <Tab 
            icon={
              <Badge 
                badgeContent={escalas.filter(e => e.status === 'ativa').length} 
                color="success"
              >
                <ScheduleIcon />
              </Badge>
            } 
            label="Escalas" 
          />
          <Tab 
            icon={
              <Badge 
                badgeContent={trocas.filter(t => ['pendente', 'aguardando_aprovacao'].includes(t.status)).length}
                color="warning"
              >
                <SwapIcon />
              </Badge>
            } 
            label="Trocas de Serviço" 
          />
          <Tab 
            icon={
              <Badge 
                badgeContent={extras.filter(e => e.status === 'pendente').length} 
                color="warning"
              >
                <ExtraIcon />
              </Badge>
            } 
            label="Serviços Extras" 
          />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderAlasTab()}
      {activeTab === 1 && renderEscalasTab()}
      {activeTab === 2 && renderTrocasTab()}
      {activeTab === 3 && renderExtrasTab()}

      {renderMobileCalendarDialog()}

      {/* Menu de ações */}
      {activeTab > 0 && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem
            key="view-operacional"
            onClick={() => {
              const type = activeTab === 1 ? 'escala' : activeTab === 2 ? 'troca' : 'extra';
              handleOpenDialog(type, selectedItem);
              setAnchorEl(null);
            }}
          >
            <ViewIcon sx={{ mr: 1 }} />
            Visualizar
          </MenuItem>
        </Menu>
      )}

      {/* Dialog para formulários */}
      <Menu
        anchorEl={calendarActionMenu.anchorEl}
        open={Boolean(calendarActionMenu.anchorEl)}
        onClose={handleCloseCalendarActionMenu}
      >
        <MenuItem onClick={handleCalendarPdfAction}>
          <PdfIcon sx={{ mr: 1 }} fontSize="small" />
          Baixar escala em PDF
        </MenuItem>
        <MenuItem
          onClick={handleOpenSwapFromCalendarMenu}
          disabled={!canRequestSwapFromCalendarMenu()}
        >
          <SwapIcon sx={{ mr: 1 }} fontSize="small" />
          {getCalendarSwapActionLabel()}
        </MenuItem>
      </Menu>

      <Dialog
        open={decisionDialog.open}
        onClose={closeDecisionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {decisionDialog.status === 'aprovada' ? 'Aprovar Troca de Serviço' : 'Rejeitar Troca de Serviço'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Alert severity={decisionDialog.status === 'aprovada' ? 'success' : 'warning'}>
              A decisão será enviada aos usuários envolvidos na troca.
            </Alert>
            <TextField
              label="Observações da decisão"
              multiline
              minRows={3}
              fullWidth
              value={decisionDialog.observacoes}
              onChange={(e) => setDecisionDialog((prev) => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Registre a justificativa ou orientação administrativa"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDecisionDialog}>Cancelar</Button>
          <Button
            onClick={handleAdminTrocaDecision}
            variant="contained"
            color={decisionDialog.status === 'aprovada' ? 'success' : 'error'}
            disabled={trocaActionLoading === decisionDialog.troca?.id}
          >
            {trocaActionLoading === decisionDialog.troca?.id ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'escala' && (selectedItem ? 'Editar Escala' : 'Nova Escala')}
          {dialogType === 'troca' && (selectedItem ? 'Visualizar Troca' : 'Nova Troca de Serviço')}
          {dialogType === 'extra' && (selectedItem ? 'Visualizar Serviço Extra' : 'Novo Serviço Extra')}
          {dialogType === 'swap' && 'Solicitar Troca de Serviço'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'swap' ? (
            <Stack spacing={2} mt={1}>
              <Alert severity="info">
                Você está solicitando trabalhar no serviço do militar selecionado. Se houver pagamento, escolha a data em que esse militar trabalhará para você.
              </Alert>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1,
                }}
              >
                {[
                  {
                    label: 'Quem folga',
                    value: formData.substituto_nome || 'Selecione um militar',
                  },
                  {
                    label: 'Quem trabalha',
                    value: formData.solicitante_nome || user?.nome || '-',
                  },
                  {
                    label: 'Serviço selecionado',
                    value: formData.data_servico_original ? formatDate(formData.data_servico_original) : 'Selecione um turno',
                  },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1.5,
                      bgcolor: 'background.default',
                    }}
                  >
                    <Typography variant="caption" color="textSecondary" display="block">
                      {item.label}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <FormControl fullWidth sx={{ mb: 1 }}>
                <InputLabel>Militar que irá folgar</InputLabel>
                <Select
                  value={selectedColleagueId || ''}
                  label="Militar que irá folgar"
                  onChange={(e) => handleColleagueChange(e.target.value)}
                >
                  {(selectedItem?.escala?.participantes || [])
                    .filter((participante) => isEligibleSwapTarget(participante, selectedItem?.escala))
                    .map((participante) => (
                      <MenuItem key={participante.id} value={participante.id}>
                        {participante.nome}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary" display="block">
                  Serviço que você irá trabalhar
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formData.substituto_nome || 'Militar selecionado'} em {formatDate(formData.data_servico_original)}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={pagarAgora}
                    onChange={(e) => {
                      setPagarAgora(e.target.checked);
                      if (!e.target.checked) {
                        handleFormChange('data_servico_compensacao', '');
                      }
                    }}
                  />
                }
                label="Informar pagamento agora"
              />
              {pagarAgora && (
                <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 2, mb: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Pagamento da troca
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mb={2}>
                    Quando informado, este é o seu serviço em que o militar selecionado trabalhará para pagar a troca.
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Seu serviço que será usado como pagamento</InputLabel>
                    <Select
                      value={formData.data_servico_compensacao || ''}
                      label="Seu serviço que será usado como pagamento"
                      onChange={(e) => handleFormChange('data_servico_compensacao', e.target.value)}
                    >
                      {sortShiftsByDate(colleagueShifts).map((shift) => (
                        <MenuItem key={shift.escala_usuario_id} value={shift.data_servico}>
                          {shift.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="textSecondary">
                      O pagamento pode ser uma data passada ou futura, conforme combinado entre os envolvidos.
                    </Typography>
                  </FormControl>
                  {formData.data_servico_compensacao && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Pagamento: {formData.substituto_nome || 'O militar selecionado'} trabalhará para {formData.solicitante_nome || user?.nome || 'você'} em {formatDate(formData.data_servico_compensacao)}.
                    </Alert>
                  )}
                </Box>
              )}
              <TextField
                label="Motivo ou observações"
                multiline
                minRows={3}
                value={formData.observacoes || ''}
                onChange={(e) => handleFormChange('observacoes', e.target.value)}
                placeholder="Explique o motivo ou combinado da troca (opcional)"
              />
            </Stack>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Formulário em desenvolvimento...
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : dialogType === 'swap' ? 'Enviar Solicitação' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Operacional;
