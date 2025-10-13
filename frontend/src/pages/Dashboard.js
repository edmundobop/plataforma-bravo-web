import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Paper,
  useTheme,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { dashboardService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUnit } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Recarregar dados quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadDashboardData();
    }
  }, [currentUnit]);
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDashboardGeral();
      setDashboardData(response.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (tipo) => {
    switch (tipo) {
      case 'error':
        return { Component: ErrorIcon, color: 'error' };
      case 'warning':
        return { Component: WarningIcon, color: 'warning' };
      default:
        return { Component: InfoIcon, color: 'info' };
    }
  };

  const getAlertColor = (tipo) => {
    switch (tipo) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={loadDashboardData}>
          Tentar Novamente
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  const { estatisticas, atividades_recentes, alertas } = dashboardData || {};

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Bem-vindo, {user?.nome}! Aqui está um resumo das atividades do sistema.
        </Typography>
      </Box>

      {/* Estatísticas principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #1976d2, #42a5f5)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas?.usuarios_ativos || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Usuários Ativos
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #388e3c, #66bb6a)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas?.viaturas_disponiveis || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Viaturas Disponíveis
                  </Typography>
                </Box>
                <CarIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #f57c00, #ffb74d)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas?.produtos_baixo_estoque || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Estoque Baixo
                  </Typography>
                </Box>
                <InventoryIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #7b1fa2, #ba68c8)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas?.emprestimos_ativos || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Cautelas Ativas
                  </Typography>
                </Box>
                <AssignmentIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #d32f2f, #f44336)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas?.escalas_ativas || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Escalas Ativas
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #5d4037, #8d6e63)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas?.notificacoes_nao_lidas || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Notificações
                  </Typography>
                </Box>
                <NotificationsIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Alertas importantes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Alertas Importantes
              </Typography>
              
              {alertas && alertas.length > 0 ? (
                <List>
                  {alertas.map((alerta, index) => {
                    const { Component: IconComponent, color } = getAlertIcon(alerta.tipo);
                    return (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          {IconComponent ? <IconComponent color={color} /> : null}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {alerta.titulo}
                              </Typography>
                              <Chip 
                                label={alerta.modulo} 
                                size="small" 
                                color={getAlertColor(alerta.tipo)}
                                variant="outlined"
                              />
                            </Typography>
                          }
                          secondary={alerta.mensagem}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" py={4}>
                  <Box textAlign="center">
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="body1" color="textSecondary">
                      Nenhum alerta no momento
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Atividades recentes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Atividades Recentes
              </Typography>
              
              {atividades_recentes && atividades_recentes.length > 0 ? (
                <List>
                  {atividades_recentes.slice(0, 8).map((atividade, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {atividade.descricao}
                            </Typography>
                            <Chip 
                              label={atividade.tipo} 
                              size="small" 
                              variant="outlined"
                            />
                          </Typography>
                        }
                        secondary={
                          <Typography component="div">
                            <Typography component="span" variant="body2" color="textSecondary" display="block">
                              Por: {atividade.usuario}
                            </Typography>
                            <Typography component="span" variant="caption" color="textSecondary" display="block">
                              {formatDate(atividade.data)}
                            </Typography>
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" py={4}>
                  <Typography variant="body1" color="textSecondary">
                    Nenhuma atividade recente
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Acesso rápido aos módulos */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Acesso Rápido
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                }
              }}
              onClick={() => navigate('/dashboard/frota')}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <CarIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Gestão de Frota
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Viaturas e manutenções
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                }
              }}
              onClick={() => navigate('/almoxarifado')}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <InventoryIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Gestão de Almoxarifado
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Controle de estoque
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                }
              }}
              onClick={() => navigate('/emprestimos')}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <AssignmentIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Cautelas
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Cautela de equipamentos
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                }
              }}
              onClick={() => navigate('/operacional')}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <ScheduleIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Gestão Operacional
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Escalas e serviços
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;