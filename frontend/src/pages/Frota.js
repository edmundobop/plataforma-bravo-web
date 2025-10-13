import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Avatar,
  ListItemAvatar,
  Card,
  CardContent,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Assignment as ChecklistIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Speed as SpeedIcon,
  Description as DescriptionIcon,
  Build as BuildIcon,
  Schedule as ScheduleIcon,
  LocalGasStation as FuelIcon,
  ZoomIn as ZoomInIcon,
} from '@mui/icons-material';

const Frota = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulários
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleOpenDialog = (type, item = null) => {
    console.log('handleOpenDialog called with:', { type, item });
    setDialogType(type);
    setSelectedItem(item);
    
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({});
    }
    
    setFormErrors({});
    setDialogOpen(true);
    console.log('Dialog state after opening:', { dialogType: type, selectedItem: item, dialogOpen: true });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setFormData({});
    setFormErrors({});
  };

  const handleOpenPhotoModal = (photo) => {
    setSelectedPhoto(photo);
    setPhotoModalOpen(true);
  };

  const handleClosePhotoModal = () => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
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

    const confirmMessage = `Tem certeza que deseja excluir este item?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
    } catch (err) {
      console.error('Erro ao excluir:', err);
      const errorMessage = err.response?.data?.error || 'Erro ao excluir item';
      setError(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuAction = async (action) => {
    const currentSelectedItem = selectedItem;
    console.log('handleMenuAction called with:', { action, currentSelectedItem });
    
    handleMenuClose();
    
    if (action === 'view') {
      console.log('Opening view dialog with item:', currentSelectedItem);
      
      handleOpenDialog('view', currentSelectedItem);
    } else if (action === 'edit') {
      // Funcionalidade de edição removida - usar páginas específicas
      console.log('Edit action - redirect to specific page');
    } else if (action === 'delete') {
      handleDelete(currentSelectedItem);
    }
  };

<<<<<<< Updated upstream
  const loadTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const response = await checklistTemplateService.getTemplates();
      setTemplates(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar modelos:', err);
      setError('Erro ao carregar modelos');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadManutencoes = useCallback(async () => {
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
  }, [manutencoesFilters]);

  const loadData = useCallback(() => {
    switch (activeTab) {
      case 0:
        loadViaturas();
        break;
      case 1:
        loadTemplates();
        break;
      case 2:
        loadChecklistsPendentes();
        loadChecklists();
        break;
      case 3:
        loadManutencoes();
        break;
      default:
        break;
    }
  }, [activeTab, loadViaturas, loadTemplates, loadChecklistsPendentes, loadChecklists, loadManutencoes]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTab]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
  };

  const handleOpenDialog = (type, item = null) => {
    if (type === 'checklist' && !item) {
      // Para novo checklist, abrir o gerenciador de modelos
      setTemplateManagerOpen(true);
    } else {
      // Para outros tipos ou edição, usar o diálogo padrão
      setDialogType(type);
      setSelectedItem(item);
      setFormData(item || {});
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setSelectedItem(null);
    setFormData({});
  };

  const handleCloseTemplateManager = () => {
    setTemplateManagerOpen(false);
    setSelectedItem(null);
  };

  const handleTemplateManagerSave = async () => {
    // Fechar o gerenciador de modelos e recarregar a lista
    setTemplateManagerOpen(false);
    setSelectedItem(null);
    await loadTemplates();
  };

  const handleEditTemplate = (template) => {
    setSelectedItem(template);
    setTemplateManagerOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteTemplate = async (template) => {
    if (window.confirm(`Tem certeza que deseja excluir o modelo "${template.nome}"?`)) {
      try {
        setLoading(true);
        await checklistService.deleteTemplate(template.id);
        await loadTemplates();
        setAnchorEl(null);
        setSelectedItem(null);
      } catch (error) {
        console.error('Erro ao excluir modelo:', error);
        setError('Erro ao excluir modelo: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

=======
>>>>>>> Stashed changes
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Funcionalidade removida - usar páginas específicas para edição
      handleCloseDialog();
    } catch (err) {
      console.error('Erro detalhado:', err.response?.data || err.message);
      setError('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo': return 'success';
      case 'inativo': return 'default';
      case 'manutencao': return 'warning';
      default: return 'default';
    }
  };

  // Renderizar aba de manutenções
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestão de Frota
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie viaturas e manutenções
        </Typography>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Página de Frota - Redirecionamento para subpáginas */}
      <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
        Use o menu lateral para navegar entre Viaturas, Manutenções e Checklists.
      </Typography>

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
<<<<<<< Updated upstream
        {activeTab === 1 ? (
          // Menu para modelos
          [
            <MenuItem key="edit" onClick={() => handleEditTemplate(selectedItem)}>
              <EditIcon sx={{ mr: 1 }} />
              Editar Modelo
            </MenuItem>,
            <MenuItem key="delete" onClick={() => handleDeleteTemplate(selectedItem)}>
              <DeleteIcon sx={{ mr: 1 }} />
              Excluir Modelo
            </MenuItem>
          ]
        ) : (
          // Menu para outras abas
          [
            <MenuItem key="view" onClick={() => {
              if (activeTab === 2) {
                // Aba de checklists - usar handleOpenDialog
                handleOpenDialog('checklist', selectedItem);
              } else {
                // Outras abas - usar handleOpenDialog
                handleOpenDialog(activeTab === 0 ? 'viatura' : activeTab === 3 ? 'manutencao' : 'checklist', selectedItem);
              }
              setAnchorEl(null);
            }}>
              <ViewIcon sx={{ mr: 1 }} />
              Visualizar
            </MenuItem>,
            (activeTab === 0 || activeTab === 3) && (
              <MenuItem key="edit" onClick={() => {
                handleOpenDialog(activeTab === 0 ? 'viatura' : 'manutencao', selectedItem);
                setAnchorEl(null);
              }}>
                <EditIcon sx={{ mr: 1 }} />
                Editar
              </MenuItem>
            )
          ]
        )}
=======
        <MenuItem key="view-frota" onClick={() => handleMenuAction('view')}>
          <ViewIcon sx={{ mr: 1 }} /> Visualizar
        </MenuItem>
        <MenuItem key="edit-frota" onClick={() => handleMenuAction('edit')}>
          <EditIcon sx={{ mr: 1 }} /> Editar
        </MenuItem>
        <MenuItem key="delete-frota" onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Excluir
        </MenuItem>
>>>>>>> Stashed changes
      </Menu>

      {/* Diálogo de formulário */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.50', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {dialogType === 'view' && selectedItem && (
              <>
                <ViewIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                  Visualizar Item
                </Typography>
                {selectedItem.prefixo && (
                  <Chip 
                    label={selectedItem.prefixo} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ ml: 1, fontWeight: 'bold' }}
                  />
                )}
              </>
            )}
            {dialogType !== 'view' && (
              <>
                <EditIcon sx={{ color: 'secondary.main' }} />
                <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                  {`${selectedItem ? 'Editar' : 'Novo'} Item`}
                </Typography>
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {dialogType === 'view' && selectedItem ? (
              <Box sx={{ p: 2 }}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                  <List sx={{ width: '100%', maxWidth: '100%', bgcolor: 'transparent' }}>
                  {/* Detectar se é viatura (tem prefixo, modelo, placa) */}
                  {(selectedItem.prefixo || selectedItem.modelo || selectedItem.placa) && (
                    <>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: 'primary.main' }}>
                        🚗 Informações da Viatura
                      </Typography>
                      <ListItem sx={{ bgcolor: 'primary.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <CarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Prefixo"
                          secondary={
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {selectedItem.prefixo || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <InfoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Tipo"
                          secondary={
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {selectedItem.tipo || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>
                            <InfoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Modelo"
                          secondary={
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {selectedItem.modelo || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            <InfoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Marca"
                          secondary={
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {selectedItem.marca || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <CalendarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Ano"
                          secondary={
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {selectedItem.ano || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>
                            <LocationIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Placa"
                          secondary={
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'text.primary' }}>
                              {selectedItem.placa || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getStatusColor(selectedItem.status) === 'success' ? 'success.main' : getStatusColor(selectedItem.status) === 'warning' ? 'warning.main' : 'error.main' }}>
                            {getStatusColor(selectedItem.status) === 'success' ? <CheckCircleIcon /> : getStatusColor(selectedItem.status) === 'warning' ? <WarningIcon /> : <ErrorIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Status"
                          secondary={
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold', 
                                color: getStatusColor(selectedItem.status) === 'success' ? 'success.main' : 
                                       getStatusColor(selectedItem.status) === 'warning' ? 'warning.main' : 'error.main'
                              }}
                            >
                              {selectedItem.status || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <BusinessIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Setor"
                          secondary={
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {selectedItem.setor_responsavel || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>

                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'purple.main' }}>
                            <InfoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Chassi"
                          secondary={
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                              {selectedItem.chassi || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'indigo.main' }}>
                            <InfoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="RENAVAM"
                          secondary={
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                              {selectedItem.renavam || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'orange.main' }}>
                            <SpeedIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="KM Atual"
                          secondary={
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {selectedItem.km_atual ? `${selectedItem.km_atual.toLocaleString()} km` : '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {selectedItem.observacoes && (
                        <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'grey.500' }}>
                              <DescriptionIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Observações"
                            secondary={
                              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                {selectedItem.observacoes}
                              </Typography>
                            }
                          />
                        </ListItem>
                      )}
                    </>
                  )}
                  
                  {/* Detectar se é manutenção (tem tipo e descricao de manutenção e NÃO tem campos específicos de checklist) */}
                  {(selectedItem.tipo && selectedItem.descricao) && 
                   !(selectedItem.data_checklist || selectedItem.km_inicial || selectedItem.combustivel_percentual || selectedItem.ala_servico || selectedItem.tipo_checklist) && (
                    <>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: 'warning.main' }}>
                        🔧 Informações da Manutenção
                      </Typography>
                      <ListItem sx={{ bgcolor: 'warning.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <CarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Viatura"
                          secondary={
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {selectedItem.viatura_prefixo || 'N/A'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'info.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>
                            <BuildIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Tipo de Manutenção"
                          secondary={
                            <Typography variant="body2">
                              {selectedItem.tipo || 'N/A'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'grey.600' }}>
                            <DescriptionIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Descrição"
                          secondary={
                            <Typography variant="body2">
                              {selectedItem.descricao || 'Sem descrição'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'success.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            <InfoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Status"
                          secondary={
                            <Chip
                              label={selectedItem.status || 'N/A'}
                              color={getStatusColor(selectedItem.status)}
                              size="small"
                            />
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'primary.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <CalendarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Data de Início"
                          secondary={
                            <Typography variant="body2">
                              {selectedItem.data_inicio ? new Date(selectedItem.data_inicio).toLocaleDateString('pt-BR', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'N/A'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'secondary.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <ScheduleIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Data de Fim"
                          secondary={
                            <Typography variant="body2">
                              {selectedItem.data_fim ? new Date(selectedItem.data_fim).toLocaleDateString('pt-BR', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'Em andamento'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    </>
                  )}
                  
                  {/* Detectar se é checklist (tem campos específicos de checklist) */}
                  {(selectedItem.data_checklist || selectedItem.km_inicial || selectedItem.combustivel_percentual || selectedItem.ala_servico || selectedItem.tipo_checklist) && 
                   !(selectedItem.prefixo || selectedItem.modelo || selectedItem.placa) && 
                   !(selectedItem.tipo && selectedItem.descricao && !selectedItem.data_checklist) && (
                    <>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: 'info.main' }}>
                        📋 Informações do Checklist
                      </Typography>
                      <ListItem sx={{ bgcolor: 'info.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <CarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Viatura"
                          secondary={
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {selectedItem.viatura_prefixo || selectedItem.viatura?.prefixo || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <CalendarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Data do Checklist"
                          secondary={
                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 'medium' }}>
                              {selectedItem.data_checklist ? new Date(selectedItem.data_checklist).toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>
                            <SpeedIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Quilometragem Inicial"
                          secondary={
                            <Typography variant="body2" sx={{ color: 'text.primary', fontFamily: 'monospace', fontWeight: 'bold' }}>
                              {selectedItem.km_inicial ? `${Number(selectedItem.km_inicial).toLocaleString('pt-BR')} km` : '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            <FuelIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Nível de Combustível"
                          secondary={
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.primary', 
                                fontWeight: 'medium',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}
                            >
                              {selectedItem.combustivel || '-'}
                              {selectedItem.combustivel && (
                                <Typography 
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    ml: 1,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    bgcolor: Number(selectedItem.combustivel) > 50 ? 'success.light' : Number(selectedItem.combustivel) > 25 ? 'warning.light' : 'error.light',
                                    color: Number(selectedItem.combustivel) > 50 ? 'success.dark' : Number(selectedItem.combustivel) > 25 ? 'warning.dark' : 'error.dark',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {selectedItem.combustivel}%
                                </Typography>
                              )}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getStatusColor(selectedItem.status) === 'success' ? 'success.main' : getStatusColor(selectedItem.status) === 'warning' ? 'warning.main' : 'error.main' }}>
                            {getStatusColor(selectedItem.status) === 'success' ? <CheckCircleIcon /> : getStatusColor(selectedItem.status) === 'warning' ? <WarningIcon /> : <ErrorIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Status"
                          secondary={
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold', 
                                color: getStatusColor(selectedItem.status) === 'success' ? 'success.main' : 
                                       getStatusColor(selectedItem.status) === 'warning' ? 'warning.main' : 'error.main'
                              }}
                            >
                              {selectedItem.status || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Responsável"
                          secondary={
                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 'medium' }}>
                              {selectedItem.usuario?.nome || selectedItem.usuario || '-'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      
                      {/* Seção de Itens do Checklist */}
                      {selectedItem.itens && selectedItem.itens.length > 0 && (
                        <>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 2, color: 'primary.main' }}>
                            📋 Itens Verificados ({selectedItem.itens.length})
                          </Typography>
                          {selectedItem.itens.map((item, index) => {
                            const fotos = typeof item.fotos === 'string' ? JSON.parse(item.fotos || '[]') : (item.fotos || []);
                            return (
                              <Card key={index} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent>
                                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                      {item.nome_item}
                                    </Typography>
                                    <Chip
                                      icon={
                                        item.status === 'ok' ? <CheckCircleIcon /> :
                                        item.status === 'com_alteracao' ? <WarningIcon /> :
                                        <ErrorIcon />
                                      }
                                      label={item.status === 'ok' ? 'OK' : 'Com Alteração'}
                                      color={
                                        item.status === 'ok' ? 'success' :
                                        item.status === 'com_alteracao' ? 'warning' :
                                        'error'
                                      }
                                      sx={{
                                        fontWeight: 'bold',
                                        '& .MuiChip-icon': {
                                          fontSize: '16px'
                                        }
                                      }}
                                    />
                                  </Box>
                                  
                                  {item.categoria && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                      📂 Categoria: {item.categoria}
                                    </Typography>
                                  )}
                                  
                                  {item.observacoes && (
                                    <Alert severity={item.status === 'ok' ? 'info' : 'warning'} sx={{ mb: 2 }}>
                                      <Typography variant="body2">
                                        <strong>Observações:</strong> {item.observacoes}
                                      </Typography>
                                    </Alert>
                                  )}
                                  
                                  {fotos.length > 0 && (
                                    <Box mt={2}>
                                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                                        📷 Fotos ({fotos.length}):
                                      </Typography>
                                      <ImageList cols={3} rowHeight={120} sx={{ maxHeight: 300 }}>
                                        {fotos.map((foto, fotoIndex) => (
                                          <ImageListItem 
                                            key={fotoIndex}
                                            sx={{ 
                                              cursor: 'pointer',
                                              transition: 'transform 0.2s',
                                              '&:hover': {
                                                transform: 'scale(1.05)',
                                                zIndex: 1
                                              }
                                            }}
                                            onClick={() => handleOpenPhotoModal(foto)}
                                          >
                                            <img
                                              src={foto.url}
                                              alt={foto.name || `Foto ${fotoIndex + 1}`}
                                              loading="lazy"
                                              style={{
                                                width: '100%',
                                                height: '120px',
                                                objectFit: 'cover',
                                                borderRadius: '4px'
                                              }}
                                              onError={(e) => {
                                                e.target.style.display = 'none';
                                              }}
                                            />
                                            <ImageListItemBar
                                              title={foto.name || `Foto ${fotoIndex + 1}`}
                                              subtitle={foto.size ? `${(foto.size / 1024).toFixed(1)} KB` : ''}
                                              actionIcon={
                                                <IconButton
                                                  sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenPhotoModal(foto);
                                                  }}
                                                >
                                                  <ZoomInIcon />
                                                </IconButton>
                                              }
                                              sx={{
                                                background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 100%)',
                                                '& .MuiImageListItemBar-title': {
                                                  fontSize: '0.75rem'
                                                },
                                                '& .MuiImageListItemBar-subtitle': {
                                                  fontSize: '0.65rem'
                                                }
                                              }}
                                            />
                                          </ImageListItem>
                                        ))}
                                      </ImageList>
                                    </Box>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                          
                          {/* Resumo dos Itens */}
                          <Card sx={{ mt: 2, bgcolor: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '1px solid #dee2e6' }}>
                            <CardContent>
                              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <InfoIcon color="primary" />
                                Resumo dos Itens Verificados
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                <Chip
                                  icon={<CheckCircleIcon />}
                                  label={`OK: ${selectedItem.itens?.filter(item => item.status === 'ok').length || 0}`}
                                  color="success"
                                  sx={{ fontWeight: 'bold' }}
                                />
                                <Chip
                                  icon={<WarningIcon />}
                                  label={`Com Alteração: ${selectedItem.itens?.filter(item => item.status === 'com_alteracao').length || 0}`}
                                  color="warning"
                                  sx={{ fontWeight: 'bold' }}
                                />
                                <Chip
                                  icon={<ErrorIcon />}
                                  label={`Críticos: ${selectedItem.itens?.filter(item => item.status === 'critico').length || 0}`}
                                  color="error"
                                  sx={{ fontWeight: 'bold' }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Chip
                                  label={`📷 Total de Fotos: ${selectedItem.itens?.reduce((total, item) => {
                                    const fotos = typeof item.fotos === 'string' ? JSON.parse(item.fotos || '[]') : (item.fotos || []);
                                    return total + fotos.length;
                                  }, 0) || 0}`}
                                  color="info"
                                  variant="outlined"
                                  sx={{ fontWeight: 'medium' }}
                                />
                                <Chip
                                  label={`📝 Total de Itens: ${selectedItem.itens?.length || 0}`}
                                  color="default"
                                  variant="outlined"
                                  sx={{ fontWeight: 'medium' }}
                                />
                              </Box>
                            </CardContent>
                          </Card>
                          
                          {/* Seção de Observações Gerais */}
                          {(selectedItem.observacoes_gerais || selectedItem.itens?.some(item => item.observacoes)) && (
                            <Card sx={{ mt: 2, bgcolor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                              <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <ChecklistIcon color="warning" />
                                  Observações
                                </Typography>
                                
                                {selectedItem.observacoes_gerais && (
                                  <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                      <strong>Observações Gerais:</strong> {selectedItem.observacoes_gerais}
                                    </Typography>
                                  </Alert>
                                )}
                                
                                {selectedItem.itens?.filter(item => item.observacoes).length > 0 && (
                                  <Box>
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
                              </CardContent>
                            </Card>
                          )}
                        </>
                      )}
                    </>
                  )}
                  
                  {/* Fallback - mostrar dados básicos se nenhuma condição específica for atendida */}
                  {!(selectedItem.prefixo || selectedItem.modelo || selectedItem.placa) && 
                   !(selectedItem.viatura_prefixo || selectedItem.tipo || selectedItem.descricao) && (
                    <>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: 'grey.700' }}>
                        📄 Informações Gerais
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                        Dados disponíveis para este item:
                      </Typography>
                      {Object.entries(selectedItem)
                        .filter(([key, value]) => value && key !== 'id' && key !== 'created_at' && key !== 'updated_at')
                        .map(([key, value]) => {
                          const formatKey = (key) => {
                            return key
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase())
                              .replace(/Id$/, 'ID')
                              .replace(/Bm$/, 'BM');
                          };
                          
                          const formatValue = (value) => {
                            if (typeof value === 'object' && value !== null) {
                              return JSON.stringify(value, null, 2);
                            }
                            if (key.includes('data') || key.includes('date')) {
                              try {
                                return new Date(value).toLocaleDateString('pt-BR');
                              } catch {
                                return String(value);
                              }
                            }
                            return String(value);
                          };
                          
                          return (
                            <ListItem key={key} sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'grey.400' }}>
                                  <InfoIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                                    {formatKey(key)}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
                                    {formatValue(value)}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          );
                        })}
                      {Object.entries(selectedItem)
                        .filter(([key, value]) => value && key !== 'id' && key !== 'created_at' && key !== 'updated_at')
                        .length === 0 && (
                        <ListItem sx={{ bgcolor: 'warning.50', borderRadius: 1 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'warning.main' }}>
                              <WarningIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Nenhum dado disponível"
                            secondary="Este item não possui informações para exibir."
                          />
                        </ListItem>
                      )}
                    </>
                  )}
                  </List>
                </Paper>
              </Box>
            ) : null}
            

            

          </Box>
        </DialogContent>
        <DialogActions>
          {dialogType === 'view' ? (
            <Button onClick={handleCloseDialog} variant="contained">
              Fechar
            </Button>
          ) : (
            <>
              <Button onClick={handleCloseDialog}>Cancelar</Button>
              <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Salvar'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>



      {/* Modal de Visualização de Fotos */}
      <Dialog
        open={photoModalOpen}
        onClose={handleClosePhotoModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: 'none'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          color: 'white',
          bgcolor: 'rgba(0, 0, 0, 0.8)'
        }}>
          <Typography variant="h6">
            {selectedPhoto?.name || 'Visualização da Foto'}
          </Typography>
          <IconButton 
            onClick={handleClosePhotoModal}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          p: 0, 
          bgcolor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}>
          {selectedPhoto && (
            <Box sx={{ 
              width: '100%', 
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 2
            }}>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name || 'Foto ampliada'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center'
        }}>
          {selectedPhoto?.size && (
            <Typography variant="body2" sx={{ color: 'white', mr: 2 }}>
              Tamanho: {(selectedPhoto.size / 1024).toFixed(1)} KB
            </Typography>
          )}
          <Button 
            onClick={handleClosePhotoModal}
            variant="contained"
            color="primary"
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Frota;