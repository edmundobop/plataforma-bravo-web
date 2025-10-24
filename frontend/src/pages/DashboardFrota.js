import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Build as BuildIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { dashboardService } from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTenant } from '../contexts/TenantContext';

const DashboardFrota = () => {
  const { currentUnit } = useTenant();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('30');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtros, setFiltros] = useState({
    periodo: '30',
    setor: '',
    tipo_viatura: '',
    status: '',
    data_inicial: '',
    data_final: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  // useEffect para recarregar dados quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      loadDashboardData();
    }
  }, [currentUnit]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDashboardFrota();
      setDashboardData(response.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard de frota:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Cores para gráficos
  const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];

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

  const { 
    estatisticas_viaturas, 
    manutencoes_por_status, 
    viaturas_mais_usadas, 
    proximas_manutencoes 
  } = dashboardData || {};

  // Preparar dados para gráficos
  const dadosStatusViaturas = [
    { name: 'Ativas', value: estatisticas_viaturas?.ativas || 0, color: '#4caf50' },
    { name: 'Em Manutenção', value: estatisticas_viaturas?.em_manutencao || 0, color: '#ff9800' },
    { name: 'Inativas', value: estatisticas_viaturas?.inativas || 0, color: '#f44336' },
  ];

  const dadosManutencoes = manutencoes_por_status?.map(item => ({
    status: item.status,
    quantidade: parseInt(item.quantidade)
  })) || [];

  // Calcular percentual de disponibilidade
  const totalViaturas = estatisticas_viaturas?.total_viaturas || 0;
  const viaturasDisponiveis = estatisticas_viaturas?.ativas || 0;
  const percentualDisponibilidade = totalViaturas > 0 ? 
    Number(((viaturasDisponiveis / totalViaturas) * 100).toFixed(1)) || 0 : 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Dashboard - Gestão de Frota
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Visão geral das viaturas, manutenções e indicadores operacionais
        </Typography>
      </Box>

      {/* Filtros */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={filtroPeriodo}
            label="Período"
            onChange={(e) => setFiltroPeriodo(e.target.value)}
          >
            <MenuItem key="7" value="7">7 dias</MenuItem>
            <MenuItem key="30" value="30">30 dias</MenuItem>
            <MenuItem key="90" value="90">90 dias</MenuItem>
            <MenuItem key="365" value="365">1 ano</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Setor</InputLabel>
          <Select
            value={filtroSetor}
            label="Setor"
            onChange={(e) => setFiltroSetor(e.target.value)}
          >
            <MenuItem key="todos" value="">Todos</MenuItem>
            <MenuItem key="operacional" value="operacional">Operacional</MenuItem>
            <MenuItem key="administrativo" value="administrativo">Administrativo</MenuItem>
            <MenuItem key="emergencia" value="emergencia">Emergência</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Cards de métricas principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4caf50, #66bb6a)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas_viaturas?.total_viaturas || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Total de Viaturas
                  </Typography>
                </Box>
                <CarIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #2196f3, #42a5f5)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas_viaturas?.ativas || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Viaturas Ativas
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ff9800, #ffb74d)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {estatisticas_viaturas?.em_manutencao || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Em Manutenção
                  </Typography>
                </Box>
                <BuildIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #9c27b0, #ba68c8)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    {percentualDisponibilidade}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Disponibilidade
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Gráfico de Status das Viaturas */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Status das Viaturas
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosStatusViaturas}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dadosStatusViaturas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico de Manutenções por Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Manutenções por Status
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosManutencoes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Próximas Manutenções Agendadas - Versão Expandida */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Próximas Manutenções Agendadas
                </Typography>
                <Chip 
                  label={`${proximas_manutencoes?.length || 0} agendadas`} 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
              
              {proximas_manutencoes && proximas_manutencoes.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Viatura</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Data Agendada</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Prioridade</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Responsável</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {proximas_manutencoes.slice(0, 10).map((manutencao, index) => {
                        const diasRestantes = Math.ceil((new Date(manutencao.data_manutencao) - new Date()) / (1000 * 60 * 60 * 24));
                        const isUrgente = diasRestantes <= 3;
                        const isVencida = diasRestantes < 0;
                        
                        return (
                          <TableRow 
                            key={index}
                            sx={{ 
                              '&:hover': { bgcolor: 'grey.50' },
                              bgcolor: isVencida ? 'error.50' : isUrgente ? 'warning.50' : 'inherit'
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CarIcon color="primary" fontSize="small" />
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {manutencao.prefixo}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {manutencao.marca} {manutencao.modelo}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={manutencao.tipo} 
                                size="small" 
                                color={manutencao.tipo === 'preventiva' ? 'success' : 'warning'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {formatDate(manutencao.data_manutencao)}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color={isVencida ? 'error.main' : isUrgente ? 'warning.main' : 'textSecondary'}
                              >
                                {isVencida ? `${Math.abs(diasRestantes)} dias vencida` : 
                                 isUrgente ? `${diasRestantes} dias restantes` : 
                                 `em ${diasRestantes} dias`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={manutencao.prioridade || 'Normal'} 
                                size="small" 
                                color={
                                  manutencao.prioridade === 'Alta' ? 'error' : 
                                  manutencao.prioridade === 'Média' ? 'warning' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={manutencao.status || 'Agendada'} 
                                size="small" 
                                color={
                                  manutencao.status === 'Em andamento' ? 'info' : 
                                  manutencao.status === 'Concluída' ? 'success' : 'default'
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {manutencao.responsavel || 'Não definido'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Button size="small" variant="outlined" color="primary">
                                  Ver
                                </Button>
                                <Button size="small" variant="outlined" color="secondary">
                                  Editar
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  justifyContent="center" 
                  py={6}
                  sx={{ bgcolor: 'grey.50', borderRadius: 1 }}
                >
                  <ScheduleIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Nenhuma manutenção agendada
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Todas as manutenções estão em dia
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Ranking de Viaturas - Versão Expandida */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Ranking de Viaturas
                </Typography>
                <Chip 
                  label="Por Manutenções" 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                />
              </Box>
              
              {viaturas_mais_usadas && viaturas_mais_usadas.length > 0 ? (
                <Box>
                  {viaturas_mais_usadas.slice(0, 8).map((viatura, index) => {
                    const maxManutencoes = viaturas_mais_usadas.length > 0 ? 
                      Math.max(...viaturas_mais_usadas.map(v => v.numero_manutencoes)) : 1;
                    const percentual = maxManutencoes > 0 ? (viatura.numero_manutencoes / maxManutencoes) * 100 : 0;
                    
                    return (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box 
                              sx={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: '50%', 
                                bgcolor: index < 3 ? ['gold', 'silver', '#CD7F32'][index] : 'grey.400',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              {index + 1}
                            </Box>
                            <CarIcon color="primary" fontSize="small" />
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {viatura.prefixo}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {viatura.marca} {viatura.modelo}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {viatura.numero_manutencoes} manutenções
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {viatura.km_rodados ? `${viatura.km_rodados.toLocaleString()} km` : 'N/A'}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Barra de progresso */}
                        <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 6 }}>
                          <Box 
                            sx={{ 
                              width: `${percentual}%`, 
                              bgcolor: index < 3 ? 'error.main' : 'warning.main',
                              height: '100%', 
                              borderRadius: 1,
                              transition: 'width 0.3s ease'
                            }} 
                          />
                        </Box>
                        
                        {/* Informações adicionais */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            Última manutenção: {viatura.ultima_manutencao ? formatDate(viatura.ultima_manutencao) : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color={viatura.status === 'ativo' ? 'success.main' : 'error.main'}>
                            {viatura.status || 'Ativo'}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                  
                  {/* Estatísticas do ranking */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Estatísticas do Ranking
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">Média</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {viaturas_mais_usadas.length > 0 ? 
                            (viaturas_mais_usadas.reduce((acc, v) => acc + v.numero_manutencoes, 0) / viaturas_mais_usadas.length).toFixed(1) : 
                            '0.0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">Máximo</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {viaturas_mais_usadas.length > 0 ? 
                            Math.max(...viaturas_mais_usadas.map(v => v.numero_manutencoes)) : 
                            0}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">Total</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {viaturas_mais_usadas.reduce((acc, v) => acc + v.numero_manutencoes, 0)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              ) : (
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  justifyContent="center" 
                  py={6}
                  sx={{ bgcolor: 'grey.50', borderRadius: 1 }}
                >
                  <TrendingUpIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Nenhum dado disponível
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Dados de uso serão exibidos aqui
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Viaturas Mais Usadas */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Viaturas Mais Usadas
              </Typography>
              
              {viaturas_mais_usadas && viaturas_mais_usadas.length > 0 ? (
                <List>
                  {viaturas_mais_usadas.map((viatura, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <CarIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography component="span" sx={{ fontWeight: 600 }}>
                              {viatura.prefixo}
                            </Typography>
                            <Chip 
                              label={`${viatura.total_manutencoes} manutenções`} 
                              size="small" 
                              color="warning"
                              variant="outlined"
                            />
                          </Typography>
                        }
                        secondary={`${viatura.marca} ${viatura.modelo}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" py={4}>
                  <Typography variant="body1" color="textSecondary">
                    Nenhum dado disponível
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alertas Críticos */}
      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Alertas e Indicadores Críticos
            </Typography>
            
            <Grid container spacing={2}>
              {/* Alerta de viaturas em manutenção */}
              {estatisticas_viaturas?.em_manutencao > 0 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Alert severity="warning" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      🔧 {estatisticas_viaturas.em_manutencao} viatura(s) em manutenção
                    </Typography>
                    <Typography variant="body2">
                      Verifique o status e previsão de conclusão
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {/* Alerta de próximas manutenções */}
              {proximas_manutencoes?.length > 0 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Alert severity="info" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      📅 {proximas_manutencoes.length} manutenção(ões) agendada(s)
                    </Typography>
                    <Typography variant="body2">
                      Próximas manutenções nos próximos 7 dias
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {/* Alerta de baixa disponibilidade */}
              {percentualDisponibilidade < 80 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Alert severity="error" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      ⚠️ Baixa disponibilidade ({percentualDisponibilidade}%)
                    </Typography>
                    <Typography variant="body2">
                      Considere acelerar as manutenções pendentes
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {/* Alerta de manutenções vencidas */}
              {dashboardData?.manutencoes_vencidas > 0 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Alert severity="error" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      🚨 {dashboardData.manutencoes_vencidas} manutenção(ões) vencida(s)
                    </Typography>
                    <Typography variant="body2">
                      Ação imediata necessária
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {/* Alerta de alta utilização */}
              {dashboardData?.viaturas_alta_utilizacao > 0 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Alert severity="warning" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      📈 {dashboardData.viaturas_alta_utilizacao} viatura(s) com alta utilização
                    </Typography>
                    <Typography variant="body2">
                      Monitore para manutenção preventiva
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {/* Alerta de combustível baixo */}
              {dashboardData?.viaturas_combustivel_baixo > 0 && (
                <Grid item xs={12} sm={6} md={4}>
                  <Alert severity="warning" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      ⛽ {dashboardData.viaturas_combustivel_baixo} viatura(s) com combustível baixo
                    </Typography>
                    <Typography variant="body2">
                      Abasteça antes do próximo uso
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {/* Mensagem quando não há alertas */}
              {!estatisticas_viaturas?.em_manutencao && 
               !proximas_manutencoes?.length && 
               percentualDisponibilidade >= 80 && 
               !dashboardData?.manutencoes_vencidas && 
               !dashboardData?.viaturas_alta_utilizacao && 
               !dashboardData?.viaturas_combustivel_baixo && (
                <Grid item xs={12}>
                  <Alert severity="success" sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      ✅ Tudo funcionando perfeitamente!
                    </Typography>
                    <Typography variant="body2">
                      Não há alertas críticos no momento. A frota está operando normalmente.
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default DashboardFrota;