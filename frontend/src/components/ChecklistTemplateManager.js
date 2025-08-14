import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import checklistTemplateService from '../services/checklistTemplateService';

const ChecklistTemplateManager = ({ open, onClose, onSave, viaturas = [], template: templateProp = null }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_viatura: '',
    padrao: false
  });

  const tiposViatura = [
    { value: 'ABT', label: 'Auto Bomba Tanque' },
    { value: 'ABTF', label: 'Auto Bomba Tanque Florestal' },
    { value: 'UR', label: 'Unidade de Resgate' },
    { value: 'AV', label: 'Auto Viatura' },
    { value: 'ASA', label: 'Auto Socorro de Altura' },
    { value: 'MOB', label: 'Motocicleta' }
  ];

  useEffect(() => {
    if (open) {
      loadTemplates();
      if (templateProp) {
        setEditingTemplate(templateProp);
        setFormData({
          nome: templateProp.nome || '',
          descricao: templateProp.descricao || '',
          tipo_viatura: templateProp.tipo_viatura || '',
          padrao: templateProp.padrao || false
        });
        setShowForm(true);
      } else {
        resetForm();
      }
    }
  }, [open, templateProp]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await checklistTemplateService.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setError('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo_viatura: '',
      padrao: false
    });
    setEditingTemplate(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!formData.nome || !formData.tipo_viatura) {
        setError('Nome e tipo de viatura são obrigatórios');
        return;
      }

      const templateData = {
        ...formData,
        configuracao: {
          motorista: [
            { id: 1, nome: 'Documentação da viatura', obrigatorio: true },
            { id: 2, nome: 'Nível de combustível', obrigatorio: true },
            { id: 3, nome: 'Nível de óleo do motor', obrigatorio: true },
            { id: 4, nome: 'Funcionamento dos faróis', obrigatorio: true },
            { id: 5, nome: 'Estado dos pneus', obrigatorio: true }
          ],
          socorrista: [
            { id: 1, nome: 'Kit de primeiros socorros', obrigatorio: true },
            { id: 2, nome: 'Equipamentos de proteção individual', obrigatorio: true },
            { id: 3, nome: 'Sistema de comunicação', obrigatorio: true }
          ]
        }
      };

      if (editingTemplate) {
        await checklistTemplateService.updateTemplate(editingTemplate.id, templateData);
        setSuccess('Template atualizado com sucesso!');
      } else {
        await checklistTemplateService.createTemplate(templateData);
        setSuccess('Template criado com sucesso!');
      }

      await loadTemplates();
      resetForm();
      if (onSave) onSave();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      setError(error.response?.data?.error || 'Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      nome: template.nome,
      descricao: template.descricao || '',
      tipo_viatura: template.tipo_viatura,
      padrao: template.padrao
    });
    setShowForm(true);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Tem certeza que deseja excluir este template?')) {
      return;
    }

    try {
      setLoading(true);
      await checklistTemplateService.deleteTemplate(templateId);
      setSuccess('Template excluído com sucesso!');
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      setError('Erro ao excluir template');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (template) => {
    const newName = prompt('Digite o nome para o novo template:', `Cópia de ${template.nome}`);
    if (!newName) return;

    try {
      setLoading(true);
      await checklistTemplateService.duplicateTemplate(template.id, newName);
      setSuccess('Template duplicado com sucesso!');
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
      setError('Erro ao duplicar template');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (templateId, tipoViatura) => {
    try {
      setLoading(true);
      await checklistTemplateService.setDefaultTemplate(templateId, tipoViatura);
      setSuccess('Template definido como padrão!');
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao definir template padrão:', error);
      setError('Erro ao definir template padrão');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderTemplatesList = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Modelos de Checklists</Typography>
        <Button
          variant="contained"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          Novo Modelo
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} key={template.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="div">
                    {template.nome}
                    {template.padrao && (
                      <StarIcon sx={{ color: 'gold', ml: 1, fontSize: 20 }} />
                    )}
                  </Typography>
                  <Chip
                    label={tiposViatura.find(t => t.value === template.tipo_viatura)?.label || template.tipo_viatura}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                
                {template.descricao && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.descricao}
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary">
                  Criado em: {new Date(template.created_at).toLocaleDateString('pt-BR')}
                </Typography>
              </CardContent>
              
              <CardActions>
                <IconButton onClick={() => handleEdit(template)} size="small">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDuplicate(template)} size="small">
                  <CopyIcon />
                </IconButton>
                <IconButton 
                  onClick={() => handleSetDefault(template.id, template.tipo_viatura)} 
                  size="small"
                  color={template.padrao ? 'primary' : 'default'}
                >
                  {template.padrao ? <StarIcon /> : <StarBorderIcon />}
                </IconButton>
                <IconButton onClick={() => handleDelete(template.id)} size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {templates.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Nenhum template encontrado. Crie seu primeiro modelo!
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderForm = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}
        </Typography>
        <Button onClick={() => setShowForm(false)}>Voltar</Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nome do Modelo"
            value={formData.nome}
            onChange={(e) => handleInputChange('nome', e.target.value)}
            required
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Descrição"
            value={formData.descricao}
            onChange={(e) => handleInputChange('descricao', e.target.value)}
            multiline
            rows={3}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Tipo de Viatura</InputLabel>
            <Select
              value={formData.tipo_viatura}
              onChange={(e) => handleInputChange('tipo_viatura', e.target.value)}
              label="Tipo de Viatura"
            >
              {tiposViatura.map((tipo) => (
                <MenuItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.padrao}
                onChange={(e) => handleInputChange('padrao', e.target.checked)}
              />
            }
            label="Definir como padrão"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !formData.nome || !formData.tipo_viatura}
        >
          {loading ? <CircularProgress size={20} /> : (editingTemplate ? 'Atualizar' : 'Criar')}
        </Button>
        <Button onClick={() => setShowForm(false)}>Cancelar</Button>
      </Box>
    </Box>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Gerenciamento de Modelos de Checklists
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

        {showForm ? renderForm() : renderTemplatesList()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChecklistTemplateManager;