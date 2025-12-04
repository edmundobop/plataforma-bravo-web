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
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Build as BuildIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { frotaService } from '../services/api';
import { useTenant } from '../contexts/TenantContext';

const Manutencoes = () => {
  const { currentUnit } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados para manutenções
  const [manutencoes, setManutencoes] = useState([]);
  const [manutencoesLoading, setManutencoesLoading] = useState(false);
  const [manutencoesFilters, setManutencoesFilters] = useState({
    viatura_id: '',
    status: '',
    data_inicio: '',
    data_fim: '',
    tipo: '',
    search: '',
  });
  const [manutencoesPage, setManutencoesPage] = useState(1);
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const qp = Number(params.get('page') || '1');
      if (!Number.isNaN(qp) && qp > 0 && qp !== manutencoesPage) {
        setManutencoesPage(qp);
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

  const handleManutencoesPageChange = (page) => {
    setManutencoesPage(page);
    setQueryParam('page', page);
  };
  const [viaturasDisponiveis, setViaturasDisponiveis] = useState([]);
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulários
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Carregar manutenções
  const loadManutencoes = useCallback(async () => {
    try {
      setManutencoesLoading(true);
      const response = await frotaService.getManutencoes(manutencoesFilters);
      const manutencoesData = Array.isArray(response.data) ? response.data : [];
      setManutencoes(manutencoesData);
    } catch (err) {
      console.error('Erro ao carregar manutenções:', err);
      setError('❌ Erro ao carregar manutenções');
    } finally {
      setManutencoesLoading(false);
    }
  }, [manutencoesFilters]);

  // useEffect para carregar dados iniciais
  useEffect(() => {
    loadManutencoes();
  }, [loadManutencoes]);

  // useEffect para recarregar dados quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadManutencoes();
    }
  }, [currentUnit, loadManutencoes]);

  useEffect(() => {
    frotaService.getViaturas({ limit: 500 })
      .then((res) => {
        const lista = res.data?.viaturas || res.viaturas || [];
        setViaturasDisponiveis(lista);
      })
      .catch((err) => {
        console.error('Erro ao carregar viaturas para filtros:', err);
        setViaturasDisponiveis([]);
      });
  }, [currentUnit]);

  useEffect(() => {
    setManutencoesPage(1);
    setQueryParam('page', 1);
  }, [manutencoesFilters, isMobile]);
  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({});
    }
    
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setFormData({});
    setFormErrors({});
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleDelete = async (item) => {
    if (!item || !item.id) {
      setError('❌ Item não encontrado para exclusão');
      return;
    }

    const confirmMessage = `Tem certeza que deseja excluir esta manutenção?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await frotaService.deleteManutencao(item.id);
      setError('✅ Manutenção excluída com sucesso');
      loadManutencoes();
    } catch (err) {
      console.error('Erro ao excluir manutenção:', err);
      setError('❌ Erro ao excluir manutenção');
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const dialogType = 'manutencao';
      
      if (selectedItem) {
        await frotaService.updateManutencao(selectedItem.id, formData);
      } else {
        await frotaService.createManutencao(formData);
      }
      loadManutencoes();
      handleCloseDialog();
      setError(selectedItem ? '✅ Manutenção atualizada com sucesso' : '✅ Manutenção criada com sucesso');
    } catch (err) {
      console.error('Erro ao salvar manutenção:', err);
      setError('❌ Erro ao salvar manutenção');
    } finally {
      setLoading(false);
    }
  };

  const handleFabClick = () => {
    handleOpenDialog('manutencao');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente': return 'warning';
      case 'em_andamento': return 'info';
      case 'concluida': return 'success';
      case 'cancelada': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const manutencoesPerPage = isMobile ? 5 : 10;
  const filteredManutencoes = manutencoes.filter((m) => {
    const s = (manutencoesFilters.search || '').toLowerCase();
    const matchSearch = !s ||
      (m.viatura_prefixo || '').toLowerCase().includes(s) ||
      (m.descricao || '').toLowerCase().includes(s) ||
      (m.tipo || '').toLowerCase().includes(s);
    return matchSearch;
  });
  const manutencoesPages = Math.max(1, Math.ceil(filteredManutencoes.length / manutencoesPerPage));
  const paginatedManutencoes = filteredManutencoes.slice((manutencoesPage - 1) * manutencoesPerPage, manutencoesPage * manutencoesPerPage);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Manutenções
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie as manutenções das viaturas
        </Typography>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity={error.includes('✅') ? 'success' : 'error'} sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      {isMobile ? (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<FilterIcon />}>Filtros</AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Viatura</InputLabel>
                  <Select
                    value={manutencoesFilters.viatura_id}
                    onChange={(e) => setManutencoesFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                    label="Viatura"
                  >
                    <MenuItem key="todas-viaturas" value="">Todas</MenuItem>
                    {viaturasDisponiveis.map((v) => (
                      <MenuItem key={v.id} value={v.id}>
                        {(v.prefixo || v.placa || v.viatura_prefixo || v.viatura_placa || `#${v.id}`)}{v.modelo || v.viatura_modelo ? ` - ${v.modelo || v.viatura_modelo}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Buscar (prefixo, tipo, descrição)"
                  value={manutencoesFilters.search}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={manutencoesFilters.status}
                    onChange={(e) => setManutencoesFilters(prev => ({ ...prev, status: e.target.value }))}
                    label="Status"
                  >
                    <MenuItem key="todos-status" value="">Todos</MenuItem>
                    <MenuItem key="pendente" value="pendente">Pendente</MenuItem>
                    <MenuItem key="em_andamento" value="em_andamento">Em Andamento</MenuItem>
                    <MenuItem key="concluida" value="concluida">Concluída</MenuItem>
                    <MenuItem key="cancelada" value="cancelada">Cancelada</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Início"
                  type="date"
                  value={manutencoesFilters.data_inicio}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Fim"
                  type="date"
                  value={manutencoesFilters.data_fim}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filtros
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Viatura</InputLabel>
                  <Select
                    value={manutencoesFilters.viatura_id}
                    onChange={(e) => setManutencoesFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                    label="Viatura"
                  >
                    <MenuItem key="todas-viaturas" value="">Todas</MenuItem>
                    {viaturasDisponiveis.map((v) => (
                      <MenuItem key={v.id} value={v.id}>
                        {(v.prefixo || v.placa || v.viatura_prefixo || v.viatura_placa || `#${v.id}`)}{v.modelo || v.viatura_modelo ? ` - ${v.modelo || v.viatura_modelo}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Buscar (prefixo, tipo, descrição)"
                  value={manutencoesFilters.search}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={manutencoesFilters.status}
                    onChange={(e) => setManutencoesFilters(prev => ({ ...prev, status: e.target.value }))}
                    label="Status"
                  >
                    <MenuItem key="todos-status" value="">Todos</MenuItem>
                    <MenuItem key="pendente" value="pendente">Pendente</MenuItem>
                    <MenuItem key="em_andamento" value="em_andamento">Em Andamento</MenuItem>
                    <MenuItem key="concluida" value="concluida">Concluída</MenuItem>
                    <MenuItem key="cancelada" value="cancelada">Cancelada</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Data Início"
                  type="date"
                  value={manutencoesFilters.data_inicio}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Data Fim"
                  type="date"
                  value={manutencoesFilters.data_fim}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Lista de manutenções */}
      {!isMobile ? (
        <>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Viatura</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data Início</TableCell>
                <TableCell>Data Fim</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {manutencoesLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedManutencoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhuma manutenção encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedManutencoes.map((manutencao) => (
                  <TableRow key={manutencao.id}>
                    <TableCell>{manutencao.viatura_prefixo}</TableCell>
                    <TableCell>{manutencao.tipo}</TableCell>
                    <TableCell>{manutencao.descricao}</TableCell>
                    <TableCell>
                      <Chip
                        label={manutencao.status}
                        color={getStatusColor(manutencao.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(manutencao.data_inicio)}</TableCell>
                    <TableCell>{formatDate(manutencao.data_fim)}</TableCell>
                    <TableCell>
                      <IconButton onClick={(e) => handleMenuOpen(e, manutencao)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {manutencoesPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={manutencoesPages}
              page={manutencoesPage}
              onChange={(e, page) => handleManutencoesPageChange(page)}
              color="primary"
            />
          </Box>
        )}
        </>
      ) : (
        <Grid container spacing={2}>
          {manutencoesLoading ? (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : paginatedManutencoes.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Nenhuma manutenção encontrada</Typography>
            </Grid>
          ) : (
            paginatedManutencoes.map((manutencao) => (
              <Grid item xs={12} key={manutencao.id}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <BuildIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{manutencao.viatura_prefixo}</Typography>
                        <Typography variant="caption" color="text.secondary">{manutencao.tipo}</Typography>
                      </Box>
                    </Box>
                    <Chip label={manutencao.status} color={getStatusColor(manutencao.status)} size="small" />
                    <IconButton onClick={(e) => handleMenuOpen(e, manutencao)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  {manutencao.descricao && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {manutencao.descricao}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Início: {formatDate(manutencao.data_inicio)}</Typography>
                    <Typography variant="caption" color="text.secondary">Fim: {formatDate(manutencao.data_fim)}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))
          )}
          {manutencoesPages > 1 && (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" mt={1}>
                <Pagination
                  count={manutencoesPages}
                  page={manutencoesPage}
                  onChange={(e, page) => handleManutencoesPageChange(page)}
                  color="primary"
                />
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem key="edit-manutencao" onClick={() => {
          handleOpenDialog('manutencao', selectedItem);
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem key="view-manutencao" onClick={() => {
          handleOpenDialog('manutencao', selectedItem);
          handleMenuClose();
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        <MenuItem key="delete-manutencao" onClick={() => handleDelete(selectedItem)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>

      {/* Diálogo de formulário */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          {selectedItem ? 'Editar Manutenção' : 'Nova Manutenção'}
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Viatura</InputLabel>
                <Select
                  value={formData.viatura_id || ''}
                  onChange={(e) => handleFormChange('viatura_id', e.target.value)}
                  label="Viatura"
                >
                  {viaturasDisponiveis.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {(v.prefixo || v.placa || v.viatura_prefixo || v.viatura_placa || `#${v.id}`)}{v.modelo || v.viatura_modelo ? ` - ${v.modelo || v.viatura_modelo}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.tipo || ''}
                  onChange={(e) => handleFormChange('tipo', e.target.value)}
                  label="Tipo"
                >
                  <MenuItem key="preventiva" value="preventiva">Preventiva</MenuItem>
                  <MenuItem key="corretiva" value="corretiva">Corretiva</MenuItem>
                  <MenuItem key="preditiva" value="preditiva">Preditiva</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.descricao || ''}
                onChange={(e) => handleFormChange('descricao', e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status || ''}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem key="pendente-form" value="pendente">Pendente</MenuItem>
                  <MenuItem key="em_andamento-form" value="em_andamento">Em Andamento</MenuItem>
                  <MenuItem key="concluida-form" value="concluida">Concluída</MenuItem>
                  <MenuItem key="cancelada-form" value="cancelada">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={formData.data_inicio || ''}
                onChange={(e) => handleFormChange('data_inicio', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={formData.data_fim || ''}
                onChange={(e) => handleFormChange('data_fim', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Custo"
                type="number"
                value={formData.custo || ''}
                onChange={(e) => handleFormChange('custo', e.target.value)}
                InputProps={{
                  startAdornment: 'R$ '
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAB */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleFabClick}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default Manutencoes;
