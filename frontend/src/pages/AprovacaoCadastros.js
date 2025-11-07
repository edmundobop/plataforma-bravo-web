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
import { useTenant } from '../contexts/TenantContext';
import { useNavigate } from 'react-router-dom';
import { militaresService } from '../services/militaresService';
import { formatDate, formatCPF, formatPhone } from '../utils/validations';

const AprovacaoCadastros = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { currentUnit } = useTenant();
  
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
  
  // Estados para campos obrigatórios na aprovação
  const [setorAprovacao, setSetorAprovacao] = useState('');
  const [funcaoAprovacao, setFuncaoAprovacao] = useState('');
  const [roleAprovacao, setRoleAprovacao] = useState('militar');
  
  // Estados para listas de opções
  const [setores, setSetores] = useState([]);
  const [funcoes, setFuncoes] = useState([]);

  // Verificar se o usuário tem permissão
  useEffect(() => {
    if (!hasRole('Administrador')) {
      setError('Acesso negado. Apenas administradores podem acessar esta página.');
      return;
    }
    loadSolicitacoes();
    loadSetoresEFuncoes();
  }, [hasRole, pagination.page, currentUnit]);

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

  const loadSolicitacoes = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await militaresService.getSolicitacoesPendentes({
        page: pagination.page,
        limit: pagination.limit,
        unidade_id: currentUnit?.id || undefined
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
    setSelectedSolicitacao(solicitacao);
    setViewDialogOpen(true);
  };

  const handleApprovalAction = (solicitacao, action) => {
    // Para aprovação, navegar para a tela de edição com prefill
    if (action === 'aprovar') {
      navigate('/gestao-pessoas/cadastro-militares', {
        state: {
          prefillSolicitacao: solicitacao,
          dialogType: 'approve'
        }
      });
      return;
    }

    // Para rejeição, permanecer no fluxo atual
    setSelectedSolicitacao(solicitacao);
    setApprovalAction(action);
    setObservacoesAprovacao('');
    
    // Resetar campos de aprovação
    setSetorAprovacao('');
    setFuncaoAprovacao('');
    setRoleAprovacao('militar');
    
    setApprovalDialogOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedSolicitacao || !approvalAction) return;
    
    // Validar campos obrigatórios para aprovação
    if (approvalAction === 'aprovar') {
      if (!setorAprovacao || !funcaoAprovacao || !roleAprovacao) {
        setError('Setor, função e role são obrigatórios para aprovação do cadastro');
        return;
      }
    }
    
    setProcessingApproval(true);
    setError('');
    setSuccess('');
    
    try {
      const dadosAprovacao = {
        acao: approvalAction,
        observacoes_aprovacao: observacoesAprovacao
      };
      
      // Adicionar campos obrigatórios se for aprovação
      if (approvalAction === 'aprovar') {
        dadosAprovacao.setor = setorAprovacao;
        dadosAprovacao.funcao = funcaoAprovacao;
        dadosAprovacao.role = roleAprovacao;
      }
      
      const response = await militaresService.aprovarCadastro(
        selectedSolicitacao.id,
        dadosAprovacao.acao,
        dadosAprovacao.observacoes_aprovacao,
        dadosAprovacao.setor,
        dadosAprovacao.funcao,
        dadosAprovacao.role
      );
      
      if (response.data.success) {
        setSuccess(
          approvalAction === 'aprovar' 
            ? 'Cadastro aprovado com sucesso!' 
            : 'Cadastro rejeitado com sucesso!'
        );
        
        // Recarregar lista
        await loadSolicitacoes();
        
        // Fechar dialog
        setApprovalDialogOpen(false);
        setSelectedSolicitacao(null);
        setApprovalAction('');
        setObservacoesAprovacao('');
      }
    } catch (error) {
      console.error('Erro ao processar aprovação:', error);
      setError(error.response?.data?.message || 'Erro ao processar solicitação');
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
                      <TableRow 
                        key={solicitacao.id} 
                        hover 
                        onClick={() => handleViewDetails(solicitacao)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        <TableCell>{solicitacao.unidade_nome || solicitacao.unidade}</TableCell>
                        <TableCell>{solicitacao.email}</TableCell>
                        <TableCell>
                          {formatDataSolicitacao(solicitacao.data_solicitacao)}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Ver Detalhes">
                          <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleViewDetails(solicitacao); }}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Aprovar">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={(e) => { e.stopPropagation(); handleApprovalAction(solicitacao, 'aprovar'); }}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Rejeitar">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); handleApprovalAction(solicitacao, 'rejeitar'); }}
                              >
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
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

      {/* Dialog de Detalhes */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            Detalhes da Solicitação
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSolicitacao && (
            <Grid container spacing={3}>
              {/* Dados Pessoais */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" />
                  Dados Pessoais
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Nome Completo</Typography>
                <Typography variant="body1">{selectedSolicitacao.nome_completo}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Nome de Guerra</Typography>
                <Typography variant="body1">{selectedSolicitacao.nome_guerra}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">CPF</Typography>
                <Typography variant="body1">{formatCPF(selectedSolicitacao.cpf)}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Identidade Militar</Typography>
                <Typography variant="body1">{selectedSolicitacao.identidade_militar}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Data de Nascimento</Typography>
                <Typography variant="body1">{formatDate(selectedSolicitacao.data_nascimento)}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Data de Incorporação</Typography>
                <Typography variant="body1">{formatDate(selectedSolicitacao.data_incorporacao)}</Typography>
              </Grid>

              {/* Contato */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <EmailIcon color="primary" />
                  Contato
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{selectedSolicitacao.email}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Telefone</Typography>
                <Typography variant="body1">{formatPhone(selectedSolicitacao.telefone)}</Typography>
              </Grid>

              {/* Dados Militares */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <WorkIcon color="primary" />
                  Dados Militares
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Posto/Graduação</Typography>
                <Typography variant="body1">{selectedSolicitacao.posto_graduacao}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Unidade</Typography>
                <Typography variant="body1">{selectedSolicitacao.unidade}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Setor</Typography>
                <Typography variant="body1">{selectedSolicitacao.setor}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Data da Solicitação</Typography>
                <Typography variant="body1">{formatDataSolicitacao(selectedSolicitacao.data_solicitacao)}</Typography>
              </Grid>
              
              {selectedSolicitacao.observacoes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Observações</Typography>
                  <Typography variant="body1">{selectedSolicitacao.observacoes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Fechar</Button>
          {selectedSolicitacao && (
            <>
              <Button
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => {
                  setViewDialogOpen(false);
                  handleApprovalAction(selectedSolicitacao, 'rejeitar');
                }}
              >
                Rejeitar
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => {
                  setViewDialogOpen(false);
                  handleApprovalAction(selectedSolicitacao, 'aprovar');
                }}
              >
                Aprovar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog de Aprovação/Rejeição */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => !processingApproval && setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {approvalAction === 'aprovar' ? (
              <ApproveIcon color="success" />
            ) : (
              <RejectIcon color="error" />
            )}
            {approvalAction === 'aprovar' ? 'Aprovar Cadastro' : 'Rejeitar Cadastro'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSolicitacao && (
            <>
              <Typography variant="body1" gutterBottom>
                {approvalAction === 'aprovar' 
                  ? `Confirma a aprovação do cadastro de ${selectedSolicitacao.nome_completo}?`
                  : `Confirma a rejeição do cadastro de ${selectedSolicitacao.nome_completo}?`
                }
              </Typography>
              
              {approvalAction === 'aprovar' && (
                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                  Ao aprovar, um usuário será criado automaticamente e uma senha temporária será gerada.
                </Alert>
              )}
              
              <TextField
                fullWidth
                label="Observações (opcional)"
                multiline
                rows={3}
                value={observacoesAprovacao}
                onChange={(e) => setObservacoesAprovacao(e.target.value)}
                placeholder={`Adicione observações sobre a ${approvalAction === 'aprovar' ? 'aprovação' : 'rejeição'}...`}
                sx={{ mt: 2 }}
              />
              
              {approvalAction === 'aprovar' && (
                <>
                  <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                    Dados Obrigatórios para Aprovação
                  </Typography>
                  
                  <FormControl fullWidth sx={{ mb: 2 }} required>
                    <InputLabel>Setor</InputLabel>
                    <Select
                      value={setorAprovacao}
                      onChange={(e) => setSetorAprovacao(e.target.value)}
                      label="Setor"
                    >
                      {setores.map((setor) => (
                        <MenuItem key={setor} value={setor}>
                          {setor}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth sx={{ mb: 2 }} required>
                    <InputLabel>Função</InputLabel>
                    <Select
                      value={funcaoAprovacao}
                      onChange={(e) => setFuncaoAprovacao(e.target.value)}
                      label="Função"
                    >
                      {funcoes.map((funcao) => (
                        <MenuItem key={funcao} value={funcao}>
                          {funcao}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth sx={{ mb: 2 }} required>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={roleAprovacao}
                      onChange={(e) => setRoleAprovacao(e.target.value)}
                      label="Role"
                    >
                      <MenuItem key="militar-role" value="militar">Militar</MenuItem>
                      <MenuItem key="administrador-role" value="Administrador">Administrador</MenuItem>
                      <MenuItem key="s1-role" value="Administrador">S1</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
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
            color={approvalAction === 'aprovar' ? 'success' : 'error'}
            onClick={handleConfirmApproval}
            disabled={processingApproval}
            startIcon={processingApproval ? <CircularProgress size={20} /> : (
              approvalAction === 'aprovar' ? <ApproveIcon /> : <RejectIcon />
            )}
          >
            {processingApproval ? 'Processando...' : (
              approvalAction === 'aprovar' ? 'Aprovar' : 'Rejeitar'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AprovacaoCadastros;