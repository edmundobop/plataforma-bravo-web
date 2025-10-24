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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  DirectionsCar as CarIcon,
  Assignment as ChecklistIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  LocalGasStation as FuelIcon,
  Speed as SpeedIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Description as TemplateIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { checklistService } from '../services/api';
import ChecklistViatura from '../components/ChecklistViatura';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import TemplateBuilder from '../components/TemplateBuilder';

const Checklists = () => {
  const { currentUnit } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState(0);
  const [checklists, setChecklists] = useState([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [checklistsFilters, setChecklistsFilters] = useState({
    viatura_id: '',
    status: '',
    data_inicio: '',
    data_fim: '',
    tipo_checklist: '',
    ala_servico: '',
  });
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Estados para formulários
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  
  // Estado de debug (remover em produção)
  const [debugInfo, setDebugInfo] = useState({
    dialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    selectedItem: selectedItem?.id || null,
    dialogType
  });
  
  // Atualizar debug info quando estados mudarem
  useEffect(() => {
    setDebugInfo({
      dialogOpen,
      editDialogOpen,
      deleteDialogOpen,
      selectedItem: selectedItem?.id || null,
      dialogType
    });
  }, [dialogOpen, editDialogOpen, deleteDialogOpen, selectedItem, dialogType]);
  
  // Carregar checklists
  const loadChecklists = useCallback(async () => {
    try {
      setChecklistsLoading(true);
      console.log('🔍 Carregando checklists...');
      console.log('🏢 CurrentUnit:', currentUnit);
      
      // Preparar filtros incluindo unidade se disponível
      const filters = { ...checklistsFilters };
      if (currentUnit?.id) {
        filters.unidade_id = currentUnit.id;
        console.log('📍 Aplicando filtro de unidade:', currentUnit.id);
      } else {
        console.warn('⚠️ CurrentUnit não definido ou sem ID');
      }
      
      console.log('📤 Filtros da requisição:', filters);
      const response = await checklistService.getChecklists(filters);
      console.log('📥 Resposta da API:', response);
      
      const checklistsData = Array.isArray(response.checklists) ? response.checklists : [];
      console.log('📋 Checklists carregados:', checklistsData.length, checklistsData);
      
      setChecklists(checklistsData);
    } catch (err) {
      console.error('❌ Erro ao carregar checklists:', err);
      setError('❌ Erro ao carregar checklists');
    } finally {
      setChecklistsLoading(false);
    }
  }, [checklistsFilters, currentUnit]);

  // useEffect para carregar dados iniciais
  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  // useEffect para recarregar dados quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadChecklists();
    }
  }, [currentUnit, loadChecklists]);

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedItem(null);
    setFormData({});
    setFormErrors({});
  };

  const handleMenuOpen = (event, item) => {
    console.log('📋 Abrindo menu para item:', item);
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
    console.log('✅ Menu aberto, item selecionado:', item?.id);
  };

  const handleMenuClose = () => {
    console.log('❌ Fechando menu');
    setAnchorEl(null);
    // Não limpar selectedItem aqui para preservar durante as ações
  };

  const handleMenuAction = async (action) => {
    console.log('🎯 Ação do menu:', action, 'Item selecionado:', selectedItem);
    
    if (!selectedItem) {
      console.error('❌ Nenhum item selecionado');
      return;
    }

    // Preservar o item selecionado para as ações
    const itemToProcess = selectedItem;
    
    try {
      if (action === 'view') {
        console.log('👁️ Executando ação de visualizar');
        await handleViewChecklist(itemToProcess);
      } else if (action === 'edit') {
        console.log('✏️ Executando ação de editar');
        handleEditChecklist(itemToProcess);
      } else if (action === 'delete') {
        console.log('🗑️ Executando ação de excluir');
        // Preservar o item para a exclusão
        setSelectedItem(itemToProcess);
        setDeleteDialogOpen(true);
        console.log('✅ Diálogo de exclusão aberto');
      }
    } catch (err) {
      console.error('❌ Erro ao executar ação:', err);
      setError(`Erro ao executar ação: ${err.message}`);
    } finally {
      handleMenuClose();
    }
  };

  // Função para visualizar checklist com dados completos
  const handleViewChecklist = async (checklist) => {
    try {
      setActionLoading(true);
      console.log('🔍 Carregando detalhes do checklist:', checklist.id);
      const response = await checklistService.getChecklist(checklist.id);
      console.log('📥 Dados completos do checklist:', response);
      
      // Garantir que temos os dados corretos
      const fullChecklist = response.checklist || response;
      setSelectedItem(fullChecklist);
      setDialogType('view');
      setDialogOpen(true);
      
      console.log('✅ Diálogo de visualização aberto');
    } catch (err) {
      console.error('❌ Erro ao carregar checklist:', err);
      setError('Erro ao carregar detalhes do checklist');
    } finally {
      setActionLoading(false);
    }
  };

  // Função para editar checklist
  const handleEditChecklist = (checklist) => {
    console.log('✏️ Abrindo diálogo de edição para:', checklist);
    setSelectedItem(checklist);
    setFormData({
      km_inicial: checklist.km_inicial || '',
      combustivel_percentual: checklist.combustivel_percentual || '',
      observacoes_gerais: checklist.observacoes_gerais || '',
      status: checklist.status || 'em_andamento'
    });
    setEditDialogOpen(true);
    console.log('✅ Diálogo de edição aberto');
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    
    try {
      setActionLoading(true);
      await checklistService.deleteChecklist(selectedItem.id);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      await loadChecklists();
      setError('');
    } catch (err) {
      console.error('Erro ao excluir checklist:', err);
      setError('Erro ao excluir checklist. Verifique suas permissões.');
    } finally {
      setActionLoading(false);
    }
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    
    try {
      setActionLoading(true);
      await checklistService.updateChecklist(selectedItem.id, formData);
      setEditDialogOpen(false);
      setSelectedItem(null);
      setFormData({});
      await loadChecklists();
      setError('');
    } catch (err) {
      console.error('Erro ao atualizar checklist:', err);
      setError('Erro ao atualizar checklist');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFabClick = () => {
    if (activeTab === 0) {
      // Aba de Checklists - abrir diálogo de checklist
      setChecklistDialogOpen(true);
    } else if (activeTab === 1) {
      // Aba de Templates - o TemplateBuilder tem seu próprio botão
      // Não fazemos nada aqui pois o TemplateBuilder gerencia seus próprios diálogos
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'finalizado':
        return 'success';
      case 'pendente':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Função para renderizar o conteúdo da aba de Modelos de Checklists
  const renderModelosTab = () => (
    <TemplateBuilder />
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header com Abas */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChecklistIcon sx={{ color: 'primary.main' }} />
          Checklists
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Gerencie checklists e modelos de checklists das viaturas
        </Typography>
        
        {/* Abas */}
        <Tabs 
          value={activeTab} 
          onChange={(event, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="Checklists de Viaturas" 
            icon={<ChecklistIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Modelos de Checklists" 
            icon={<TemplateIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Debug Info - Remover em produção */}
      {process.env.NODE_ENV === 'development' && (
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
          <Typography variant="caption">
            <strong>Debug:</strong> dialogOpen: {debugInfo.dialogOpen.toString()}, 
            editDialogOpen: {debugInfo.editDialogOpen.toString()}, 
            deleteDialogOpen: {debugInfo.deleteDialogOpen.toString()}, 
            selectedItem: {debugInfo.selectedItem || 'null'}, 
            dialogType: {debugInfo.dialogType || 'null'}
          </Typography>
        </Alert>
      )}

      {/* Conteúdo das Abas */}
      {activeTab === 0 && (
        <>
          {/* Filtros */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon /> Filtros de Pesquisa
            </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Viatura</InputLabel>
              <Select
                value={checklistsFilters.viatura_id || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                label="Viatura"
              >
                <MenuItem key="todas-viaturas-checklist" value="">Todas</MenuItem>
                {/* Viaturas serão carregadas da página separada */}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={checklistsFilters.status || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem key="todos-status-checklist" value="">Todos</MenuItem>
                <MenuItem key="pendente-checklist" value="pendente">Pendente</MenuItem>
                <MenuItem key="finalizado-checklist" value="finalizado">Finalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={checklistsFilters.data_inicio}
              onChange={(e) => setChecklistsFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={checklistsFilters.data_fim}
              onChange={(e) => setChecklistsFilters(prev => ({ ...prev, data_fim: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Checklist</InputLabel>
              <Select
                value={checklistsFilters.tipo_checklist || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, tipo_checklist: e.target.value }))}
                label="Tipo de Checklist"
              >
                <MenuItem key="todos-tipos-checklist" value="">Todos</MenuItem>
                <MenuItem key="diario-checklist" value="Diário">Diário</MenuItem>
                <MenuItem key="semanal-checklist" value="Semanal">Semanal</MenuItem>
                <MenuItem key="mensal-checklist" value="Mensal">Mensal</MenuItem>
                <MenuItem key="pre-operacional-checklist" value="Pré-Operacional">Pré-Operacional</MenuItem>
                <MenuItem key="pos-operacional-checklist" value="Pós-Operacional">Pós-Operacional</MenuItem>
                <MenuItem key="manutencao-preventiva-checklist" value="Manutenção Preventiva">Manutenção Preventiva</MenuItem>
                <MenuItem key="inspecao-seguranca-checklist" value="Inspeção de Segurança">Inspeção de Segurança</MenuItem>
                <MenuItem key="vistoria-tecnica-checklist" value="Vistoria Técnica">Vistoria Técnica</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <FormControl fullWidth>
              <InputLabel>Ala</InputLabel>
              <Select
                value={checklistsFilters.ala_servico || ''}
                onChange={(e) => setChecklistsFilters(prev => ({ ...prev, ala_servico: e.target.value }))}
                label="Ala"
              >
                <MenuItem key="todas-alas-checklist" value="">Todas</MenuItem>
                <MenuItem key="alpha-ala" value="Alpha">Alpha</MenuItem>
                <MenuItem key="bravo-ala" value="Bravo">Bravo</MenuItem>
                <MenuItem key="charlie-ala" value="Charlie">Charlie</MenuItem>
                <MenuItem key="delta-ala" value="Delta">Delta</MenuItem>
                <MenuItem key="adm-ala" value="ADM">ADM</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setChecklistsFilters({
              viatura_id: '',
              status: '',
              data_inicio: '',
              data_fim: '',
              tipo_checklist: '',
              ala_servico: '',
            })}
            startIcon={<FilterIcon />}
          >
            Limpar Filtros
          </Button>
        </Box>
      </Box>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Viatura</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Ala</TableCell>
              <TableCell>KM Inicial</TableCell>
              <TableCell>Combustível</TableCell>
              <TableCell>Situação</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Usuário</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {checklistsLoading ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : checklists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  Nenhum checklist encontrado
                </TableCell>
              </TableRow>
            ) : (
              checklists.map((checklist) => (
                <TableRow key={checklist.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CarIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {checklist.placa || checklist.viatura_prefixo || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {checklist.modelo || checklist.viatura_modelo || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(checklist.data_checklist)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.tipo_checklist || 'N/A'}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.ala_servico || 'N/A'}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SpeedIcon sx={{ color: 'info.main', fontSize: 16 }} />
                      <Typography variant="body2">
                        {checklist.km_inicial ? `${Number(checklist.km_inicial).toLocaleString('pt-BR')} km` : '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FuelIcon sx={{ 
                        color: checklist.combustivel_percentual > 50 ? 'success.main' : 
                               checklist.combustivel_percentual > 25 ? 'warning.main' : 'error.main',
                        fontSize: 16 
                      }} />
                      <Typography variant="body2">
                        {checklist.combustivel_percentual}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.situacao || 'Sem Alteração'}
                      color={checklist.situacao === 'Com Alteração' ? 'warning' : 'success'}
                      size="small"
                      icon={checklist.situacao === 'Com Alteração' ? <WarningIcon /> : <CheckCircleIcon />}
                      sx={{
                        fontWeight: checklist.situacao === 'Com Alteração' ? 'bold' : 'normal',
                        '& .MuiChip-label': {
                          color: checklist.situacao === 'Com Alteração' ? 'warning.contrastText' : 'success.contrastText'
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={checklist.status}
                      color={getStatusColor(checklist.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                      <Typography variant="body2">
                        {checklist.usuario_nome}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={(e) => handleMenuOpen(e, checklist)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
            </TableContainer>
        </>
      )}

      {/* Aba de Templates */}
      {activeTab === 1 && renderModelosTab()}

      {/* FAB */}
      {activeTab === 0 && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleFabClick}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem key="view-checklist" onClick={() => handleMenuAction('view')}>
          <ViewIcon sx={{ mr: 1 }} /> Visualizar
        </MenuItem>
        {/* Editar: permitido para Administrador, Chefe e Operador (se for o próprio checklist) */}
        {(user?.perfil_nome === 'Administrador' || user?.perfil_nome === 'Chefe' || 
          (user?.perfil_nome === 'Operador' && selectedItem?.usuario_id === user?.id)) && (
          <MenuItem key="edit-checklist" onClick={() => handleMenuAction('edit')}>
            <EditIcon sx={{ mr: 1 }} /> Editar
          </MenuItem>
        )}
        {/* Excluir: apenas Administrador e Chefe */}
        {(user?.perfil_nome === 'Administrador' || user?.perfil_nome === 'Chefe') && (
          <MenuItem key="delete-checklist" onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} /> Excluir
          </MenuItem>
        )}
      </Menu>

      {/* Diálogo de visualização */}
      <Dialog open={dialogOpen && dialogType === 'view'} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.50', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
              Visualizar Checklist
            </Typography>
            {selectedItem && (selectedItem.placa || selectedItem.viatura_prefixo) && (
              <Chip 
                label={selectedItem.placa || selectedItem.viatura_prefixo} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ ml: 1, fontWeight: 'bold' }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem ? (
            <Box sx={{ mt: 2 }}>
              {console.log('🔍 Renderizando diálogo de visualização com dados:', selectedItem) || null}
              {/* Informações do Checklist */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: 'grey.700' }}>
                📋 Informações do Checklist
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Data do Checklist</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {formatDate(selectedItem.data_checklist)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Tipo</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {selectedItem.tipo_checklist || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">KM Inicial</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {selectedItem.km_inicial ? `${Number(selectedItem.km_inicial).toLocaleString('pt-BR')} km` : 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Combustível</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {selectedItem.combustivel_percentual}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Observações Gerais */}
              {selectedItem.observacoes_gerais && (
                <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Observações Gerais:</strong> {selectedItem.observacoes_gerais}
                  </Typography>
                </Alert>
              )}

              {/* Observações por Item */}
              {selectedItem.itens?.filter(item => item.observacoes).length > 0 && (
                <Box sx={{ mt: 2 }}>
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
            </Box>
            ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Nenhum checklist selecionado para edição
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo do ChecklistViatura */}
      <ChecklistViatura
        open={checklistDialogOpen}
        onClose={() => setChecklistDialogOpen(false)}
        onSuccess={() => {
          setChecklistDialogOpen(false);
          loadChecklists();
        }}
      />

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ color: 'error.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon />
            Confirmar Exclusão
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este checklist?
          </Typography>
          {selectedItem && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Viatura:</strong> {selectedItem.viatura_prefixo || selectedItem.placa}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Data:</strong> {formatDate(selectedItem.data_checklist)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Tipo:</strong> {selectedItem.tipo_checklist}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {actionLoading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de edição */}
      <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'warning.50', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon sx={{ color: 'warning.main' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
              Editar Checklist
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedItem ? (
            <>
              {console.log('✏️ Renderizando diálogo de edição com dados:', selectedItem) || null}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Viatura:</strong> {selectedItem.placa || selectedItem.viatura_prefixo || 'N/A'} - {selectedItem.modelo || selectedItem.viatura_modelo || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Data:</strong> {formatDate(selectedItem.data_checklist)}
                </Typography>
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="KM Inicial"
                    type="number"
                    value={formData.km_inicial || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, km_inicial: parseInt(e.target.value) || 0 }))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Combustível (%)"
                    type="number"
                    value={formData.combustivel_percentual || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, combustivel_percentual: parseInt(e.target.value) || 0 }))}
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status || 'em_andamento'}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      label="Status"
                    >
                      <MenuItem key="em-andamento-status" value="em_andamento">Em Andamento</MenuItem>
                      <MenuItem key="finalizado-status" value="finalizado">Finalizado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observações Gerais"
                    multiline
                    rows={3}
                    value={formData.observacoes_gerais || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes_gerais: e.target.value }))}
                  />
                </Grid>
              </Grid>
              </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Nenhum checklist selecionado para edição
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {actionLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Checklists;