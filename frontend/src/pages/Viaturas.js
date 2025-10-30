import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
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
} from '@mui/material';
import {
  Add as AddIcon,
  DirectionsCar as CarIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { frotaService, uploadService } from '../services/api';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

const Viaturas = () => {
  const { currentUnit, availableUnits } = useTenant();
  const { isOperador } = useAuth();
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
  const [filteredViaturas, setFilteredViaturas] = useState([]);
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'viatura', 'view'
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulários
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Carregar viaturas
  const loadViaturas = useCallback(async () => {
    try {
      setViaturasLoading(true);
      const response = await frotaService.getViaturas();
      const viaturasData = response.data.viaturas || [];
      setViaturas(viaturasData);
      setFilteredViaturas(viaturasData);
    } catch (err) {
      console.error('Erro ao carregar viaturas:', err);
      setError('❌ Erro ao carregar viaturas');
    } finally {
      setViaturasLoading(false);
    }
  }, []);

  // Filtrar viaturas
  useEffect(() => {
    let filtered = viaturas;
    
    if (viaturasFilters.status) {
      filtered = filtered.filter(v => v.status === viaturasFilters.status);
    }
    if (viaturasFilters.setor) {
      filtered = filtered.filter(v => v.setor_responsavel === viaturasFilters.setor);
    }
    if (viaturasFilters.unidade_id) {
      filtered = filtered.filter(v => v.unidade_id === viaturasFilters.unidade_id);
    }
    if (viaturasFilters.search) {
      const searchTerm = viaturasFilters.search.toLowerCase();
      filtered = filtered.filter(v => 
        v.prefixo?.toLowerCase().includes(searchTerm) ||
        v.modelo?.toLowerCase().includes(searchTerm) ||
        v.placa?.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredViaturas(filtered);
  }, [viaturas, viaturasFilters]);

  // useEffect para carregar dados iniciais
  useEffect(() => {
    loadViaturas();
  }, [loadViaturas]);

  // useEffect para recarregar dados quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadViaturas();
    }
  }, [currentUnit, loadViaturas]);
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

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Função para upload de foto
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const response = await uploadService.uploadFoto(file, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });
      
      const fotoUrl = `http://localhost:5000${response.data.url}`;
      handleFormChange('foto', fotoUrl);
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      setError('Erro ao fazer upload da foto: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Função para remover foto
  const handleRemovePhoto = () => {
    handleFormChange('foto', '');
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

    const confirmMessage = `Tem certeza que deseja excluir a viatura ${item.prefixo}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await frotaService.deleteViatura(item.id);
      setError('✅ Viatura excluída com sucesso');
      loadViaturas();
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
      handleOpenDialog('viatura', currentSelectedItem);
    } else if (action === 'delete') {
      handleDelete(currentSelectedItem);
    }
  };

  const validateViatura = () => {
    const errors = {};
    
    if (!formData.tipo) errors.tipo = 'Tipo é obrigatório';
    if (!formData.prefixo) errors.prefixo = 'Prefixo é obrigatório';
    if (!formData.modelo) errors.modelo = 'Modelo é obrigatório';
    if (!formData.marca) errors.marca = 'Marca é obrigatória';
    if (!formData.placa) errors.placa = 'Placa é obrigatória';
    if (!formData.ano) {
      errors.ano = 'Ano é obrigatório';
    } else {
      const currentYear = new Date().getFullYear();
      if (formData.ano < 1900 || formData.ano > currentYear + 1) {
        errors.ano = `Ano deve estar entre 1900 e ${currentYear + 1}`;
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (dialogType === 'viatura') {
        if (!validateViatura()) {
          setError('Por favor, corrija os erros no formulário');
          return;
        }
        
        // Preparar dados para envio, garantindo que campos obrigatórios não sejam undefined
        const viaturaData = {
          tipo: formData.tipo || '',
          prefixo: formData.prefixo || '',
          modelo: formData.modelo || '',
          marca: formData.marca || '',
          ano: formData.ano || new Date().getFullYear(),
          placa: formData.placa || '',
          chassi: formData.chassi || '',
          renavam: formData.renavam || '',
          km_atual: formData.km_atual || 0,
          status: formData.status || 'Ativo',
          setor_responsavel: formData.setor_responsavel || '',
          unidade_id: formData.unidade_id || currentUnit?.id || null,
          observacoes: formData.observacoes || '',
          foto: formData.foto || ''
        };
        
        console.log('Dados sendo enviados:', viaturaData);
        console.log('Selected item:', selectedItem);
        console.log('FormData ID:', formData.id);
        
        // Usar formData.id como referência principal para edição
        const isEdit = formData.id || (selectedItem && selectedItem.id);
        const editId = formData.id || selectedItem?.id;
        
        console.log('É edição?', !!isEdit);
        
        if (isEdit) {
          console.log('Fazendo UPDATE para ID:', editId);
          await frotaService.updateViatura(editId, viaturaData);
        } else {
          console.log('Fazendo CREATE (novo)');
          await frotaService.createViatura(viaturaData);
        }
        loadViaturas();
      }
      handleCloseDialog();
    } catch (err) {
      console.error('Erro detalhado:', err.response?.data || err.message);
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao salvar');
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

  // (removido) formatDate não utilizado

  const renderViaturasTab = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por prefixo, modelo ou placa..."
          value={viaturasFilters.search}
          onChange={(e) => setViaturasFilters(prev => ({ ...prev, search: e.target.value }))}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ minWidth: 300 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={viaturasFilters.status}
            onChange={(e) => setViaturasFilters(prev => ({ ...prev, status: e.target.value }))}
            label="Status"
          >
            <MenuItem key="todos-status" value="">Todos</MenuItem>
            <MenuItem key="ativo" value="Ativo">Ativo</MenuItem>
            <MenuItem key="inativo" value="Inativo">Inativo</MenuItem>
            <MenuItem key="manutencao" value="Manutenção">Manutenção</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Foto</TableCell>
              <TableCell>Prefixo</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Placa</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Setor</TableCell>
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
            ) : filteredViaturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma viatura encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredViaturas.map((viatura) => (
                <TableRow key={viatura.id}>
                  <TableCell>
                    {viatura.foto ? (
                      <Avatar
                        src={viatura.foto}
                        alt={`Viatura ${viatura.prefixo}`}
                        sx={{ width: 60, height: 60 }}
                        variant="rounded"
                      />
                    ) : (
                      <Avatar
                        sx={{ width: 60, height: 60, bgcolor: 'grey.300' }}
                        variant="rounded"
                      >
                        <CarIcon />
                      </Avatar>
                    )}
                  </TableCell>
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
                  <TableCell>{viatura.setor_responsavel || '-'}</TableCell>
                  <TableCell>
                    <IconButton onClick={(e) => handleMenuOpen(e, viatura)}>
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

  const renderViaturasDialog = () => (
    <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
      <DialogTitle>
        {dialogType === 'view' ? 'Detalhes da Viatura' : selectedItem ? 'Editar Viatura' : 'Nova Viatura'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity={error.includes('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {dialogType === 'view' ? (
          // Visualização dos dados
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Tipo</Typography>
              <Typography variant="body1">{selectedItem?.tipo || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Prefixo</Typography>
              <Typography variant="body1">{selectedItem?.prefixo || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Modelo</Typography>
              <Typography variant="body1">{selectedItem?.modelo || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Marca</Typography>
              <Typography variant="body1">{selectedItem?.marca || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Ano</Typography>
              <Typography variant="body1">{selectedItem?.ano || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Placa</Typography>
              <Typography variant="body1">{selectedItem?.placa || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Status</Typography>
              <Chip
                label={selectedItem?.status || '-'}
                color={getStatusColor(selectedItem?.status)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">KM Atual</Typography>
              <Typography variant="body1">{selectedItem?.km_atual || '-'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Observações</Typography>
              <Typography variant="body1">{selectedItem?.observacoes || '-'}</Typography>
            </Grid>
          </Grid>
        ) : (
          // Formulário de edição/criação
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.tipo}>
                <InputLabel>Tipo *</InputLabel>
                <Select
                  value={formData.tipo || ''}
                  onChange={(e) => handleFormChange('tipo', e.target.value)}
                  label="Tipo *"
                >
                  <MenuItem key="abtf" value="ABTF">ABTF - Auto Bomba Tanque Florestal</MenuItem>
                  <MenuItem key="abt" value="ABT">ABT - Auto Bomba Tanque</MenuItem>
                  <MenuItem key="ur" value="UR">UR - Unidade de Resgate</MenuItem>
                  <MenuItem key="asa" value="ASA">ASA - Auto Socorro de Altura</MenuItem>
                  <MenuItem key="mob" value="MOB">MOB - Motobomba</MenuItem>
                  <MenuItem key="av" value="AV">AV - Ambulância</MenuItem>
                </Select>
                {formErrors.tipo && (
                  <Typography variant="caption" color="error">{formErrors.tipo}</Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prefixo *"
                value={formData.prefixo || ''}
                onChange={(e) => handleFormChange('prefixo', e.target.value)}
                error={!!formErrors.prefixo}
                helperText={formErrors.prefixo}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Modelo *"
                value={formData.modelo || ''}
                onChange={(e) => handleFormChange('modelo', e.target.value)}
                error={!!formErrors.modelo}
                helperText={formErrors.modelo}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Marca *"
                value={formData.marca || ''}
                onChange={(e) => handleFormChange('marca', e.target.value)}
                error={!!formErrors.marca}
                helperText={formErrors.marca}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ano *"
                type="number"
                value={formData.ano || ''}
                onChange={(e) => handleFormChange('ano', parseInt(e.target.value))}
                error={!!formErrors.ano}
                helperText={formErrors.ano}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Placa *"
                value={formData.placa || ''}
                onChange={(e) => handleFormChange('placa', e.target.value)}
                error={!!formErrors.placa}
                helperText={formErrors.placa}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Chassi"
                value={formData.chassi || ''}
                onChange={(e) => handleFormChange('chassi', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RENAVAM"
                value={formData.renavam || ''}
                onChange={(e) => handleFormChange('renavam', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="KM Atual"
                type="number"
                value={formData.km_atual || ''}
                onChange={(e) => handleFormChange('km_atual', parseInt(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status || 'Ativo'}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem key="ativo-form" value="Ativo">Ativo</MenuItem>
                  <MenuItem key="inativo-form" value="Inativo">Inativo</MenuItem>
                  <MenuItem key="manutencao-form" value="Manutenção">Manutenção</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Setor Responsável"
                value={formData.setor_responsavel || ''}
                onChange={(e) => handleFormChange('setor_responsavel', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Unidade BM Atual</InputLabel>
                <Select
                  value={formData.unidade_id || ''}
                  onChange={(e) => handleFormChange('unidade_id', e.target.value)}
                  label="Unidade BM Atual"
                >
                  <MenuItem key="selecione-unidade" value="">
                    <em>Selecione uma unidade</em>
                  </MenuItem>
                  {availableUnits.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.codigo} - {unit.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={formData.observacoes || ''}
                onChange={(e) => handleFormChange('observacoes', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Foto da Viatura
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {formData.foto ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Avatar
                      src={formData.foto}
                      alt="Foto da viatura"
                      sx={{ width: 120, height: 120 }}
                      variant="rounded"
                    />
                    <IconButton
                      onClick={handleRemovePhoto}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' },
                        width: 24,
                        height: 24
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      border: '2px dashed #ccc',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                    onClick={() => document.getElementById('photo-upload-input').click()}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                  </Box>
                )}
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
                <Button
                  variant="outlined"
                  startIcon={uploadingPhoto ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
                  onClick={() => document.getElementById('photo-upload-input').click()}
                  disabled={uploadingPhoto}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {uploadingPhoto ? 'Enviando...' : (formData.foto ? 'Alterar Foto' : 'Adicionar Foto')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancelar</Button>
        {dialogType !== 'view' && (
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : (selectedItem ? 'Atualizar' : 'Criar')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestão de Viaturas
      </Typography>
      
      {error && (
        <Alert 
          severity={error.includes('✅') ? 'success' : 'error'} 
          sx={{ mb: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {renderViaturasTab()}
      {renderViaturasDialog()}

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem key="view-viatura" onClick={() => handleMenuAction('view')}>
          <ViewIcon sx={{ mr: 1 }} /> Visualizar
        </MenuItem>
        <MenuItem key="edit-viatura" disabled={isOperador()} onClick={() => handleMenuAction('edit')}>
          <EditIcon sx={{ mr: 1 }} /> Editar
        </MenuItem>
        <MenuItem key="delete-viatura" disabled={isOperador()} onClick={() => handleMenuAction('delete')}>
          <DeleteIcon sx={{ mr: 1 }} /> Excluir
        </MenuItem>
      </Menu>

      {/* Botão flutuante para adicionar nova viatura */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        disabled={isOperador()}
        onClick={() => handleOpenDialog('viatura')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default Viaturas;