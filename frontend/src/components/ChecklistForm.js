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
    { value: 'manutencao', label: 'Manutenção' },
    { value: 'diario', label: 'Diário' }
  ];

  useEffect(() => {
    if (open) {
      loadViaturas();
      if (checklist) {
        // Modo edição
        // Mapear tipos do backend para o frontend
        const mapTipoFromBackend = (tipo) => {
          const tipoMap = {
            'diario': 'diario',
            'pre_operacional': 'pre_operacional',
            'pos_operacional': 'pos_operacional',
            'manutencao': 'manutencao'
          };
          return tipoMap[tipo] || 'pre_operacional';
        };

        setFormData({
          viatura_id: parseInt(checklist.viatura_id) || '',
          template_id: parseInt(checklist.template_id) || '',
          tipo: mapTipoFromBackend(checklist.tipo),
          observacoes: checklist.observacoes || '',
          itens: checklist.itens || {}
        });
        setSelectedViatura(checklist.viatura_id ? String(checklist.viatura_id) : '');
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
      setViaturas(response.data.viaturas || []);
    } catch (error) {
      console.error('Erro ao carregar viaturas:', error);
      setError('Erro ao carregar viaturas');
      setViaturas([]); // Garantir que seja sempre um array
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
        setFormData(prev => ({ ...prev, template_id: parseInt(defaultTemplate.id) }));
        // Passa os dados existentes do checklist se estiver em modo de edição
        const existingItems = checklist?.itens || {};
        initializeChecklistItems(defaultTemplate.configuracao, existingItems);
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
      // Passa os dados existentes do checklist se estiver em modo de edição
      const existingItems = checklist?.itens || {};
      initializeChecklistItems(response.data.configuracao, existingItems);
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      setError('Erro ao carregar template');
    }
  };

  const initializeChecklistItems = (configuracao, existingItems = {}) => {
    const items = {};
    
    // Inicializa itens para cada categoria (motorista, combatente, socorrista, etc.)
    Object.keys(configuracao).forEach(categoria => {
      items[categoria] = {};
      const categoriaItems = Array.isArray(configuracao[categoria]) ? configuracao[categoria] : [];
      
      categoriaItems.forEach(item => {
        // Tenta acessar dados existentes usando diferentes formatos de ID
        const itemIdStr = String(item.id);
        const itemIdNum = typeof item.id === 'string' ? parseInt(item.id) : item.id;
        
        // Busca o item existente em diferentes formatos (string, número, original)
        let existingItem = existingItems[categoria]?.[item.id] || 
                          existingItems[categoria]?.[itemIdStr] || 
                          existingItems[categoria]?.[itemIdNum];
        
        // Se não encontrou, tenta buscar por nome similar (para migração)
        if (!existingItem && typeof item.id === 'string') {
          // Mapeia IDs descritivos para IDs numéricos antigos
          const legacyIdMap = {
            'documentacao_viatura': '1',
            'nivel_oleo_motor': '3',
            'nivel_agua_radiador': '4',
            'funcionamento_farois': '5',
            'funcionamento_setas': '6',
            'funcionamento_giroflex': '7',
            'funcionamento_sirene': '8',
            'estado_pneus': '9',
            'funcionamento_freios': '10'
          };
          
          const legacyId = legacyIdMap[item.id];
          if (legacyId) {
            existingItem = existingItems[categoria]?.[legacyId];
          }
        }
        
        if (item.tipo === 'number') {
          // Para campos numéricos, preserva valores existentes ou inicializa vazio
          items[categoria][item.id] = {
            valor: existingItem?.valor || '',
            observacao: existingItem?.observacao || ''
          };
        } else {
          // Para campos de checklist tradicionais, preserva valores existentes
          items[categoria][item.id] = {
            verificado: existingItem?.verificado || false,
            conforme: existingItem?.conforme || null,
            observacao: existingItem?.observacao || ''
          };
        }
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
    setFormData(prev => ({ ...prev, viatura_id: viaturaId ? parseInt(viaturaId) : '', template_id: '' }));
    setSelectedTemplate(null);
    setChecklistItems({});
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    setSelectedTemplate(template);
    setFormData(prev => ({ ...prev, template_id: templateId ? parseInt(templateId) : '' }));
    
    if (template) {
      // Passa os dados existentes do checklist se estiver em modo de edição
      const existingItems = checklist?.itens || {};
      initializeChecklistItems(template.configuracao, existingItems);
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
        viatura_id: parseInt(formData.viatura_id),
        template_id: parseInt(formData.template_id),
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
        if (onSave) onSave(checklistData);
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
            {(Array.isArray(selectedTemplate.configuracao[categoria]) ? selectedTemplate.configuracao[categoria] : []).map(item => (
              <Grid item xs={12} key={item.id}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  {item.tipo === 'number' ? (
                    // Campos numéricos (KM Inicial, Combustível)
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          {item.nome}
                        </Typography>
                        {item.obrigatorio && (
                          <Chip label="Obrigatório" size="small" color="error" variant="outlined" />
                        )}
                      </Box>
                      <TextField
                        fullWidth
                        type="number"
                        label={item.nome}
                        value={checklistItems[categoria]?.[item.id]?.valor || ''}
                        onChange={(e) => handleItemChange(categoria, item.id, 'valor', e.target.value)}
                        inputProps={{ 
                          min: 0,
                          ...(item.id === 'combustivel_inicial' && { max: 100 })
                        }}
                        size="small"
                        sx={{ mb: 1 }}
                      />
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
                  ) : (
                    // Campos de checklist tradicionais
                    <Box>
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
                value={viaturas.length > 0 ? (selectedViatura || '') : ''}
                onChange={(e) => handleViaturaChange(e.target.value)}
                label="Viatura"
                disabled={viaturas.length === 0}
              >
                {viaturas.map((viatura) => (
                  <MenuItem key={viatura.id} value={String(viatura.id)}>
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
                  value={templates.length > 0 ? (formData.template_id || '') : ''}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  label="Template"
                  disabled={templates.length === 0}
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={String(template.id)}>
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