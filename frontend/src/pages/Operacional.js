import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { operacionalService } from '../services/api';
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
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const VALID_ALAS = ['Alfa', 'Bravo', 'Charlie', 'Delta'];
const ALA_STYLES = {
  Alfa: { border: '#2e7d32', bg: 'rgba(46, 125, 50, 0.08)' },
  Bravo: { border: '#0277bd', bg: 'rgba(2, 119, 189, 0.08)' },
  Charlie: { border: '#f9a825', bg: 'rgba(249, 168, 37, 0.15)' },
  Delta: { border: '#d32f2f', bg: 'rgba(211, 47, 47, 0.12)' },
};

const INITIAL_ALA_BOARD = {
  pool: [],
  Alfa: [],
  Bravo: [],
  Charlie: [],
  Delta: [],
};

const Operacional = () => {
  const theme = useTheme();
  const { user } = useAuth();
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
  
  // Estados para usuários operacionais / alas
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosMap, setUsuariosMap] = useState({});
  const [alaBoard, setAlaBoard] = useState(() => ({ ...INITIAL_ALA_BOARD }));
  const [alasLoading, setAlasLoading] = useState(false);
  const [alasSaving, setAlasSaving] = useState(false);
  const [escalaGenerating, setEscalaGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [dragInfo, setDragInfo] = useState({ id: null, from: null });
  const [alasForm, setAlasForm] = useState({
    data_inicio: '',
    ala_inicial: VALID_ALAS[0],
    quantidade_servicos: 4,
    nome_base: '',
    observacoes: '',
  });
  const [escalaViewMode, setEscalaViewMode] = useState('calendar');
  const [selectedAlas, setSelectedAlas] = useState([...VALID_ALAS]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [escalaParticipantsCache, setEscalaParticipantsCache] = useState({});
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'escala', 'troca', 'extra'
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulários
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = () => {
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

  const loadEscalas = async () => {
    try {
      setEscalasLoading(true);
      const response = await operacionalService.getEscalas(escalasFilters);
      const data = response.data || {};
      const lista = Array.isArray(data) ? data : (data.escalas || []);
      setEscalasPagination(data.pagination || {});

      const enriched = await Promise.all(
        lista.map(async (escala) => {
          try {
            let participantes = escalaParticipantsCache[escala.id];
            if (!participantes) {
              const detalhes = await operacionalService.getEscalaById(escala.id);
              participantes = detalhes?.data?.usuarios || [];
              setEscalaParticipantsCache((prev) => ({
                ...prev,
                [escala.id]: participantes,
              }));
            }
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

  const loadTrocas = async () => {
    try {
      setTrocasLoading(true);
      const response = await operacionalService.getTrocas(trocasFilters);
      setTrocas(response.data.trocas || []);
      setTrocasPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar trocas:', err);
      setError('Erro ao carregar trocas de serviço');
    } finally {
      setTrocasLoading(false);
    }
  };

  const loadExtras = async () => {
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
    } catch (err) {
      console.error('Erro ao carregar alas operacionais:', err);
      const message = err.response?.data?.error || 'Erro ao carregar alas operacionais';
      setError(message);
    } finally {
      setAlasLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
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
          // Aprovar/rejeitar troca
          await operacionalService.updateTroca(selectedItem.id, formData);
        } else {
          await operacionalService.createTroca(formData);
        }
        loadTrocas();
      } else if (dialogType === 'extra') {
        if (selectedItem) {
          // Aprovar/rejeitar extra
          await operacionalService.updateExtra(selectedItem.id, formData);
        } else {
          await operacionalService.createExtra(formData);
        }
        loadExtras();
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarRejeitar = async (tipo, id, acao) => {
    try {
      setLoading(true);
      
      if (tipo === 'troca') {
        await operacionalService.updateTroca(id, { status: acao });
        loadTrocas();
      } else if (tipo === 'extra') {
        await operacionalService.updateExtra(id, { status: acao });
        loadExtras();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'ativa':
      case 'aprovado':
        return 'success';
      case 'pendente':
        return 'warning';
      case 'rejeitado':
      case 'cancelado':
        return 'error';
      case 'finalizada':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR');
  };

  const isAdmin = user?.perfil_nome === 'Administrador';

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
      await operacionalService.salvarAlas({ alas: buildAlaPayload() });
      setSuccessMessage('Alas atualizadas com sucesso.');
    } catch (err) {
      console.error('Erro ao salvar alas:', err);
      const message = err.response?.data?.error || 'Erro ao salvar as alas';
      setError(message);
    } finally {
      setAlasSaving(false);
    }
  };

  const handleGenerateEscalas = async () => {
    if (!isAdmin) return;
    if (!alasForm.data_inicio) {
      setError('Selecione a data de início da escala');
      return;
    }
    if (!alasForm.quantidade_servicos || Number(alasForm.quantidade_servicos) < 1) {
      setError('Informe o número de serviços a serem gerados');
      return;
    }
    try {
      setEscalaGenerating(true);
      setError('');
      setSuccessMessage('');
      await operacionalService.gerarEscalasAutomaticas({
        data_inicio: alasForm.data_inicio,
        ala_inicial: alasForm.ala_inicial,
        quantidade_servicos: Number(alasForm.quantidade_servicos),
        nome_base: alasForm.nome_base || undefined,
        observacoes: alasForm.observacoes || undefined,
        alas: buildAlaPayload(),
      });
      setSuccessMessage('Escalas geradas com sucesso.');
      loadEscalas();
    } catch (err) {
      console.error('Erro ao gerar escalas:', err);
      const message = err.response?.data?.error || 'Erro ao gerar escalas';
      setError(message);
    } finally {
      setEscalaGenerating(false);
    }
  };

  const handleAlaFormChange = (field, value) => {
    setAlasForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenSwapDialog = (participante, escala) => {
    if (!participante || !escala) return;
    setError('');
    const dataSubstituto = getDateKey(participante.data_servico || escala.data_inicio) || '';
    setDialogType('swap');
    setSelectedItem({ participante, escala });
    setFormData({
      solicitante_nome: user?.nome || '',
      solicitante_id: user?.id,
      substituto_nome: participante.nome,
      substituto_id: participante.usuario_id,
      data_substituto: dataSubstituto,
      data_solicitante: '',
    });
    setDialogOpen(true);
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

  const getEscalaAla = (escala) => {
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
    const match = escala.nome?.match(/Ala\s+([A-Za-z]+)/i);
    if (match) {
      const candidate = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      if (VALID_ALAS.includes(candidate)) {
        return candidate;
      }
    }
    return VALID_ALAS[0];
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
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <IconButton onClick={() => handleCalendarMonthChange(-1)}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" textTransform="capitalize">
              {format(calendarMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>
            <IconButton onClick={() => handleCalendarMonthChange(1)}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Grid container columns={7} spacing={1} sx={{ textTransform: 'uppercase', mb: 1 }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <Grid item xs={1} key={day}>
                <Typography variant="caption" color="textSecondary" textAlign="center">
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {calendarInterval.map((week, index) => (
            <Grid container columns={7} spacing={1} key={`week-${index}`} sx={{ mb: 1 }}>
              {week.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEscalas = escalasByDate[dateKey] || [];
                const hasEscala = dayEscalas.length > 0;
                const ala = hasEscala ? dayEscalas[0].ala : null;
                const style = ala ? ALA_STYLES[ala] : { border: theme.palette.divider, bg: theme.palette.background.default };

                return (
                  <Grid item xs={1} key={dateKey}>
                    <Paper
                      sx={{
                        minHeight: 140,
                        p: 1,
                        bgcolor: hasEscala ? style.bg : 'background.default',
                        border: '1px solid',
                        borderColor: hasEscala ? style.border : 'divider',
                        opacity: isSameMonth(day, calendarMonth) ? 1 : 0.4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {format(day, 'd')}
                      </Typography>
                      {hasEscala ? (
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
                                {participante.nome}
                              </Typography>
                            ))}
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
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {(escala.participantes || []).map((participante) => (
                        <Button
                          key={`${escala.id}-${participante.usuario_id}`}
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenSwapDialog(participante, escala)}
                          sx={{
                            textTransform: 'none',
                            borderColor: style.border,
                            color: style.border,
                          }}
                        >
                          {participante.nome}
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
                  <MenuItem key="todos-status-troca" value="">Todos</MenuItem>
                  <MenuItem key="pendente-troca" value="pendente">Pendente</MenuItem>
                  <MenuItem key="aprovado-troca" value="aprovado">Aprovado</MenuItem>
                  <MenuItem key="rejeitado-troca" value="rejeitado">Rejeitado</MenuItem>
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

      {/* Lista de trocas */}
      <Paper>
        <List>
          {trocasLoading ? (
            <ListItem>
              <Box display="flex" justifyContent="center" width="100%">
                <CircularProgress />
              </Box>
            </ListItem>
          ) : trocas.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Nenhuma troca de serviço encontrada"
                sx={{ textAlign: 'center' }}
              />
            </ListItem>
          ) : (
            trocas.map((troca, index) => (
              <React.Fragment key={troca.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <SwapIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {troca.solicitante_nome} → {troca.destinatario_nome}
                        </Typography>
                        <Chip
                          label={troca.status}
                          color={getStatusColor(troca.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Data Original: {formatDate(troca.data_original)} ({troca.turno_original})
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Data Troca: {formatDate(troca.data_troca)} ({troca.turno_troca})
                        </Typography>
                        {troca.motivo && (
                          <Typography variant="body2" color="textSecondary">
                            Motivo: {troca.motivo}
                          </Typography>
                        )}
                        <Typography variant="caption" color="textSecondary">
                          Solicitado em: {formatDateTime(troca.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box display="flex" gap={1}>
                    {troca.status === 'pendente' && (
                      <>
                        <IconButton
                          color="success"
                          onClick={() => handleAprovarRejeitar('troca', troca.id, 'aprovado')}
                          disabled={loading}
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleAprovarRejeitar('troca', troca.id, 'rejeitado')}
                          disabled={loading}
                        >
                          <CloseIcon />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      onClick={() => handleOpenDialog('troca', troca)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Box>
                </ListItem>
                {index < trocas.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      {/* Paginação */}
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
            <Typography variant="subtitle2">{usuario.nome}</Typography>
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
            <Box mt={3} display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={handleSaveAlas}
                disabled={alasSaving || alasLoading}
                startIcon={alasSaving ? <CircularProgress size={16} /> : <CheckIcon />}
              >
                Salvar Distribuição
              </Button>
            </Box>

            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Gerar Escalas Automáticas
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={2}>
                  Informe o dia de início, a ala que iniciará a escala e quantos serviços devem ser gerados.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Dia de início"
                      type="date"
                      fullWidth
                      value={alasForm.data_inicio}
                      onChange={(e) => handleAlaFormChange('data_inicio', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Ala inicial</InputLabel>
                      <Select
                        label="Ala inicial"
                        value={alasForm.ala_inicial}
                        onChange={(e) => handleAlaFormChange('ala_inicial', e.target.value)}
                      >
                        {VALID_ALAS.map((ala) => (
                          <MenuItem key={`ala-${ala}`} value={ala}>{ala}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Quantidade de serviços"
                      type="number"
                      fullWidth
                      inputProps={{ min: 1 }}
                      value={alasForm.quantidade_servicos}
                      onChange={(e) => handleAlaFormChange('quantidade_servicos', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nome base (opcional)"
                      fullWidth
                      value={alasForm.nome_base}
                      onChange={(e) => handleAlaFormChange('nome_base', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Observações"
                      fullWidth
                      multiline
                      minRows={1}
                      value={alasForm.observacoes}
                      onChange={(e) => handleAlaFormChange('observacoes', e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Box mt={3} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={handleGenerateEscalas}
                    disabled={escalaGenerating || alasLoading}
                    startIcon={escalaGenerating ? <CircularProgress size={16} color="inherit" /> : <ScheduleIcon />}
                  >
                    Gerar Escalas
                  </Button>
                </Box>
              </CardContent>
            </Card>
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
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
                badgeContent={trocas.filter(t => t.status === 'pendente').length} 
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
                Escolha o dia em que você deseja que o colega selecionado cubra seu serviço. Em breve a solicitação será enviada automaticamente para aprovação.
              </Alert>
              <TextField
                label="Militar que solicita"
                value={formData.solicitante_nome || ''}
                fullWidth
                disabled
              />
              <TextField
                label="Militar selecionado"
                value={formData.substituto_nome || ''}
                fullWidth
                disabled
              />
              <TextField
                label="Data do serviço do militar selecionado"
                value={formData.data_substituto || ''}
                fullWidth
                disabled
              />
              <TextField
                label="Data em que você precisa de cobertura"
                type="date"
                value={formData.data_solicitante || ''}
                onChange={(e) => handleFormChange('data_solicitante', e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Selecione o dia que você deseja trocar."
              />
              <TextField
                label="Observações"
                multiline
                minRows={3}
                value={formData.observacoes || ''}
                onChange={(e) => handleFormChange('observacoes', e.target.value)}
                placeholder="Descreva o motivo da troca (opcional)"
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
          {dialogType === 'swap' ? (
            <Tooltip title="Funcionalidade em desenvolvimento" placement="top">
              <span>
                <Button variant="contained" disabled>
                  Enviar Solicitação
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Salvar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Operacional;
