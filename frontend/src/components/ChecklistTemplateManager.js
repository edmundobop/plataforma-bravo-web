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
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import checklistTemplateService from '../services/checklistTemplateService';
import TemplateFormBuilder from './TemplateFormBuilder';

const ChecklistTemplateManager = ({ open, onClose, onSave, viaturas = [], template: templateProp = null }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
    setEditingTemplate(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };



  const handleSaveTemplate = async (templateData) => {
    try {
      setLoading(true);
      setError('');

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
    <TemplateFormBuilder
      template={editingTemplate}
      onSave={handleSaveTemplate}
      onCancel={() => setShowForm(false)}
      loading={loading}
    />
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