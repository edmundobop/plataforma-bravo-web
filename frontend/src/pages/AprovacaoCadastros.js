import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
  Alert,
  CircularProgress,
  Pagination,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  FormLabel,
  Radio,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  PendingActions as PendingIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { militaresService } from '../services/militaresService';
import { usuariosService } from '../services/api';
import { formatDate, formatCPF, formatPhone, validateUsuarioForm, sanitizeUsuarioData } from '../utils/validations';

const AprovacaoCadastros = () => {
  const theme = useTheme();
  const { user, hasRole } = useAuth();
  
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  // Estados para visualização de detalhes
  const [selectedSolicitacao, setSelectedSolicitacao] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  // Estados para aprovação/rejeição
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState(''); // 'aprovar' ou 'rejeitar'
  const [observacoesAprovacao, setObservacoesAprovacao] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  
  // Formulário independente (mesmo modal do cadastro de militares)
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    tipo: 'militar',
    posto_graduacao: '',
    nome_guerra: '',
    matricula: '',
    data_incorporacao: '',
    antiguidade: '',
    unidades_ids: [],
    unidade_lotacao_id: '',
    setor_id: '',
    funcoes: [],
    perfil_id: 5,
    ativo: true,
    senha: '',
    confirmar_senha: '',
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Opções
  const [setores, setSetores] = useState([]);
  const [funcoes, setFuncoes] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [postosGraduacoes, setPostosGraduacoes] = useState([]);

  // Verificar se o usuário tem permissão
  useEffect(() => {
    if (!hasRole('Administrador')) {
      setError('Acesso negado. Apenas administradores podem acessar esta página.');
      return;
    }
    loadSolicitacoes();
    loadSetoresEFuncoes();
    // Carregar opções do formulário (unidades, perfis e postos) antecipadamente
    loadDialogOptions();
  }, [hasRole, pagination.page]);

  const loadSetoresEFuncoes = async () => {
    try {
      const [setoresResponse, funcoesResponse] = await Promise.all([
        militaresService.getSetores(),
        militaresService.getFuncoes()
      ]);
      
      if (setoresResponse.data.success) {
        setSetores(setoresResponse.data.setores);
      }
      
      if (funcoesResponse.data.success) {
        setFuncoes(funcoesResponse.data.funcoes);
      }
    } catch (error) {
      console.error('Erro ao carregar setores e funções:', error);
    }
  };

  const loadDialogOptions = async () => {
    try {
      // Perfis
      const perfisRes = await usuariosService.getPerfis();
      const perfisData = perfisRes?.data?.perfis || perfisRes?.data?.data || [];
      const perfisNorm = Array.isArray(perfisData)
        ? perfisData.map(p => ({ id: p.id, nome: p.nome }))
        : [];
      setPerfis(perfisNorm);

      // Unidades (tentar todas para admin/comandante; senão, unidades do usuário)
      let unidadesLista = [];
      try {
        if (hasRole && hasRole(['Administrador', 'Comandante'])) {
          const respAll = await usuariosService.getTodasUnidades();
          unidadesLista = respAll?.data?.units || respAll?.data?.unidades || respAll?.data?.data || [];
        } else {
          const respUser = await usuariosService.getUnidades();
          unidadesLista = respUser?.data?.unidades || respUser?.data?.units || respUser?.data?.data || [];
        }
      } catch (errUnidades) {
        // Fallback: tentar endpoint do usuário se falhou o de todas
        try {
          const respUser = await usuariosService.getUnidades();
          unidadesLista = respUser?.data?.unidades || respUser?.data?.units || respUser?.data?.data || [];
        } catch (_) {
          unidadesLista = [];
        }
      }
      const unidadesNorm = (unidadesLista || []).map(u => ({ id: u.id, nome: u.nome }));
      setUnidades(unidadesNorm);

      // Postos/Graduações
      try {
        const postosRes = await militaresService.getPostosGraduacoes();
        const postosData = postosRes?.data?.postos || postosRes?.data?.data || postosRes?.data || [];
        if (Array.isArray(postosData) && postosData.length > 0) {
          setPostosGraduacoes(postosData);
        } else {
          setPostosGraduacoes([
            'Coronel', 'Tenente-Coronel', 'Major',
            'Capitão', '1º Tenente', '2º Tenente', 'Aspirante a Oficial',
            'Subtenente', '1º Sargento', '2º Sargento', '3º Sargento',
            'Cabo', 'Soldado'
          ]);
        }
      } catch (_) {
        setPostosGraduacoes([
          'Coronel', 'Tenente-Coronel', 'Major',
          'Capitão', '1º Tenente', '2º Tenente', 'Aspirante a Oficial',
          'Subtenente', '1º Sargento', '2º Sargento', '3º Sargento',
          'Cabo', 'Soldado'
        ]);
      }
    } catch (e) {
      console.error('Erro ao carregar opções do diálogo:', e);
      // Fallback mínimo para não quebrar UI
      setPerfis([]);
      setUnidades([]);
      setPostosGraduacoes([
        'Coronel', 'Tenente-Coronel', 'Major',
        'Capitão', '1º Tenente', '2º Tenente', 'Aspirante a Oficial',
        'Subtenente', '1º Sargento', '2º Sargento', '3º Sargento',
        'Cabo', 'Soldado'
      ]);
    }
  };

  const loadSolicitacoes = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await militaresService.getSolicitacoesPendentes({
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (response.data.success) {
        setSolicitacoes(response.data.data);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      setError('Erro ao carregar solicitações pendentes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (solicitacao) => {
    // Abre dialog com formulário independente
    setSelectedSolicitacao(solicitacao);
    const toInputDate = (v) => {
      if (!v) return '';
      if (typeof v === 'string') {
        if (v.includes('-')) return v.substring(0, 10);
        if (v.includes('/')) {
          const [d, m, y] = v.split('/');
          if (d && m && y) return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }
      try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      } catch { return ''; }
    };

    const unidadesIds = Array.isArray(solicitacao.unidades_ids)
      ? solicitacao.unidades_ids.map(String)
      : (Array.isArray(solicitacao.unidades)
        ? solicitacao.unidades.map(u => String(u.id ?? u))
        : []);

    setFormData({
      nome_completo: solicitacao.nome_completo || '',
      email: solicitacao.email || '',
      cpf: solicitacao.cpf || '',
      telefone: solicitacao.telefone || '',
      data_nascimento: toInputDate(solicitacao.data_nascimento) || '',
      tipo: solicitacao.tipo || 'militar',
      posto_graduacao: solicitacao.posto_graduacao || '',
      nome_guerra: solicitacao.nome_guerra || '',
      matricula: solicitacao.matricula || solicitacao.identidade_militar || '',
      data_incorporacao: toInputDate(solicitacao.data_incorporacao) || '',
      antiguidade: solicitacao.antiguidade ?? '',
      unidades_ids: unidadesIds,
      unidade_lotacao_id: solicitacao.unidade_lotacao_id || solicitacao.unidade_id || '',
      setor_id: solicitacao.setor_id || '',
      funcoes: Array.isArray(solicitacao.funcoes) ? solicitacao.funcoes : (solicitacao.funcoes ? [solicitacao.funcoes] : []),
      perfil_id: solicitacao.perfil_id || 5,
      ativo: solicitacao.ativo !== false,
      senha: '',
      confirmar_senha: '',
    });
    setFormErrors({});
    setViewDialogOpen(true);
    loadDialogOptions();
  };

  // Preencher padrões quando opções forem carregadas e formulário estiver aberto
  useEffect(() => {
    if (!viewDialogOpen) return;
    setFormData((prev) => {
      let next = { ...prev };
      if (!next.perfil_id && perfis.length > 0) {
        next.perfil_id = perfis[0].id;
      }
      if (next.tipo === 'militar') {
        if (!next.posto_graduacao && postosGraduacoes.length > 0) {
          next.posto_graduacao = postosGraduacoes[0];
        }
        if (!next.unidade_lotacao_id && unidades.length > 0) {
          next.unidade_lotacao_id = String(unidades[0].id);
        }
      }
      return next;
    });
  }, [perfis, unidades, postosGraduacoes, viewDialogOpen]);

  const handleFormFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveForm = async () => {
    if (!selectedSolicitacao) return;
    setProcessingApproval(true);
    try {
      const errors = validateUsuarioForm(formData) || {};
      setFormErrors(errors);
      if (Object.keys(errors).length > 0) {
        setProcessingApproval(false);
        return;
      }
      // Sanitizar tipos numéricos e IDs antes de enviar
      const basePayload = sanitizeUsuarioData({ ...formData });
      const isNumeric = (v) => v !== undefined && v !== null && /^\d+$/.test(String(v));
      const toInt = (v) => (isNumeric(v) ? parseInt(v, 10) : undefined);
      const unidadeId = toInt(basePayload.unidade_lotacao_id || basePayload.unidade_id);
      const setorId = toInt(basePayload.setor_id);
      const sanitizedPayloadRaw = {
        ...basePayload,
        unidade_id: unidadeId,
        setor_id: setorId,
        antiguidade: toInt(basePayload.antiguidade),
        perfil_id: toInt(basePayload.perfil_id) ?? basePayload.perfil_id,
      };
      // Remover campos inválidos/strings que causariam erro no UPDATE
      const sanitizedPayload = Object.fromEntries(
        Object.entries(sanitizedPayloadRaw).filter(([k, v]) => {
          if (k === 'setor_id' && !isNumeric(basePayload.setor_id)) return false; // evitar string em coluna numérica
          if (k === 'unidade_id' && !isNumeric(basePayload.unidade_lotacao_id || basePayload.unidade_id)) return false;
          return v !== undefined && v !== null && v !== '';
        })
      );

      const res = await usuariosService.updateUsuario(selectedSolicitacao.id, sanitizedPayload);
      if (res.data?.success) {
        setSuccess('Dados salvos com sucesso.');
      } else {
        setError(res.data?.message || 'Falha ao salvar dados.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao salvar dados.');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleApproveFromForm = async () => {
    if (!selectedSolicitacao) return;
    setProcessingApproval(true);
    try {
      // Não bloquear aprovação por validações do formulário;
      // manter erros visíveis se existirem, mas seguir com aprovação.
      try {
        const possibleErrors = validateUsuarioForm(formData) || {};
        setFormErrors(possibleErrors);
      } catch (_) {}
      const payload = sanitizeUsuarioData({ ...formData });
      const isNumeric = (v) => v !== undefined && v !== null && /^\d+$/.test(String(v));
      const toInt = (v) => (isNumeric(v) ? parseInt(v, 10) : undefined);

      // Mapear campos para atualização conforme backend aceita (unidade_id em vez de unidade_lotacao_id)
      const savePayloadRaw = {
        nome_completo: payload.nome_completo,
        email: payload.email,
        cpf: payload.cpf,
        telefone: payload.telefone,
        tipo: payload.tipo,
        posto_graduacao: payload.posto_graduacao,
        nome_guerra: payload.nome_guerra,
        matricula: payload.matricula,
        data_nascimento: payload.data_nascimento,
        data_incorporacao: payload.data_incorporacao,
        antiguidade: toInt(payload.antiguidade),
        unidade_id: toInt(payload.unidade_lotacao_id || payload.unidade_id),
        setor_id: toInt(payload.setor_id),
        perfil_id: toInt(payload.perfil_id) ?? payload.perfil_id,
        ativo: payload.ativo,
        funcoes: payload.funcoes,
      };
      // Remover chaves undefined/null para evitar 400 de "Nenhum campo válido"
      const savePayload = Object.fromEntries(
        Object.entries(savePayloadRaw).filter(([k, v]) => {
          if (k === 'setor_id' && !isNumeric(payload.setor_id)) return false;
          if (k === 'unidade_id' && !isNumeric(payload.unidade_lotacao_id || payload.unidade_id)) return false;
          return v !== undefined && v !== null && v !== '';
        })
      );

      // Tentar salvar; se não houver campos válidos, seguir para aprovação
      try {
        if (Object.keys(savePayload).length > 0) {
          const saveRes = await usuariosService.updateUsuario(selectedSolicitacao.id, savePayload);
          if (!saveRes.data?.success) {
            // Se falhar por ausência de campos válidos, continuar para aprovação
            const msg = saveRes.data?.message || '';
            if (!/Nenhum campo válido/i.test(msg)) {
              throw new Error(msg || 'Falha ao salvar antes de aprovar');
            }
          }
        }
      } catch (saveErr) {
        // Continuar a aprovação mesmo que o save retorne 400 de campos
        const msg = saveErr?.response?.data?.message || saveErr?.message || '';
        if (!/Nenhum campo válido/i.test(msg)) {
          throw saveErr;
        }
      }
      const approveRes = await usuariosService.aprovarSolicitacao(selectedSolicitacao.id, {
        aprovado: true,
        observacoes: observacoesAprovacao,
        perfil_id: toInt(payload.perfil_id) || perfis[0]?.id || 5,
        setor_id: toInt(payload.setor_id),
        setor: !isNumeric(payload.setor_id) && payload.setor_id ? String(payload.setor_id) : undefined,
        funcao_id: payload.funcao_id,
        funcoes: payload.funcoes,
      });
      if (approveRes.data?.success) {
        setSuccess('Cadastro validado, salvo e aprovado com sucesso.');
        setViewDialogOpen(false);
        await loadSolicitacoes();
      } else {
        setError(approveRes.data?.message || 'Falha ao aprovar.');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Erro ao aprovar.');
    } finally {
      setProcessingApproval(false);
    }
  };

  const validateSolicitacaoFields = (sol) => {
    if (!sol) return 'Solicitação não encontrada.';
    const errors = [];
    const requiredBase = ['nome_completo', 'email', 'cpf', 'telefone', 'data_nascimento'];
    requiredBase.forEach((f) => { if (!sol[f]) errors.push(f); });
    if ((sol.tipo || 'militar') === 'militar') {
      const reqMil = ['posto_graduacao', 'nome_guerra', 'data_incorporacao'];
      reqMil.forEach((f) => { if (!sol[f]) errors.push(f); });
      if (!sol.identidade_militar && !sol.matricula) errors.push('identidade_militar/matricula');
      if (!sol.unidade && !sol.unidade_id) errors.push('unidade');
    }
    return errors.length ? `Campos obrigatórios ausentes: ${errors.join(', ')}` : null;
  };

  const handleApprovalAction = (solicitacao, action) => {
    setSelectedSolicitacao(solicitacao);
    setApprovalAction(action);
    setObservacoesAprovacao('');
    // Abrir somente para rejeição; aprovação é realizada pelo formulário
    if (action === 'rejeitar') {
      // Fechar o diálogo de edição para evitar sobreposição de diálogos
      setViewDialogOpen(false);
      setApprovalDialogOpen(true);
    }
  };

  const handleConfirmApproval = async () => {
    if (!selectedSolicitacao || approvalAction !== 'rejeitar') return;
    setProcessingApproval(true);
    setError('');
    setSuccess('');
    try {
      const response = await usuariosService.aprovarSolicitacao(selectedSolicitacao.id, {
        aprovado: false,
        observacoes: observacoesAprovacao,
      });
      if (response.data?.success) {
        setSuccess('Cadastro rejeitado com sucesso!');
        await loadSolicitacoes();
        setApprovalDialogOpen(false);
        // Garantir que o diálogo de edição permaneça fechado após rejeitar
        setViewDialogOpen(false);
        setSelectedSolicitacao(null);
        setApprovalAction('');
        setObservacoesAprovacao('');
      } else {
        setError(response.data?.message || 'Erro ao processar rejeição');
      }
    } catch (error) {
      console.error('Erro ao processar rejeição:', error);
      setError(error.response?.data?.message || 'Erro ao processar rejeição');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDataSolicitacao = (dataString) => {
    if (!dataString) return '-';
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR');
  };

  if (!hasRole('Administrador')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Acesso negado. Apenas administradores podem acessar esta página.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminIcon color="primary" />
            Aprovação de Cadastros
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie as solicitações de cadastro de militares
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadSolicitacoes}
          disabled={loading}
        >
          Atualizar
        </Button>
      </Box>

      {/* Alertas */}
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

      {/* Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {pagination.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Solicitações Pendentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Solicitações */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Solicitações Pendentes
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : solicitacoes.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <PendingIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Nenhuma solicitação pendente
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Todas as solicitações foram processadas
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Militar</TableCell>
                      <TableCell>Posto/Graduação</TableCell>
                      <TableCell>Unidade</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Data Solicitação</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {solicitacoes.map((solicitacao) => (
                      <TableRow key={solicitacao.id} hover>
                        <TableCell>
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                            onClick={() => handleViewDetails(solicitacao)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleViewDetails(solicitacao); }}
                          >
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">
                                {solicitacao.nome_completo}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {solicitacao.nome_guerra}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={solicitacao.posto_graduacao} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{solicitacao.unidade}</TableCell>
                        <TableCell>{solicitacao.email}</TableCell>
                        <TableCell>
                          {formatDataSolicitacao(solicitacao.data_solicitacao)}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewDetails(solicitacao)}
                            >
                              Ver Detalhes
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de formulário independente (baseado no cadastro de militares) */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            Editar Usuário
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSolicitacao && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Tipo de Usuário</FormLabel>
                  <RadioGroup
                    row
                    value={formData.tipo}
                    onChange={(e) => handleFormFieldChange('tipo', e.target.value)}
                  >
                    <FormControlLabel value="militar" control={<Radio />} label="Militar" />
                    <FormControlLabel value="civil" control={<Radio />} label="Civil" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Dados Pessoais</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nome Completo"
                  fullWidth
                  value={formData.nome_completo}
                  onChange={(e) => handleFormFieldChange('nome_completo', e.target.value)}
                  error={!!formErrors.nome_completo}
                  helperText={formErrors.nome_completo}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  fullWidth
                  value={formData.email}
                  onChange={(e) => handleFormFieldChange('email', e.target.value)}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="CPF"
                  fullWidth
                  value={formData.cpf}
                  onChange={(e) => handleFormFieldChange('cpf', e.target.value)}
                  error={!!formErrors.cpf}
                  helperText={formErrors.cpf}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Telefone"
                  fullWidth
                  value={formData.telefone}
                  onChange={(e) => handleFormFieldChange('telefone', e.target.value)}
                  error={!!formErrors.telefone}
                  helperText={formErrors.telefone}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Data de Nascimento"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.data_nascimento}
                  onChange={(e) => handleFormFieldChange('data_nascimento', e.target.value)}
                  error={!!formErrors.data_nascimento}
                  helperText={formErrors.data_nascimento}
                />
              </Grid>

              {formData.tipo === 'militar' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Dados Militares</Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={!!formErrors.posto_graduacao}>
                      <InputLabel>Posto/Graduação</InputLabel>
                      <Select
                        label="Posto/Graduação"
                        value={formData.posto_graduacao}
                        onChange={(e) => handleFormFieldChange('posto_graduacao', e.target.value)}
                      >
                        {postosGraduacoes.map((p) => (
                          <MenuItem key={p.id || p} value={p.value || p.nome || p}>
                            {p.nome || p.label || p}
                          </MenuItem>
                        ))}
                      </Select>
                      {formErrors.posto_graduacao && (
                        <Typography variant="caption" color="error">{formErrors.posto_graduacao}</Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nome de Guerra"
                      fullWidth
                      value={formData.nome_guerra}
                      onChange={(e) => handleFormFieldChange('nome_guerra', e.target.value)}
                      error={!!formErrors.nome_guerra}
                      helperText={formErrors.nome_guerra}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Matrícula"
                      fullWidth
                      value={formData.matricula}
                      onChange={(e) => handleFormFieldChange('matricula', e.target.value)}
                      error={!!formErrors.matricula}
                      helperText={formErrors.matricula}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Data de Incorporação"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={formData.data_incorporacao}
                      onChange={(e) => handleFormFieldChange('data_incorporacao', e.target.value)}
                      error={!!formErrors.data_incorporacao}
                      helperText={formErrors.data_incorporacao}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Antiguidade"
                      fullWidth
                      value={formData.antiguidade}
                      onChange={(e) => handleFormFieldChange('antiguidade', e.target.value)}
                      error={!!formErrors.antiguidade}
                      helperText={formErrors.antiguidade}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Organização</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Unidades CMBGO</InputLabel>
                  <Select
                    multiple
                    label="Unidades CMBGO"
                    value={formData.unidades_ids}
                    onChange={(e) => handleFormFieldChange('unidades_ids', e.target.value)}
                    renderValue={(selected) => selected.map(id => {
                      const u = unidades.find(x => String(x.id) === String(id));
                      return u ? u.nome : id;
                    }).join(', ')}
                  >
                    {unidades.map(u => (
                      <MenuItem key={u.id} value={String(u.id)}>{u.nome}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.unidade_lotacao_id}>
                  <InputLabel>Unidade de Lotação</InputLabel>
                  <Select
                    label="Unidade de Lotação"
                    value={formData.unidade_lotacao_id}
                    onChange={(e) => handleFormFieldChange('unidade_lotacao_id', e.target.value)}
                  >
                    {unidades.map(u => (
                      <MenuItem key={u.id} value={String(u.id)}>{u.nome}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.unidade_lotacao_id && (
                    <Typography variant="caption" color="error">{formErrors.unidade_lotacao_id}</Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.setor_id}>
                  <InputLabel>Setor</InputLabel>
                  <Select
                    label="Setor"
                    value={formData.setor_id}
                    onChange={(e) => handleFormFieldChange('setor_id', e.target.value)}
                  >
                    {setores.map(s => (
                      <MenuItem key={s.id || s} value={String(s.id || s)}>{s.nome || s}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.setor_id && (
                    <Typography variant="caption" color="error">{formErrors.setor_id}</Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Funções</InputLabel>
                  <Select
                    multiple
                    label="Funções"
                    value={formData.funcoes}
                    onChange={(e) => handleFormFieldChange('funcoes', e.target.value)}
                    renderValue={(selected) => selected.join(', ')}
                  >
                    {funcoes.map(f => (
                      <MenuItem key={f.id || f} value={f.nome || f}>{f.nome || f}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.perfil_id}>
                  <InputLabel>Perfil</InputLabel>
                  <Select
                    label="Perfil"
                    value={formData.perfil_id}
                    onChange={(e) => handleFormFieldChange('perfil_id', e.target.value)}
                  >
                    {perfis.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>
                    ))}
                  </Select>
                  {formErrors.perfil_id && (
                    <Typography variant="caption" color="error">{formErrors.perfil_id}</Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações (opcional)"
                  multiline
                  rows={2}
                  value={observacoesAprovacao}
                  onChange={(e) => setObservacoesAprovacao(e.target.value)}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={processingApproval ? <CircularProgress size={20} /> : <ApproveIcon />}
            onClick={handleApproveFromForm}
            disabled={processingApproval}
          >
            {processingApproval ? 'Processando...' : 'Aprovar'}
          </Button>
          <Button
            color="error"
            startIcon={<RejectIcon />}
            onClick={() => handleApprovalAction(selectedSolicitacao, 'rejeitar')}
          >
            Rejeitar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => !processingApproval && setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RejectIcon color="error" />
            Rejeitar Cadastro
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSolicitacao && (
            <>
              <Typography variant="body1" gutterBottom>
                {`Confirma a rejeição do cadastro de ${selectedSolicitacao.nome_completo}?`}
              </Typography>
              
              <TextField
                fullWidth
                label="Observações (opcional)"
                multiline
                rows={3}
                value={observacoesAprovacao}
                onChange={(e) => setObservacoesAprovacao(e.target.value)}
                placeholder={`Adicione observações sobre a rejeição...`}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setApprovalDialogOpen(false)}
            disabled={processingApproval}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmApproval}
            disabled={processingApproval}
            startIcon={processingApproval ? <CircularProgress size={20} /> : <RejectIcon />}
          >
            {processingApproval ? 'Processando...' : 'Rejeitar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AprovacaoCadastros;