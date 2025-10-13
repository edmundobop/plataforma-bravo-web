import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Chip,
  useTheme,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  DirectionsCar as CarIcon,
  Inventory as InventoryIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usuariosService } from '../services/api';

const Perfil = () => {
  const theme = useTheme();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Estados para edição do perfil
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
  });
  
  // Estados para alteração de senha
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    atual: false,
    nova: false,
    confirmar: false,
  });
  
  // Estados para dados do perfil
  const [perfilData, setPerfilData] = useState(null);
  const [setores, setSetores] = useState([]);

  useEffect(() => {
    loadPerfilData();
    loadSetores();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        telefone: user.telefone || '',
      });
    }
  }, [user]);

  const loadPerfilData = async () => {
    try {
      setLoading(true);
      const response = await usuariosService.getPerfil();
      setPerfilData(response.data);
    } catch (err) {
      console.error('Erro ao carregar dados do perfil:', err);
      setError('Erro ao carregar dados do perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadSetores = async () => {
    try {
      const response = await usuariosService.getSetores();
      setSetores(response.data.setores || []);
    } catch (err) {
      console.error('Erro ao carregar setores:', err);
    }
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Cancelar edição
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        telefone: user.telefone || '',
      });
    }
    setEditMode(!editMode);
    setError('');
    setSuccess('');
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePerfil = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      if (!formData.nome || !formData.email) {
        setError('Nome e email são obrigatórios');
        return;
      }
      
      const response = await usuariosService.updateUsuario(user.id, formData);
      updateUser(response.data.usuario);
      setSuccess('Perfil atualizado com sucesso!');
      setEditMode(false);
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      if (!passwordData.senha_atual || !passwordData.nova_senha) {
        setError('Preencha todos os campos de senha');
        return;
      }
      
      if (passwordData.nova_senha.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }
      
      if (passwordData.nova_senha !== passwordData.confirmar_senha) {
        setError('As senhas não coincidem');
        return;
      }
      
      await usuariosService.changePassword(user.id, {
        senha_atual: passwordData.senha_atual,
        nova_senha: passwordData.nova_senha,
      });
      
      setSuccess('Senha alterada com sucesso!');
      setPasswordDialog(false);
      setPasswordData({
        senha_atual: '',
        nova_senha: '',
        confirmar_senha: '',
      });
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setError(err.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const getRoleLabel = (papel) => {
    switch (papel) {
      case 'admin':
        return 'Administrador';
      case 'gestor':
        return 'Gestor';
      case 'operador':
        return 'Operador';
      default:
        return papel;
    }
  };

  const getRoleColor = (papel) => {
    switch (papel) {
      case 'admin':
        return 'error';
      case 'gestor':
        return 'warning';
      case 'operador':
        return 'primary';
      default:
        return 'default';
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

  const renderPerfilTab = () => (
    <Grid container spacing={3}>
      {/* Informações Básicas */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Typography variant="h6" gutterBottom>
                Informações Pessoais
              </Typography>
              <Button
                startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                onClick={handleEditToggle}
                color={editMode ? 'secondary' : 'primary'}
              >
                {editMode ? 'Cancelar' : 'Editar'}
              </Button>
            </Box>
            
            <Box display="flex" justifyContent="center" mb={3}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: theme.palette.primary.main,
                  fontSize: '2rem',
                }}
              >
                {user?.nome?.charAt(0)?.toUpperCase()}
              </Avatar>
            </Box>
            
            {editMode ? (
              <Box component="form" noValidate>
                <TextField
                  fullWidth
                  label="Nome"
                  value={formData.nome}
                  onChange={(e) => handleFormChange('nome', e.target.value)}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Telefone"
                  value={formData.telefone}
                  onChange={(e) => handleFormChange('telefone', e.target.value)}
                  margin="normal"
                />
                
                <Box mt={3} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSavePerfil}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={20} /> : 'Salvar'}
                  </Button>
                </Box>
              </Box>
            ) : (
              <List>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Nome"
                    secondary={user?.nome}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={user?.email}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Matrícula"
                    secondary={user?.matricula}
                  />
                </ListItem>
                {user?.telefone && (
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Telefone"
                      secondary={user.telefone}
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Papel"
                    secondary={
                      <Chip
                        label={getRoleLabel(user?.papel)}
                        color={getRoleColor(user?.papel)}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <WorkIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Setor"
                    secondary={setores.find(s => s.value === user?.setor)?.label || user?.setor}
                  />
                </ListItem>
                {user?.ultimo_acesso && (
                  <ListItem>
                    <ListItemIcon>
                      <TimeIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Último Acesso"
                      secondary={formatDateTime(user.ultimo_acesso)}
                    />
                  </ListItem>
                )}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      {/* Segurança */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Segurança
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <LockIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Senha"
                  secondary="Última alteração: Não disponível"
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setPasswordDialog(true)}
                >
                  Alterar
                </Button>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderEstatisticasTab = () => {
    if (!perfilData) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    const { estatisticas } = perfilData;

    return (
      <Grid container spacing={3}>
        {/* Cards de Estatísticas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <CarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {estatisticas?.checklists || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Checklists Realizados
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
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  <InventoryIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {estatisticas?.movimentacoes || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Movimentações de Estoque
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
                  <BuildIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {estatisticas?.emprestimos || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Cautelas Realizadas
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
                  <AssignmentIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {estatisticas?.servicos_extras || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Serviços Extras
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Notificações */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notificações
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <NotificationsIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {perfilData.notificacoes_nao_lidas || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Notificações não lidas
                  </Typography>
                </Box>
              </Box>
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
          Meu Perfil
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gerencie suas informações pessoais e configurações
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
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Perfil" />
          <Tab label="Estatísticas" />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderPerfilTab()}
      {activeTab === 1 && renderEstatisticasTab()}

      {/* Dialog para alteração de senha */}
      <Dialog
        open={passwordDialog}
        onClose={() => setPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Alterar Senha</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Senha Atual"
            type={showPasswords.atual ? 'text' : 'password'}
            value={passwordData.senha_atual}
            onChange={(e) => handlePasswordChange('senha_atual', e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('atual')}
                    edge="end"
                  >
                    {showPasswords.atual ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            fullWidth
            label="Nova Senha"
            type={showPasswords.nova ? 'text' : 'password'}
            value={passwordData.nova_senha}
            onChange={(e) => handlePasswordChange('nova_senha', e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('nova')}
                    edge="end"
                  >
                    {showPasswords.nova ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            fullWidth
            label="Confirmar Nova Senha"
            type={showPasswords.confirmar ? 'text' : 'password'}
            value={passwordData.confirmar_senha}
            onChange={(e) => handlePasswordChange('confirmar_senha', e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('confirmar')}
                    edge="end"
                  >
                    {showPasswords.confirmar ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Alterar Senha'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Perfil;