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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Autocomplete,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  FormLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Divider,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  PhotoCamera,
  Delete,
  NavigateNext,
  NavigateBefore,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import api, { frotaService, checklistService, uploadService, templateService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

const ChecklistViatura = ({ open, onClose, onSuccess, viaturas: viaturasProps, selectedViatura: selectedViaturaProps, prefill }) => {
  const { user } = useAuth(); // Obter usuário logado
  const { currentUnit } = useTenant(); // Obter unidade atual
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1); // 1: Dados iniciais, 2: Checklist, 3: Autenticação
  // Paginação por categoria no Passo 2 e visualização de imagens
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [imagePreview, setImagePreview] = useState({ open: false, url: '', title: '' });
  
  // Estados para dados iniciais
  const [viaturas, setViaturas] = useState(viaturasProps || []);
  const [selectedViatura, setSelectedViatura] = useState(selectedViaturaProps || null);
  const [kmInicial, setKmInicial] = useState('');
  const [combustivelPercentual, setCombustivelPercentual] = useState('');
  const [alaServico, setAlaServico] = useState('');
  const [tipoChecklist, setTipoChecklist] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [dataHora] = useState(new Date());
  const [templateModelo, setTemplateModelo] = useState(null);
  
  // Itens do checklist
  const [itensChecklist, setItensChecklist] = useState([
    { nome_item: 'Pneus', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 1 },
    { nome_item: 'Freios', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 2 },
    { nome_item: 'Luzes', categoria: 'Elétrica', status: 'ok', observacoes: '', fotos: [], ordem: 3 },
    { nome_item: 'Óleo do motor', categoria: 'Motor', status: 'ok', observacoes: '', fotos: [], ordem: 4 },
    { nome_item: 'Água do radiador', categoria: 'Motor', status: 'ok', observacoes: '', fotos: [], ordem: 5 },
    { nome_item: 'Bateria', categoria: 'Elétrica', status: 'ok', observacoes: '', fotos: [], ordem: 6 },
    { nome_item: 'Documentação', categoria: 'Documentos', status: 'ok', observacoes: '', fotos: [], ordem: 7 },
    { nome_item: 'Kit de primeiros socorros', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 8 },
    { nome_item: 'Extintor', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 9 },
    { nome_item: 'Triângulo', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 10 },
  ]);
  
  // Autenticação
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioAutenticacao, setUsuarioAutenticacao] = useState(user || null);
  const [senhaAutenticacao, setSenhaAutenticacao] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Função para carregar templates
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      console.log('📋 ChecklistViatura - Carregando templates...');
      console.log('🏢 CurrentUnit:', currentUnit);
      
      const filters = {};
      
      // Adicionar filtro de unidade se disponível
      if (currentUnit?.id) {
        filters.unidade_id = currentUnit.id;
        console.log('📍 Usando unidade_id para templates:', currentUnit.id);
      } else {
        console.warn('⚠️ CurrentUnit não definido ou sem ID para templates');
      }
      
      console.log('📤 Filtros para templates:', filters);
      const response = await templateService.getTemplates(filters);
      console.log('📥 Resposta da API templates:', response);
      
      const templates = Array.isArray(response) ? response : (response.templates || []);
      console.log('📋 Templates carregados:', templates.length, templates);
      
      setTemplates(templates);
    } catch (err) {
      console.error('❌ Erro ao carregar templates:', err);
      setError('Erro ao carregar templates de checklist');
    } finally {
      setTemplatesLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      if (viaturasProps && viaturasProps.length > 0) {
        setViaturas(viaturasProps);
      } else {
        loadViaturas();
      }
      
      // Carregar templates disponíveis
      loadTemplates();
          
      // Pré-preencher com usuário logado
      if (user) {
        setUsuarioAutenticacao({
          nome: user.nome,
          email: user.email
        });
      }
      
      // Aplicar prefill para campos simples
      if (prefill) {
        if (prefill.tipo_checklist) setTipoChecklist(prefill.tipo_checklist);
        if (prefill.ala_servico) setAlaServico(prefill.ala_servico);
      }
    }
  }, [open, viaturasProps, user, currentUnit, prefill]);

  // Após carregar viaturas, aplicar prefill de viatura_id
  useEffect(() => {
    if (prefill?.viatura_id && viaturas.length > 0 && !selectedViatura) {
      const v = viaturas.find(x => x.id === prefill.viatura_id);
      if (v) setSelectedViatura(v);
    }
  }, [viaturas, prefill, selectedViatura]);

  // Após carregar templates, aplicar prefill de template_id
  useEffect(() => {
    if (prefill?.template_id && templates.length > 0 && !selectedTemplate) {
      const t = templates.find(x => x.id === prefill.template_id);
      if (t) setSelectedTemplate(t);
    }
  }, [templates, prefill, selectedTemplate]);

  // Resetar formulário quando fechar
  useEffect(() => {
    if (!open) {
      setStep(1);
      setCategoryIndex(0);
      setKmInicial('');
      setCombustivelPercentual('');
      setAlaServico('');
      setTipoChecklist('');
      setSelectedTemplate(null);
      setObservacoesGerais('');
      setUsuarioAutenticacao(null);
      setSenhaAutenticacao('');
      setUsuarios([]);
      setError('');
      setSuccess('');
      // Reset itens checklist para o estado inicial
      setItensChecklist([
        { nome_item: 'Pneus', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 1 },
        { nome_item: 'Freios', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 2 },
        { nome_item: 'Luzes', categoria: 'Elétrica', status: 'ok', observacoes: '', fotos: [], ordem: 3 },
        { nome_item: 'Óleo do motor', categoria: 'Motor', status: 'ok', observacoes: '', fotos: [], ordem: 4 },
        { nome_item: 'Água do radiador', categoria: 'Motor', status: 'ok', observacoes: '', fotos: [], ordem: 5 },
        { nome_item: 'Bateria', categoria: 'Elétrica', status: 'ok', observacoes: '', fotos: [], ordem: 6 },
        { nome_item: 'Documentação', categoria: 'Documentos', status: 'ok', observacoes: '', fotos: [], ordem: 7 },
        { nome_item: 'Kit de primeiros socorros', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 8 },
        { nome_item: 'Extintor', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 9 },
        { nome_item: 'Triângulo', categoria: 'Segurança', status: 'ok', observacoes: '', fotos: [], ordem: 10 },
      ]);
      setImagePreview({ open: false, url: '', title: '' });
    }
  }, [open]);

  // Ao entrar no Passo 2, iniciar na primeira categoria
  useEffect(() => {
    if (step === 2) {
      setCategoryIndex(0);
    }
  }, [step]);

  const loadViaturas = async () => {
    try {
      setLoading(true);
      console.log('🚗 ChecklistViatura - Carregando viaturas...');
      console.log('🏢 CurrentUnit:', currentUnit);
      
      const params = {};
      
      // Adicionar filtro de unidade se disponível
      if (currentUnit?.id) {
        params.unidade_id = currentUnit.id;
        console.log('📍 Usando unidade_id:', currentUnit.id);
      } else {
        console.warn('⚠️ CurrentUnit não definido ou sem ID');
      }
      
      console.log('📤 Parâmetros da requisição:', params);
      const response = await frotaService.getViaturas(params);
      console.log('📥 Resposta da API:', response);
      
      const viaturas = response.data?.viaturas || response.viaturas || [];
      console.log('🚗 Viaturas carregadas:', viaturas.length, viaturas);
      
      setViaturas(viaturas);
    } catch (error) {
      console.error('❌ Erro ao carregar viaturas:', error);
      setError('Erro ao carregar viaturas');
    } finally {
      setLoading(false);
    }
  };

  const searchUsuarios = async (query) => {
    if (!query || query.length < 2) {
      setUsuarios([]);
      return [];
    }
    
    try {
      const data = await checklistService.searchUsuarios(query);
      const usuariosArray = Array.isArray(data) ? data : [];
      setUsuarios(usuariosArray);
      return usuariosArray;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsuarios([]);
      return [];
    }
  };

  const handleItemStatusChange = (index, status) => {
    const newItens = [...itensChecklist];
    newItens[index].status = status;
    if (status === 'ok') {
      newItens[index].observacoes = '';
    }
    setItensChecklist(newItens);
  };

  const handleItemObservacaoChange = (index, observacao) => {
    const newItens = [...itensChecklist];
    newItens[index].observacoes = observacao;
    setItensChecklist(newItens);
  };

  const handlePhotoUpload = async (index, event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setLoading(true);
    try {
      const newItens = [...itensChecklist];
      
      // Upload real das fotos
      const response = await uploadService.uploadFotos(files, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });
      
      // Adicionar as fotos retornadas pela API
      response.data.fotos.forEach(foto => {
        newItens[index].fotos.push({
          url: `http://localhost:3000${foto.url}`,
          name: foto.originalName,
          size: foto.size,
          filename: foto.filename
        });
      });
      
      setItensChecklist(newItens);
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      setError('Erro ao fazer upload da foto: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = (itemIndex, photoIndex) => {
    const newItens = [...itensChecklist];
    newItens[itemIndex].fotos.splice(photoIndex, 1);
    setItensChecklist(newItens);
  };

  // Removido: upload/remoção de fotos de categoria (gerenciadas no Template)

  const handleNext = async () => {
    if (step === 1) {
      if (!selectedViatura || !kmInicial || !combustivelPercentual || !alaServico || !tipoChecklist || !selectedTemplate) {
        setError('Preencha todos os campos obrigatórios');
        return;
      }
      
      // Carregar itens do template selecionado
      try {
        setLoading(true);
        const templateCompleto = await templateService.getTemplate(selectedTemplate.id);
        setTemplateModelo(templateCompleto);
        
        // Converter categorias e itens do template para o formato do checklist
        const itensDoTemplate = [];
        let ordem = 1;
        
        if (templateCompleto.categorias && templateCompleto.categorias.length > 0) {
          templateCompleto.categorias.forEach(categoria => {
            if (categoria.itens && categoria.itens.length > 0) {
              categoria.itens.forEach(item => {
                itensDoTemplate.push({
                  nome_item: item.nome,
                  categoria: categoria.nome,
                  status: 'ok',
                  observacoes: '',
                  fotos: [],
                  ordem: ordem++,
                  obrigatorio: item.obrigatorio || false,
                  tipo: item.tipo || 'checkbox',
                  modelo_imagem_url: item.imagem_url || ''
                });
              });
            }
          });
        }
        
        // Atualizar itens do checklist com os itens do template
        if (itensDoTemplate.length > 0) {
          setItensChecklist(itensDoTemplate);
        }
        
      } catch (err) {
        console.error('Erro ao carregar template completo:', err);
        setError('Erro ao carregar itens do template selecionado');
        return;
      } finally {
        setLoading(false);
      }
    }
    // No Passo 2, avançar entre categorias antes de ir ao Passo 3
    if (step === 2) {
      const categorias = Object.keys(groupItemsByCategory(itensChecklist));
      if (categoryIndex < categorias.length - 1) {
        setCategoryIndex(categoryIndex + 1);
        return;
      }
    }

    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 2) {
      if (categoryIndex > 0) {
        setCategoryIndex(categoryIndex - 1);
        return;
      }
    }
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Evitar múltiplos envios concorrentes (Enter + botão, etc.)
    if (loading) return;
    if (!usuarioAutenticacao || !senhaAutenticacao) {
      setError('Preencha os dados de autenticação');
      return;
    }

    // Validar se um template foi selecionado
    if (!selectedTemplate || !selectedTemplate.id) {
      setError('Selecione um template de checklist');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // PRIMEIRO: Validar credenciais antes de criar o checklist
      console.log('🔐 Validando credenciais:', {
        usuario: usuarioAutenticacao.nome,
        senhaLength: senhaAutenticacao.length
      });
      
      await checklistService.validarCredenciais({
        usuario_autenticacao: usuarioAutenticacao.nome,
        senha_autenticacao: senhaAutenticacao
      });
      
      console.log('✅ Credenciais validadas com sucesso');

      // Garantir que itens do template foram carregados no Passo 2
      if (!itensChecklist || itensChecklist.length === 0) {
        setError('Não foi possível carregar os itens do template. Volte ao Passo 2 e tente novamente.');
        setLoading(false);
        return;
      }

      // SEGUNDO: Criar ou atualizar checklist (só se as credenciais forem válidas)
      // Normalizar valores sensíveis a restrições do banco
      const normalizeAlaServico = (val) => {
        const v = (val || '').trim();
        const map = {
          'alpha': 'Alpha', 'Alpha': 'Alpha',
          'bravo': 'Bravo', 'Bravo': 'Bravo',
          'charlie': 'Charlie', 'Charlie': 'Charlie',
          'delta': 'Delta', 'Delta': 'Delta',
          'adm': 'ADM', 'ADM': 'ADM'
        };
        return map[v] || 'Alpha';
      };

      const checklistData = {
        viatura_id: selectedViatura.id,
        template_id: selectedTemplate.id,
        km_inicial: parseInt(kmInicial),
        combustivel_percentual: parseInt(combustivelPercentual),
        ala_servico: normalizeAlaServico(alaServico),
        tipo_checklist: tipoChecklist,
        data_hora: dataHora.toISOString(),
        observacoes_gerais: observacoesGerais,
        itens: itensChecklist.map(item => ({
          nome_item: item.nome_item,
          categoria: item.categoria,
          status: item.status,
          observacoes: item.observacoes,
          fotos: item.fotos,
          ordem: item.ordem
        }))
      };

      console.log('📦 Enviando checklistData', checklistData);

      let checklistId = null;
      if (prefill?.checklist_id) {
        await checklistService.updateChecklist(prefill.checklist_id, checklistData);
        checklistId = prefill.checklist_id;
      } else {
        const response = await checklistService.createChecklist(checklistData);
        checklistId = response.checklist.id;
      }
      
      // TERCEIRO: Finalizar checklist (credenciais já validadas)
      await checklistService.finalizarChecklist(checklistId, {
        usuario_autenticacao: usuarioAutenticacao.nome,
        senha_autenticacao: senhaAutenticacao
      });

      setSuccess('Checklist criado e finalizado com sucesso!');
      setTimeout(() => {
        onSuccess && onSuccess();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Erro ao processar checklist:', error);
      
      // Tratar especificamente erro de autenticação
      if (error.response?.status === 401) {
        setError(error.response?.data?.error || 'Credenciais inválidas. Verifique o usuário e senha.');
        // Limpar senha para permitir nova tentativa
        setSenhaAutenticacao('');
        // Interromper fluxo imediatamente — não criar checklist
        return;
      } else if (error.code === 'ERR_NETWORK') {
        const base = (api?.defaults?.baseURL) || (process?.env?.REACT_APP_API_BASE_URL) || '/api';
        console.warn('⚠️ ERR_NETWORK ao enviar checklist', {
          baseURL: base,
          url: error.config?.url,
          message: error.message
        });
        setError(`Servidor indisponível ou conexão recusada (ERR_NETWORK). Base: ${base}. Verifique se o backend está rodando e acessível.`);
        return;
      } else {
        const generic = error.response?.data?.error || 'Erro ao processar checklist';
        const details = error.response?.data?.details;
        setError(details ? `${generic} - ${details}` : generic);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoading(false);
    onClose();
  };

  const renderStep1 = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Dados Iniciais do Checklist
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <FormControl fullWidth required>
          <InputLabel>Viatura</InputLabel>
          <Select
            value={selectedViatura?.id || ''}
            onChange={(e) => {
              const viatura = viaturas.find(v => v.id === e.target.value);
              setSelectedViatura(viatura);
            }}
            label="Viatura"
            disabled={!!prefill}
          >
            {viaturas.map((viatura) => (
              <MenuItem key={viatura.id} value={viatura.id}>
                {viatura.prefixo} - {viatura.modelo} ({viatura.placa})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="KM Inicial"
          type="text"
          value={kmInicial}
          onChange={(e) => {
            // Permitir apenas números
            const value = e.target.value.replace(/[^0-9]/g, '');
            setKmInicial(value);
          }}
          required
          inputProps={{ 
            inputMode: 'numeric',
            pattern: '[0-9]*'
          }}
          onKeyPress={(e) => {
            // Bloquear caracteres não numéricos
            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
              e.preventDefault();
            }
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Combustível (%)"
          type="text"
          value={combustivelPercentual}
          onChange={(e) => {
            // Permitir apenas números
            const numericValue = e.target.value.replace(/[^0-9]/g, '');
            const value = parseInt(numericValue);
            
            // Manter as regras existentes do campo de combustível
            if (!isNaN(value) && value >= 0 && value <= 100) {
              setCombustivelPercentual(numericValue);
            } else if (numericValue === '') {
              setCombustivelPercentual('');
            }
          }}
          required
          inputProps={{ 
            inputMode: 'numeric',
            pattern: '[0-9]*'
          }}
          onKeyPress={(e) => {
            // Bloquear caracteres não numéricos
            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
              e.preventDefault();
            }
          }}
          helperText="Digite um valor entre 0 e 100"
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Ala de Serviço</InputLabel>
          <Select
            value={alaServico}
            onChange={(e) => setAlaServico(e.target.value)}
            label="Ala de Serviço"
          >
            <MenuItem key="Alpha" value="Alpha">Alpha</MenuItem>
            <MenuItem key="Bravo" value="Bravo">Bravo</MenuItem>
            <MenuItem key="Charlie" value="Charlie">Charlie</MenuItem>
            <MenuItem key="Delta" value="Delta">Delta</MenuItem>
            <MenuItem key="ADM" value="ADM">ADM</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Tipo de Checklist</InputLabel>
          <Select
            value={tipoChecklist}
            onChange={(e) => setTipoChecklist(e.target.value)}
            label="Tipo de Checklist"
            disabled={!!prefill}
          >
            <MenuItem key="Diário" value="Diário">Checklist Diário</MenuItem>
            <MenuItem key="Semanal" value="Semanal">Checklist Semanal</MenuItem>
            <MenuItem key="Mensal" value="Mensal">Checklist Mensal</MenuItem>
            <MenuItem key="Pré-Operacional" value="Pré-Operacional">Checklist Pré-Operacional</MenuItem>
            <MenuItem key="Pós-Operacional" value="Pós-Operacional">Checklist Pós-Operacional</MenuItem>
            <MenuItem key="Manutenção Preventiva" value="Manutenção Preventiva">Manutenção Preventiva</MenuItem>
            <MenuItem key="Inspeção de Segurança" value="Inspeção de Segurança">Inspeção de Segurança</MenuItem>
            <MenuItem key="Vistoria Técnica" value="Vistoria Técnica">Vistoria Técnica</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12}>
        <FormControl fullWidth required>
          <InputLabel>Modelo de Checklist</InputLabel>
          <Select
            value={selectedTemplate?.id || ''}
            onChange={(e) => {
              const template = templates.find(t => t.id === e.target.value);
              setSelectedTemplate(template);
            }}
            label="Modelo de Checklist"
            disabled={templatesLoading || !!prefill}
          >
            {templatesLoading ? (
              <MenuItem key="loading" disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Carregando templates...
              </MenuItem>
            ) : templates.length === 0 ? (
              <MenuItem key="no-templates" disabled>
                Nenhum template disponível
              </MenuItem>
            ) : (
              templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.nome} - {template.tipo_viatura}
                  {template.descricao && (
                    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      ({template.descricao})
                    </Typography>
                  )}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Data e Hora"
          value={dataHora.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
          InputProps={{
            readOnly: true,
          }}
          variant="outlined"
          sx={{
            '& .MuiInputBase-input': {
              backgroundColor: 'grey.100',
              cursor: 'default'
            }
          }}
        />
      </Grid>
    </Grid>
  );

  // Função para agrupar itens por categoria
  const groupItemsByCategory = (items) => {
    const grouped = {};
    items.forEach((item, index) => {
      const category = item.categoria || 'Sem Categoria';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({ ...item, originalIndex: index });
    });
    return grouped;
  };

  const renderStep2 = () => {
    const groupedItems = groupItemsByCategory(itensChecklist);
    const categorias = Object.keys(groupedItems);
    const totalCategorias = categorias.length || 1;
    const categoriaAtual = categorias[categoryIndex] || 'Categoria';
    const items = groupedItems[categoriaAtual] || [];

    const progresso = Math.round(((categoryIndex + 1) / totalCategorias) * 100);

    return (
      <Box>
        {/* Cabeçalho da categoria e progresso */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {templateModelo && (() => {
              const catRef = templateModelo.categorias?.find(c => c.nome === categoriaAtual);
              if (catRef?.imagem_url) {
                return (
                  <img
                    src={catRef.imagem_url}
                    alt={`Categoria ${categoriaAtual}`}
                    style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee', cursor: 'pointer' }}
                    onClick={() => setImagePreview({ open: true, url: catRef.imagem_url, title: categoriaAtual })}
                  />
                );
              }
              return null;
            })()}
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {categoriaAtual}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Categoria {categoryIndex + 1} de {totalCategorias}
          </Typography>
          <LinearProgress variant="determinate" value={progresso} sx={{ mt: 1, height: 8, borderRadius: 1 }} />
        </Box>

        {/* Itens da categoria atual */}
        <Grid container spacing={2}>
          {items.map((item) => {
            return (
              <Grid item xs={12} key={item.originalIndex}>
                <Card variant="outlined">
                  <CardContent>
                    <Box>
                      <Box mb={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.modelo_imagem_url && (
                            <img
                              src={item.modelo_imagem_url}
                              alt={item.nome_item}
                              style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee', cursor: 'pointer' }}
                              onClick={() => setImagePreview({ open: true, url: item.modelo_imagem_url, title: item.nome_item })}
                            />
                          )}
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {item.nome_item}
                          </Typography>
                        </Box>
                      </Box>

                        <RadioGroup row value={item.status} onChange={(e) => handleItemStatusChange(item.originalIndex, e.target.value)}>
                          <FormControlLabel value="ok" control={<Radio color="success" />} label={<Box display="flex" alignItems="center"><CheckIcon color="success" sx={{ mr: 1 }} />OK</Box>} />
                          <FormControlLabel value="com_alteracao" control={<Radio color="warning" />} label={<Box display="flex" alignItems="center"><WarningIcon color="warning" sx={{ mr: 1 }} />Com Alteração</Box>} />
                        </RadioGroup>

                        {item.status === 'com_alteracao' && (
                          <TextField fullWidth label="Observações" multiline rows={2} value={item.observacoes} onChange={(e) => handleItemObservacaoChange(item.originalIndex, e.target.value)} sx={{ mt: 2 }} placeholder="Descreva o problema encontrado..." />
                        )}

                        <Box mt={2}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Typography variant="body2" sx={{ mr: 2 }}>Evidências:</Typography>
                            <input accept="image/*" style={{ display: 'none' }} id={`photo-upload-${item.originalIndex}`} multiple type="file" onChange={(e) => handlePhotoUpload(item.originalIndex, e)} />
                            <label htmlFor={`photo-upload-${item.originalIndex}`}>
                              <IconButton color="primary" component="span">
                                <PhotoIcon />
                              </IconButton>
                            </label>
                          </Box>

                          {item.fotos && item.fotos.length > 0 && (
                            <ImageList cols={3} rowHeight={100}>
                              {item.fotos.map((foto, photoIndex) => (
                                <ImageListItem key={photoIndex}>
                                  <img src={foto.url} alt={foto.name} loading="lazy" style={{ height: 100, objectFit: 'cover' }} onClick={() => setImagePreview({ open: true, url: foto.url, title: item.nome_item })} />
                                  <ImageListItemBar actionIcon={
                                    <IconButton sx={{ color: 'rgba(255, 255, 255, 0.9)' }} onClick={() => handleRemovePhoto(item.originalIndex, photoIndex)}>
                                      <DeleteIcon />
                                    </IconButton>
                                  } />
                                </ImageListItem>
                              ))}
                            </ImageList>
                          )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const renderObservacoes = () => (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Observações Gerais"
            multiline
            rows={3}
            value={observacoesGerais}
            onChange={(e) => setObservacoesGerais(e.target.value)}
            placeholder="Observações gerais sobre o checklist..."
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep3 = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Autenticação para Finalização
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Para finalizar o checklist, confirme sua senha de usuário.
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Usuário"
          value={usuarioAutenticacao ? `${usuarioAutenticacao.nome} (${usuarioAutenticacao.email})` : ''}
          disabled
          variant="filled"
          helperText="Usuário logado no sistema"
        />
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Senha"
          type="password"
          value={senhaAutenticacao}
          onChange={(e) => {
            setSenhaAutenticacao(e.target.value);
            // Limpar erro quando usuário começar a digitar novamente
            if (error && (error.includes('Credenciais inválidas') || error.includes('Senha incorreta') || error.includes('Usuário não encontrado'))) {
              setError('');
            }
          }}
          onKeyDown={(e) => {
            // Pressionar ENTER deve acionar a finalização, evitando duplo envio
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!loading) {
                handleSubmit();
              }
            }
          }}
          required
          placeholder="Digite sua senha para confirmar"
          autoFocus
        />
      </Grid>
    </Grid>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Checklist de Viatura</Typography>
          <Chip label={`Passo ${step} de 3`} color="primary" size="small" />
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
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        {step > 1 && (<Button onClick={handleBack}>Voltar</Button>)}
        {step < 3 ? (
          <Button onClick={handleNext} variant="contained" startIcon={<SaveIcon />}>
            {step === 2 ? 'Próxima Categoria' : 'Próximo'}
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />} type="button">
            {loading ? 'Finalizando...' : 'Finalizar Checklist'}
          </Button>
        )}
      </DialogActions>

      {/* Visualização de imagem ampliada */}
      <Dialog open={imagePreview.open} onClose={() => setImagePreview({ open: false, url: '', title: '' })} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1">{imagePreview.title}</Typography>
            <IconButton onClick={() => setImagePreview({ open: false, url: '', title: '' })}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {imagePreview.url && (
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <img src={imagePreview.url} alt={imagePreview.title} style={{ maxWidth: '100%', borderRadius: 8 }} />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default ChecklistViatura;