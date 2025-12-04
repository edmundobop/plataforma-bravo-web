import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Paper,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  LocalFireDepartment as FireIcon,
} from '@mui/icons-material';
import { militaresService } from '../services/militaresService';
import { formatCPF, formatPhone, validateCPF } from '../utils/validations';

const SolicitarCadastro = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    nome_guerra: '',
    posto_graduacao: '',
    cpf: '',
    identidade_militar: '',
    email: '',
    telefone: '',
    unidade_id: '',
    data_nascimento: '',
    data_incorporacao: '',
    categoria_cnh: '',
    observacoes: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [unidades, setUnidades] = useState([]);

  const postosGraduacoes = [
    'Coronel', 'Tenente-Coronel', 'Major',
    'Capitão', '1º Tenente', '2º Tenente', 'Aspirante a Oficial',
    'Subtenente', '1º Sargento', '2º Sargento', '3º Sargento',
    'Cabo', 'Soldado'
  ];

  // Carregar unidades da API
  useEffect(() => {
    const loadUnidades = async () => {
      try {
        const response = await militaresService.getUnidadesPublicas();
        if (response.data && response.data.unidades) {
          const mapped = response.data.unidades.map(u => ({ id: String(u.id), nome: u.nome }));
          setUnidades(mapped);
        }
      } catch (error) {
        console.error('Erro ao carregar unidades:', error);
        // Fallback para unidades estáticas em caso de erro
        setUnidades([
          { id: '1', nome: '1º Batalhão de Infantaria' },
          { id: '2', nome: '2ª Companhia de Fuzileiros' },
          { id: '3', nome: '3º Pelotão de Reconhecimento' },
          { id: '4', nome: 'Seção de Inteligência' },
          { id: '5', nome: 'Grupo de Apoio Logístico' },
          { id: '6', nome: 'Comando da Unidade' },
          { id: '7', nome: 'Estado-Maior' },
          { id: '999', nome: 'Outra' }
        ]);
      }
    };
    
    loadUnidades();
  }, []);



  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Formatação automática
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validações obrigatórias
    if (!formData.nome_completo.trim()) {
      newErrors.nome_completo = 'Nome completo é obrigatório';
    }

    if (!formData.nome_guerra.trim()) {
      newErrors.nome_guerra = 'Nome de guerra é obrigatório';
    }

    if (!formData.posto_graduacao) {
      newErrors.posto_graduacao = 'Posto/graduação é obrigatório';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }

    if (!formData.identidade_militar.trim()) {
      newErrors.identidade_militar = 'Identidade militar é obrigatória';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    }

    if (!String(formData.unidade_id || '').trim()) {
      newErrors.unidade_id = 'Unidade é obrigatória';
    }



    if (!formData.data_nascimento) {
      newErrors.data_nascimento = 'Data de nascimento é obrigatória';
    }

    if (!formData.data_incorporacao) {
      newErrors.data_incorporacao = 'Data de incorporação é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Por favor, corrija os erros no formulário');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await militaresService.solicitarCadastro(formData);
      setSuccess(true);
    } catch (error) {
      console.error('Erro ao solicitar cadastro:', error);
      setError(error.response?.data?.message || 'Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <FireIcon sx={{ fontSize: 60, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h4" gutterBottom color="primary">
            Solicitação Enviada!
          </Typography>
          <Typography variant="body1" paragraph sx={{ mb: 3 }}>
            Sua solicitação de cadastro foi enviada com sucesso. 
            Você receberá um email quando sua solicitação for aprovada pelo administrador.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Mantenha seus dados de contato atualizados para que possamos entrar em contato.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToLogin}
            sx={{ mt: 2 }}
          >
            Voltar ao Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ 
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          p: 3,
          textAlign: 'center'
        }}>
          <FireIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Solicitar Cadastro
          </Typography>
          <Typography variant="body1">
            Preencha seus dados para solicitar acesso ao sistema
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
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
                <TextField
                  fullWidth
                  label="Nome Completo"
                  name="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleChange}
                  error={!!errors.nome_completo}
                  helperText={errors.nome_completo}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  required
                />
              </Grid>



              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CPF"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  error={!!errors.cpf}
                  helperText={errors.cpf}
                  placeholder="000.000.000-00"
                  required
                />
              </Grid>


              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Data de Nascimento"
                  name="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  error={!!errors.data_nascimento}
                  helperText={errors.data_nascimento}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Categoria CNH</InputLabel>
                  <Select
                    name="categoria_cnh"
                    value={formData.categoria_cnh}
                    onChange={handleChange}
                    label="Categoria CNH"
                  >
                    {['A','B','AB','C','D','E'].map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  error={!!errors.telefone}
                  helperText={errors.telefone}
                  placeholder="(00) 00000-0000"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  required
                />
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
                <FormControl fullWidth error={!!errors.posto_graduacao} required>
                  <InputLabel>Posto/Graduação</InputLabel>
                  <Select
                    name="posto_graduacao"
                    value={formData.posto_graduacao}
                    onChange={handleChange}
                    label="Posto/Graduação"
                  >
                    {postosGraduacoes.map((posto) => (
                      <MenuItem key={posto} value={posto}>
                        {posto}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.posto_graduacao && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.posto_graduacao}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome de Guerra"
                  name="nome_guerra"
                  value={formData.nome_guerra}
                  onChange={handleChange}
                  error={!!errors.nome_guerra}
                  helperText={errors.nome_guerra}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.unidade_id} required>
                  <InputLabel>Unidade</InputLabel>
                  <Select
                    name="unidade_id"
                    value={formData.unidade_id}
                    onChange={handleChange}
                    label="Unidade"
                  >
                    {unidades.map((unidade) => (
                      <MenuItem key={unidade.id} value={String(unidade.id)}>
                        {unidade.nome}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.unidade_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.unidade_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Identidade Militar"
                  name="identidade_militar"
                  value={formData.identidade_militar}
                  onChange={handleChange}
                  inputProps={{ maxLength: 5 }}
                  error={!!errors.identidade_militar}
                  helperText={errors.identidade_militar}
                  placeholder="Ex: 12345"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Data de Incorporação"
                  name="data_incorporacao"
                  type="date"
                  value={formData.data_incorporacao}
                  onChange={handleChange}
                  error={!!errors.data_incorporacao}
                  helperText={errors.data_incorporacao}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  required
                />
              </Grid>



              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  placeholder="Informações adicionais (opcional)"
                />
              </Grid>

              {/* Botões */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBackToLogin}
                    disabled={loading}
                  >
                    Voltar ao Login
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                    disabled={loading}
                    size="large"
                  >
                    {loading ? 'Enviando...' : 'Solicitar Cadastro'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Paper>
    </Container>
  );
};

export default SolicitarCadastro;
