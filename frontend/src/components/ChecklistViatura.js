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
  Alert,
  CircularProgress,
  LinearProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { frotaService, checklistService, uploadService, templateService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

const ChecklistViatura = ({ open, onClose, onSuccess, viaturas: viaturasProps, selectedViatura: selectedViaturaProps, prefill }) => {
  const BACKEND_ORIGIN = process.env.REACT_APP_API_ORIGIN || (window.location.origin.replace(':3003', ':5000'));
  const { user } = useAuth(); // Obter usuário logado
  const { currentUnit } = useTenant(); // Obter unidade atual
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1); // 1: Dados iniciais, 2: Checklist, 3: Autenticação
  
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
  const [usuarioAutenticacao, setUsuarioAutenticacao] = useState(user || null);
  const [senhaAutenticacao, setSenhaAutenticacao] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Paginação por categoria (Step 2)
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

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
      setKmInicial('');
      setCombustivelPercentual('');
      setAlaServico('');
      setTipoChecklist('');
      setSelectedTemplate(null);
      setObservacoesGerais('');
      setUsuarioAutenticacao(null);
      setSenhaAutenticacao('');
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
    }
  }, [open]);

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
      response.data.fotos.forEach((foto) => {
        const relativeUrl = foto.url || '';
        const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${BACKEND_ORIGIN}${relativeUrl}`;
        newItens[index].fotos.push({
          url: absoluteUrl,
          name: foto.originalName,
          size: foto.size,
          filename: foto.filename,
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
                  tipo: item.tipo || 'checkbox'
                });
              });
            }
          });
        }
        
        // Atualizar itens do checklist com os itens do template
        if (itensDoTemplate.length > 0) {
          setItensChecklist(itensDoTemplate);
          // Definir páginas por categoria na ordem do template
          let cats = [];
          if (templateCompleto.categorias && templateCompleto.categorias.length > 0) {
            cats = templateCompleto.categorias
              .filter(c => Array.isArray(c.itens) && c.itens.length > 0)
              .map(c => c.nome || 'Sem Categoria');
          } else {
            const grouped = groupItemsByCategory(itensDoTemplate);
            cats = Object.keys(grouped);
          }
          setCategories(cats);
          setCurrentCategoryIndex(0);
        }
        
      } catch (err) {
        console.error('Erro ao carregar template completo:', err);
        setError('Erro ao carregar itens do template selecionado');
        return;
      } finally {
        setLoading(false);
      }
    }

    // Navegação entre categorias dentro do Passo 2
    if (step === 2) {
      if (Array.isArray(categories) && categories.length > 0) {
        const grouped = groupItemsByCategory(itensChecklist);
        const currentCategory = categories[currentCategoryIndex];
        const items = grouped[currentCategory] || [];

        // Validação simples: itens obrigatórios com alteração exigem observação
        const missingObs = items.filter(
          (it) => it.obrigatorio && it.status === 'com_alteracao' && (!it.observacoes || !it.observacoes.trim())
        );
        if (missingObs.length > 0) {
          setError(
            `Preencha observações para itens obrigatórios com alteração: ${missingObs
              .map((i) => i.nome_item)
              .join(', ')}`
          );
          return;
        }

        // Avançar para próxima categoria ou seguir para autenticação
        if (currentCategoryIndex < categories.length - 1) {
          setError('');
          setCurrentCategoryIndex((idx) => idx + 1);
          return;
        }
      }
    }
    
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    // Retroceder entre categorias no Passo 2
    if (step === 2 && currentCategoryIndex > 0) {
      setCurrentCategoryIndex((idx) => Math.max(0, idx - 1));
      return;
    }
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
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
      // Normalizar valores sensíveis a restrições do banco (versão robusta, igual ao backend)
      const normalizeAlaServico = (val) => {
        const raw = (val || '').toString().trim();
        const cleaned = raw.replace(/[^a-zA-Z]/g, '').toLowerCase();
        const map = {
          alpha: 'Alpha',
          bravo: 'Bravo',
          charlie: 'Charlie',
          delta: 'Delta',
          adm: 'ADM',
        };
        return map[cleaned] || 'Alpha';
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
      console.error('Erro ao processar checklist:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      // Tratar especificamente erro de autenticação
      if (error.response?.status === 401) {
        setError(error.response?.data?.error || 'Credenciais inválidas. Verifique o usuário e senha.');
        // Limpar senha para permitir nova tentativa
        setSenhaAutenticacao('');
      } else {
        const generic = error.response?.data?.error || 'Erro ao processar checklist';
        const details = error.response?.data?.details;
        const constraint = error.response?.data?.constraint;
        const detail = error.response?.data?.detail;
        if (constraint || detail) {
          console.warn('ℹ️ Detalhes do erro (DB CHECK):', { constraint, detail });
        }
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
    <Grid container spacing={isMobile ? 2 : 3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
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
          type="number"
          value={kmInicial}
          onChange={(e) => setKmInicial(e.target.value)}
          required
          inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*' }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Combustível (%)"
          type="number"
          value={combustivelPercentual}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (value >= 0 && value <= 100) {
              setCombustivelPercentual(e.target.value);
            } else if (e.target.value === '') {
              setCombustivelPercentual('');
            }
          }}
          required
          inputProps={{ min: 0, max: 100, inputMode: 'numeric', pattern: '[0-9]*' }}
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
    const totalCategories = categories.length || Object.keys(groupedItems).length;
    const currentCategoryName = categories.length > 0
      ? categories[currentCategoryIndex]
      : Object.keys(groupedItems)[0];

    const items = groupedItems[currentCategoryName] || [];

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Checklist da Viatura
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Categoria {Math.min(currentCategoryIndex + 1, totalCategories)} de {totalCategories}: {currentCategoryName}
        </Typography>

        <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mt: 1 }}>
          {/* Header da Categoria */}
          <Grid item xs={12}>
            <Box sx={{ my: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {currentCategoryName}
              </Typography>
              <Divider sx={{ mt: 1 }} />
            </Box>
          </Grid>

          {/* Itens da Categoria Atual */}
          {items.map((item) => (
            <Grid item xs={12} key={item.originalIndex}>
              <Card variant="outlined">
                <CardContent>
                  <Box mb={2}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {item.nome_item}
                    </Typography>
                  </Box>

                  <RadioGroup row={!isMobile} value={item.status} onChange={(e) => handleItemStatusChange(item.originalIndex, e.target.value)}>
                    <FormControlLabel
                      value="ok"
                      control={<Radio color="success" />}
                      label={<Box display="flex" alignItems="center"><CheckIcon color="success" sx={{ mr: 1 }} />OK</Box>}
                    />
                    <FormControlLabel
                      value="com_alteracao"
                      control={<Radio color="warning" />}
                      label={<Box display="flex" alignItems="center"><WarningIcon color="warning" sx={{ mr: 1 }} />Com Alteração</Box>}
                    />
                  </RadioGroup>

                  {item.status === 'com_alteracao' && (
                    <TextField
                      fullWidth
                      label="Observações"
                      multiline
                      rows={2}
                      value={item.observacoes}
                      onChange={(e) => handleItemObservacaoChange(item.originalIndex, e.target.value)}
                      sx={{ mt: 2 }}
                      placeholder="Descreva o problema encontrado..."
                    />
                  )}

                  <Box mt={2}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" sx={{ mr: 2 }}>
                        Fotos:
                      </Typography>
                      <input accept="image/*" capture="environment" style={{ display: 'none' }} id={`photo-upload-${item.originalIndex}`} multiple type="file" onChange={(e) => handlePhotoUpload(item.originalIndex, e)} />
                      <label htmlFor={`photo-upload-${item.originalIndex}`}>
                        <IconButton color="primary" component="span">
                          <PhotoIcon />
                        </IconButton>
                      </label>
                    </Box>

                    {item.fotos && item.fotos.length > 0 && (
                      <ImageList cols={isMobile ? 2 : 3} rowHeight={isMobile ? 90 : 100}>
                        {item.fotos.map((foto, photoIndex) => (
                          <ImageListItem key={photoIndex}>
                            <img src={foto.url} alt={foto.name} loading="lazy" style={{ height: 100, objectFit: 'cover' }} />
                            <ImageListItemBar
                              actionIcon={
                                <IconButton sx={{ color: 'rgba(255, 255, 255, 0.54)' }} onClick={() => handleRemovePhoto(item.originalIndex, photoIndex)}>
                                  <DeleteIcon />
                                </IconButton>
                              }
                            />
                          </ImageListItem>
                        ))}
                      </ImageList>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };


  const renderStep3 = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
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
            // Pressionar ENTER deve acionar a finalização
            if (e.key === 'Enter') {
              // Não impedir o comportamento; chamamos handleSubmit diretamente
              handleSubmit();
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
    <Dialog open={open} onClose={handleClose} fullScreen={isMobile} maxWidth="md" fullWidth>
      <DialogTitle>
        {step === 2 && (Array.isArray(categories) && categories.length > 0)
          ? `Checklist de Viatura - Categoria ${currentCategoryIndex + 1} de ${categories.length}`
          : `Checklist de Viatura - Passo ${step} de 3`}
      </DialogTitle>
      
      <DialogContent sx={{ p: isMobile ? 1.5 : 3 }}>
        {/* Barra de Progresso */}
        {(function() {
          const grouped = groupItemsByCategory(itensChecklist);
          const catsCount = (Array.isArray(categories) && categories.length > 0) ? categories.length : Object.keys(grouped).length;
          const totalPages = 2 + (catsCount || 0);
          let progressPercent = 0;
          if (totalPages > 0) {
            if (step === 1) progressPercent = 0;
            else if (step === 2) progressPercent = Math.round(((1 + currentCategoryIndex) / totalPages) * 100);
            else if (step === 3) progressPercent = 100;
          }
          return (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Progresso</Typography>
              <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 1 }} />
              <Box display="flex" justifyContent="space-between" mt={0.5}>
                <Typography variant="caption">{progressPercent}%</Typography>
                <Typography variant="caption">
                  {step === 2 && catsCount > 0 ? `Categoria ${currentCategoryIndex + 1} de ${catsCount}` : `Passo ${step} de 3`}
                </Typography>
              </Box>
            </Box>
          );
        })()}
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
      
      <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: isMobile ? 'background.paper' : undefined, zIndex: 1 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        
        {step > 1 && (
          <Button onClick={handleBack}>Voltar</Button>
        )}

        {step < 3 ? (
          <Button onClick={handleNext} variant="contained" startIcon={<SaveIcon />}>
            {step === 2 && (Array.isArray(categories) && categories.length > 0) && currentCategoryIndex < categories.length - 1
              ? 'Próxima Categoria'
              : 'Próximo'}
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            type="button"
          >
            {loading ? 'Finalizando...' : 'Finalizar Checklist'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ChecklistViatura;
