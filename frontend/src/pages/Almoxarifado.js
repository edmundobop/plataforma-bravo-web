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
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Fab,
  Tooltip,
  Badge,
  useTheme,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  SwapHoriz as MovimentacaoIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { almoxarifadoService } from '../services/api';

const Almoxarifado = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { currentUnit } = useTenant();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para produtos
  const [produtos, setProdutos] = useState([]);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [produtosFilters, setProdutosFilters] = useState({
    categoria_id: '',
    ativo: '',
    baixo_estoque: false,
    search: '',
    page: 1,
    limit: 10,
  });
  const [produtosPagination, setProdutosPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  
  // Estados para categorias
  const [categorias, setCategorias] = useState([]);
  const [categoriasLoading, setCategoriasLoading] = useState(false);
  
  // Estados para movimentações
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [movimentacoesLoading, setMovimentacoesLoading] = useState(false);
  const [movimentacoesFilters, setMovimentacoesFilters] = useState({
    produto_id: '',
    tipo: '',
    data_inicio: '',
    data_fim: '',
    page: 1,
    limit: 10,
  });
  const [movimentacoesPagination, setMovimentacoesPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
  });
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'produto', 'categoria', 'movimentacao'
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Estados para formulários
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadCategorias();
    loadData();
  }, [activeTab]);

  // Recarregar dados quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadData();
    }
  }, [currentUnit]);
  const loadData = () => {
    switch (activeTab) {
      case 0:
        loadProdutos();
        break;
      case 1:
        loadCategorias();
        break;
      case 2:
        loadMovimentacoes();
        break;
      default:
        break;
    }
  };

  const loadProdutos = async () => {
    try {
      setProdutosLoading(true);
      const response = await almoxarifadoService.getProdutos(produtosFilters);
      setProdutos(response.data.produtos || []);
      setProdutosPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError('Erro ao carregar produtos');
    } finally {
      setProdutosLoading(false);
    }
  };

  const loadCategorias = async () => {
    try {
      setCategoriasLoading(true);
      const response = await almoxarifadoService.getCategorias();
      setCategorias(response.data.categorias || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      setError('Erro ao carregar categorias');
    } finally {
      setCategoriasLoading(false);
    }
  };

  const loadMovimentacoes = async () => {
    try {
      setMovimentacoesLoading(true);
      const response = await almoxarifadoService.getMovimentacoes(movimentacoesFilters);
      setMovimentacoes(response.data.movimentacoes || []);
      setMovimentacoesPagination(response.data.pagination || {});
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
      setError('Erro ao carregar movimentações');
    } finally {
      setMovimentacoesLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
  };

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    setFormData(item || {});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setSelectedItem(null);
    setFormData({});
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
      
      if (dialogType === 'produto') {
        if (selectedItem) {
          // Atualizar produto (implementar quando necessário)
        } else {
          await almoxarifadoService.createProduto(formData);
        }
        loadProdutos();
      } else if (dialogType === 'categoria') {
        await almoxarifadoService.createCategoria(formData);
        loadCategorias();
      } else if (dialogType === 'movimentacao') {
        await almoxarifadoService.createMovimentacao(formData);
        loadMovimentacoes();
        loadProdutos(); // Atualizar estoque
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  const getEstoqueColor = (produto) => {
    if (produto.estoque_atual <= produto.estoque_minimo) {
      return 'error';
    } else if (produto.estoque_atual <= produto.estoque_minimo * 1.5) {
      return 'warning';
    }
    return 'success';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const renderProdutosTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Buscar produto"
                value={produtosFilters.search}
                onChange={(e) => setProdutosFilters(prev => ({ ...prev, search: e.target.value }))}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={produtosFilters.categoria_id}
                  onChange={(e) => setProdutosFilters(prev => ({ ...prev, categoria_id: e.target.value }))}
                  label="Categoria"
                >
                  <MenuItem key="todas-categorias" value="">Todas</MenuItem>
                  {categorias.map((categoria) => (
                    <MenuItem key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={produtosFilters.ativo}
                  onChange={(e) => setProdutosFilters(prev => ({ ...prev, ativo: e.target.value }))}
                  label="Status"
                >
                  <MenuItem key="todos-status-produto" value="">Todos</MenuItem>
                  <MenuItem key="ativo-produto" value="true">Ativo</MenuItem>
                  <MenuItem key="inativo-produto" value="false">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant={produtosFilters.baixo_estoque ? 'contained' : 'outlined'}
                color="warning"
                onClick={() => setProdutosFilters(prev => ({ ...prev, baixo_estoque: !prev.baixo_estoque }))}
                startIcon={<WarningIcon />}
              >
                Baixo Estoque
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadProdutos}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de produtos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Estoque Atual</TableCell>
              <TableCell>Estoque Mínimo</TableCell>
              <TableCell>Valor Unitário</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produtosLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : produtos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>{produto.codigo}</TableCell>
                  <TableCell>{produto.nome}</TableCell>
                  <TableCell>{produto.categoria_nome}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        color={getEstoqueColor(produto) === 'error' ? 'error' : 'inherit'}
                        fontWeight={getEstoqueColor(produto) === 'error' ? 'bold' : 'normal'}
                      >
                        {produto.estoque_atual}
                      </Typography>
                      {produto.estoque_atual <= produto.estoque_minimo && (
                        <WarningIcon color="error" fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{produto.estoque_minimo}</TableCell>
                  <TableCell>{formatCurrency(produto.valor_unitario)}</TableCell>
                  <TableCell>
                    <Chip
                      label={produto.ativo ? 'Ativo' : 'Inativo'}
                      color={produto.ativo ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(produto);
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
      {produtosPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={produtosPagination.pages}
            page={produtosPagination.current_page}
            onChange={(e, page) => {
              setProdutosFilters(prev => ({ ...prev, page }));
              loadProdutos();
            }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );

  const renderCategoriasTab = () => (
    <Box>
      <Grid container spacing={3}>
        {categoriasLoading ? (
          <Grid item xs={12}>
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          </Grid>
        ) : categorias.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Nenhuma categoria encontrada
              </Typography>
            </Paper>
          </Grid>
        ) : (
          categorias.map((categoria) => (
            <Grid item xs={12} sm={6} md={4} key={categoria.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {categoria.nome}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {categoria.descricao}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Criada em: {formatDate(categoria.created_at)}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(categoria);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );

  const renderMovimentacoesTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Produto</InputLabel>
                <Select
                  value={movimentacoesFilters.produto_id}
                  onChange={(e) => setMovimentacoesFilters(prev => ({ ...prev, produto_id: e.target.value }))}
                  label="Produto"
                >
                  <MenuItem key="todos-produtos" value="">Todos</MenuItem>
                  {produtos.map((produto) => (
                    <MenuItem key={produto.id} value={produto.id}>
                      {produto.codigo} - {produto.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={movimentacoesFilters.tipo}
                  onChange={(e) => setMovimentacoesFilters(prev => ({ ...prev, tipo: e.target.value }))}
                  label="Tipo"
                >
                  <MenuItem key="todos-tipos-mov" value="">Todos</MenuItem>
                  <MenuItem key="entrada-mov" value="entrada">Entrada</MenuItem>
                  <MenuItem key="saida-mov" value="saida">Saída</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={movimentacoesFilters.data_inicio}
                onChange={(e) => setMovimentacoesFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={movimentacoesFilters.data_fim}
                onChange={(e) => setMovimentacoesFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadMovimentacoes}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de movimentações */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Produto</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Quantidade</TableCell>
              <TableCell>Valor Unitário</TableCell>
              <TableCell>Valor Total</TableCell>
              <TableCell>Usuário</TableCell>
              <TableCell>Observações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movimentacoesLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : movimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              movimentacoes.map((movimentacao) => (
                <TableRow key={movimentacao.id}>
                  <TableCell>{formatDate(movimentacao.data_movimentacao)}</TableCell>
                  <TableCell>{movimentacao.produto_nome}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {movimentacao.tipo === 'entrada' ? (
                        <TrendingUpIcon color="success" fontSize="small" />
                      ) : (
                        <TrendingDownIcon color="error" fontSize="small" />
                      )}
                      <Chip
                        label={movimentacao.tipo}
                        color={movimentacao.tipo === 'entrada' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{movimentacao.quantidade}</TableCell>
                  <TableCell>{formatCurrency(movimentacao.valor_unitario)}</TableCell>
                  <TableCell>{formatCurrency(movimentacao.valor_total)}</TableCell>
                  <TableCell>{movimentacao.usuario_nome}</TableCell>
                  <TableCell>
                    <Tooltip title={movimentacao.observacoes || 'Sem observações'}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 150,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {movimentacao.observacoes || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      {movimentacoesPagination.pages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={movimentacoesPagination.pages}
            page={movimentacoesPagination.current_page}
            onChange={(e, page) => {
              setMovimentacoesFilters(prev => ({ ...prev, page }));
              loadMovimentacoes();
            }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Gestão de Almoxarifado
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Controle de estoque, produtos e movimentações
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={
              <Badge 
                badgeContent={produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length} 
                color="error"
              >
                <InventoryIcon />
              </Badge>
            } 
            label="Produtos" 
          />
          <Tab icon={<CategoryIcon />} label="Categorias" />
          <Tab icon={<MovimentacaoIcon />} label="Movimentações" />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderProdutosTab()}
      {activeTab === 1 && renderCategoriasTab()}
      {activeTab === 2 && renderMovimentacoesTab()}

      {/* FAB para adicionar */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          if (activeTab === 0) handleOpenDialog('produto');
          else if (activeTab === 1) handleOpenDialog('categoria');
          else if (activeTab === 2) handleOpenDialog('movimentacao');
        }}
      >
        <AddIcon />
      </Fab>

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem key="view-almoxarifado" onClick={() => {
          const type = activeTab === 0 ? 'produto' : activeTab === 1 ? 'categoria' : 'movimentacao';
          handleOpenDialog(type, selectedItem);
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        {activeTab !== 2 && (
          <MenuItem key="edit-almoxarifado" onClick={() => {
            const type = activeTab === 0 ? 'produto' : 'categoria';
            handleOpenDialog(type, selectedItem);
            setAnchorEl(null);
          }}>
            <EditIcon sx={{ mr: 1 }} />
            Editar
          </MenuItem>
        )}
        {activeTab === 0 && (
          <MenuItem key="movimentacao-almoxarifado" onClick={() => {
            handleOpenDialog('movimentacao', { produto_id: selectedItem?.id });
            setAnchorEl(null);
          }}>
            <MovimentacaoIcon sx={{ mr: 1 }} />
            Nova Movimentação
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
          {dialogType === 'produto' && (selectedItem ? 'Editar Produto' : 'Novo Produto')}
          {dialogType === 'categoria' && (selectedItem ? 'Editar Categoria' : 'Nova Categoria')}
          {dialogType === 'movimentacao' && 'Nova Movimentação'}
        </DialogTitle>
        <DialogContent>
          {/* Formulários específicos serão implementados conforme necessário */}
          <Typography variant="body2" color="textSecondary">
            Formulário em desenvolvimento...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Almoxarifado;