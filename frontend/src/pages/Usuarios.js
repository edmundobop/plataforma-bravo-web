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
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PersonOff as PersonOffIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usuariosService } from '../services/api';
import { useTenant } from '../contexts/TenantContext';

const Usuarios = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, hasRole } = useAuth();
  const { availableUnits } = useTenant();
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
    papel: 'Operador',
    setor: '',
    telefone: '',
    ativo: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para setores
  const [setores, setSetores] = useState([]);
  
  // Estados para unidades
  const [unidades, setUnidades] = useState([]);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadUsuarios();
    loadSetores();
    loadUnidades();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadUnidades = async () => {
    try {
      let unidadesLista = [];
      console.log('🔍 [DEBUG] Carregando unidades. hasRole:', hasRole(['Administrador', 'Comandante']));
      
      // Carregar todas as unidades apenas para perfis com privilégio
      if (hasRole(['Administrador', 'Comandante'])) {
        try {
          const respAll = await usuariosService.getTodasUnidades();
          unidadesLista = respAll.data?.units || [];
          console.log('🔍 [DEBUG] Unidades carregadas via getTodasUnidades:', unidadesLista);
        } catch (e) {
          console.log('🔍 [DEBUG] Falha ao carregar todas unidades, tentando unidades do usuário:', e.message);
          const respUser = await usuariosService.getUnidades();
          unidadesLista = respUser.data?.unidades || respUser.data?.units || [];
          console.log('🔍 [DEBUG] Unidades carregadas via getUnidades (fallback):', unidadesLista);
        }
      } else {
        const respUser = await usuariosService.getUnidades();
        unidadesLista = respUser.data?.unidades || respUser.data?.units || [];
        console.log('🔍 [DEBUG] Unidades carregadas via getUnidades (não-admin):', unidadesLista);
      }
      const normalized = (unidadesLista || []).map(u => ({ id: String(u.id), nome: u.nome }));
      console.log('🔍 [DEBUG] Unidades normalizadas:', normalized);
      if ((!normalized || normalized.length === 0) && Array.isArray(availableUnits) && availableUnits.length > 0) {
        const fallbackUnits = availableUnits.map(u => ({ id: String(u.id), nome: u.nome }));
        console.log('🔍 [DEBUG] Aplicando fallback de TenantContext.availableUnits:', fallbackUnits);
        setUnidades(fallbackUnits);
      } else {
        setUnidades(normalized);
      }
    } catch (err) {
      console.error('Erro ao carregar unidades:', err);
      if (Array.isArray(availableUnits) && availableUnits.length > 0) {
        const fallbackUnits = availableUnits.map(u => ({ id: String(u.id), nome: u.nome }));
        console.log('🔍 [DEBUG] Erro ao carregar unidades, usando fallback TenantContext.availableUnits:', fallbackUnits);
        setUnidades(fallbackUnits);
      }
    }
  };

  const handleOpenDialog = async (type, usuario = null) => {
    console.log('🔍 [DEBUG] handleOpenDialog chamado:', { type, usuario, unidadesDisponiveis: unidades.length });
    
    setDialogType(type);
    setSelectedUser(usuario);
    setError('');
    setSuccess('');
    
    if (type === 'create') {
      setFormData({
        nome: '',
        email: '',
        matricula: '',
        senha: '',
        confirmar_senha: '',
        papel: 'Operador',
        setor: '',
        telefone: '',
        ativo: true,
        unidades_ids: [],
        unidade_lotacao_id: '',
      });
    } else if ((type === 'edit' || type === 'view') && usuario) {
      try {
        console.log('🔍 [DEBUG] Carregando detalhes do usuário:', usuario.id);
        const resp = await usuariosService.getUsuarioById(usuario.id);
        const u = resp.data || resp;
        console.log('🔍 [DEBUG] Dados do usuário carregados:', u);
        
        const unidadesIds = Array.isArray(u.unidades_ids) ? u.unidades_ids.map(String) : [];
        const lotacaoId = u.unidade_lotacao_id != null ? String(u.unidade_lotacao_id) : '';
        console.log('🔍 [DEBUG] Unidades processadas:', { unidadesIds, lotacaoId });
        
        // Garantir que a lotação conste em unidades_ids para renderização
        const unidadesIdsComLotacao = lotacaoId && !unidadesIds.includes(lotacaoId)
          ? [...unidadesIds, lotacaoId]
          : unidadesIds;
        
        const formDataToSet = {
          nome: u.nome_completo || usuario.nome || '',
          email: u.email || usuario.email || '',
          matricula: u.matricula || usuario.matricula || '',
          senha: '',
          confirmar_senha: '',
          papel: u.perfil_nome || usuario.papel || 'Operador',
          setor: u.setor_nome || usuario.setor || '',
          telefone: u.telefone || usuario.telefone || '',
          ativo: u.ativo !== false,
          unidades_ids: unidadesIdsComLotacao,
          unidade_lotacao_id: lotacaoId,
        };
        
        console.log('🔍 [DEBUG] FormData a ser definido:', formDataToSet);
        setFormData(formDataToSet);
      } catch (e) {
        console.error('🔍 [DEBUG] Falha ao carregar detalhes do usuário:', e);
        // Fallback: preencher com dados já carregados na lista
        setFormData({
          nome: usuario.nome || '',
          email: usuario.email || '',
          matricula: usuario.matricula || '',
          senha: '',
          confirmar_senha: '',
          papel: usuario.papel || 'Operador',
          setor: usuario.setor || '',
          telefone: usuario.telefone || '',
          ativo: usuario.ativo !== false,
          unidades_ids: [],
          unidade_lotacao_id: '',
        });
      }
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
      papel: 'Operador',
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
        // Mapear unidade de lotação para unidade_id no backend
        if (updateData.unidade_lotacao_id) {
          updateData.unidade_id = parseInt(updateData.unidade_lotacao_id);
        }
        await usuariosService.updateUsuario(selectedUser.id, updateData);
        setSuccess('Usuário atualizado com sucesso!');
        if (hasRole(['Administrador', 'Comandante', 'Chefe'])) {
          loadUsuarios();
        }
        setTimeout(() => {
          handleCloseDialog();
        }, 1500);
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
      // Mostrar mensagem específica do backend quando disponível
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Erro ao salvar usuário'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDesativarUsuario = async (usuarioId) => {
    try {
      setLoading(true);
      await usuariosService.deactivateUsuario(usuarioId);
      setSuccess('Usuário desativado com sucesso!');
      if (hasRole(['Administrador', 'Comandante', 'Chefe'])) {
        loadUsuarios();
      }
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
      case 'Administrador':
        return 'error';
      case 'Chefe':
        return 'warning';
      case 'Operador':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (papel) => {
    switch (papel) {
      case 'Administrador':
        return 'Administrador';
      case 'Chefe':
        return 'Chefe';
      case 'Operador':
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
      {isMobile ? (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<FilterIcon />}>Filtros</AccordionSummary>
          <AccordionDetails>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
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
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem key="todos-status" value="">Todos</MenuItem>
                  <MenuItem key="ativo" value="ativo">Ativo</MenuItem>
                  <MenuItem key="inativo" value="inativo">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Papel</InputLabel>
                <Select
                  value={filters.papel}
                  onChange={(e) => handleFilterChange('papel', e.target.value)}
                  label="Papel"
                >
                  <MenuItem key="todos-papel" value="">Todos</MenuItem>
                  <MenuItem key="administrador" value="Administrador">Administrador</MenuItem>
                  <MenuItem key="chefe" value="Chefe">Chefe</MenuItem>
                  <MenuItem key="operador" value="Operador">Operador</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Setor</InputLabel>
                <Select
                  value={filters.setor}
                  onChange={(e) => handleFilterChange('setor', e.target.value)}
                  label="Setor"
                >
                  <MenuItem key="todos-setor" value="">Todos</MenuItem>
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
          </AccordionDetails>
        </Accordion>
      ) : (
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
                  <MenuItem key="todos-status" value="">Todos</MenuItem>
                  <MenuItem key="ativo" value="ativo">Ativo</MenuItem>
                  <MenuItem key="inativo" value="inativo">Inativo</MenuItem>
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
                  <MenuItem key="todos-papel" value="">Todos</MenuItem>
                  <MenuItem key="administrador" value="Administrador">Administrador</MenuItem>
                  <MenuItem key="chefe" value="Chefe">Chefe</MenuItem>
                  <MenuItem key="operador" value="Operador">Operador</MenuItem>
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
                  <MenuItem key="todos-setor" value="">Todos</MenuItem>
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
      )}

      {/* Lista de usuários */}
      {!isMobile ? (
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
                        <Avatar 
                          src={usuario.foto} 
                          alt={usuario.nome}
                          sx={{ bgcolor: theme.palette.primary.main }}
                        >
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
      ) : (
        <Grid container spacing={2}>
          {usuariosLoading ? (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : usuarios.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                Nenhum usuário encontrado
              </Typography>
            </Grid>
          ) : (
            usuarios.map((usuario) => (
              <Grid item xs={12} key={usuario.id}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        {usuario.nome?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{usuario.nome}</Typography>
                        <Typography variant="caption" color="text.secondary">{usuario.email}</Typography>
                        {usuario.telefone && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{usuario.telefone}</Typography>
                        )}
                      </Box>
                    </Box>
                    <Chip label={usuario.ativo ? 'Ativo' : 'Inativo'} color={usuario.ativo ? 'success' : 'default'} size="small" />
                    <IconButton onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedUser(usuario); }}>
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={getRoleLabel(usuario.papel)} size="small" variant="outlined" />
                    <Chip label={setores.find(s => s.value === usuario.setor)?.label || usuario.setor || 'Setor'} size="small" variant="outlined" />
                    <Chip label={usuario.matricula || 'Matrícula'} size="small" variant="outlined" />
                  </Box>
                </Paper>
              </Grid>
            ))
          )}
          {pagination.pages > 1 && (
            <Grid item xs={12}>
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
            </Grid>
          )}
        </Grid>
      )}

      {/* FAB para adicionar usuário */}
      {hasRole(['Administrador']) && (
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
        <MenuItem key="view" onClick={() => {
          handleOpenDialog('view', selectedUser);
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        {hasRole(['Administrador', 'Chefe']) && (
          <MenuItem key="edit" onClick={() => {
            handleOpenDialog('edit', selectedUser);
            setAnchorEl(null);
          }}>
            <EditIcon sx={{ mr: 1 }} />
            Editar
          </MenuItem>
        )}
        {hasRole(['Administrador']) && (
          <MenuItem key="password" onClick={() => {
            handleOpenDialog('password', selectedUser);
            setAnchorEl(null);
          }}>
            <LockIcon sx={{ mr: 1 }} />
            Alterar Senha
          </MenuItem>
        )}
        {hasRole(['Administrador']) && selectedUser?.ativo && selectedUser?.id !== user?.id && (
          <MenuItem 
            key="deactivate"
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
        fullScreen={isMobile}
      >
        <DialogTitle>
          {dialogType === 'create' && 'Novo Usuário'}
          {dialogType === 'edit' && 'Editar Usuário'}
          {dialogType === 'view' && 'Visualizar Usuário'}
          {dialogType === 'password' && 'Alterar Senha'}
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
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
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                      <WorkIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Unidade de Lotação"
                    secondary={selectedUser?.unidade_nome || (unidades.find(u => u.id === (formData.unidade_lotacao_id || ''))?.nome) || '-'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                      <BadgeIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Unidades CBMGO"
                    secondary={(formData.unidades_ids && formData.unidades_ids.length > 0) ?
                      formData.unidades_ids
                        .map(id => {
                          const unit = unidades.find(u => u.id === id);
                          return unit ? unit.nome : id;
                        })
                        .join(', ')
                      : '-'}
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
                        disabled={dialogType === 'view' || !hasRole(['Administrador'])}
                      >
                        <MenuItem key="operador-papel" value="Operador">Operador</MenuItem>
                        <MenuItem key="chefe-papel" value="Chefe">Chefe</MenuItem>
                <MenuItem key="administrador-papel" value="Administrador">Administrador</MenuItem>
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
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Unidades CBMGO</InputLabel>
                      <Select
                        multiple
                        value={formData.unidades_ids || []}
                        onChange={(e) => handleFormChange('unidades_ids', e.target.value)}
                        label="Unidades CBMGO"
                        disabled={dialogType === 'view'}
                        renderValue={(selected) => {
                          const ids = Array.isArray(selected) ? selected.map(String) : [];
                          const nomes = (unidades || [])
                            .filter(u => ids.includes(String(u.id)))
                            .map(u => u.nome);
                          return nomes.join(', ');
                        }}
                      >
                        {(() => {
                          console.log('🔍 [DEBUG] Renderizando Unidades CBMGO:', { 
                            unidades: unidades.length, 
                            formDataUnidadesIds: formData.unidades_ids,
                            unidadesData: unidades 
                          });
                          return unidades.map((u) => (
                            <MenuItem key={u.id} value={String(u.id)}>
                              {u.nome}
                            </MenuItem>
                          ));
                        })()}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Unidade de Lotação</InputLabel>
                      <Select
                        value={formData.unidade_lotacao_id || ''}
                        onChange={(e) => handleFormChange('unidade_lotacao_id', e.target.value)}
                        label="Unidade de Lotação"
                        disabled={dialogType === 'view'}
                      >
                        {(() => {
                          console.log('🔍 [DEBUG] Renderizando Unidade de Lotação:', { 
                            unidades: unidades.length, 
                            formDataLotacaoId: formData.unidade_lotacao_id,
                            unidadesData: unidades 
                          });
                          return unidades.map((u) => (
                            <MenuItem key={u.id} value={String(u.id)}>
                              {u.nome}
                            </MenuItem>
                          ));
                        })()}
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
                            disabled={!hasRole(['Administrador'])}
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
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
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
