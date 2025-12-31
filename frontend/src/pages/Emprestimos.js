import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
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
  Fab,
  Tooltip,
  Badge,
  useTheme,
  Pagination,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Devices as DevicesIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  KeyboardReturn as ReturnIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { emprestimosService, formatters } from '../services/api';
import { uploadService } from '../services/api';

const Emprestimos = () => {
  const location = useLocation();
  const theme = useTheme();
  const { user, isOperador } = useAuth();
  const { currentUnit } = useTenant();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiBase = process.env.REACT_APP_API_BASE_URL || '/api';
  const assetsBase = apiBase.startsWith('http') ? apiBase.replace(/\/api\/?$/, '') : 'http://localhost:5000';
  const buildAssetUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${assetsBase}${p}`;
  };
  const getFirstPhotoUrl = (fotos) => {
    if (!fotos) return '';
    if (Array.isArray(fotos) && fotos.length > 0) {
      const f = fotos[0];
      if (typeof f === 'string') return buildAssetUrl(f);
      if (f && typeof f === 'object' && f.url) return buildAssetUrl(f.url);
    }
    if (typeof fotos === 'string') {
      try {
        const arr = JSON.parse(fotos);
        if (Array.isArray(arr) && arr.length > 0) {
          const f = arr[0];
          if (typeof f === 'string') return buildAssetUrl(f);
          if (f && typeof f === 'object' && f.url) return buildAssetUrl(f.url);
        }
      } catch {}
      return buildAssetUrl(fotos);
    }
    return '';
  };
  
  // Estados para equipamentos
  const [equipamentos, setEquipamentos] = useState([]);
  const [equipamentosLoading, setEquipamentosLoading] = useState(false);
  const [equipamentosFilters, setEquipamentosFilters] = useState({
    status: '',
    condicao: '',
    setor: '',
    search: '',
    page: 1,
    limit: 10,
  });
  const [equipamentosPagination, setEquipamentosPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  
  // Estados para cautelas
  const [emprestimos, setEmprestimos] = useState([]);
  const [emprestimosLoading, setEmprestimosLoading] = useState(false);
  const [emprestimosFilters, setEmprestimosFilters] = useState({
    status: '',
    equipamento_id: '',
    usuario_id: '',
    vencidos: false,
    page: 1,
    limit: 10,
  });
  const [emprestimosPagination, setEmprestimosPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'equipamento', 'emprestimo', 'devolucao'
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulários
  const [formData, setFormData] = useState({});
  const [assinaturaSolic, setAssinaturaSolic] = useState(null);
  const [assinaturaAuto, setAssinaturaAuto] = useState(null);
  const canvasRefSolic = React.useRef(null);
  const canvasRefAuto = React.useRef(null);
  const clearCanvas = (ref) => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
  };
  const startDraw = (ref, e) => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.beginPath();
    const rect = c.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    c.isDrawing = true;
  };
  const drawMove = (ref, e) => {
    const c = ref.current;
    if (!c || !c.isDrawing) return;
    const ctx = c.getContext('2d');
    const rect = c.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  const endDraw = (ref, setState) => {
    const c = ref.current;
    if (!c) return;
    c.isDrawing = false;
    setState(c.toDataURL('image/png'));
  };
  const [barcodeEquip, setBarcodeEquip] = useState('');
  const [carrinho, setCarrinho] = useState([]);
  const [loteLoading, setLoteLoading] = useState(false);
  const [relResumo, setRelResumo] = useState(null);
  const [relTop, setRelTop] = useState([]);
  const [termosRecentes, setTermosRecentes] = useState([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Recarregar dados quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadData();
    }
  }, [currentUnit]);

  const loadData = () => {
    switch (activeTab) {
      case 0:
        loadEquipamentos();
        break;
      case 1:
        loadEmprestimos();
        break;
      default:
        break;
    }
  };

  const loadRelatorios = async () => {
    try {
      const results = await Promise.allSettled([
        emprestimosService.getRelatorioEmprestimos(),
        emprestimosService.getRelatorioTopEquipamentos(),
        emprestimosService.getTermosCautela({ limit: 20 })
      ]);
      const [resResumo, resTop, resTermos] = results;
      if (resResumo.status === 'fulfilled') {
        setRelResumo(resResumo.value.data);
      } else {
        setRelResumo(null);
      }
      if (resTop.status === 'fulfilled') {
        setRelTop(resTop.value.data.top || []);
      } else {
        setRelTop([]);
      }
      if (resTermos.status === 'fulfilled') {
        setTermosRecentes(resTermos.value.data.termos || []);
      } else {
        setTermosRecentes([]);
      }
      const allRejected = results.every(r => r.status === 'rejected');
      if (allRejected) {
        const msgs = results
          .map((r, idx) => {
            if (r.status !== 'rejected') return null;
            const reason = r.reason;
            const errMsg =
              (reason && reason.response && reason.response.data && reason.response.data.error) ||
              (reason && reason.message) ||
              'erro';
            return `falha${idx+1}: ${errMsg}`;
          })
          .filter(Boolean)
          .join(' | ');
        setError(`Erro ao carregar relatórios: ${msgs}`);
      } else {
        setError('');
      }
    } catch {
      setError('Erro ao carregar relatórios');
    }
  };

  const loadEquipamentos = async () => {
    try {
      setEquipamentosLoading(true);
      const response = await emprestimosService.getEquipamentos(equipamentosFilters);
      setEquipamentos(response.data.equipamentos || []);
      setEquipamentosPagination(response.data.pagination || {});
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || 'Erro ao carregar equipamentos';
      console.error('Erro ao carregar equipamentos:', err);
      setError(status ? `${msg} (HTTP ${status})` : msg);
    } finally {
      setEquipamentosLoading(false);
    }
  };

  const loadEmprestimos = async (customFilters = null) => {
    try {
      setEmprestimosLoading(true);
      const response = await emprestimosService.getEmprestimos(customFilters || emprestimosFilters);
      setEmprestimos(response.data.emprestimos || []);
      setEmprestimosPagination(response.data.pagination || {});
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || 'Erro ao carregar cautelas';
      console.error('Erro ao carregar cautelas:', err);
      setError(status ? `${msg} (HTTP ${status})` : msg);
    } finally {
      setEmprestimosLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const statusParam = params.get('status');

    if (tabParam === 'cautelas') {
      setActiveTab(1);
    }
    
    if (statusParam) {
       setEmprestimosFilters(prev => {
         const newFilters = { ...prev, status: statusParam };
         // Se a aba já for cautelas ou estivermos mudando para ela, carrega com o novo filtro
         // Nota: se activeTab mudar para 1, o useEffect do activeTab chamará loadData->loadEmprestimos
         // Mas loadData usará o state emprestimosFilters que pode não ter atualizado ainda.
         // Por segurança, chamamos explicitamente aqui.
         loadEmprestimos(newFilters);
         return newFilters;
       });
    }
  }, [location.search]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
  };

  useEffect(() => {
    if (activeTab === 2) {
      loadRelatorios();
    }
  }, [activeTab]);

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    const data = item || {};
    if (type === 'equipamento') {
      const toInputDate = (v) => {
        if (!v) return '';
        try {
          // Accept ISO strings or Date; format yyyy-MM-dd
          const d = new Date(v);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          }
        } catch {}
        // Fallback: if already yyyy-MM-dd or longer ISO, slice
        return String(v).slice(0, 10);
      };
      if (data.data_aquisicao) {
        data.data_aquisicao = toInputDate(data.data_aquisicao);
      }
    }
    setFormData(data);
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
      
      if (dialogType === 'equipamento') {
        if (selectedItem) {
          const payload = { ...formData };
          if (payload.valor !== undefined) {
            if (payload.valor === '') {
              delete payload.valor;
            } else {
              const num = parseFloat(String(payload.valor).replace(',', '.'));
              if (Number.isNaN(num)) delete payload.valor; else payload.valor = num;
            }
          }
          await emprestimosService.updateEquipamento(selectedItem.id, payload);
        } else {
          const payload = { ...formData };
          // Conversões
          if (payload.valor !== undefined) {
            if (payload.valor === '') {
              delete payload.valor;
            } else {
              const num = parseFloat(String(payload.valor).replace(',', '.'));
              if (Number.isNaN(num)) delete payload.valor; else payload.valor = num;
            }
          }
          await emprestimosService.createEquipamento(payload);
        }
        loadEquipamentos();
      } else if (dialogType === 'emprestimo') {
        const payload = {
          equipamento_id: formData.equipamento_id,
          data_prevista_devolucao: formData.data_prevista_devolucao,
          motivo: formData.motivo || 'Cautela de equipamento',
          observacoes_emprestimo: formData.observacoes_emprestimo,
          condicao_emprestimo: formData.condicao_emprestimo,
        };
        const resp = await emprestimosService.createEmprestimo(payload);
        const status = resp?.data?.status;
        if (status === 'pendente') {
          setError('Cautela pendente de autorização do Administrador');
        }
        loadEmprestimos();
        loadEquipamentos(); // Atualizar status dos equipamentos
      } else if (dialogType === 'devolucao') {
        await emprestimosService.devolverEmprestimo(
          selectedItem.id,
          formData.condicao_devolucao,
          formData.observacoes_devolucao
        );
        loadEmprestimos();
        loadEquipamentos();
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      const msg = err?.response?.data?.error || (err?.response?.data?.errors?.[0]?.msg) || 'Erro ao salvar dados';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const addEquipamentoPorBarcode = async () => {
    try {
      if (!barcodeEquip) return;
      const res = await emprestimosService.getEquipamentos({ search: barcodeEquip, page: 1, limit: 1 });
      const list = res.data.equipamentos || [];
      if (!list.length) {
        setError('Equipamento não encontrado pelo código de barras');
        return;
      }
      const eq = list[0];
      if (eq.status !== 'disponivel') {
        setError('Equipamento não está disponível');
        return;
      }
      if (carrinho.find((i) => i.id === eq.id)) {
        setError('Equipamento já está no carrinho');
        return;
      }
      setCarrinho((prev) => [...prev, { 
        id: eq.id, 
        codigo: eq.codigo, 
        nome: eq.nome,
        exige_autorizacao: eq.exige_autorizacao,
        exige_data_devolucao: eq.exige_data_devolucao
      }]);
      setBarcodeEquip('');
    } catch (err) {
      setError('Erro ao adicionar equipamento pelo código de barras');
    }
  };

  const removerDoCarrinho = (id) => {
    setCarrinho((prev) => prev.filter((i) => i.id !== id));
  };

  const confirmarCautelaEmLote = async () => {
    try {
      if (!carrinho.length) return;

      // Validação de exigências
      const itensExigemData = carrinho.filter(i => i.exige_data_devolucao);
      if (itensExigemData.length > 0 && !formData.data_prevista_devolucao) {
        setError(`Os seguintes equipamentos exigem data de devolução: ${itensExigemData.map(i => i.codigo).join(', ')}. Por favor, selecione uma data.`);
        return;
      }

      setLoteLoading(true);
      
      // Se algum item exige data, não podemos usar data padrão automática se o usuário não preencheu (mas o check acima já garante isso).
      // Se NENHUM item exige data, podemos manter o comportamento padrão ou obrigar sempre.
      // O comportamento anterior era: formData.data || data_padrao
      // Vamos manter a data padrão apenas se não houver exigência explícita bloqueando.
      
      const payload = {
        equipamentos: carrinho.map((i) => ({ id: i.id })),
        data_prevista_devolucao: formData.data_prevista_devolucao || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        motivo: formData.motivo || 'Cautela em lote',
      };
      
      const res = await emprestimosService.createEmprestimosLote(payload);
      setCarrinho([]);
      loadEmprestimos();
      loadEquipamentos();
      
      const failures = res.data?.failures || [];
       const successes = res.data?.results || [];
       const pendingCount = successes.filter(s => s.loan_status === 'pendente').length;
       
       let msg = '';
       if (failures.length) {
         msg = `Falhas: ${failures.length}. `;
       }
       if (successes.length) {
         msg += `Sucesso: ${successes.length}`;
         if (pendingCount > 0) {
            msg += ` (${pendingCount} pendente${pendingCount > 1 ? 's' : ''} de autorização)`;
         }
         msg += '.';
       }
      
    } catch (err) {
      setError('Erro ao registrar cautela em lote');
    } finally {
      setLoteLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'disponivel':
      case 'devolvido':
        return 'success';
      case 'emprestado':
      case 'ativo':
        return 'warning';
      case 'manutencao':
      case 'vencido':
        return 'error';
      case 'inativo':
        return 'default';
      default:
        return 'default';
    }
  };

  const getCondicaoColor = (condicao) => {
    switch (condicao?.toLowerCase()) {
      case 'excelente':
      case 'bom':
        return 'success';
      case 'regular':
        return 'warning';
      case 'ruim':
        return 'error';
      default:
        return 'default';
    }
  };

  const isEmprestimoVencido = (dataVencimento) => {
    return new Date(dataVencimento) < new Date();
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

  const renderEquipamentosTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Buscar equipamento"
                value={equipamentosFilters.search}
                onChange={(e) => setEquipamentosFilters(prev => ({ ...prev, search: e.target.value }))}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={equipamentosFilters.status}
                  onChange={(e) => setEquipamentosFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem key="todos-status" value="">Todos</MenuItem>
                  <MenuItem key="disponivel" value="disponivel">Disponível</MenuItem>
                  <MenuItem key="emprestado" value="emprestado">Emprestado</MenuItem>
                  <MenuItem key="manutencao" value="manutencao">Manutenção</MenuItem>
                  <MenuItem key="inativo" value="inativo">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Condição</InputLabel>
                <Select
                  value={equipamentosFilters.condicao}
                  onChange={(e) => setEquipamentosFilters(prev => ({ ...prev, condicao: e.target.value }))}
                  label="Condição"
                >
                  <MenuItem key="todas-condicao" value="">Todas</MenuItem>
                  <MenuItem key="excelente" value="excelente">Excelente</MenuItem>
                  <MenuItem key="bom" value="bom">Bom</MenuItem>
                  <MenuItem key="regular" value="regular">Regular</MenuItem>
                  <MenuItem key="ruim" value="ruim">Ruim</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Setor</InputLabel>
                <Select
                  value={equipamentosFilters.setor}
                  onChange={(e) => setEquipamentosFilters(prev => ({ ...prev, setor: e.target.value }))}
                  label="Setor"
                >
                  <MenuItem key="todos-setor" value="">Todos</MenuItem>
                  <MenuItem key="operacional-emp" value="operacional">Operacional</MenuItem>
                  <MenuItem key="administrativo-emp" value="administrativo">Administrativo</MenuItem>
                  <MenuItem key="manutencao-emp" value="manutencao">Manutenção</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadEquipamentos}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de equipamentos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Foto</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Condição</TableCell>
              <TableCell>Setor</TableCell>
              <TableCell>Localização</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {equipamentosLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : equipamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhum equipamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              equipamentos.map((equipamento) => (
                <TableRow key={equipamento.id}>
                  <TableCell>
                    {getFirstPhotoUrl(equipamento.fotos) ? (
                      <img src={getFirstPhotoUrl(equipamento.fotos)} alt="foto" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{equipamento.codigo}</TableCell>
                  <TableCell>{equipamento.nome}</TableCell>
                  <TableCell>{equipamento.valor != null ? formatters.currency(equipamento.valor) : '-'}</TableCell>
                  <TableCell>{equipamento.tipo || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={equipamento.status}
                      color={getStatusColor(equipamento.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={equipamento.condicao}
                      color={getCondicaoColor(equipamento.condicao)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{equipamento.setor_responsavel}</TableCell>
                  <TableCell>{equipamento.localizacao}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(equipamento);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      {equipamentosPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={equipamentosPagination.pages}
            page={equipamentosPagination.current_page}
            onChange={(e, page) => {
              setEquipamentosFilters(prev => ({ ...prev, page }));
              loadEquipamentos();
            }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );

  const renderEmprestimosTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={emprestimosFilters.status}
                  onChange={(e) => setEmprestimosFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem key="todos-emp-status" value="">Todos</MenuItem>
                  <MenuItem key="pendente" value="pendente">Pendente</MenuItem>
                  <MenuItem key="ativo" value="ativo">Ativo</MenuItem>
                  <MenuItem key="devolvido" value="devolvido">Devolvido</MenuItem>
                  <MenuItem key="vencido" value="vencido">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Equipamento</InputLabel>
                <Select
                  value={emprestimosFilters.equipamento_id}
                  onChange={(e) => setEmprestimosFilters(prev => ({ ...prev, equipamento_id: e.target.value }))}
                  label="Equipamento"
                >
                  <MenuItem key="todos-equipamento" value="">Todos</MenuItem>
                  {equipamentos.map((equipamento) => (
                    <MenuItem key={equipamento.id} value={equipamento.id}>
                      {equipamento.codigo} - {equipamento.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant={emprestimosFilters.vencidos ? 'contained' : 'outlined'}
                color="error"
                onClick={() => setEmprestimosFilters(prev => ({ ...prev, vencidos: !prev.vencidos }))}
                startIcon={<WarningIcon />}
              >
                Vencidos
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadEmprestimos}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de cautelas */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Equipamento</TableCell>
              <TableCell>Usuário</TableCell>
              <TableCell>Data Cautela</TableCell>
              <TableCell>Data Vencimento</TableCell>
              <TableCell>Data Devolução</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {emprestimosLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : emprestimos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma cautela encontrada
                </TableCell>
              </TableRow>
            ) : (
              emprestimos.map((emprestimo) => {
                const isVencido = emprestimo.status === 'ativo' && isEmprestimoVencido(emprestimo.data_vencimento);
                
                return (
                  <TableRow key={emprestimo.id} sx={isVencido ? { bgcolor: 'error.light', opacity: 0.1 } : {}}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <DevicesIcon color="action" fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {emprestimo.equipamento_codigo}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {emprestimo.equipamento_nome}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                          {(emprestimo.solicitante_nome || emprestimo.usuario_nome || '?').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {emprestimo.solicitante_nome || emprestimo.usuario_nome}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {emprestimo.solicitante_matricula || emprestimo.usuario_matricula}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(emprestimo.data_emprestimo)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {isVencido && <WarningIcon color="error" fontSize="small" />}
                        <Typography
                          variant="body2"
                          color={isVencido ? 'error' : 'inherit'}
                          fontWeight={isVencido ? 'bold' : 'normal'}
                        >
                          {formatDate(emprestimo.data_vencimento)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {emprestimo.data_devolucao ? formatDate(emprestimo.data_devolucao) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isVencido ? 'Vencido' : emprestimo.status}
                        color={isVencido ? 'error' : getStatusColor(emprestimo.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog('emprestimo', emprestimo)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        {emprestimo.status === 'ativo' && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog('devolucao', emprestimo)}
                          >
                            <ReturnIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      {emprestimosPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={emprestimosPagination.pages}
            page={emprestimosPagination.current_page}
            onChange={(e, page) => {
              setEmprestimosFilters(prev => ({ ...prev, page }));
              loadEmprestimos();
            }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );

  const renderRelatoriosTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Resumo de Cautelas</Typography>
            <Button variant="outlined" onClick={loadRelatorios}>Atualizar</Button>
          </Box>
          {relResumo && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Total</Typography>
                  <Typography variant="h5">{relResumo.resumo?.total_emprestimos ?? '-'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Ativos</Typography>
                  <Typography variant="h5">{relResumo.resumo?.emprestimos_ativos ?? '-'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Devolvidos</Typography>
                  <Typography variant="h5">{relResumo.resumo?.emprestimos_devolvidos ?? '-'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Vencidos</Typography>
                  <Typography variant="h5">{relResumo.resumo?.emprestimos_vencidos ?? '-'}</Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Top Equipamentos Emprestados</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Nome</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {relTop.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.codigo}</TableCell>
                        <TableCell>{t.nome}</TableCell>
                        <TableCell>{t.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Termos Recentes</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Equipamento</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {termosRecentes.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '-'}</TableCell>
                        <TableCell>{t.equipamento_codigo} - {t.equipamento_nome}</TableCell>
                        <TableCell>
                          {t.url_pdf ? (
                            <Button size="small" href={t.url_pdf} target="_blank">Abrir PDF</Button>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Gestão de Cautelas
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Controle de cautela de equipamentos
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={
              <Badge 
                badgeContent={equipamentos.filter(e => e.status === 'emprestado').length} 
                color="warning"
              >
                <DevicesIcon />
              </Badge>
            } 
            label="Equipamentos" 
          />
          <Tab 
            icon={
              <Badge 
                badgeContent={emprestimos.filter(e => e.status === 'ativo' && isEmprestimoVencido(e.data_vencimento)).length} 
                color="error"
              >
                <AssignmentIcon />
              </Badge>
            } 
            label="Cautelas" 
          />
          <Tab icon={<AssessmentIcon />} label="Relatórios" />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderEquipamentosTab()}
      {activeTab === 1 && renderEmprestimosTab()}
      {activeTab === 2 && renderRelatoriosTab()}

      {/* FAB para adicionar */}
      {((activeTab === 1) || !isOperador()) && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => {
            if (activeTab === 0 && !isOperador()) handleOpenDialog('equipamento');
            else if (activeTab === 1) handleOpenDialog('emprestimo');
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem key="view-equipamento" onClick={() => {
          handleOpenDialog('equipamento', selectedItem);
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        {!isOperador() && (
          <MenuItem key="edit-equipamento" onClick={() => {
            handleOpenDialog('equipamento', selectedItem);
            setAnchorEl(null);
          }}>
            <EditIcon sx={{ mr: 1 }} />
            Editar
          </MenuItem>
        )}
        {selectedItem?.status === 'disponivel' && (
          <MenuItem key="emprestar-equipamento" onClick={() => {
            handleOpenDialog('emprestimo', { equipamento_id: selectedItem?.id });
            setAnchorEl(null);
          }}>
            <AssignmentIcon sx={{ mr: 1 }} />
            Cautelar
          </MenuItem>
        )}
      </Menu>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Leitor de Código de Barras"
                placeholder="Aponte o leitor aqui"
                value={barcodeEquip}
                onChange={(e) => setBarcodeEquip(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={addEquipamentoPorBarcode}
              >
                Adicionar ao Carrinho
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Prevista de Devolução"
                type="date"
                value={formData.data_prevista_devolucao || ''}
                onChange={(e) => handleFormChange('data_prevista_devolucao', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                onClick={confirmarCautelaEmLote}
                disabled={loteLoading}
              >
                {loteLoading ? <CircularProgress size={20} /> : 'Cautelar em Lote'}
              </Button>
            </Grid>
          </Grid>
          {carrinho.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Nome</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {carrinho.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.codigo}</TableCell>
                      <TableCell>{item.nome}</TableCell>
                      <TableCell>
                        <Button color="error" onClick={() => removerDoCarrinho(item.id)}>Remover</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog para formulários */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'equipamento' && (selectedItem ? 'Editar Equipamento' : 'Novo Equipamento')}
          {dialogType === 'emprestimo' && (selectedItem?.id ? 'Visualizar Cautela' : 'Nova Cautela')}
          {dialogType === 'devolucao' && 'Devolver Equipamento'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'equipamento' && (
            <Box mt={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Código do Equipamento"
                    value={formData.codigo || ''}
                    onChange={(e) => handleFormChange('codigo', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nome"
                    value={formData.nome || ''}
                    onChange={(e) => handleFormChange('nome', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Código de Barras"
                    placeholder="Aponte o leitor aqui"
                    value={formData.barcode || ''}
                    onChange={(e) => handleFormChange('barcode', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Marca"
                    value={formData.marca || ''}
                    onChange={(e) => handleFormChange('marca', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Modelo"
                    value={formData.modelo || ''}
                    onChange={(e) => handleFormChange('modelo', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Número de Série"
                    value={formData.numero_serie || ''}
                    onChange={(e) => handleFormChange('numero_serie', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Descrição"
                    value={formData.descricao || ''}
                    onChange={(e) => handleFormChange('descricao', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status || ''}
                      label="Status"
                      onChange={(e) => handleFormChange('status', e.target.value)}
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      <MenuItem value="disponivel">Disponível</MenuItem>
                      <MenuItem value="emprestado">Emprestado</MenuItem>
                      <MenuItem value="manutencao">Manutenção</MenuItem>
                      <MenuItem value="inativo">Inativo</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Condição</InputLabel>
                    <Select
                      value={formData.condicao || ''}
                      label="Condição"
                      onChange={(e) => handleFormChange('condicao', e.target.value)}
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      <MenuItem value="excelente">Excelente</MenuItem>
                      <MenuItem value="bom">Bom</MenuItem>
                      <MenuItem value="regular">Regular</MenuItem>
                      <MenuItem value="ruim">Ruim</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor (R$)"
                    inputMode="numeric"
                    value={formData.valor || ''}
                    onChange={(e) => handleFormChange('valor', e.target.value.replace(/\D/g,'').replace(/(\d{1,})(\d{2})$/,'$1.$2'))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Data de Aquisição"
                    type="date"
                    value={formData.data_aquisicao || ''}
                    onChange={(e) => handleFormChange('data_aquisicao', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Setor Responsável</InputLabel>
                    <Select
                      value={formData.setor_responsavel || ''}
                      label="Setor Responsável"
                      onChange={(e) => handleFormChange('setor_responsavel', e.target.value)}
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      <MenuItem value="operacional">Operacional</MenuItem>
                      <MenuItem value="administrativo">Administrativo</MenuItem>
                      <MenuItem value="manutencao">Manutenção</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Localização</InputLabel>
                    <Select
                      value={formData.localizacao || ''}
                      label="Localização"
                      onChange={(e) => handleFormChange('localizacao', e.target.value)}
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      <MenuItem value="almoxarifado_adm">Almoxarifado Administrativo</MenuItem>
                      <MenuItem value="almoxarifado_op">Almoxarifado Operacional</MenuItem>
                      <MenuItem value="viatura">Viatura</MenuItem>
                      <MenuItem value="sop">SOP</MenuItem>
                      <MenuItem value="sat">SAT</MenuItem>
                      <MenuItem value="saad">SAAD</MenuItem>
                      <MenuItem value="comando">COMANDO</MenuItem>
                      <MenuItem value="subcomando">SUBCOMANDO</MenuItem>
                      <MenuItem value="cob">COB</MenuItem>
                      <MenuItem value="sec">SEC</MenuItem>
                      <MenuItem value="garagem">Garagem</MenuItem>
                      <MenuItem value="lava_jato">Lava Jato</MenuItem>
                      <MenuItem value="outro">Outro (especificar)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={formData.tipo || ''}
                      label="Tipo"
                      onChange={(e) => handleFormChange('tipo', e.target.value)}
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      <MenuItem value="ferramenta">Ferramenta</MenuItem>
                      <MenuItem value="equipamento">Equipamento</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.exige_autorizacao !== false}
                        onChange={(e) => handleFormChange('exige_autorizacao', e.target.checked)}
                      />
                    }
                    label="Exige Autorização"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!formData.exige_data_devolucao}
                        onChange={(e) => handleFormChange('exige_data_devolucao', e.target.checked)}
                      />
                    }
                    label="Exige Data de Devolução"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observações"
                    value={formData.observacoes || ''}
                    onChange={(e) => handleFormChange('observacoes', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Fotos do Equipamento</Typography>
                  <Box display="flex" gap={1} mb={1}>
                    <Button
                      variant="outlined"
                      component="label"
                    >
                      Selecionar Fotos
                      <input
                        hidden
                        multiple
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          try {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            const resp = await uploadService.uploadFotos(files);
                            const urls = (resp.data?.fotos || []).map(f => ({ url: buildAssetUrl(f.url) }));
                            handleFormChange('fotos', [ ...(formData.fotos || []), ...urls ]);
                          } catch {
                            setError('Erro ao enviar fotos');
                          }
                        }}
                      />
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => handleFormChange('fotos', [])}
                    >
                      Limpar Fotos
                    </Button>
                  </Box>
                  <Grid container spacing={1}>
                    {(formData.fotos || []).map((f, idx) => (
                      <Grid item xs={6} sm={3} md={2} key={`foto-${idx}`}>
                        <Box position="relative">
                          <img src={buildAssetUrl(f.url)} alt={`foto-${idx}`} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 4 }} />
                          <Button
                            size="small"
                            color="error"
                            onClick={() => {
                              const next = [...(formData.fotos || [])];
                              next.splice(idx, 1);
                              handleFormChange('fotos', next);
                            }}
                          >
                            Remover
                          </Button>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
          {dialogType === 'emprestimo' && (
            <Box mt={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Equipamento ID"
                    value={formData.equipamento_id || ''}
                    onChange={(e) => handleFormChange('equipamento_id', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Data Prevista de Devolução"
                    type="date"
                    value={formData.data_prevista_devolucao || ''}
                    onChange={(e) => handleFormChange('data_prevista_devolucao', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Motivo do Empréstimo"
                    value={formData.motivo || ''}
                    onChange={(e) => handleFormChange('motivo', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Assinatura do Solicitante</Typography>
                  <canvas
                    ref={canvasRefSolic}
                    width={500}
                    height={120}
                    style={{ border: '1px solid #ccc', width: '100%' }}
                    onMouseDown={(e) => startDraw(canvasRefSolic, e)}
                    onMouseMove={(e) => drawMove(canvasRefSolic, e)}
                    onMouseUp={() => endDraw(canvasRefSolic, setAssinaturaSolic)}
                    onMouseLeave={() => endDraw(canvasRefSolic, setAssinaturaSolic)}
                  />
                  <Box mt={1} display="flex" gap={1}>
                    <Button variant="text" onClick={() => { clearCanvas(canvasRefSolic); setAssinaturaSolic(null); }}>Limpar</Button>
                  </Box>
                </Grid>
                {selectedItem?.id && user?.id !== selectedItem?.usuario_solicitante_id && !isOperador() && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Assinatura do Autorizador</Typography>
                    <canvas
                      ref={canvasRefAuto}
                      width={500}
                      height={120}
                      style={{ border: '1px solid #ccc', width: '100%' }}
                      onMouseDown={(e) => startDraw(canvasRefAuto, e)}
                      onMouseMove={(e) => drawMove(canvasRefAuto, e)}
                      onMouseUp={() => endDraw(canvasRefAuto, setAssinaturaAuto)}
                      onMouseLeave={() => endDraw(canvasRefAuto, setAssinaturaAuto)}
                    />
                    <Box mt={1} display="flex" gap={1}>
                      <Button variant="text" onClick={() => { clearCanvas(canvasRefAuto); setAssinaturaAuto(null); }}>Limpar</Button>
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      try {
                        const id = selectedItem?.id || formData.id;
                        if (!id) return;
                        const resp = await emprestimosService.gerarTermoPdf(id, {
                          assinatura_solicitante: assinaturaSolic,
                          assinatura_autorizador: assinaturaAuto
                        });
                        const blob = new Blob([resp.data], { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `termo_cautela_${id}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        setError('Erro ao gerar termo PDF');
                      }
                    }}
                  >
                    Gerar Termo PDF
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
          {dialogType === 'devolucao' && (
            <Box mt={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Condição de Devolução"
                    value={formData.condicao_devolucao || ''}
                    onChange={(e) => handleFormChange('condicao_devolucao', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Observações"
                    value={formData.observacoes_devolucao || ''}
                    onChange={(e) => handleFormChange('observacoes_devolucao', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (
              dialogType === 'devolucao' ? 'Devolver' : 'Salvar'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Emprestimos;
