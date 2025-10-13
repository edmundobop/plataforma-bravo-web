import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Fab,
  Tooltip,
  Avatar,
  useTheme,
  Pagination,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PersonOff as PersonOffIcon,
  PersonAdd as PersonAddIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usuariosService } from '../services/api';

const Usuarios = () => {
  const theme = useTheme();
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para usuários
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    papel: '',
    setor: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'create', 'edit', 'view', 'password'
  const [selectedUser, setSelectedUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulários
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    matricula: '',
    senha: '',
    confirmar_senha: '',
    papel: 'operador',
    setor: '',
    telefone: '',
    ativo: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para setores
  const [setores, setSetores] = useState([]);

  useEffect(() => {
    loadUsuarios();
    loadSetores();
  }, []);

  useEffect(() => {
    loadUsuarios();
  }, [filters.page]);

  const loadUsuarios = async () => {
    try {
      setUsuariosLoading(true);
      const response = await usuariosService.getUsuarios(filters);
      setUsuarios(response.data.usuarios || []);
      setPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Erro ao carregar usuários');
    } finally {
      setUsuariosLoading(false);
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

  const handleOpenDialog = (type, usuario = null) => {
    setDialogType(type);
    setSelectedUser(usuario);
    
    if (type === 'create') {
      setFormData({
        nome: '',
        email: '',
        matricula: '',
        senha: '',
        confirmar_senha: '',
        papel: 'operador',
        setor: '',
        telefone: '',
        ativo: true,
      });
    } else if (type === 'edit' && usuario) {
      setFormData({
        nome: usuario.nome || '',
        email: usuario.email || '',
        matricula: usuario.matricula || '',
        senha: '',
        confirmar_senha: '',
        papel: usuario.papel || 'operador',
        setor: usuario.setor || '',
        telefone: usuario.telefone || '',
        ativo: usuario.ativo !== false,
      });
    } else if (type === 'password' && usuario) {
      setFormData({
        senha: '',
        confirmar_senha: '',
      });
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setSelectedUser(null);
    setFormData({
      nome: '',
      email: '',
      matricula: '',
      senha: '',
      confirmar_senha: '',
      papel: 'operador',
      setor: '',
      telefone: '',
      ativo: true,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setSuccess('');
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Validações
      if (dialogType === 'create' || dialogType === 'edit') {
        if (!formData.nome || !formData.email || !formData.matricula) {
          setError('Preencha todos os campos obrigatórios');
          return;
        }
        
        if (dialogType === 'create' && (!formData.senha || formData.senha.length < 6)) {
          setError('A senha deve ter pelo menos 6 caracteres');
          return;
        }
        
        if (formData.senha && formData.senha !== formData.confirmar_senha) {
          setError('As senhas não coincidem');
          return;
        }
      }
      
      if (dialogType === 'password') {
        if (!formData.senha || formData.senha.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres');
          return;
        }
        
        if (formData.senha !== formData.confirmar_senha) {
          setError('As senhas não coincidem');
          return;
        }
      }
      
      // Submissão
      if (dialogType === 'create') {
        await usuariosService.createUsuario(formData);
        setSuccess('Usuário criado com sucesso!');
      } else if (dialogType === 'edit') {
        const updateData = { ...formData };
        if (!updateData.senha) {
          delete updateData.senha;
          delete updateData.confirmar_senha;
        }
        await usuariosService.updateUsuario(selectedUser.id, updateData);
        setSuccess('Usuário atualizado com sucesso!');
      } else if (dialogType === 'password') {
        await usuariosService.changePassword(selectedUser.id, {
          nova_senha: formData.senha,
        });
        setSuccess('Senha alterada com sucesso!');
      }
      
      loadUsuarios();
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      setError(err.response?.data?.message || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDesativarUsuario = async (usuarioId) => {
    try {
      setLoading(true);
      await usuariosService.deactivateUsuario(usuarioId);
      setSuccess('Usuário desativado com sucesso!');
      loadUsuarios();
    } catch (err) {
      console.error('Erro ao desativar usuário:', err);
      setError('Erro ao desativar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset page when filtering
    }));
  };

  const handleSearch = () => {
    loadUsuarios();
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Gestão de Usuários
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gerenciar usuários do sistema
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

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Buscar"
                placeholder="Nome, email ou matrícula"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Papel</InputLabel>
                <Select
                  value={filters.papel}
                  onChange={(e) => handleFilterChange('papel', e.target.value)}
                  label="Papel"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="gestor">Gestor</MenuItem>
                  <MenuItem value="operador">Operador</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Setor</InputLabel>
                <Select
                  value={filters.setor}
                  onChange={(e) => handleFilterChange('setor', e.target.value)}
                  label="Setor"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {setores.map((setor) => (
                    <MenuItem key={setor.value} value={setor.value}>
                      {setor.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSearch}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuário</TableCell>
                <TableCell>Matrícula</TableCell>
                <TableCell>Papel</TableCell>
                <TableCell>Setor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Último Acesso</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuariosLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box textAlign="center" py={4}>
                      <Typography variant="h6" color="textSecondary">
                        Nenhum usuário encontrado
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((usuario) => (
                  <TableRow key={usuario.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          {usuario.nome?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {usuario.nome}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {usuario.email}
                          </Typography>
                          {usuario.telefone && (
                            <Typography variant="caption" color="textSecondary">
                              {usuario.telefone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {usuario.matricula}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(usuario.papel)}
                        color={getRoleColor(usuario.papel)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {setores.find(s => s.value === usuario.setor)?.label || usuario.setor}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={usuario.ativo ? 'Ativo' : 'Inativo'}
                        color={usuario.ativo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {usuario.ultimo_acesso ? formatDate(usuario.ultimo_acesso) : 'Nunca'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedUser(usuario);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginação */}
        {pagination.pages > 1 && (
          <Box display="flex" justifyContent="center" p={2}>
            <Pagination
              count={pagination.pages}
              page={pagination.current_page}
              onChange={(e, page) => {
                setFilters(prev => ({ ...prev, page }));
              }}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {/* FAB para adicionar usuário */}
      {hasRole(['admin']) && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => handleOpenDialog('create')}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          handleOpenDialog('view', selectedUser);
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        {hasRole(['admin', 'gestor']) && (
          <MenuItem onClick={() => {
            handleOpenDialog('edit', selectedUser);
            setAnchorEl(null);
          }}>
            <EditIcon sx={{ mr: 1 }} />
            Editar
          </MenuItem>
        )}
        {hasRole(['admin']) && (
          <MenuItem onClick={() => {
            handleOpenDialog('password', selectedUser);
            setAnchorEl(null);
          }}>
            <LockIcon sx={{ mr: 1 }} />
            Alterar Senha
          </MenuItem>
        )}
        {hasRole(['admin']) && selectedUser?.ativo && selectedUser?.id !== user?.id && (
          <MenuItem 
            onClick={() => {
              handleDesativarUsuario(selectedUser.id);
              setAnchorEl(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <PersonOffIcon sx={{ mr: 1 }} />
            Desativar
          </MenuItem>
        )}
      </Menu>

      {/* Dialog para formulários */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'create' && 'Novo Usuário'}
          {dialogType === 'edit' && 'Editar Usuário'}
          {dialogType === 'view' && 'Visualizar Usuário'}
          {dialogType === 'password' && 'Alterar Senha'}
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

          {dialogType === 'view' && selectedUser ? (
            <Box>
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Nome"
                    secondary={selectedUser.nome}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                      <EmailIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Email"
                    secondary={selectedUser.email}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                      <BadgeIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Matrícula"
                    secondary={selectedUser.matricula}
                  />
                </ListItem>
                {selectedUser.telefone && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                        <PhoneIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Telefone"
                      secondary={selectedUser.telefone}
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                      <SecurityIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Papel"
                    secondary={getRoleLabel(selectedUser.papel)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.error.main }}>
                      <WorkIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Setor"
                    secondary={setores.find(s => s.value === selectedUser.setor)?.label || selectedUser.setor}
                  />
                </ListItem>
              </List>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {dialogType !== 'password' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nome *"
                      value={formData.nome}
                      onChange={(e) => handleFormChange('nome', e.target.value)}
                      disabled={dialogType === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email *"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      disabled={dialogType === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Matrícula *"
                      value={formData.matricula}
                      onChange={(e) => handleFormChange('matricula', e.target.value)}
                      disabled={dialogType === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      value={formData.telefone}
                      onChange={(e) => handleFormChange('telefone', e.target.value)}
                      disabled={dialogType === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Papel *</InputLabel>
                      <Select
                        value={formData.papel}
                        onChange={(e) => handleFormChange('papel', e.target.value)}
                        label="Papel *"
                        disabled={dialogType === 'view' || !hasRole(['admin'])}
                      >
                        <MenuItem value="operador">Operador</MenuItem>
                        <MenuItem value="gestor">Gestor</MenuItem>
                        <MenuItem value="admin">Administrador</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Setor *</InputLabel>
                      <Select
                        value={formData.setor}
                        onChange={(e) => handleFormChange('setor', e.target.value)}
                        label="Setor *"
                        disabled={dialogType === 'view'}
                      >
                        {setores.map((setor) => (
                          <MenuItem key={setor.value} value={setor.value}>
                            {setor.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  {dialogType === 'edit' && (
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.ativo}
                            onChange={(e) => handleFormChange('ativo', e.target.checked)}
                            disabled={!hasRole(['admin'])}
                          />
                        }
                        label="Usuário ativo"
                      />
                    </Grid>
                  )}
                </>
              )}
              
              {(dialogType === 'create' || dialogType === 'password') && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={dialogType === 'create' ? 'Senha *' : 'Nova Senha *'}
                      type={showPassword ? 'text' : 'password'}
                      value={formData.senha}
                      onChange={(e) => handleFormChange('senha', e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Confirmar Senha *"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmar_senha}
                      onChange={(e) => handleFormChange('confirmar_senha', e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </>
              )}
              
              {dialogType === 'edit' && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Alterar Senha (opcional)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nova Senha"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.senha}
                      onChange={(e) => handleFormChange('senha', e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Confirmar Nova Senha"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmar_senha}
                      onChange={(e) => handleFormChange('confirmar_senha', e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          {dialogType !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Salvar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Usuarios;