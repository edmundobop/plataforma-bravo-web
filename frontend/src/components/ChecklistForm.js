import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Paper
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Assignment as ChecklistIcon
} from '@mui/icons-material';
import { frotaService } from '../services/api';
import checklistTemplateService from '../services/checklistTemplateService';
import checklistService from '../services/checklistService';

const ChecklistForm = ({ open, onClose, checklist, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viaturas, setViaturas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedViatura, setSelectedViatura] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    viatura_id: '',
    template_id: '',
    tipo: 'pre_operacional',
    observacoes: '',
    itens: {}
  });
  const [checklistItems, setChecklistItems] = useState({});

  const tiposChecklist = [
    { value: 'pre_operacional', label: 'Pré-Operacional' },
    { value: 'pos_operacional', label: 'Pós-Operacional' },
    { value: 'manutencao', label: 'Manutenção' }
  ];

  useEffect(() => {
    if (open) {
      loadViaturas();
      if (checklist) {
        // Modo edição
        setFormData({
          viatura_id: checklist.viatura_id || '',
          template_id: checklist.template_id || '',
          tipo: checklist.tipo || 'pre_operacional',
          observacoes: checklist.observacoes || '',
          itens: checklist.itens || {}
        });
        setSelectedViatura(checklist.viatura_id || '');
        if (checklist.template_id) {
          loadTemplate(checklist.template_id);
        }
      } else {
        // Modo criação
        resetForm();
      }
    }
  }, [open, checklist]);

  useEffect(() => {
    if (selectedViatura) {
      loadTemplatesByViatura(selectedViatura);
    }
  }, [selectedViatura]);

  const loadViaturas = async () => {
    try {
      const response = await frotaService.getViaturas();
      setViaturas(response.data);
    } catch (error) {
      console.error('Erro ao carregar viaturas:', error);
      setError('Erro ao carregar viaturas');
    }
  };

  const loadTemplatesByViatura = async (viaturaId) => {
    try {
      const response = await checklistTemplateService.getTemplatesByViatura(viaturaId);
      setTemplates(response.data.templates || []);
      
      // Se há um template padrão, seleciona automaticamente
      const defaultTemplate = response.data.templates?.find(t => t.padrao);
      if (defaultTemplate && !formData.template_id) {
        setSelectedTemplate(defaultTemplate);
        setFormData(prev => ({ ...prev, template_id: defaultTemplate.id }));
        initializeChecklistItems(defaultTemplate.configuracao);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setError('Erro ao carregar templates');
    }
  };

  const loadTemplate = async (templateId) => {
    try {
      const response = await checklistTemplateService.getTemplateById(templateId);
      setSelectedTemplate(response.data);
      initializeChecklistItems(response.data.configuracao);
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      setError('Erro ao carregar template');
    }
  };

  const initializeChecklistItems = (configuracao) => {
    const items = {};
    
    // Inicializa itens para cada categoria (motorista, combatente, socorrista, etc.)
    Object.keys(configuracao).forEach(categoria => {
      items[categoria] = {};
      configuracao[categoria].forEach(item => {
        items[categoria][item.id] = {
          verificado: false,
          conforme: null,
          observacao: ''
        };
      });
    });
    
    setChecklistItems(items);
  };

  const resetForm = () => {
    setFormData({
      viatura_id: '',
      template_id: '',
      tipo: 'pre_operacional',
      observacoes: '',
      itens: {}
    });
    setSelectedViatura('');
    setSelectedTemplate(null);
    setChecklistItems({});
    setError('');
    setSuccess('');
  };

  const handleViaturaChange = (viaturaId) => {
    setSelectedViatura(viaturaId);
    setFormData(prev => ({ ...prev, viatura_id: viaturaId, template_id: '' }));
    setSelectedTemplate(null);
    setChecklistItems({});
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    setSelectedTemplate(template);
    setFormData(prev => ({ ...prev, template_id: templateId }));
    
    if (template) {
      initializeChecklistItems(template.configuracao);
    }
  };

  const handleItemChange = (categoria, itemId, field, value) => {
    setChecklistItems(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [itemId]: {
          ...prev[categoria][itemId],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!formData.viatura_id || !formData.template_id) {
        setError('Viatura e template são obrigatórios');
        return;
      }

      const checklistData = {
        ...formData,
        itens: checklistItems,
        status: 'concluido'
      };

      if (checklist) {
        // Atualizar checklist existente
        await checklistService.updateChecklist(checklist.id, checklistData);
        setSuccess('Checklist atualizado com sucesso!');
      } else {
        // Criar novo checklist
        await checklistService.createChecklist(checklistData);
        setSuccess('Checklist criado com sucesso!');
      }

      setTimeout(() => {
        if (onSave) onSave();
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar checklist:', error);
      setError(error.response?.data?.error || 'Erro ao salvar checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderChecklistItems = () => {
    if (!selectedTemplate || !selectedTemplate.configuracao) {
      return null;
    }

    return Object.keys(selectedTemplate.configuracao).map(categoria => (
      <Card key={categoria} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
            {categoria === 'motorista' ? 'Verificações do Motorista' :
             categoria === 'combatente' ? 'Verificações do Combatente' :
             categoria === 'socorrista' ? 'Verificações do Socorrista' :
             `Verificações - ${categoria}`}
          </Typography>
          
          <Grid container spacing={2}>
            {selectedTemplate.configuracao[categoria].map(item => (
              <Grid item xs={12} key={item.id}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checklistItems[categoria]?.[item.id]?.verificado || false}
                          onChange={(e) => handleItemChange(categoria, item.id, 'verificado', e.target.checked)}
                        />
                      }
                      label={item.nome}
                      sx={{ flexGrow: 1 }}
                    />
                    {item.obrigatorio && (
                      <Chip label="Obrigatório" size="small" color="error" variant="outlined" />
                    )}
                  </Box>
                  
                  {checklistItems[categoria]?.[item.id]?.verificado && (
                    <Box sx={{ ml: 4 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Button
                          variant={checklistItems[categoria]?.[item.id]?.conforme === true ? 'contained' : 'outlined'}
                          color="success"
                          size="small"
                          startIcon={<CheckIcon />}
                          onClick={() => handleItemChange(categoria, item.id, 'conforme', true)}
                        >
                          Conforme
                        </Button>
                        <Button
                          variant={checklistItems[categoria]?.[item.id]?.conforme === false ? 'contained' : 'outlined'}
                          color="error"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => handleItemChange(categoria, item.id, 'conforme', false)}
                        >
                          Não Conforme
                        </Button>
                      </Box>
                      
                      <TextField
                        fullWidth
                        size="small"
                        label="Observações"
                        value={checklistItems[categoria]?.[item.id]?.observacao || ''}
                        onChange={(e) => handleItemChange(categoria, item.id, 'observacao', e.target.value)}
                        multiline
                        rows={2}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    ));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChecklistIcon />
          {checklist ? 'Editar Checklist' : 'Novo Checklist'}
        </Box>
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

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Viatura</InputLabel>
              <Select
                value={selectedViatura}
                onChange={(e) => handleViaturaChange(e.target.value)}
                label="Viatura"
              >
                {viaturas.map((viatura) => (
                  <MenuItem key={viatura.id} value={viatura.id}>
                    {viatura.prefixo} - {viatura.marca} {viatura.modelo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Tipo de Checklist</InputLabel>
              <Select
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                label="Tipo de Checklist"
              >
                {tiposChecklist.map((tipo) => (
                  <MenuItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {templates.length > 0 && (
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Template</InputLabel>
                <Select
                  value={formData.template_id}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  label="Template"
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.nome}
                      {template.padrao && <Chip label="Padrão" size="small" sx={{ ml: 1 }} />}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Observações Gerais"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>

        {selectedTemplate && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Itens do Checklist - {selectedTemplate.nome}
            </Typography>
            {renderChecklistItems()}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !formData.viatura_id || !formData.template_id}
        >
          {loading ? <CircularProgress size={20} /> : (checklist ? 'Atualizar' : 'Criar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChecklistForm;