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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Schedule as ScheduleIcon,
  SwapHoriz as SwapIcon,
  WorkOff as ExtraIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { operacionalService, userService } from '../services/api';

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
    setor: '',
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
  
  // Estados para usuários operacionais
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuariosFilters, setUsuariosFilters] = useState({
    setor: '',
    posto: '',
    status: 'ativo',
    search: '',
    page: 1,
    limit: 10,
  });
  const [usuariosPagination, setUsuariosPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  
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
        loadEscalas();
        break;
      case 1:
        loadTrocas();
        break;
      case 2:
        loadExtras();
        break;
      case 3:
        loadUsuarios();
        break;
      default:
        break;
    }
  };

  const loadEscalas = async () => {
    try {
      setEscalasLoading(true);
      const response = await operacionalService.getEscalas(escalasFilters);
      setEscalas(response.data.escalas || []);
      setEscalasPagination(response.data.pagination || {});
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

  const loadUsuarios = async () => {
    try {
      setUsuariosLoading(true);
      const response = await userService.getUsuarios(usuariosFilters);
      setUsuarios(response.data.usuarios || []);
      setUsuariosPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Erro ao carregar usuários');
    } finally {
      setUsuariosLoading(false);
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

  const renderEscalasTab = () => (
    <Box>
      {/* Filtros */}
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
              <FormControl fullWidth>
                <InputLabel>Setor</InputLabel>
                <Select
                  value={escalasFilters.setor}
                  onChange={(e) => setEscalasFilters(prev => ({ ...prev, setor: e.target.value }))}
                  label="Setor"
                >
                  <MenuItem key="todos-setores-escala" value="">Todos</MenuItem>
                  <MenuItem key="operacional-setor" value="operacional">Operacional</MenuItem>
                  <MenuItem key="administrativo-setor" value="administrativo">Administrativo</MenuItem>
                  <MenuItem key="manutencao-setor" value="manutencao">Manutenção</MenuItem>
                </Select>
              </FormControl>
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
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de escalas */}
      <Grid container spacing={3}>
        {escalasLoading ? (
          <Grid item xs={12}>
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          </Grid>
        ) : escalas.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Nenhuma escala encontrada
              </Typography>
            </Paper>
          </Grid>
        ) : (
          escalas.map((escala) => (
            <Grid item xs={12} md={6} lg={4} key={escala.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" gutterBottom>
                      {escala.nome}
                    </Typography>
                    <Chip
                      label={escala.status}
                      color={getStatusColor(escala.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {formatDate(escala.data_inicio)} - {formatDate(escala.data_fim)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {escala.hora_inicio} - {escala.hora_fim}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <GroupIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {escala.usuarios?.length || 0} usuários escalados
                    </Typography>
                  </Box>
                  
                  {escala.descricao && (
                    <Typography variant="body2" color="textSecondary" mb={2}>
                      {escala.descricao}
                    </Typography>
                  )}
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="textSecondary">
                      Criada por: {escala.criado_por_nome}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(escala);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Paginação */}
      {escalasPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={escalasPagination.pages}
            page={escalasPagination.current_page}
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

  const renderUsuariosTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Buscar usuário"
                value={usuariosFilters.search}
                onChange={(e) => setUsuariosFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Nome, matrícula..."
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Setor</InputLabel>
                <Select
                  value={usuariosFilters.setor}
                  onChange={(e) => setUsuariosFilters(prev => ({ ...prev, setor: e.target.value }))}
                  label="Setor"
                >
                  <MenuItem key="todos-setores-usuario" value="">Todos</MenuItem>
                  <MenuItem key="operacional-usuario" value="operacional">Operacional</MenuItem>
                  <MenuItem key="administrativo-usuario" value="administrativo">Administrativo</MenuItem>
                  <MenuItem key="comando-usuario" value="comando">Comando</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Posto</InputLabel>
                <Select
                  value={usuariosFilters.posto}
                  onChange={(e) => setUsuariosFilters(prev => ({ ...prev, posto: e.target.value }))}
                  label="Posto"
                >
                  <MenuItem key="todos-postos" value="">Todos</MenuItem>
                  <MenuItem key="soldado-posto" value="soldado">Soldado</MenuItem>
                  <MenuItem key="cabo-posto" value="cabo">Cabo</MenuItem>
                  <MenuItem key="sargento-posto" value="sargento">Sargento</MenuItem>
                  <MenuItem key="tenente-posto" value="tenente">Tenente</MenuItem>
                  <MenuItem key="capitao-posto" value="capitao">Capitão</MenuItem>
                  <MenuItem key="major-posto" value="major">Major</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={usuariosFilters.status}
                  onChange={(e) => setUsuariosFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem key="todos-status-usuario" value="">Todos</MenuItem>
                  <MenuItem key="ativo-usuario" value="ativo">Ativo</MenuItem>
                  <MenuItem key="inativo-usuario" value="inativo">Inativo</MenuItem>
                  <MenuItem key="licenca-usuario" value="licenca">Em Licença</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadUsuarios}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de usuários */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuário</TableCell>
              <TableCell>Matrícula</TableCell>
              <TableCell>Posto</TableCell>
              <TableCell>Setor</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuariosLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {usuario.nome?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {usuario.nome}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {usuario.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{usuario.matricula}</TableCell>
                  <TableCell>
                    <Chip
                      label={usuario.posto}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{usuario.setor}</TableCell>
                  <TableCell>{usuario.telefone || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={usuario.status}
                      size="small"
                      color={usuario.status === 'ativo' ? 'success' : usuario.status === 'licenca' ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setSelectedItem(usuario);
                        setAnchorEl(e.currentTarget);
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
      {usuariosPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={usuariosPagination.pages}
            page={usuariosPagination.current_page}
            onChange={(e, page) => {
              setUsuariosFilters(prev => ({ ...prev, page }));
              loadUsuarios();
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={
              <Badge 
                badgeContent={usuarios.filter(u => u.status === 'ativo').length} 
                color="primary"
              >
                <PeopleIcon />
              </Badge>
            } 
            label="Militares"
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
      {activeTab === 0 && renderUsuariosTab()}
      {activeTab === 1 && renderEscalasTab()}
      {activeTab === 2 && renderTrocasTab()}
      {activeTab === 3 && renderExtrasTab()}

      {/* FAB para adicionar */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          if (activeTab === 0) handleOpenDialog('usuario');
          else if (activeTab === 1) handleOpenDialog('escala');
          else if (activeTab === 2) handleOpenDialog('troca');
          else if (activeTab === 3) handleOpenDialog('extra');
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
        <MenuItem key="view-operacional" onClick={() => {
          const type = activeTab === 0 ? 'escala' : activeTab === 1 ? 'troca' : 'extra';
          handleOpenDialog(type, selectedItem);
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        {activeTab === 0 && (
          <MenuItem key="edit-operacional" onClick={() => {
            handleOpenDialog('escala', selectedItem);
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
          {dialogType === 'escala' && (selectedItem ? 'Editar Escala' : 'Nova Escala')}
          {dialogType === 'troca' && (selectedItem ? 'Visualizar Troca' : 'Nova Troca de Serviço')}
          {dialogType === 'extra' && (selectedItem ? 'Visualizar Serviço Extra' : 'Novo Serviço Extra')}
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
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Operacional;