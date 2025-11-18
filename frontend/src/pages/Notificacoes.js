import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  useTheme,
  Pagination,
  Divider,
  Menu,
  Tabs,
  Tab,
  Paper,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  MarkEmailRead as MarkReadIcon,
  MarkEmailUnread as MarkUnreadIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Schedule as ScheduleIcon,
  DirectionsCar as CarIcon,
  Inventory as InventoryIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Send as SendIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { notificacoesService, usuariosService, operacionalService } from '../services/api';

const Notificacoes = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user, hasRole } = useAuth();
  const { markAsRead, markAllAsRead, markAsUnread } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Estados para notificações
  const [notificacoes, setNotificacoes] = useState([]);
  const [notificacoesLoading, setNotificacoesLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    tipo: '',
    modulo: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
    nao_lidas: 0,
  });
  const [respostaLoading, setRespostaLoading] = useState(null);
  
  // Estados para estatísticas
  const [estatisticas, setEstatisticas] = useState(null);
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'create', 'view'
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulário de criação
  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'info',
    modulo: '',
    usuario_id: '',
    broadcast: false,
  });
  
  // Estados para usuários (para broadcast)
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    loadNotificacoes();
    if (hasRole(['Administrador', 'Chefe'])) {
      loadUsuarios();
    }
  }, []);

  // Carregar estatísticas apenas quando a aba correspondente estiver ativa
  useEffect(() => {
    if (activeTab === 1) {
      loadEstatisticas();
    }
  }, [activeTab]);

  useEffect(() => {
    loadNotificacoes();
  }, [filters.page, filters.status, filters.tipo, filters.modulo]);

  const loadNotificacoes = async () => {
    try {
      setNotificacoesLoading(true);
      
      // Mapear o filtro de status para o formato esperado pelo backend
      const params = { ...filters };
      if (filters.status === 'lida') {
        params.lida = 'true';
        delete params.status;
      } else if (filters.status === 'nao_lida') {
        params.lida = 'false';
        delete params.status;
      } else {
        delete params.status;
      }
      
      const response = await notificacoesService.getNotificacoes(params);
      setNotificacoes(response.data.notificacoes || []);
      setPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
      setError('Erro ao carregar notificações');
    } finally {
      setNotificacoesLoading(false);
    }
  };

  const loadEstatisticas = async () => {
    try {
      const response = await notificacoesService.getEstatisticas();
      setEstatisticas(response.data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const loadUsuarios = async () => {
    try {
      const response = await usuariosService.getUsuarios({ limit: 100 });
      setUsuarios(response.data.usuarios || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    setSuccess('');
  };

  const handleOpenDialog = async (type, notification = null) => {
    setDialogType(type);
    setSelectedNotification(notification);
    
    if (type === 'create') {
      setFormData({
        titulo: '',
        mensagem: '',
        tipo: 'info',
        modulo: '',
        usuario_id: '',
        broadcast: false,
      });
    }
    
    // Marcar automaticamente como lida quando visualizar
    if (type === 'view' && notification && !notification.lida) {
      try {
        await handleMarkAsRead(notification.id);
      } catch (err) {
        console.error('Erro ao marcar notificação como lida:', err);
      }
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setSelectedNotification(null);
    setFormData({
      titulo: '',
      mensagem: '',
      tipo: 'info',
      modulo: '',
      usuario_id: '',
      broadcast: false,
    });
    setError('');
    setSuccess('');
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
      setSuccess('');
      
      if (!formData.titulo || !formData.mensagem) {
        setError('Título e mensagem são obrigatórios');
        return;
      }
      
      if (!formData.broadcast && !formData.usuario_id) {
        setError('Selecione um usuário ou marque como broadcast');
        return;
      }
      
      await notificacoesService.createNotificacao(formData);
      setSuccess('Notificação criada com sucesso!');
      loadNotificacoes();
      loadEstatisticas();
      
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (err) {
      console.error('Erro ao criar notificação:', err);
      setError(err.response?.data?.message || 'Erro ao criar notificação');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificacoesService.markAsRead(notificationId);
      markAsRead(notificationId);
      loadNotificacoes();
      if (activeTab === 1) {
        loadEstatisticas();
      }
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
      setError('Erro ao marcar notificação como lida');
    }
  };

  const handleMarkAsUnread = async (notificationId) => {
    try {
      await notificacoesService.markAsUnread(notificationId);
      // Atualiza imediatamente o contexto para refletir no badge
      await markAsUnread(notificationId);
      // Recarrega listas/estatísticas para manter consistência visual
      loadNotificacoes();
      if (activeTab === 1) {
        loadEstatisticas();
      }
      setSuccess('Notificação marcada como não lida');
    } catch (err) {
      console.error('Erro ao marcar como não lida:', err);
      setError('Erro ao marcar notificação como não lida');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificacoesService.markAllAsRead();
      markAllAsRead();
      loadNotificacoes();
      if (activeTab === 1) {
        loadEstatisticas();
      }
      setSuccess('Todas as notificações foram marcadas como lidas');
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
      setError('Erro ao marcar todas as notificações como lidas');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificacoesService.deleteNotificacao(notificationId);
      loadNotificacoes();
      if (activeTab === 1) {
        loadEstatisticas();
      }
      setSuccess('Notificação excluída com sucesso');
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
      setError('Erro ao excluir notificação');
    }
  };

  const handleDeleteReadNotifications = async () => {
    try {
      await notificacoesService.deleteReadNotificacoes();
      loadNotificacoes();
      if (activeTab === 1) {
        loadEstatisticas();
      }
      setSuccess('Notificações lidas excluídas com sucesso');
    } catch (err) {
      console.error('Erro ao excluir notificações lidas:', err);
      setError('Erro ao excluir notificações lidas');
    }
  };

  const isSwapRequestNotification = (notification) => (
    notification.modulo === 'operacional' &&
    notification.titulo === 'Solicitação de Troca' &&
    notification.referencia_id
  );

  const handleAcceptSwapNotification = async (event, notification) => {
    event.stopPropagation();
    if (!notification?.referencia_id) return;
    setError('');
    setSuccess('');
    setRespostaLoading(notification.id);

    try {
      await operacionalService.confirmarTroca(notification.referencia_id, {});
      await handleMarkAsRead(notification.id);
      setSuccess('Troca confirmada com sucesso.');
      loadNotificacoes();
      loadEstatisticas();
    } catch (err) {
      console.error('Erro ao aceitar troca:', err);
      setError(err.response?.data?.error || 'Erro ao aceitar troca');
    } finally {
      setRespostaLoading(null);
    }
  };

  const handleRejectSwapNotification = async (event, notification) => {
    event.stopPropagation();
    if (!notification?.referencia_id) return;
    setError('');
    setSuccess('');
    setRespostaLoading(notification.id);

    try {
      await operacionalService.responderTroca(notification.referencia_id, { resposta: 'rejeitar' });
      await handleMarkAsRead(notification.id);
      setSuccess('Troca rejeitada com sucesso.');
      loadNotificacoes();
      loadEstatisticas();
    } catch (err) {
      console.error('Erro ao rejeitar troca:', err);
      setError(err.response?.data?.error || 'Erro ao rejeitar troca');
    } finally {
      setRespostaLoading(null);
    }
  };

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case 'success':
        return { Component: SuccessIcon, color: 'success' };
      case 'warning':
        return { Component: WarningIcon, color: 'warning' };
      case 'error':
        return { Component: ErrorIcon, color: 'error' };
      case 'info':
      default:
        return { Component: InfoIcon, color: 'info' };
    }
  };

  const getModuleIcon = (modulo) => {
    switch (modulo) {
      case 'frota':
        return CarIcon;
      case 'almoxarifado':
        return InventoryIcon;
      case 'emprestimos':
        return BuildIcon;
      case 'operacional':
        return AssignmentIcon;
      case 'usuarios':
        return PersonIcon;
      case 'dashboard':
        return DashboardIcon;
      default:
        return NotificationsIcon;
    }
  };

  const getTypeColor = (tipo) => {
    switch (tipo) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
      default:
        return 'info';
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

  const renderNotificacoesTab = () => (
    <Box>
      {/* Filtros e Ações */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                  label="Status"
                >
                  <MenuItem key="todas" value="">Todas</MenuItem>
                  <MenuItem key="nao_lida" value="nao_lida">Não Lidas</MenuItem>
                  <MenuItem key="lida" value="lida">Lidas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filters.tipo}
                  onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value, page: 1 }))}
                  label="Tipo"
                >
                  <MenuItem key="todos-tipo" value="">Todos</MenuItem>
                  <MenuItem key="info" value="info">Informação</MenuItem>
                  <MenuItem key="success" value="success">Sucesso</MenuItem>
                  <MenuItem key="warning" value="warning">Aviso</MenuItem>
                  <MenuItem key="error" value="error">Erro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Módulo</InputLabel>
                <Select
                  value={filters.modulo}
                  onChange={(e) => setFilters(prev => ({ ...prev, modulo: e.target.value, page: 1 }))}
                  label="Módulo"
                >
                  <MenuItem key="todos-modulo" value="">Todos</MenuItem>
                  <MenuItem key="frota" value="frota">Frota</MenuItem>
                  <MenuItem key="almoxarifado" value="almoxarifado">Almoxarifado</MenuItem>
                  <MenuItem key="emprestimos" value="emprestimos">Cautelas</MenuItem>
                  <MenuItem key="operacional" value="operacional">Operacional</MenuItem>
                  <MenuItem key="usuarios" value="usuarios">Usuários</MenuItem>
                  <MenuItem key="dashboard" value="dashboard">Dashboard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleMarkAllAsRead}
                startIcon={<MarkReadIcon />}
                disabled={pagination.nao_lidas === 0}
              >
                Marcar Todas como Lidas
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                onClick={handleDeleteReadNotifications}
                startIcon={<DeleteSweepIcon />}
              >
                Excluir Lidas
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de notificações */}
      <Paper>
        <List>
          {notificacoesLoading ? (
            <ListItem>
              <Box display="flex" justifyContent="center" width="100%" py={4}>
                <CircularProgress />
              </Box>
            </ListItem>
          ) : notificacoes.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Nenhuma notificação encontrada"
                sx={{ textAlign: 'center' }}
              />
            </ListItem>
          ) : (
            notificacoes.map((notificacao, index) => (
              <React.Fragment key={notificacao.id}>
                <ListItem
                  button
                  onClick={() => handleOpenDialog('view', notificacao)}
                  sx={{
                    bgcolor: notificacao.lida ? 'transparent' : 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                    cursor: 'pointer',
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      variant="dot"
                      color="primary"
                      invisible={notificacao.lida}
                    >
                      <Avatar sx={{ bgcolor: `${getTypeColor(notificacao.tipo)}.main` }}>
                        {(() => {
                          const typeIcon = getTypeIcon(notificacao.tipo);
                          const IconComponent = typeIcon.Component;
                          return <IconComponent color={typeIcon.color} />;
                        })()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primaryTypographyProps={{ component: 'span' }}
                    secondaryTypographyProps={{ component: 'span' }}
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={notificacao.lida ? 'normal' : 'bold'}
                        >
                          {notificacao.titulo}
                        </Typography>
                        {notificacao.modulo && (
                          <Chip
                            icon={(() => {
                              const IconComponent = getModuleIcon(notificacao.modulo);
                              return IconComponent ? <IconComponent /> : null;
                            })()}
                            label={notificacao.modulo}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {notificacao.mensagem}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDateTime(notificacao.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                      <Box display="flex" gap={1}>
                        {!notificacao.lida && (
                          <Tooltip title="Marcar como lida">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMarkAsRead(notificacao.id);
                              }}
                            >
                              <MarkReadIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAnchorEl(event.currentTarget);
                            setSelectedNotification(notificacao);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                      {isSwapRequestNotification(notificacao) && (
                        <Box display="flex" gap={0.5}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={(event) => handleAcceptSwapNotification(event, notificacao)}
                            disabled={respostaLoading === notificacao.id}
                          >
                            {respostaLoading === notificacao.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              'Aceitar'
                            )}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={(event) => handleRejectSwapNotification(event, notificacao)}
                            disabled={respostaLoading === notificacao.id}
                          >
                            {respostaLoading === notificacao.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              'Recusar'
                            )}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notificacoes.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>

        {/* Paginação */}
        {pagination.pages > 1 && (
          <Box display="flex" justifyContent="center" p={2}>
            <Pagination
              count={pagination.pages}
              page={pagination.current_page}
              onChange={(e, page) => {
                setFilters(prev => ({ ...prev, page }));
              }}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );

  const renderEstatisticasTab = () => {
    if (!estatisticas) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {/* Cards de Estatísticas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <NotificationsIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {estatisticas.resumo?.total || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total de Notificações
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <NotificationsActiveIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {estatisticas.resumo?.nao_lidas || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Não Lidas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <MarkReadIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {(estatisticas.resumo?.total || 0) - (estatisticas.resumo?.nao_lidas || 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Lidas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {estatisticas.historico?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Últimos 7 dias
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Notificações por Tipo */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Por Tipo
              </Typography>
              <List dense>
                {estatisticas.por_tipo?.map((item) => (
                  <ListItem key={item.tipo}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `${getTypeColor(item.tipo)}.main`, width: 32, height: 32 }}>
                        {(() => {
                          const typeIcon = getTypeIcon(item.tipo);
                          const IconComponent = typeIcon.Component;
                          return <IconComponent color={typeIcon.color} />;
                        })()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.tipo}
                      secondary={`${item.total} notificações`}
                    />
                  </ListItem>
                )) || []}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Notificações por Módulo */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Por Módulo
              </Typography>
              <List dense>
                {estatisticas.por_modulo?.map((item) => (
                  <ListItem key={item.modulo}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 32, height: 32 }}>
                        {(() => {
                          const IconComponent = getModuleIcon(item.modulo);
                          return IconComponent ? <IconComponent /> : null;
                        })()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.modulo || 'Geral'}
                      secondary={`${item.total} notificações`}
                    />
                  </ListItem>
                )) || []}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Central de Notificações
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gerencie suas notificações e comunicações
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={
              <Badge 
                badgeContent={pagination.nao_lidas} 
                color="error"
              >
                <NotificationsIcon />
              </Badge>
            } 
            label="Notificações" 
          />
          <Tab 
            icon={<InfoIcon />} 
            label="Estatísticas" 
          />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderNotificacoesTab()}
      {activeTab === 1 && renderEstatisticasTab()}

      {/* FAB para criar notificação */}
      {hasRole(['Administrador', 'Chefe']) && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => handleOpenDialog('create')}
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
        <MenuItem key="view" onClick={() => {
          handleOpenDialog('view', selectedNotification);
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        {!selectedNotification?.lida ? (
          <MenuItem key="mark-read" onClick={() => {
            handleMarkAsRead(selectedNotification.id);
            setAnchorEl(null);
          }}>
            <MarkReadIcon sx={{ mr: 1 }} />
            Marcar como Lida
          </MenuItem>
        ) : (
          <MenuItem key="mark-unread" onClick={() => {
            handleMarkAsUnread(selectedNotification.id);
            setAnchorEl(null);
          }}>
            <MarkUnreadIcon sx={{ mr: 1 }} />
            Marcar como Não Lida
          </MenuItem>
        )}
        <MenuItem 
          key="delete"
          onClick={() => {
            handleDeleteNotification(selectedNotification.id);
            setAnchorEl(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>

      {/* Dialog para formulários */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'create' && 'Nova Notificação'}
          {dialogType === 'view' && 'Visualizar Notificação'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {dialogType === 'view' && selectedNotification ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedNotification.titulo}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedNotification.mensagem}
              </Typography>
              {(() => {
                const moduleRoutes = {
                  usuarios: '/gestao-pessoas/aprovacao-cadastros',
                  frota: '/frota',
                  almoxarifado: '/almoxarifado',
                  emprestimos: '/emprestimos',
                  operacional: '/operacional',
                  dashboard: '/dashboard',
                };
                const moduloRaw = (selectedNotification.modulo || '').toLowerCase();
                const modulo = ['usuarios','usuario','gestao-pessoas'].find(m => m === moduloRaw) ? 'usuarios' : moduloRaw;
                const titulo = (selectedNotification.titulo || '').toLowerCase();
                const mensagem = (selectedNotification.mensagem || '').toLowerCase();
                const fallbackToUsuarios = [titulo, mensagem].some(t => (
                  t.includes('solicitação de cadastro') ||
                  t.includes('solicitacao de cadastro') ||
                  t.includes('cadastro') ||
                  t.includes('aprovação') ||
                  t.includes('aprovacao')
                ));
                const route = moduleRoutes[modulo] || (fallbackToUsuarios ? moduleRoutes['usuarios'] : null);
                return route ? (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => navigate(route)}
                    >
                      {modulo === 'usuarios' || fallbackToUsuarios
                        ? 'Ir para aprovação de cadastros'
                        : `Ir para módulo ${modulo}`}
                    </Button>
                  </Box>
                ) : null;
              })()}
              <Box display="flex" gap={1} mb={2}>
                <Chip
                  label={selectedNotification.tipo}
                  color={getTypeColor(selectedNotification.tipo)}
                  size="small"
                />
                {selectedNotification.modulo && (
                  <Chip
                    label={selectedNotification.modulo}
                    variant="outlined"
                    size="small"
                  />
                )}
                <Chip
                  label={selectedNotification.lida ? 'Lida' : 'Não Lida'}
                  color={selectedNotification.lida ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              <Typography variant="caption" color="textSecondary">
                Criada em: {formatDateTime(selectedNotification.created_at)}
              </Typography>
              {selectedNotification.lida && selectedNotification.lida_em && (
                <Typography variant="caption" color="textSecondary" display="block">
                  Lida em: {formatDateTime(selectedNotification.lida_em)}
                </Typography>
              )}
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título *"
                  value={formData.titulo}
                  onChange={(e) => handleFormChange('titulo', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mensagem *"
                  multiline
                  rows={4}
                  value={formData.mensagem}
                  onChange={(e) => handleFormChange('mensagem', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo *</InputLabel>
                  <Select
                    value={formData.tipo}
                    onChange={(e) => handleFormChange('tipo', e.target.value)}
                    label="Tipo *"
                  >
                    <MenuItem key="info-form" value="info">Informação</MenuItem>
                    <MenuItem key="success-form" value="success">Sucesso</MenuItem>
                    <MenuItem key="warning-form" value="warning">Aviso</MenuItem>
                    <MenuItem key="error-form" value="error">Erro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Módulo</InputLabel>
                  <Select
                    value={formData.modulo}
                    onChange={(e) => handleFormChange('modulo', e.target.value)}
                    label="Módulo"
                  >
                    <MenuItem key="geral" value="">Geral</MenuItem>
                    <MenuItem key="frota-form" value="frota">Frota</MenuItem>
                    <MenuItem key="almoxarifado-form" value="almoxarifado">Almoxarifado</MenuItem>
                    <MenuItem key="emprestimos-form" value="emprestimos">Cautelas</MenuItem>
                    <MenuItem key="operacional-form" value="operacional">Operacional</MenuItem>
                    <MenuItem key="usuarios-form" value="usuarios">Usuários</MenuItem>
                    <MenuItem key="dashboard-form" value="dashboard">Dashboard</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.broadcast}
                      onChange={(e) => handleFormChange('broadcast', e.target.checked)}
                    />
                  }
                  label="Enviar para todos os usuários (Broadcast)"
                />
              </Grid>
              {!formData.broadcast && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Usuário *</InputLabel>
                    <Select
                      value={formData.usuario_id}
                      onChange={(e) => handleFormChange('usuario_id', e.target.value)}
                      label="Usuário *"
                    >
                      {usuarios.map((usuario) => (
                        <MenuItem key={usuario.id} value={usuario.id}>
                          {usuario.nome} ({usuario.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          {dialogType === 'create' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              startIcon={<SendIcon />}
            >
              {loading ? <CircularProgress size={20} /> : 'Enviar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Notificacoes;
