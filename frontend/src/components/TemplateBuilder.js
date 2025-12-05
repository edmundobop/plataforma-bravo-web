import React, { useState, useEffect, useRef } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  ListItemAvatar,
  Divider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  DragIndicator as DragIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon,
  CheckBox as CheckBoxIcon,
  CheckBox as CheckboxIcon,
  TextFields as TextIcon,
  PhotoCamera as PhotoIcon,
  Star as RatingIcon,
  DateRange as DateIcon,
  DirectionsCar as CarIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { templateService, uploadService } from '../services/api';
import { useTenant } from '../contexts/TenantContext';

const TemplateBuilder = () => {
  const { currentUnit } = useTenant();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'create', 'edit', 'view'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulário de template
  const [templateForm, setTemplateForm] = useState({
    nome: '',
    descricao: '',
    tipo_viatura: '',
    categorias: []
  });
  
  // Estados para categoria sendo editada
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    nome: '',
    descricao: '',
    imagem_url: '',
    itens: []
  });
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(-1);
  
  // Estados para item sendo editado
  const [itemDialog, setItemDialog] = useState(false);
  const [itemForm, setItemForm] = useState({
    nome: '',
    tipo: 'checkbox',
    obrigatorio: true,
    imagem_url: ''
  });
  const [editingItemIndex, setEditingItemIndex] = useState(-1);

  const categoryImageInputRef = useRef(null);
  const itemImageInputRef = useRef(null);

  const buildAbsoluteUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
    const base = process.env.REACT_APP_API_BASE_URL || '';
    const origin = base ? base.replace(/\/api$/,'') : 'http://localhost:5000';
    return `${origin}${relativeUrl}`;
  };

  const handleUploadCategoriaFoto = async (file) => {
    try {
      setLoading(true);
      const res = await uploadService.uploadFoto(file);
      const url = res?.data?.url || '';
      const absolute = buildAbsoluteUrl(url);
      setCategoryForm({ ...categoryForm, imagem_url: absolute });
      setSuccess('Foto enviada com sucesso');
    } catch (err) {
      setError('Erro ao enviar foto');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadItemFoto = async (file) => {
    try {
      setLoading(true);
      const res = await uploadService.uploadFoto(file);
      const url = res?.data?.url || '';
      const absolute = buildAbsoluteUrl(url);
      setItemForm({ ...itemForm, imagem_url: absolute });
      setSuccess('Foto enviada com sucesso');
    } catch (err) {
      setError('Erro ao enviar foto');
    } finally {
      setLoading(false);
    }
  };

  // Tipos de viatura disponíveis
  const tiposViatura = [
    { value: 'ABTF', label: 'ABTF - Auto Bomba Tanque Florestal' },
    { value: 'ABT', label: 'ABT - Auto Bomba Tanque' },
    { value: 'UR', label: 'UR - Unidade de Resgate' },
    { value: 'ASA', label: 'ASA - Auto Socorro de Altura' },
    { value: 'MOB', label: 'MOB - Motobomba' },
    { value: 'AV', label: 'AV - Ambulância' }
  ];

  const [filters, setFilters] = useState({ nome: '', tipo_viatura: '' });



  // Tipos de item disponíveis
  const tiposItem = [
    { value: 'checkbox', label: 'Checkbox', icon: <CheckBoxIcon /> },
    { value: 'text', label: 'Texto', icon: <TextIcon /> },
    { value: 'number', label: 'Número', icon: <TextIcon /> },
    { value: 'photo', label: 'Foto', icon: <PhotoIcon /> },
    { value: 'rating', label: 'Avaliação (1-5)', icon: <RatingIcon /> }
  ];

  // Carregar templates
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await templateService.getTemplates();
      // A API retorna um array diretamente, não um objeto com propriedade templates
      const templates = Array.isArray(response) ? response : (response.templates || []);
      console.log('Templates carregados:', templates);
      setTemplates(templates);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setError('Erro ao carregar templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Recarregar templates quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadTemplates();
    }
  }, [currentUnit]);

  // Handlers para template
  const handleOpenTemplateDialog = async (type, template = null) => {
    setDialogType(type);
    setSelectedTemplate(template);
    
    if (template) {
      try {
        setLoading(true);
        // Buscar dados completos do template incluindo categorias e itens
        const templateCompleto = await templateService.getTemplate(template.id);
        setTemplateForm({
          nome: templateCompleto.nome || '',
          descricao: templateCompleto.descricao || '',
          tipo_viatura: templateCompleto.tipo_viatura || '',
          categorias: templateCompleto.categorias || []
        });
      } catch (err) {
        console.error('Erro ao carregar template completo:', err);
        setError('Erro ao carregar dados do template');
        // Fallback para dados básicos
        setTemplateForm({
          nome: template.nome || '',
          descricao: template.descricao || '',
          tipo_viatura: template.tipo_viatura || '',
          categorias: []
        });
      } finally {
        setLoading(false);
      }
    } else {
      setTemplateForm({
        nome: '',
        descricao: '',
        tipo_viatura: '',
        categorias: []
      });
    }
    
    setDialogOpen(true);
  };

  const handleCloseTemplateDialog = () => {
    setDialogOpen(false);
    setSelectedTemplate(null);
    setTemplateForm({ nome: '', descricao: '', tipo_viatura: '', categorias: [] });
    setError('');
    setSuccess('');
  };

  const handleSaveTemplate = async () => {
    try {
      setLoading(true);
      
      if (!templateForm.nome || !templateForm.tipo_viatura) {
        setError('Nome e tipo de viatura são obrigatórios');
        return;
      }

      const templateData = {
        ...templateForm,
        categorias: templateForm.categorias.map((cat, catIndex) => ({
          ...cat,
          ordem: catIndex + 1,
          itens: cat.itens.map((item, itemIndex) => ({
            ...item,
            ordem: itemIndex + 1
          }))
        }))
      };

      if (selectedTemplate) {
        await templateService.updateTemplate(selectedTemplate.id, templateData);
        setSuccess('Template atualizado com sucesso!');
      } else {
        await templateService.createTemplate(templateData);
        setSuccess('Template criado com sucesso!');
      }
      
      await loadTemplates();
      setTimeout(() => {
        handleCloseTemplateDialog();
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar template:', err);
      setError('Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Tem certeza que deseja excluir este template?')) {
      try {
        await templateService.deleteTemplate(templateId);
        setSuccess('Template excluído com sucesso!');
        await loadTemplates();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Erro ao excluir template:', err);
        setError('Erro ao excluir template');
      }
    }
  };

  // Handlers para categoria
  const handleOpenCategoryDialog = (categoryIndex = -1) => {
    setEditingCategoryIndex(categoryIndex);
    
    if (categoryIndex >= 0) {
      const categoria = templateForm.categorias[categoryIndex];
      setCategoryForm({
        ...categoria,
        localizacao: categoria.localizacao || 'personalizada'
      });
    } else {
      setCategoryForm({ 
        nome: '', 
        descricao: '', 
        imagem_url: '', 
        localizacao: 'basicos',
        itens: [] 
      });
    }
    
    setCategoryDialog(true);
  };

  const handleSaveCategory = () => {
    const newCategorias = [...templateForm.categorias];
    
    const categoriaFinal = { ...categoryForm };
    
    if (editingCategoryIndex >= 0) {
      newCategorias[editingCategoryIndex] = categoriaFinal;
    } else {
      newCategorias.push(categoriaFinal);
    }
    
    setTemplateForm({ ...templateForm, categorias: newCategorias });
    setCategoryDialog(false);
    setCategoryForm({ nome: '', descricao: '', imagem_url: '', itens: [] });
  };

  const handleDeleteCategory = (categoryIndex) => {
    const newCategorias = templateForm.categorias.filter((_, index) => index !== categoryIndex);
    setTemplateForm({ ...templateForm, categorias: newCategorias });
  };

  // Handlers para drag & drop
  const handleDragStart = (e, type, index, parentIndex = null) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, index, parentIndex }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropCategory = (e, targetIndex) => {
    e.preventDefault();
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    if (dragData.type === 'categoria' && dragData.index !== targetIndex) {
      const newCategorias = [...templateForm.categorias];
      const draggedItem = newCategorias.splice(dragData.index, 1)[0];
      newCategorias.splice(targetIndex, 0, draggedItem);
      setTemplateForm({ ...templateForm, categorias: newCategorias });
    }
  };

  const handleDropItem = (e, targetIndex, categoryIndex) => {
    e.preventDefault();
    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    if (dragData.type === 'item' && dragData.parentIndex === categoryIndex && dragData.index !== targetIndex) {
      const newCategorias = [...templateForm.categorias];
      const categoria = { ...newCategorias[categoryIndex] };
      const newItens = [...categoria.itens];
      const draggedItem = newItens.splice(dragData.index, 1)[0];
      newItens.splice(targetIndex, 0, draggedItem);
      categoria.itens = newItens;
      newCategorias[categoryIndex] = categoria;
      setTemplateForm({ ...templateForm, categorias: newCategorias });
    }
  };

  // Handlers para item
  const handleOpenItemDialog = (itemIndex = -1) => {
    setEditingItemIndex(itemIndex);
    
    if (itemIndex >= 0) {
      setItemForm(categoryForm.itens[itemIndex]);
    } else {
      setItemForm({ nome: '', tipo: 'checkbox', obrigatorio: true, imagem_url: '' });
    }
    
    setItemDialog(true);
  };

  const handleSaveItem = () => {
    const newItens = [...categoryForm.itens];
    
    if (editingItemIndex >= 0) {
      newItens[editingItemIndex] = itemForm;
    } else {
      newItens.push(itemForm);
    }
    
    setCategoryForm({ ...categoryForm, itens: newItens });
    setItemDialog(false);
    setItemForm({ nome: '', tipo: 'checkbox', obrigatorio: true, imagem_url: '' });
  };

  const handleDeleteItem = (itemIndex) => {
    const newItens = categoryForm.itens.filter((_, index) => index !== itemIndex);
    setCategoryForm({ ...categoryForm, itens: newItens });
  };

  // Handlers de menu
  const handleMenuOpen = (event, template) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Não resetar selectedTemplate aqui para manter o estado durante a edição
  };

  const handleMenuAction = (action) => {
    if (selectedTemplate) {
      if (action === 'view') {
        handleOpenTemplateDialog('view', selectedTemplate);
      } else if (action === 'edit') {
        handleOpenTemplateDialog('edit', selectedTemplate);
      } else if (action === 'delete') {
        handleDeleteTemplate(selectedTemplate.id);
      }
    }
    handleMenuClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const byName = filters.nome
      ? (t.nome || '').toLowerCase().includes(filters.nome.toLowerCase())
      : true;
    const byTipo = filters.tipo_viatura ? t.tipo_viatura === filters.tipo_viatura : true;
    return byName && byTipo;
  });

  return (
    <Box>
      {/* Alertas */}
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

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 2 : 0 }}>
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon /> Templates de Checklists
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crie e gerencie templates personalizados para cada tipo de viatura
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenTemplateDialog('create')}
          fullWidth={isMobile}
        >
          Novo Template
        </Button>
      </Box>

      {/* Filtros */}
      <Accordion defaultExpanded={!isMobile} sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>Filtros</AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Buscar por nome"
                value={filters.nome}
                onChange={(e) => setFilters((prev) => ({ ...prev, nome: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Viatura</InputLabel>
                <Select
                  value={filters.tipo_viatura}
                  onChange={(e) => setFilters((prev) => ({ ...prev, tipo_viatura: e.target.value }))}
                  label="Tipo de Viatura"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {tiposViatura.map((tipo) => (
                    <MenuItem key={tipo.value} value={tipo.value}>{tipo.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {}}
              >
                Filtrar
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="text"
                onClick={() => setFilters({ nome: '', tipo_viatura: '' })}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Tabela de Templates */}
      <TableContainer component={Paper}>
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            {isMobile ? (
              <TableRow>
                <TableCell>Template</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell>Nome do Template</TableCell>
                <TableCell>Tipo de Viatura</TableCell>
                <TableCell>Categorias</TableCell>
                <TableCell>Itens Total</TableCell>
                <TableCell>Criado em</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {templatesLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Nenhum template encontrado. Clique em "Novo Template" para criar o primeiro.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => {
                const totalItens = template.categorias?.reduce((total, cat) => total + (cat.itens?.length || 0), 0) || 0;
                
                return (
                  <TableRow key={template.id}>
                    {isMobile ? (
                      <>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {template.nome}
                            </Typography>
                            {template.descricao && (
                              <Typography variant="caption" color="text.secondary">
                                {template.descricao}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              <Chip label={template.tipo_viatura} size="small" color="primary" variant="outlined" icon={<CarIcon />} />
                              <Chip label={`${template.categorias?.length || 0} cat.`} size="small" variant="outlined" />
                              <Chip label={`${totalItens} itens`} size="small" variant="outlined" />
                              <Chip label={formatDate(template.created_at)} size="small" variant="outlined" />
                              <Chip label={template.ativo ? 'Ativo' : 'Inativo'} size="small" color={template.ativo ? 'success' : 'default'} variant="outlined" />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={(e) => handleMenuOpen(e, template)}>
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {template.nome}
                            </Typography>
                            {template.descricao && (
                              <Typography variant="caption" color="text.secondary">
                                {template.descricao}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={template.tipo_viatura}
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<CarIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {template.categorias?.length || 0} categoria(s)
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {totalItens} item(ns)
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(template.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={template.ativo ? 'Ativo' : 'Inativo'}
                            size="small"
                            color={template.ativo ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={(e) => handleMenuOpen(e, template)}>
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })
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
        <MenuItem key="view-template" onClick={() => handleMenuAction('view')}>
          <ViewIcon sx={{ mr: 1 }} /> Visualizar
        </MenuItem>
        <MenuItem key="edit-template" onClick={() => handleMenuAction('edit')}>
          <EditIcon sx={{ mr: 1 }} /> Editar
        </MenuItem>
        <MenuItem key="delete-template" onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Excluir
        </MenuItem>
      </Menu>

      {/* Diálogo principal do template */}
      <Dialog open={dialogOpen} onClose={handleCloseTemplateDialog} maxWidth="lg" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon />
            {dialogType === 'create' && 'Criar Novo Template'}
            {dialogType === 'edit' && 'Editar Template'}
            {dialogType === 'view' && 'Visualizar Template'}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
          {/* Informações básicas do template */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Template"
                value={templateForm.nome}
                onChange={(e) => setTemplateForm({ ...templateForm, nome: e.target.value })}
                disabled={dialogType === 'view'}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Viatura</InputLabel>
                <Select
                  value={templateForm.tipo_viatura}
                  onChange={(e) => setTemplateForm({ ...templateForm, tipo_viatura: e.target.value })}
                  label="Tipo de Viatura"
                  disabled={dialogType === 'view'}
                >
                  {tiposViatura.map((tipo) => (
                    <MenuItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={templateForm.descricao}
                onChange={(e) => setTemplateForm({ ...templateForm, descricao: e.target.value })}
                disabled={dialogType === 'view'}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Categorias */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Categorias</Typography>
            {dialogType !== 'view' && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCategoryDialog()}
              >
                Adicionar Categoria
              </Button>
            )}
          </Box>

          {templateForm.categorias.length === 0 ? (
            <Alert severity="info">
              Nenhuma categoria adicionada. Clique em "Adicionar Categoria" para começar.
            </Alert>
          ) : (
            templateForm.categorias.map((categoria, catIndex) => {
              // Estilo padrão para categorias
              const getCategoryStyle = () => {
                return {
                  mb: 2,
                  cursor: dialogType !== 'view' ? 'move' : 'default',
                  border: '2px solid',
                  borderRadius: 2,
                  boxShadow: 2,
                  borderColor: '#1976d2',
                  backgroundColor: '#e3f2fd',
                  '& .MuiAccordionSummary-root': {
                    backgroundColor: '#bbdefb',
                    borderRadius: '8px 8px 0 0'
                  }
                };
              };
              
              return (
              <Box key={catIndex}>
                <Accordion 
                  sx={getCategoryStyle()}
                  draggable={dialogType !== 'view'}
                  onDragStart={(e) => handleDragStart(e, 'categoria', catIndex)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropCategory(e, catIndex)}
                >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <DragIcon sx={{ color: 'text.secondary' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {categoria.nome}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {categoria.itens?.length || 0} item(ns)
                        </Typography>
                      </Box>
                    </Box>
                    {dialogType !== 'view' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCategoryDialog(catIndex);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(catIndex);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {categoria.descricao && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {categoria.descricao}
                    </Typography>
                  )}
                  
                  {categoria.itens?.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Nenhum item nesta categoria
                    </Typography>
                  ) : (
                    <List dense>
                      {categoria.itens.map((item, itemIndex) => (
                        <ListItem 
                          key={itemIndex} 
                          sx={{ 
                            pl: 0, 
                            cursor: dialogType !== 'view' ? 'move' : 'default',
                            '&:hover': dialogType !== 'view' ? { bgcolor: 'action.hover' } : {}
                          }}
                          draggable={dialogType !== 'view'}
                          onDragStart={(e) => handleDragStart(e, 'item', itemIndex, catIndex)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropItem(e, itemIndex, catIndex)}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {dialogType !== 'view' ? <DragIcon sx={{ color: 'text.secondary', mr: 1 }} /> : null}
                            {tiposItem.find(tipo => tipo.value === item.tipo)?.icon || <CheckboxIcon />}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.nome}
                            secondary={`Tipo: ${tiposItem.find(tipo => tipo.value === item.tipo)?.label || item.tipo}${item.obrigatorio ? ' • Obrigatório' : ''}`}
                          />
                          {dialogType !== 'view' && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingCategoryIndex(catIndex);
                                  setCategoryForm(categoria);
                                  handleOpenItemDialog(itemIndex);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setEditingCategoryIndex(catIndex);
                                  setCategoryForm(categoria);
                                  handleDeleteItem(itemIndex);
                                  const newCategorias = [...templateForm.categorias];
                                  newCategorias[catIndex] = categoryForm;
                                  setTemplateForm({ ...templateForm, categorias: newCategorias });
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  )}
                </AccordionDetails>
                </Accordion>
              </Box>
            );
            })
          )}
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
          <Button onClick={handleCloseTemplateDialog}>
            Cancelar
          </Button>
          {dialogType !== 'view' && (
            <Button
              variant="contained"
              onClick={handleSaveTemplate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {selectedTemplate ? 'Atualizar Template' : 'Criar Template'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo de categoria */}
      <Dialog open={categoryDialog} onClose={() => setCategoryDialog(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          {editingCategoryIndex >= 0 ? 'Editar Categoria' : 'Nova Categoria'}
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Categoria"
                value={categoryForm.nome}
                onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={categoryForm.descricao}
                onChange={(e) => setCategoryForm({ ...categoryForm, descricao: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
                <TextField
                  fullWidth
                  label="URL da Imagem (opcional)"
                  value={categoryForm.imagem_url}
                  onChange={(e) => setCategoryForm({ ...categoryForm, imagem_url: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                  sx={{ flex: 1 }}
                  size={isMobile ? 'small' : 'medium'}
                />
                <Button
                  variant="outlined"
                  onClick={() => categoryImageInputRef.current && categoryImageInputRef.current.click()}
                  sx={{ height: isMobile ? 40 : 56, minWidth: isMobile ? 40 : 56 }}
                >
                  <PhotoIcon />
                </Button>
                <input
                  ref={categoryImageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) handleUploadCategoriaFoto(file);
                    e.target.value = null;
                  }}
                />
              </Box>
            </Grid>

          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Itens da categoria */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Itens da Categoria</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenItemDialog()}
            >
              Adicionar Item
            </Button>
          </Box>

          {categoryForm.itens.length === 0 ? (
            <Alert severity="info">
              Nenhum item adicionado. Clique em "Adicionar Item" para começar.
            </Alert>
          ) : (
            <List>
              {categoryForm.itens.map((item, itemIndex) => {
                const tipoIcon = tiposItem.find(t => t.value === item.tipo)?.icon;
                return (
                  <ListItem
                    key={itemIndex}
                    secondaryAction={
                      <Box>
                        <IconButton onClick={() => handleOpenItemDialog(itemIndex)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteItem(itemIndex)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        {tipoIcon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.nome}
                      secondary={`Tipo: ${tiposItem.find(t => t.value === item.tipo)?.label} ${item.obrigatorio ? '(Obrigatório)' : ''}`}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
          <Button onClick={() => setCategoryDialog(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveCategory}>
            Salvar Categoria
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de item */}
      <Dialog open={itemDialog} onClose={() => setItemDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          {editingItemIndex >= 0 ? 'Editar Item' : 'Novo Item'}
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Item"
                value={itemForm.nome}
                onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
                <TextField
                  fullWidth
                  label="URL da Imagem do Item (opcional)"
                  value={itemForm.imagem_url}
                  onChange={(e) => setItemForm({ ...itemForm, imagem_url: e.target.value })}
                  placeholder="https://exemplo.com/imagem-item.jpg"
                  sx={{ flex: 1 }}
                  size={isMobile ? 'small' : 'medium'}
                />
                <Button
                  variant="outlined"
                  onClick={() => itemImageInputRef.current && itemImageInputRef.current.click()}
                  sx={{ height: isMobile ? 40 : 56, minWidth: isMobile ? 40 : 56 }}
                >
                  <PhotoIcon />
                </Button>
                <input
                  ref={itemImageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) handleUploadItemFoto(file);
                    e.target.value = null;
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo do Item</InputLabel>
                <Select
                  value={itemForm.tipo}
                  onChange={(e) => setItemForm({ ...itemForm, tipo: e.target.value })}
                  label="Tipo do Item"
                >
                  {tiposItem.map((tipo) => (
                    <MenuItem key={tipo.value} value={tipo.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {tipo.icon}
                        {tipo.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={itemForm.obrigatorio}
                    onChange={(e) => setItemForm({ ...itemForm, obrigatorio: e.target.checked })}
                  />
                }
                label="Item obrigatório"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
          <Button onClick={() => setItemDialog(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveItem}>
            Salvar Item
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateBuilder;
