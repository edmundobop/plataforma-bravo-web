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
import { FormControlLabel, Switch } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { almoxarifadoService } from '../services/api';

const Almoxarifado = () => {
  const theme = useTheme();
  const { user, isOperador } = useAuth();
  const { currentUnit } = useTenant();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const [retiradaQtd, setRetiradaQtd] = useState(1);
  const [retiradaLoading, setRetiradaLoading] = useState(false);

  useEffect(() => {
    loadCategorias();
    loadData();
  }, [activeTab]);

  useEffect(() => {
    const h = setTimeout(() => {
      loadProdutos();
    }, 300);
    return () => clearTimeout(h);
  }, [produtosFilters.search]);
  useEffect(() => {
    const h = setTimeout(() => {
      loadProdutos();
    }, 150);
    return () => clearTimeout(h);
  }, [produtosFilters.categoria_id, produtosFilters.ativo, produtosFilters.baixo_estoque]);
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

  const handleRetiradaRapida = async () => {
    try {
      if (!barcodeInput || retiradaQtd <= 0) return;
      setRetiradaLoading(true);
      const res = await almoxarifadoService.getProdutos({ search: barcodeInput, page: 1, limit: 1 });
      const list = res.data.produtos || [];
      if (!list.length) {
        setError('Produto não encontrado pelo código de barras');
        return;
      }
      const produto = list[0];
      await almoxarifadoService.createMovimentacao({
        produto_id: produto.id,
        tipo: 'saida',
        quantidade: parseInt(retiradaQtd, 10),
        motivo: 'Retirada rápida',
      });
      setBarcodeInput('');
      setRetiradaQtd(1);
      loadMovimentacoes();
      loadProdutos();
    } catch (err) {
      setError('Erro na retirada rápida');
    } finally {
      setRetiradaLoading(false);
    }
  };

  const loadCategorias = async () => {
    try {
      setCategoriasLoading(true);
      const response = await almoxarifadoService.getCategorias();
      setCategorias(Array.isArray(response.data) ? response.data : (response.data.categorias || []));
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
      const data = response.data;
      setMovimentacoes(Array.isArray(data) ? data : (data.movimentacoes || []));
      setMovimentacoesPagination(Array.isArray(data) ? { total: data.length, pages: 1, current_page: 1 } : (data.pagination || {}));
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

  const renderRelatoriosTab = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Relatório de Estoque</Typography>
            <Button
              variant="outlined"
              startIcon={<ReportIcon />}
              onClick={async () => {
                try {
                  const params = {};
                  if (produtosFilters.categoria_id) params.categoria_id = produtosFilters.categoria_id;
                  if (produtosFilters.baixo_estoque) params.baixo_estoque = 'true';
                  const resp = await almoxarifadoService.getRelatorioEstoque(params);
                  setRelatorio(resp.data);
                } catch (err) {
                  setError('Erro ao carregar relatório');
                }
              }}
            >
              Atualizar Relatório
            </Button>
          </Box>
          {relatorio && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Total de Produtos</Typography>
                  <Typography variant="h5">{relatorio.resumo?.total_produtos ?? '-'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Produtos em Baixo Estoque</Typography>
                  <Typography variant="h5">{relatorio.resumo?.produtos_baixo_estoque ?? '-'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Valor Total</Typography>
                  <Typography variant="h5">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatorio.resumo?.valor_total || 0)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
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
  const formatCurrencyInput = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    const num = Number(digits) / 100;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  const parseCurrencyInput = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    return (Number(digits) / 100).toFixed(2);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (dialogType === 'produto') {
        const payload = { ...formData };
        // Conversões
        if (payload.categoria_id !== undefined) payload.categoria_id = parseInt(payload.categoria_id || '0', 10);
        if (payload.estoque_minimo !== undefined) payload.estoque_minimo = parseInt(payload.estoque_minimo || '0', 10);
        if (payload.valor_unitario !== undefined) {
          const v = String(payload.valor_unitario).replace('.', '').replace(',', '.');
          payload.valor_unitario = parseFloat(v || '0');
        }
        // Envio
        if (selectedItem) {
          // Atualização futura
        } else {
          const res = await almoxarifadoService.createProduto(payload);
          const novo = res.data?.produto;
          const estoqueInicial = parseInt(formData.estoque_inicial || '0', 10);
          if (novo?.id && estoqueInicial > 0) {
            await almoxarifadoService.createMovimentacao({
              produto_id: novo.id,
              tipo: 'entrada',
              quantidade: estoqueInicial,
              motivo: 'Estoque inicial',
            });
          }
        }
        loadProdutos();
      } else if (dialogType === 'categoria') {
        await almoxarifadoService.createCategoria(formData);
        loadCategorias();
      } else if (dialogType === 'movimentacao') {
        const payload = { ...formData };
        payload.produto_id = parseInt(payload.produto_id || '0', 10);
        payload.quantidade = parseInt(payload.quantidade || '0', 10);
        if (payload.valor_unitario !== undefined) {
          const v = String(payload.valor_unitario).replace('.', '').replace(',', '.');
          payload.valor_unitario = parseFloat(v || '0');
        }
        if (isOperador() && payload.tipo === 'entrada') {
          setError('Operador não pode registrar entradas');
          setLoading(false);
          return;
        }
        await almoxarifadoService.createMovimentacao(payload);
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
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Leitor de Código de Barras"
                placeholder="Aponte o leitor aqui"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Quantidade"
                type="number"
                value={retiradaQtd}
                onChange={(e) => setRetiradaQtd(parseInt(e.target.value || '1', 10))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleRetiradaRapida}
                disabled={retiradaLoading}
              >
                {retiradaLoading ? <CircularProgress size={20} /> : 'Retirar'}
              </Button>
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
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  const headers = ['codigo', 'barcode', 'nome', 'categoria_nome', 'estoque_atual', 'estoque_minimo', 'valor_unitario', 'ativo'];
                  const rows = produtos.map(p => [
                    p.codigo,
                    p.barcode || '',
                    p.nome,
                    p.categoria_nome || '',
                    p.estoque_atual,
                    p.estoque_minimo,
                    p.valor_unitario,
                    p.ativo ? 'Ativo' : 'Inativo'
                  ]);
                  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'\\"')}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'produtos.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exportar CSV
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setProdutosFilters({
                    categoria_id: '',
                    ativo: '',
                    baixo_estoque: false,
                    search: '',
                    page: 1,
                    limit: 10,
                  });
                  loadProdutos();
                }}
              >
                Limpar Filtros
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
              <TableCell>Barcode</TableCell>
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
                  <TableCell>{produto.barcode || '-'}</TableCell>
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
                    {!isOperador() && (
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedItem(produto);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
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
          <Tab icon={<ReportIcon />} label="Relatórios" />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderProdutosTab()}
      {activeTab === 1 && renderCategoriasTab()}
      {activeTab === 2 && renderMovimentacoesTab()}
      {activeTab === 3 && renderRelatoriosTab()}

      {/* FAB para adicionar */}
      {((activeTab === 2) || !isOperador()) && (
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
      )}

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
        {activeTab !== 2 && !isOperador() && (
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
          {dialogType === 'produto' && (
            <Box mt={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Código do Produto"
                    value={formData.codigo || ''}
                    onChange={(e) => handleFormChange('codigo', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nome"
                    value={formData.nome || ''}
                    onChange={(e) => handleFormChange('nome', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Descrição"
                    value={formData.descricao || ''}
                    onChange={(e) => handleFormChange('descricao', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={formData.categoria_id || ''}
                      label="Categoria"
                      onChange={(e) => handleFormChange('categoria_id', e.target.value)}
                    >
                      <MenuItem key="cat-none" value="">Selecione</MenuItem>
                      {categorias.map((categoria) => (
                        <MenuItem key={`cat-${categoria.id}`} value={categoria.id}>
                          {categoria.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Código de Barras"
                    placeholder="Aponte o leitor aqui"
                    value={formData.barcode || ''}
                    onChange={(e) => handleFormChange('barcode', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Unidade de Medida"
                    value={formData.unidade_medida || ''}
                    onChange={(e) => handleFormChange('unidade_medida', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Estoque Mínimo"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={formData.estoque_minimo ?? ''}
                    onChange={(e) => handleFormChange('estoque_minimo', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor Unitário (R$)"
                    inputMode="numeric"
                    value={formatCurrencyInput(formData.valor_unitario)}
                    onChange={(e) => handleFormChange('valor_unitario', parseCurrencyInput(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Estoque Inicial"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={formData.estoque_inicial ?? ''}
                    onChange={(e) => handleFormChange('estoque_inicial', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(formData.ativo ?? true)}
                        onChange={(e) => handleFormChange('ativo', e.target.checked)}
                      />
                    }
                    label="Ativo"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          {dialogType === 'categoria' && (
            <Box mt={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nome da Categoria"
                    value={formData.nome || ''}
                    onChange={(e) => handleFormChange('nome', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Descrição"
                    value={formData.descricao || ''}
                    onChange={(e) => handleFormChange('descricao', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          {dialogType === 'movimentacao' && (
            <Box mt={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Produto</InputLabel>
                    <Select
                      value={formData.produto_id || ''}
                      label="Produto"
                      onChange={(e) => handleFormChange('produto_id', e.target.value)}
                    >
                      <MenuItem key="mov-todos-produtos" value="">Selecione</MenuItem>
                      {produtos.map((produto) => (
                        <MenuItem key={`mov-prod-${produto.id}`} value={produto.id}>
                          {produto.codigo} - {produto.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={formData.tipo || ''}
                      label="Tipo"
                      onChange={(e) => handleFormChange('tipo', e.target.value)}
                    >
                      <MenuItem key="mov-tipo-none" value="">Selecione</MenuItem>
                      {!isOperador() && (
                        <MenuItem key="mov-tipo-entrada" value="entrada">Entrada</MenuItem>
                      )}
                      <MenuItem key="mov-tipo-saida" value="saida">Saída</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Quantidade"
                    type="number"
                    value={formData.quantidade || ''}
                    onChange={(e) => handleFormChange('quantidade', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Motivo"
                    value={formData.motivo || ''}
                    onChange={(e) => handleFormChange('motivo', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor Unitário (R$)"
                    inputMode="numeric"
                    value={formatCurrencyInput(formData.valor_unitario)}
                    onChange={(e) => handleFormChange('valor_unitario', parseCurrencyInput(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Documento (NF/OS)"
                    value={formData.documento || ''}
                    onChange={(e) => handleFormChange('documento', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fornecedor"
                    value={formData.fornecedor || ''}
                    onChange={(e) => handleFormChange('fornecedor', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
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
