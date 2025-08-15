import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Edit as EditIcon,
  Lock as LockIcon
} from '@mui/icons-material';

const TemplateFormBuilder = ({ template, onSave, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_viatura: '',
    padrao: false
  });

  const [configuracao, setConfiguracao] = useState({
    motorista: [],
    combatente: []
  });

  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('');
  const [newField, setNewField] = useState({ nome: '', obrigatorio: false, tipo: 'text' });
  const [editingField, setEditingField] = useState(null);

  const tiposViatura = [
    { value: 'ABT', label: 'Auto Bomba Tanque' },
    { value: 'ABTF', label: 'Auto Bomba Tanque Florestal' },
    { value: 'UR', label: 'Unidade de Resgate' },
    { value: 'AV', label: 'Auto Viatura' },
    { value: 'ASA', label: 'Auto Socorro de Altura' },
    { value: 'MOB', label: 'Motocicleta' }
  ];

  const tiposCampo = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' }
  ];

  // Campos obrigatórios que não podem ser removidos
  const camposObrigatorios = {
    motorista: [
      { id: 'km_inicial', nome: 'KM Inicial', obrigatorio: true, tipo: 'number', fixo: true },
      { id: 'combustivel_inicial', nome: 'Combustível Inicial (%)', obrigatorio: true, tipo: 'number', fixo: true }
    ],
    combatente: []
  };

  useEffect(() => {
    if (template) {
      setFormData({
        nome: template.nome || '',
        descricao: template.descricao || '',
        tipo_viatura: template.tipo_viatura || '',
        padrao: template.padrao || false
      });

      // Carregar configuração existente ou inicializar com campos obrigatórios
      const configExistente = template.configuracao || {};
      setConfiguracao({
        motorista: [
          ...camposObrigatorios.motorista,
          ...(configExistente.motorista || []).filter(campo => !camposObrigatorios.motorista.find(obr => obr.id === campo.id))
        ],
        combatente: [
          ...camposObrigatorios.combatente,
          ...(configExistente.combatente || []).filter(campo => !camposObrigatorios.combatente.find(obr => obr.id === campo.id))
        ]
      });
    } else {
      // Novo template - inicializar com campos obrigatórios
      setConfiguracao({
        motorista: [...camposObrigatorios.motorista],
        combatente: [...camposObrigatorios.combatente]
      });
    }
  }, [template]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddField = (categoria) => {
    setCurrentCategory(categoria);
    setNewField({ nome: '', obrigatorio: false, tipo: 'text' });
    setEditingField(null);
    setShowAddFieldDialog(true);
  };

  const handleEditField = (categoria, field) => {
    setCurrentCategory(categoria);
    setNewField({ ...field });
    setEditingField(field);
    setShowAddFieldDialog(true);
  };

  const handleSaveField = () => {
    if (!newField.nome.trim()) return;

    const fieldData = {
      id: editingField?.id || Date.now().toString(),
      nome: newField.nome.trim(),
      obrigatorio: newField.obrigatorio,
      tipo: newField.tipo,
      fixo: false
    };

    setConfiguracao(prev => {
      const newConfig = { ...prev };
      
      if (editingField) {
        // Editar campo existente
        newConfig[currentCategory] = newConfig[currentCategory].map(campo => 
          campo.id === editingField.id ? fieldData : campo
        );
      } else {
        // Adicionar novo campo
        newConfig[currentCategory] = [...newConfig[currentCategory], fieldData];
      }
      
      return newConfig;
    });

    setShowAddFieldDialog(false);
    setNewField({ nome: '', obrigatorio: false, tipo: 'text' });
    setEditingField(null);
  };

  const handleDeleteField = (categoria, fieldId) => {
    setConfiguracao(prev => ({
      ...prev,
      [categoria]: prev[categoria].filter(campo => campo.id !== fieldId)
    }));
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.tipo_viatura) {
      alert('Nome e tipo de viatura são obrigatórios');
      return;
    }

    const templateData = {
      ...formData,
      configuracao
    };
    
    onSave(templateData);
  };

  const renderFieldsList = (categoria, campos) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
            {categoria === 'combatente' ? 'Combatente/Socorrista' : categoria}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleAddField(categoria)}
          >
            Adicionar Campo
          </Button>
        </Box>

        <List dense>
          {campos.map((campo, index) => (
            <ListItem key={campo.id} divider={index < campos.length - 1}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                {campo.fixo ? <LockIcon fontSize="small" color="disabled" /> : <DragIcon fontSize="small" color="disabled" />}
              </Box>
              
              <ListItemText
                primary={campo.nome}
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip size="small" label={tiposCampo.find(t => t.value === campo.tipo)?.label || campo.tipo} />
                    {campo.obrigatorio && <Chip size="small" label="Obrigatório" color="primary" />}
                    {campo.fixo && <Chip size="small" label="Campo Fixo" color="default" />}
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                {!campo.fixo && (
                  <>
                    <IconButton size="small" onClick={() => handleEditField(categoria, campo)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteField(categoria, campo.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        {campos.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Nenhum campo adicionado. Clique em "Adicionar Campo" para começar.
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Informações básicas do template */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informações do Template
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Template"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
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
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.padrao}
                    onChange={(e) => handleInputChange('padrao', e.target.checked)}
                  />
                }
                label="Definir como template padrão para este tipo de viatura"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Editor de campos */}
      <Typography variant="h6" gutterBottom>
        Configuração dos Campos do Formulário
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Os campos "KM Inicial" e "Combustível Inicial (%)" são obrigatórios e não podem ser removidos.
        Você pode adicionar campos personalizados para cada categoria.
      </Alert>

      {renderFieldsList('motorista', configuracao.motorista)}
      {renderFieldsList('combatente', configuracao.combatente)}

      {/* Botões de ação */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading || !formData.nome || !formData.tipo_viatura}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ mr: 1 }} />
          ) : null}
          {template ? 'Atualizar Template' : 'Criar Template'}
        </Button>
        <Button onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
      </Box>

      {/* Dialog para adicionar/editar campo */}
      <Dialog open={showAddFieldDialog} onClose={() => setShowAddFieldDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingField ? 'Editar Campo' : 'Adicionar Campo'}
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Campo"
                value={newField.nome}
                onChange={(e) => setNewField(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo do Campo</InputLabel>
                <Select
                  value={newField.tipo}
                  onChange={(e) => setNewField(prev => ({ ...prev, tipo: e.target.value }))}
                  label="Tipo do Campo"
                >
                  {tiposCampo.map((tipo) => (
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
                    checked={newField.obrigatorio}
                    onChange={(e) => setNewField(prev => ({ ...prev, obrigatorio: e.target.checked }))}
                  />
                }
                label="Campo obrigatório"
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowAddFieldDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveField} variant="contained">
            {editingField ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateFormBuilder;