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
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Fab,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  DirectionsCar as CarIcon,
  Build as BuildIcon,
  Assignment as ChecklistIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { frotaService } from '../services/api';

const Frota = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para viaturas
  const [viaturas, setViaturas] = useState([]);
  const [viaturasLoading, setViaturasLoading] = useState(false);
  const [viaturasFilters, setViaturasFilters] = useState({
    status: '',
    setor: '',
    search: '',
  });
  
  // Estados para checklists
  const [checklists, setChecklists] = useState([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [checklistsFilters, setChecklistsFilters] = useState({
    viatura_id: '',
    tipo: '',
    status: '',
  });
  
  // Estados para manutenções
  const [manutencoes, setManutencoes] = useState([]);
  const [manutencoesLoading, setManutencoesLoading] = useState(false);
  const [manutencoesFilters, setManutencoesFilters] = useState({
    viatura_id: '',
    status: '',
  });
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'viatura', 'checklist', 'manutencao'
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
        loadViaturas();
        break;
      case 1:
        loadChecklists();
        break;
      case 2:
        loadManutencoes();
        break;
      default:
        break;
    }
  };

  const loadViaturas = async () => {
    try {
      setViaturasLoading(true);
      const response = await frotaService.getViaturas(viaturasFilters);
      setViaturas(response.data.viaturas || []);
    } catch (err) {
      console.error('Erro ao carregar viaturas:', err);
      setError('Erro ao carregar viaturas');
    } finally {
      setViaturasLoading(false);
    }
  };

  const loadChecklists = async () => {
    try {
      setChecklistsLoading(true);
      const response = await frotaService.getChecklists(checklistsFilters);
      setChecklists(response.data.checklists || []);
    } catch (err) {
      console.error('Erro ao carregar checklists:', err);
      setError('Erro ao carregar checklists');
    } finally {
      setChecklistsLoading(false);
    }
  };

  const loadManutencoes = async () => {
    try {
      setManutencoesLoading(true);
      const response = await frotaService.getManutencoes(manutencoesFilters);
      setManutencoes(response.data.manutencoes || []);
    } catch (err) {
      console.error('Erro ao carregar manutenções:', err);
      setError('Erro ao carregar manutenções');
    } finally {
      setManutencoesLoading(false);
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
      setError('');
      
      console.log('Salvando dados:', { dialogType, selectedItem: selectedItem?.id, formData });
      
      if (dialogType === 'viatura') {
        if (selectedItem) {
          const response = await frotaService.updateViatura(selectedItem.id, formData);
          console.log('Viatura atualizada:', response);
        } else {
          const response = await frotaService.createViatura(formData);
          console.log('Viatura criada:', response);
        }
        await loadViaturas();
      } else if (dialogType === 'checklist') {
        await frotaService.createChecklist(formData);
        await loadChecklists();
      } else if (dialogType === 'manutencao') {
        if (selectedItem) {
          await frotaService.updateManutencao(selectedItem.id, formData);
        } else {
          await frotaService.createManutencao(formData);
        }
        await loadManutencoes();
      }
      
      console.log('Dados salvos com sucesso, fechando diálogo');
      handleCloseDialog();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Erro ao salvar dados';
      setError(errorMessage);
      // Não fechar o diálogo em caso de erro para que o usuário possa corrigir
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'disponivel':
      case 'concluido':
      case 'finalizada':
        return 'success';
      case 'em_uso':
      case 'pendente':
      case 'em_andamento':
        return 'warning';
      case 'manutencao':
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const renderViaturasTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Buscar"
                value={viaturasFilters.search}
                onChange={(e) => setViaturasFilters(prev => ({ ...prev, search: e.target.value }))}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={viaturasFilters.status}
                  onChange={(e) => setViaturasFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="disponivel">Disponível</MenuItem>
                  <MenuItem value="em_uso">Em Uso</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
                  <MenuItem value="inativa">Inativa</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Setor</InputLabel>
                <Select
                  value={viaturasFilters.setor}
                  onChange={(e) => setViaturasFilters(prev => ({ ...prev, setor: e.target.value }))}
                  label="Setor"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="operacional">Operacional</MenuItem>
                  <MenuItem value="administrativo">Administrativo</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadViaturas}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de viaturas */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Prefixo</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Placa</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Setor</TableCell>
              <TableCell>Hodômetro</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {viaturasLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : viaturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma viatura encontrada
                </TableCell>
              </TableRow>
            ) : (
              viaturas.map((viatura) => (
                <TableRow key={viatura.id}>
                  <TableCell>{viatura.prefixo}</TableCell>
                  <TableCell>{viatura.modelo}</TableCell>
                  <TableCell>{viatura.placa}</TableCell>
                  <TableCell>
                    <Chip
                      label={viatura.status}
                      color={getStatusColor(viatura.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{viatura.setor_responsavel}</TableCell>
                  <TableCell>{viatura.km_atual?.toLocaleString()} km</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(viatura);
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
    </Box>
  );

  const renderChecklistsTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Viatura</InputLabel>
                <Select
                  value={checklistsFilters.viatura_id}
                  onChange={(e) => setChecklistsFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                  label="Viatura"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {viaturas.map((viatura) => (
                    <MenuItem key={viatura.id} value={viatura.id}>
                      {viatura.prefixo} - {viatura.modelo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={checklistsFilters.tipo}
                  onChange={(e) => setChecklistsFilters(prev => ({ ...prev, tipo: e.target.value }))}
                  label="Tipo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="saida">Saída</MenuItem>
                  <MenuItem value="retorno">Retorno</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={checklistsFilters.status}
                  onChange={(e) => setChecklistsFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="concluido">Concluído</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadChecklists}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de checklists */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Viatura</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Usuário</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {checklistsLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : checklists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhum checklist encontrado
                </TableCell>
              </TableRow>
            ) : (
              checklists.map((checklist) => (
                <TableRow key={checklist.id}>
                  <TableCell>{checklist.viatura_prefixo}</TableCell>
                  <TableCell>{checklist.tipo}</TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.status}
                      color={getStatusColor(checklist.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{checklist.usuario_nome}</TableCell>
                  <TableCell>{formatDate(checklist.created_at)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog('checklist', checklist)}>
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderManutencoesTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Viatura</InputLabel>
                <Select
                  value={manutencoesFilters.viatura_id}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                  label="Viatura"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {viaturas.map((viatura) => (
                    <MenuItem key={viatura.id} value={viatura.id}>
                      {viatura.prefixo} - {viatura.modelo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={manutencoesFilters.status}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="agendada">Agendada</MenuItem>
                  <MenuItem value="em_andamento">Em Andamento</MenuItem>
                  <MenuItem value="finalizada">Finalizada</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadManutencoes}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de manutenções */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Viatura</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data Agendada</TableCell>
              <TableCell>Custo</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {manutencoesLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : manutencoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhuma manutenção encontrada
                </TableCell>
              </TableRow>
            ) : (
              manutencoes.map((manutencao) => (
                <TableRow key={manutencao.id}>
                  <TableCell>{manutencao.viatura_prefixo}</TableCell>
                  <TableCell>{manutencao.tipo}</TableCell>
                  <TableCell>
                    <Chip
                      label={manutencao.status}
                      color={getStatusColor(manutencao.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(manutencao.data_agendada)}</TableCell>
                  <TableCell>
                    {manutencao.custo ? `R$ ${manutencao.custo.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(manutencao);
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
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Gestão de Frota
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gerencie viaturas, checklists e manutenções
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
          <Tab icon={<CarIcon />} label="Viaturas" />
          <Tab icon={<ChecklistIcon />} label="Checklists" />
          <Tab icon={<BuildIcon />} label="Manutenções" />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderViaturasTab()}
      {activeTab === 1 && renderChecklistsTab()}
      {activeTab === 2 && renderManutencoesTab()}

      {/* FAB para adicionar */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          if (activeTab === 0) handleOpenDialog('viatura');
          else if (activeTab === 1) handleOpenDialog('checklist');
          else if (activeTab === 2) handleOpenDialog('manutencao');
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
        <MenuItem onClick={() => {
          handleOpenDialog(activeTab === 0 ? 'viatura' : activeTab === 2 ? 'manutencao' : 'checklist', selectedItem);
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        {(activeTab === 0 || activeTab === 2) && (
          <MenuItem onClick={() => {
            handleOpenDialog(activeTab === 0 ? 'viatura' : 'manutencao', selectedItem);
            setAnchorEl(null);
          }}>
            <EditIcon sx={{ mr: 1 }} />
            Editar
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
          {dialogType === 'viatura' && (selectedItem ? 'Editar Viatura' : 'Nova Viatura')}
          {dialogType === 'checklist' && (selectedItem ? 'Visualizar Checklist' : 'Novo Checklist')}
          {dialogType === 'manutencao' && (selectedItem ? 'Editar Manutenção' : 'Nova Manutenção')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {dialogType === 'viatura' && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Tipo da Viatura</InputLabel>
                    <Select
                      value={formData.tipo || ''}
                      onChange={(e) => handleFormChange('tipo', e.target.value)}
                      label="Tipo da Viatura"
                    >
                      <MenuItem value="ABT">ABT - Auto Bomba Tanque</MenuItem>
                      <MenuItem value="ABTF">ABTF - Auto Bomba Tanque Florestal</MenuItem>
                      <MenuItem value="UR">UR - Unidade de Resgate</MenuItem>
                      <MenuItem value="AV">AV - Auto Viatura</MenuItem>
                      <MenuItem value="ASA">ASA - Auto Socorro de Altura</MenuItem>
                      <MenuItem value="MOB">MOB - Motocicleta</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Nome da Viatura"
                    value={formData.nome || ''}
                    onChange={(e) => handleFormChange('nome', e.target.value)}
                    placeholder="Ex: Viatura 01, Resgate Principal, etc."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Prefixo"
                    value={formData.prefixo || ''}
                    onChange={(e) => handleFormChange('prefixo', e.target.value)}
                    placeholder="Ex: ABT-01, UR-02"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Placa"
                    value={formData.placa || ''}
                    onChange={(e) => handleFormChange('placa', e.target.value)}
                    placeholder="Ex: ABC-1234"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Marca"
                    value={formData.marca || ''}
                    onChange={(e) => handleFormChange('marca', e.target.value)}
                    placeholder="Ex: Mercedes-Benz, Volkswagen"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Modelo"
                    value={formData.modelo || ''}
                    onChange={(e) => handleFormChange('modelo', e.target.value)}
                    placeholder="Ex: Atego 1719, Sprinter 415"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Ano"
                    value={formData.ano || ''}
                    onChange={(e) => handleFormChange('ano', parseInt(e.target.value))}
                    inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quilometragem Atual"
                    value={formData.km_atual || ''}
                    onChange={(e) => handleFormChange('km_atual', parseInt(e.target.value))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Chassi"
                    value={formData.chassi || ''}
                    onChange={(e) => handleFormChange('chassi', e.target.value)}
                    placeholder="Número do chassi"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="RENAVAM"
                    value={formData.renavam || ''}
                    onChange={(e) => handleFormChange('renavam', e.target.value)}
                    placeholder="Número do RENAVAM"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status || 'disponivel'}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="disponivel">Disponível</MenuItem>
                      <MenuItem value="em_uso">Em Uso</MenuItem>
                      <MenuItem value="manutencao">Em Manutenção</MenuItem>
                      <MenuItem value="indisponivel">Indisponível</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Setor Responsável"
                    value={formData.setor_responsavel || ''}
                    onChange={(e) => handleFormChange('setor_responsavel', e.target.value)}
                    placeholder="Ex: 1º Pelotão, Resgate, Operações"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações"
                    value={formData.observacoes || ''}
                    onChange={(e) => handleFormChange('observacoes', e.target.value)}
                    placeholder="Informações adicionais sobre a viatura..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          {dialogType === 'checklist' && (
            <Typography variant="body2" color="textSecondary">
              Formulário de checklist em desenvolvimento...
            </Typography>
          )}
          {dialogType === 'manutencao' && (
            <Typography variant="body2" color="textSecondary">
              Formulário de manutenção em desenvolvimento...
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
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Frota;