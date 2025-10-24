import React, { useState, useEffect, useCallback } from 'react';
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
  
  // Estados para manutenções
  const [manutencoes, setManutencoes] = useState([]);
  const [manutencoesLoading, setManutencoesLoading] = useState(false);
  const [manutencoesFilters, setManutencoesFilters] = useState({
    viatura_id: '',
    status: '',
    data_inicio: '',
    data_fim: '',
    tipo: '',
  });
  
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
                  {/* Viaturas serão carregadas dinamicamente */}
                </Select>
              </FormControl>
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

      {/* Lista de manutenções */}
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
            ) : manutencoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma manutenção encontrada
                </TableCell>
              </TableRow>
            ) : (
              manutencoes.map((manutencao) => (
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedItem ? 'Editar Manutenção' : 'Nova Manutenção'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Viatura</InputLabel>
                <Select
                  value={formData.viatura_id || ''}
                  onChange={(e) => handleFormChange('viatura_id', e.target.value)}
                  label="Viatura"
                >
                  {/* Viaturas serão carregadas dinamicamente */}
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
        <DialogActions>
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