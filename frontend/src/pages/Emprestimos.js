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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { emprestimosService } from '../services/api';

const Emprestimos = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { currentUnit } = useTenant();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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

  const loadEquipamentos = async () => {
    try {
      setEquipamentosLoading(true);
      const response = await emprestimosService.getEquipamentos(equipamentosFilters);
      setEquipamentos(response.data.equipamentos || []);
      setEquipamentosPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar equipamentos:', err);
      setError('Erro ao carregar equipamentos');
    } finally {
      setEquipamentosLoading(false);
    }
  };

  const loadEmprestimos = async () => {
    try {
      setEmprestimosLoading(true);
      const response = await emprestimosService.getEmprestimos(emprestimosFilters);
      setEmprestimos(response.data.emprestimos || []);
      setEmprestimosPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar cautelas:', err);
      setError('Erro ao carregar cautelas');
    } finally {
      setEmprestimosLoading(false);
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
      
      if (dialogType === 'equipamento') {
        if (selectedItem) {
          // Atualizar equipamento (implementar quando necessário)
        } else {
          await emprestimosService.createEquipamento(formData);
        }
        loadEquipamentos();
      } else if (dialogType === 'emprestimo') {
        await emprestimosService.createEmprestimo(formData);
        loadEmprestimos();
        loadEquipamentos(); // Atualizar status dos equipamentos
      } else if (dialogType === 'devolucao') {
        await emprestimosService.devolverEquipamento(selectedItem.id, formData);
        loadEmprestimos();
        loadEquipamentos();
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar dados');
    } finally {
      setLoading(false);
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
              <TableCell>Código</TableCell>
              <TableCell>Nome</TableCell>
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
                  <TableCell>{equipamento.codigo}</TableCell>
                  <TableCell>{equipamento.nome}</TableCell>
                  <TableCell>{equipamento.tipo}</TableCell>
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
                  <TableCell>{equipamento.setor}</TableCell>
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
                          {emprestimo.usuario_nome?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {emprestimo.usuario_nome}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {emprestimo.usuario_matricula}
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
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderEquipamentosTab()}
      {activeTab === 1 && renderEmprestimosTab()}

      {/* FAB para adicionar */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          if (activeTab === 0) handleOpenDialog('equipamento');
          else if (activeTab === 1) handleOpenDialog('emprestimo');
        }}
      >
        <AddIcon />
      </Fab>

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
        <MenuItem key="edit-equipamento" onClick={() => {
          handleOpenDialog('equipamento', selectedItem);
          setAnchorEl(null);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        {selectedItem?.status === 'disponivel' && (
          <MenuItem key="emprestar-equipamento" onClick={() => {
            handleOpenDialog('emprestimo', { equipamento_id: selectedItem?.id });
            setAnchorEl(null);
          }}>
            <AssignmentIcon sx={{ mr: 1 }} />
            Emprestar
          </MenuItem>
        )}
      </Menu>

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
          {/* Formulários específicos serão implementados conforme necessário */}
          <Typography variant="body2" color="textSecondary">
            Formulário em desenvolvimento...
          </Typography>
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