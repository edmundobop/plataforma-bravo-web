import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  DirectionsCar as CarIcon,
  Build as BuildIcon,
  Assignment as ChecklistIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Description as TemplateIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { frotaService } from '../services/api';
import ChecklistCard from '../components/ChecklistCard';
import ChecklistForm from '../components/ChecklistForm';
import ChecklistTemplateManager from '../components/ChecklistTemplateManager';
import checklistService from '../services/checklistService';

const Frota = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para viaturas
  const [viaturas, setViaturas] = useState([]);
  const [viaturasLoading, setViaturasLoading] = useState(false);
  const [viaturasFilters, setViaturasFilters] = useState({
    status: '',
    setor: '',
    unidade_bm: '',
    search: '',
  });
  const [filteredViaturas, setFilteredViaturas] = useState([]);
  
  // Estados para checklists
  const [checklists, setChecklists] = useState([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [checklistsPendentes, setChecklistsPendentes] = useState([]);
  const [checklistsFilters, setChecklistsFilters] = useState({
    viatura_id: '',
    tipo: '',
    status: '',
  });
  
  // Estados para modelos
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  
  // Estados para manutenções
  const [manutencoes, setManutencoes] = useState([]);
  const [manutencoesLoading, setManutencoesLoading] = useState(false);
  const [manutencoesFilters, setManutencoesFilters] = useState({
    viatura_id: '',
    status: '',
  });
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'viatura', 'checklist', 'manutencao'
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openChecklistForm, setOpenChecklistForm] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  
  // Estados para formulários
  const [formData, setFormData] = useState({});

  // Função para filtrar viaturas dinamicamente
  const filterViaturas = useCallback(() => {
    let filtered = [...viaturas];

    // Filtro por busca (prefixo, modelo, placa)
    if (viaturasFilters.search) {
      const searchTerm = viaturasFilters.search.toLowerCase();
      filtered = filtered.filter(viatura => 
        viatura.prefixo?.toLowerCase().includes(searchTerm) ||
        viatura.modelo?.toLowerCase().includes(searchTerm) ||
        viatura.placa?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por status
    if (viaturasFilters.status) {
      filtered = filtered.filter(viatura => viatura.status === viaturasFilters.status);
    }

    // Filtro por setor
    if (viaturasFilters.setor) {
      filtered = filtered.filter(viatura => viatura.setor_responsavel === viaturasFilters.setor);
    }

    // Filtro por unidade BM
    if (viaturasFilters.unidade_bm) {
      filtered = filtered.filter(viatura => viatura.unidade_bm === viaturasFilters.unidade_bm);
    }

    setFilteredViaturas(filtered);
  }, [viaturas, viaturasFilters]);

  // Função para limpar filtros
  const clearFilters = () => {
    setViaturasFilters({
      search: '',
      status: '',
      setor: '',
      unidade_bm: ''
    });
  };

  // Aplicar filtros automaticamente quando filtros ou viaturas mudarem
  useEffect(() => {
    filterViaturas();
  }, [viaturas, viaturasFilters, filterViaturas]);

  const loadViaturas = useCallback(async () => {
    try {
      setViaturasLoading(true);
      const response = await frotaService.getViaturas({});
      setViaturas(response.data.viaturas || []);
    } catch (err) {
      console.error('Erro ao carregar viaturas:', err);
      setError('Erro ao carregar viaturas');
    } finally {
      setViaturasLoading(false);
    }
  }, []);





  const loadChecklists = useCallback(async () => {
    try {
      setChecklistsLoading(true);
      const response = await frotaService.getChecklists(checklistsFilters);
      setChecklists(response.data.checklists || []);
    } catch (err) {
      console.error('Erro ao carregar checklists:', err);
      setError('Erro ao carregar checklists');
    } finally {
      setChecklistsLoading(false);
    }
  }, [checklistsFilters]);

  const loadChecklistsPendentes = useCallback(async () => {
    try {
      setChecklistsLoading(true);
      const response = await checklistService.getChecklistsPendentes();
      // A API retorna os dados diretamente como array
      const checklists = Array.isArray(response.data) ? response.data : [];
      setChecklistsPendentes(checklists);
    } catch (err) {
      console.error('Erro ao carregar checklists pendentes:', err);
      setError('Erro ao carregar checklists pendentes');
    } finally {
      setChecklistsLoading(false);
    }
  }, []);

  const handleGerarChecklistsDiarios = async () => {
    try {
      setChecklistsLoading(true);
      await checklistService.gerarChecklistsDiarios();
      await loadChecklistsPendentes();
    } catch (err) {
      console.error('Erro ao gerar checklists diários:', err);
      setError('Erro ao gerar checklists diários');
    } finally {
      setChecklistsLoading(false);
    }
  };

  const handleIniciarChecklist = async (checklist) => {
     try {
       setSelectedChecklist(checklist);
       setOpenChecklistForm(true);
     } catch (err) {
       console.error('Erro ao iniciar checklist:', err);
       setError('Erro ao iniciar checklist');
     }
   };

   const handleCloseChecklistForm = () => {
     setOpenChecklistForm(false);
     setSelectedChecklist(null);
   };

   const handleChecklistSaved = async (checklistData) => {
    try {
      setLoading(true);
      
      if (checklistData.status === 'finalizado') {
         // Se o checklist está sendo finalizado, usar o endpoint de finalizar
         const assinaturaData = {
           nome_completo: checklistData.assinatura.nome_completo,
           senha: checklistData.assinatura.senha
         };
         
         await checklistService.finalizarChecklist(selectedChecklist.id, assinaturaData);
      } else {
        // Se é apenas um salvamento, usar o endpoint de atualizar
        await checklistService.updateChecklist(selectedChecklist.id, checklistData);
      }
      
      // Recarregar as listas após salvar
      await loadChecklistsPendentes();
      await loadChecklists();
      handleCloseChecklistForm();
    } catch (error) {
      console.error('Erro ao salvar checklist:', error);
      setError('Erro ao salvar checklist: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllChecklists = async () => {
    if (window.confirm('Tem certeza que deseja excluir TODOS os checklists? Esta ação não pode ser desfeita.')) {
      try {
        setChecklistsLoading(true);
        const response = await frotaService.deleteAllChecklists();
        setError('');
        
        // Recarregar as listas
        await loadChecklistsPendentes();
        await loadChecklists();
        
        // Mostrar mensagem de sucesso
        alert(response.data.message || 'Todos os checklists foram excluídos com sucesso');
      } catch (err) {
        console.error('Erro ao excluir checklists:', err);
        setError('Erro ao excluir checklists: ' + (err.response?.data?.error || err.message));
      } finally {
        setChecklistsLoading(false);
      }
    }
  };

  const loadTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const response = await checklistService.getTemplates();
      setTemplates(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar modelos:', err);
      setError('Erro ao carregar modelos');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadManutencoes = useCallback(async () => {
    try {
      setManutencoesLoading(true);
      const response = await frotaService.getManutencoes(manutencoesFilters);
      setManutencoes(response.data.manutencoes || []);
    } catch (err) {
      console.error('Erro ao carregar manutenções:', err);
      setError('Erro ao carregar manutenções');
    } finally {
      setManutencoesLoading(false);
    }
  }, [manutencoesFilters]);

  const loadData = useCallback(() => {
    switch (activeTab) {
      case 0:
        loadViaturas();
        break;
      case 1:
        loadChecklistsPendentes();
        loadChecklists();
        break;
      case 2:
        loadTemplates();
        break;
      case 3:
        loadManutencoes();
        break;
      default:
        break;
    }
  }, [activeTab, loadViaturas, loadChecklistsPendentes, loadChecklists, loadManutencoes]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTab]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
  };

  const handleOpenDialog = (type, item = null) => {
    if (type === 'checklist' && !item) {
      // Para novo checklist, abrir o gerenciador de modelos
      setTemplateManagerOpen(true);
    } else {
      // Para outros tipos ou edição, usar o diálogo padrão
      setDialogType(type);
      setSelectedItem(item);
      setFormData(item || {});
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setSelectedItem(null);
    setFormData({});
  };

  const handleCloseTemplateManager = () => {
    setTemplateManagerOpen(false);
    setSelectedItem(null);
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      setLoading(true);
      
      // Encontrar a viatura selecionada para obter o tipo
      const viaturaSelecionada = viaturas.find(v => v.id === parseInt(templateData.veiculo_id));
      if (!viaturaSelecionada) {
        throw new Error('Viatura não encontrada');
      }
      
      // Transformar os dados para o formato esperado pelo backend
      const backendData = {
        nome: templateData.nome,
        descricao: templateData.descricao || '',
        tipo_viatura: viaturaSelecionada.tipo,
        configuracao: {
          veiculo_id: templateData.veiculo_id,
          km_inicial: templateData.km_inicial,
          combustivel_inicial: templateData.combustivel_inicial,
          motorista: templateData.motorista,
          combatente: templateData.combatente
        }
      };
      
      if (selectedItem && selectedItem.id) {
        // Editando modelo existente
        await checklistService.updateTemplate(selectedItem.id, backendData);
      } else {
        // Criando novo modelo
        await checklistService.createTemplate(backendData);
      }
      
      // Fechar o gerenciador de modelos
      setTemplateManagerOpen(false);
      setSelectedItem(null);
      
      // Recarregar modelos
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      setError('Erro ao salvar modelo: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setSelectedItem(template);
    setTemplateManagerOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteTemplate = async (template) => {
    if (window.confirm(`Tem certeza que deseja excluir o modelo "${template.nome}"?`)) {
      try {
        setLoading(true);
        await checklistService.deleteTemplate(template.id);
        await loadTemplates();
        setAnchorEl(null);
        setSelectedItem(null);
      } catch (error) {
        console.error('Erro ao excluir modelo:', error);
        setError('Erro ao excluir modelo: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    }
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
      
      console.log('Salvando dados:', { dialogType, selectedItem: selectedItem?.id, formData });
      
      if (dialogType === 'viatura') {
        if (selectedItem) {
          const response = await frotaService.updateViatura(selectedItem.id, formData);
          console.log('Viatura atualizada:', response);
        } else {
          const response = await frotaService.createViatura(formData);
          console.log('Viatura criada:', response);
        }
        await loadViaturas();
      } else if (dialogType === 'checklist') {
        await frotaService.createChecklist(formData);
        await loadChecklists();
      } else if (dialogType === 'manutencao') {
        if (selectedItem) {
          await frotaService.updateManutencao(selectedItem.id, formData);
        } else {
          await frotaService.createManutencao(formData);
        }
        await loadManutencoes();
      }
      
      console.log('Dados salvos com sucesso, fechando diálogo');
      handleCloseDialog();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Erro ao salvar dados';
      setError(errorMessage);
      // Não fechar o diálogo em caso de erro para que o usuário possa corrigir
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'disponivel':
      case 'concluido':
      case 'finalizada':
        return 'success';
      case 'em_uso':
      case 'pendente':
      case 'em_andamento':
        return 'warning';
      case 'manutencao':
      case 'cancelado':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
  };

  const renderViaturasTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Buscar"
                value={viaturasFilters.search}
                onChange={(e) => setViaturasFilters(prev => ({ ...prev, search: e.target.value }))}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
                placeholder="Prefixo, modelo ou placa"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={viaturasFilters.status}
                  onChange={(e) => setViaturasFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="disponivel">Disponível</MenuItem>
                  <MenuItem value="em_uso">Em Uso</MenuItem>
                  <MenuItem value="manutencao">Manutenção</MenuItem>
                  <MenuItem value="indisponivel">Indisponível</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <FormControl fullWidth>
                <InputLabel>Setor</InputLabel>
                <Select
                  value={viaturasFilters.setor}
                  onChange={(e) => setViaturasFilters(prev => ({ ...prev, setor: e.target.value }))}
                  label="Setor"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="Operacional">Operacional</MenuItem>
                  <MenuItem value="Administrativo">Administrativo</MenuItem>
                  <MenuItem value="Outro">Outro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <FormControl fullWidth>
                <InputLabel>Unidade BM</InputLabel>
                <Select
                  value={viaturasFilters.unidade_bm}
                  onChange={(e) => setViaturasFilters(prev => ({ ...prev, unidade_bm: e.target.value }))}
                  label="Unidade BM"
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="13 BBM Jataí">13 BBM Jataí</MenuItem>
                  <MenuItem value="14 BBM Mineiros">14 BBM Mineiros</MenuItem>
                  <MenuItem value="15 BBM Rio Verde">15 BBM Rio Verde</MenuItem>
                  <MenuItem value="16 DBM Caiapônia">16 DBM Caiapônia</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={clearFilters}
                color="secondary"
                sx={{ mb: 1 }}
              >
                Limpar Filtros
              </Button>
            </Grid>
          </Grid>
          
          {/* Contador de resultados */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="textSecondary">
              {filteredViaturas.length} de {viaturas.length} viaturas
            </Typography>
            {(viaturasFilters.search || viaturasFilters.status || viaturasFilters.setor || viaturasFilters.unidade_bm) && (
              <Chip
                label="Filtros ativos"
                color="primary"
                size="small"
                onDelete={clearFilters}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Tabela de viaturas */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Foto</TableCell>
              <TableCell>Prefixo</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Placa</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Setor</TableCell>
              <TableCell>Hodômetro</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {viaturasLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredViaturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhuma viatura encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredViaturas.map((viatura) => (
                <TableRow key={viatura.id}>
                  <TableCell>
                    <Box sx={{ width: 60, height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {viatura.foto ? (
                        <img
                          src={viatura.foto}
                          alt={`Foto ${viatura.prefixo}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0'
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <CarIcon sx={{ color: '#bdbdbd', fontSize: 20 }} />
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{viatura.prefixo}</TableCell>
                  <TableCell>{viatura.modelo}</TableCell>
                  <TableCell>{viatura.placa}</TableCell>
                  <TableCell>
                    <Chip
                      label={viatura.status}
                      color={getStatusColor(viatura.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{viatura.setor_responsavel}</TableCell>
                  <TableCell>{viatura.km_atual?.toLocaleString()} km</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(viatura);
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
    </Box>
  );

  const renderChecklistsTab = () => (
    <Box>
      {/* Header com ações */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Checklists Diários
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleGerarChecklistsDiarios}
                disabled={checklistsLoading}
              >
                Gerar Checklists do Dia
              </Button>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={loadChecklistsPendentes}
                disabled={checklistsLoading}
              >
                Atualizar
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteAllChecklists}
                disabled={checklistsLoading}
              >
                Limpar Todos
              </Button>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Data: {new Date().toLocaleDateString('pt-BR')} • 
            Pendentes: {checklistsPendentes.length} • 
            Tipos elegíveis: ABT, ABTF, UR, ASA
          </Typography>
        </CardContent>
      </Card>

      {/* Cards de checklists pendentes */}
      {checklistsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : checklistsPendentes.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ChecklistIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum checklist pendente
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Todos os checklists do dia foram concluídos ou ainda não foram gerados.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleGerarChecklistsDiarios}
            >
              Gerar Checklists do Dia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {checklistsPendentes.map((checklist) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={checklist.id}>
              <ChecklistCard
                checklist={checklist}
                onIniciar={handleIniciarChecklist}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Histórico de checklists */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Histórico de Checklists
          </Typography>
          
          {/* Filtros do histórico */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Viatura</InputLabel>
                <Select
                  value={checklistsFilters.viatura_id}
                  onChange={(e) => setChecklistsFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                  label="Viatura"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {viaturas.map((viatura) => (
                    <MenuItem key={viatura.id} value={viatura.id}>
                      {viatura.prefixo} - {viatura.marca} {viatura.modelo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={checklistsFilters.tipo}
                  onChange={(e) => setChecklistsFilters(prev => ({ ...prev, tipo: e.target.value }))}
                  label="Tipo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="diario">Diário</MenuItem>
                  <MenuItem value="saida">Saída</MenuItem>
                  <MenuItem value="retorno">Retorno</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={checklistsFilters.status}
                  onChange={(e) => setChecklistsFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="concluido">Concluído</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadChecklists}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>

          {/* Tabela de histórico */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Viatura</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checklists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Nenhum checklist encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  checklists.map((checklist) => (
                    <TableRow key={checklist.id}>
                      <TableCell>{checklist.viatura_prefixo}</TableCell>
                      <TableCell>
                        <Chip
                          label={checklist.tipo}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={checklist.status}
                          color={getStatusColor(checklist.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{checklist.usuario_nome || '-'}</TableCell>
                      <TableCell>{formatDate(checklist.data_checklist)}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpenDialog('checklist', checklist)}>
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderTemplatesTab = () => (
    <Box>
      {/* Header com ações */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Modelos de Checklists
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setTemplateManagerOpen(true)}
                disabled={templatesLoading}
              >
                Novo Modelo
              </Button>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={loadTemplates}
                disabled={templatesLoading}
              >
                Atualizar
              </Button>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Gerencie os modelos de checklists que serão utilizados para criar checklists personalizados.
          </Typography>
        </CardContent>
      </Card>

      {/* Lista de modelos */}
      {templatesLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <TemplateIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum modelo encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crie seu primeiro modelo de checklist para começar.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setTemplateManagerOpen(true)}
            >
              Criar Primeiro Modelo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {template.nome}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(template);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.descricao || 'Sem descrição'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {template.configuracao?.motorista?.secoes && (
                      <Chip
                        label={`Motorista: ${Object.values(template.configuracao.motorista.secoes).reduce((total, secao) => total + (secao?.length || 0), 0)} campos`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {template.configuracao?.combatente?.secoes && (
                      <Chip
                        label={`Combatente: ${Object.values(template.configuracao.combatente.secoes).reduce((total, secao) => total + (secao?.length || 0), 0)} campos`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                    {template.configuracao?.socorrista?.secoes && (
                      <Chip
                        label={`Socorrista: ${Object.values(template.configuracao.socorrista.secoes).reduce((total, secao) => total + (secao?.length || 0), 0)} campos`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    Criado em: {new Date(template.created_at).toLocaleDateString('pt-BR')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderManutencoesTab = () => (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Viatura</InputLabel>
                <Select
                  value={manutencoesFilters.viatura_id}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, viatura_id: e.target.value }))}
                  label="Viatura"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {viaturas.map((viatura) => (
                    <MenuItem key={viatura.id} value={viatura.id}>
                      {viatura.prefixo} - {viatura.modelo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={manutencoesFilters.status}
                  onChange={(e) => setManutencoesFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="agendada">Agendada</MenuItem>
                  <MenuItem value="em_andamento">Em Andamento</MenuItem>
                  <MenuItem value="finalizada">Finalizada</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadManutencoes}
                startIcon={<FilterIcon />}
              >
                Filtrar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de manutenções */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Viatura</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data Agendada</TableCell>
              <TableCell>Custo</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {manutencoesLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : manutencoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhuma manutenção encontrada
                </TableCell>
              </TableRow>
            ) : (
              manutencoes.map((manutencao) => (
                <TableRow key={manutencao.id}>
                  <TableCell>{manutencao.viatura_prefixo}</TableCell>
                  <TableCell>{manutencao.tipo}</TableCell>
                  <TableCell>
                    <Chip
                      label={manutencao.status}
                      color={getStatusColor(manutencao.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(manutencao.data_agendada)}</TableCell>
                  <TableCell>
                    {manutencao.custo ? `R$ ${manutencao.custo.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(manutencao);
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
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Gestão de Frota
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gerencie viaturas, checklists e manutenções
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
          <Tab icon={<CarIcon />} label="Viaturas" />
          <Tab icon={<TemplateIcon />} label="Modelos Checklists" />
          <Tab icon={<ChecklistIcon />} label="Checklists" />
          <Tab icon={<BuildIcon />} label="Manutenções" />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && renderViaturasTab()}
      {activeTab === 1 && renderTemplatesTab()}
      {activeTab === 2 && renderChecklistsTab()}
      {activeTab === 3 && renderManutencoesTab()}

      {/* FAB para adicionar */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => {
          if (activeTab === 0) handleOpenDialog('viatura');
          else if (activeTab === 1) handleOpenDialog('checklist');
          else if (activeTab === 2) handleOpenDialog('modelo');
          else if (activeTab === 3) handleOpenDialog('manutencao');
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
        {activeTab === 2 ? (
          // Menu para modelos
          [
            <MenuItem key="edit" onClick={() => handleEditTemplate(selectedItem)}>
              <EditIcon sx={{ mr: 1 }} />
              Editar Modelo
            </MenuItem>,
            <MenuItem key="delete" onClick={() => handleDeleteTemplate(selectedItem)}>
              <DeleteIcon sx={{ mr: 1 }} />
              Excluir Modelo
            </MenuItem>
          ]
        ) : (
          // Menu para outras abas
          [
            <MenuItem key="view" onClick={() => {
              handleOpenDialog(activeTab === 0 ? 'viatura' : activeTab === 3 ? 'manutencao' : 'checklist', selectedItem);
              setAnchorEl(null);
            }}>
              <ViewIcon sx={{ mr: 1 }} />
              Visualizar
            </MenuItem>,
            (activeTab === 0 || activeTab === 3) && (
              <MenuItem key="edit" onClick={() => {
                handleOpenDialog(activeTab === 0 ? 'viatura' : 'manutencao', selectedItem);
                setAnchorEl(null);
              }}>
                <EditIcon sx={{ mr: 1 }} />
                Editar
              </MenuItem>
            )
          ]
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
          {dialogType === 'viatura' && (selectedItem ? 'Editar Viatura' : 'Nova Viatura')}
          {dialogType === 'checklist' && (selectedItem ? 'Visualizar Checklist' : 'Novo Checklist')}
          {dialogType === 'manutencao' && (selectedItem ? 'Editar Manutenção' : 'Nova Manutenção')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {dialogType === 'viatura' && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <label htmlFor="viatura-foto-upload">
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Foto da Viatura</Typography>
                    </label>
                    <input
                      id="viatura-foto-upload"
                      name="viatura-foto"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            handleFormChange('foto', event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ marginBottom: '8px' }}
                    />
                    {formData.foto && (
                      <Box sx={{ mt: 1 }}>
                        <img
                          src={formData.foto}
                          alt="Preview"
                          style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Tipo da Viatura</InputLabel>
                    <Select
                      value={formData.tipo || ''}
                      onChange={(e) => handleFormChange('tipo', e.target.value)}
                      label="Tipo da Viatura"
                    >
                      <MenuItem value="ABT">ABT - Auto Bomba Tanque</MenuItem>
                      <MenuItem value="ABTF">ABTF - Auto Bomba Tanque Florestal</MenuItem>
                      <MenuItem value="UR">UR - Unidade de Resgate</MenuItem>
                      <MenuItem value="AV">AV - Auto Viatura</MenuItem>
                      <MenuItem value="ASA">ASA - Auto Socorro de Altura</MenuItem>
                      <MenuItem value="MOB">MOB - Motocicleta</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Prefixo"
                    value={formData.prefixo || ''}
                    onChange={(e) => handleFormChange('prefixo', e.target.value)}
                    placeholder="Ex: ABT-01, UR-02"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Unidade BM</InputLabel>
                    <Select
                      value={formData.unidade_bm || ''}
                      onChange={(e) => handleFormChange('unidade_bm', e.target.value)}
                      label="Unidade BM"
                    >
                      <MenuItem value="13 BBM Jataí">13 BBM Jataí</MenuItem>
                      <MenuItem value="16 DBM Caiapônia">16 DBM Caiapônia</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Placa"
                    value={formData.placa || ''}
                    onChange={(e) => handleFormChange('placa', e.target.value)}
                    placeholder="Ex: ABC-1234"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Marca"
                    value={formData.marca || ''}
                    onChange={(e) => handleFormChange('marca', e.target.value)}
                    placeholder="Ex: Mercedes-Benz, Volkswagen"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Modelo"
                    value={formData.modelo || ''}
                    onChange={(e) => handleFormChange('modelo', e.target.value)}
                    placeholder="Ex: Atego 1719, Sprinter 415"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Ano"
                    value={formData.ano || ''}
                    onChange={(e) => handleFormChange('ano', parseInt(e.target.value))}
                    inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quilometragem Atual"
                    value={formData.km_atual || ''}
                    onChange={(e) => handleFormChange('km_atual', parseInt(e.target.value))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Chassi"
                    value={formData.chassi || ''}
                    onChange={(e) => handleFormChange('chassi', e.target.value)}
                    placeholder="Número do chassi"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="RENAVAM"
                    value={formData.renavam || ''}
                    onChange={(e) => handleFormChange('renavam', e.target.value)}
                    placeholder="Número do RENAVAM"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status || 'disponivel'}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="disponivel">Disponível</MenuItem>
                      <MenuItem value="em_uso">Em Uso</MenuItem>
                      <MenuItem value="manutencao">Em Manutenção</MenuItem>
                      <MenuItem value="indisponivel">Indisponível</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Setor Responsável</InputLabel>
                    <Select
                      value={formData.setor_responsavel || ''}
                      onChange={(e) => handleFormChange('setor_responsavel', e.target.value)}
                      label="Setor Responsável"
                    >
                      <MenuItem value="Operacional">Operacional</MenuItem>
                      <MenuItem value="Administrativo">Administrativo</MenuItem>
                      <MenuItem value="Outro">Outro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações"
                    value={formData.observacoes || ''}
                    onChange={(e) => handleFormChange('observacoes', e.target.value)}
                    placeholder="Informações adicionais sobre a viatura..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          {dialogType === 'checklist' && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Este formulário criará um checklist básico. Para checklists completos com modelos configuráveis, 
                use o botão "Gerar Checklists do Dia" ou inicie um checklist pendente.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Viatura</InputLabel>
                    <Select
                      value={formData.viatura_id || ''}
                      onChange={(e) => handleFormChange('viatura_id', e.target.value)}
                      label="Viatura"
                    >
                      {viaturas.map((viatura) => (
                        <MenuItem key={viatura.id} value={viatura.id}>
                          {viatura.prefixo} - {viatura.marca} {viatura.modelo} ({viatura.tipo})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Tipo do Checklist</InputLabel>
                    <Select
                      value={formData.tipo || ''}
                      onChange={(e) => handleFormChange('tipo', e.target.value)}
                      label="Tipo do Checklist"
                    >
                      <MenuItem value="diario">Diário</MenuItem>
                      <MenuItem value="saida">Saída</MenuItem>
                      <MenuItem value="retorno">Retorno</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    label="Data do Checklist"
                    value={formData.data_checklist || new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleFormChange('data_checklist', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="KM Inicial"
                    value={formData.km_inicial || ''}
                    onChange={(e) => handleFormChange('km_inicial', e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Combustível Inicial (%)"
                    value={formData.combustivel_inicial || ''}
                    onChange={(e) => handleFormChange('combustivel_inicial', e.target.value)}
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações Gerais"
                    value={formData.observacoes_gerais || ''}
                    onChange={(e) => handleFormChange('observacoes_gerais', e.target.value)}
                    placeholder="Observações sobre o checklist..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          {dialogType === 'manutencao' && (
            <Typography variant="body2" color="textSecondary">
              Formulário de manutenção em desenvolvimento...
            </Typography>
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

      {/* Formulário de Checklist */}
      <ChecklistForm
        open={openChecklistForm}
        onClose={handleCloseChecklistForm}
        checklist={selectedChecklist}
        onSave={handleChecklistSaved}
      />

      {/* Gerenciador de Modelos de Checklist */}
      <ChecklistTemplateManager
        open={templateManagerOpen}
        onClose={handleCloseTemplateManager}
        onSave={handleSaveTemplate}
        viaturas={viaturas}
        template={selectedItem}
      />
    </Box>
  );
};

export default Frota;