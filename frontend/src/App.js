import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { TenantProvider } from './contexts/TenantContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Frota from './pages/Frota';
import Viaturas from './pages/Viaturas';
import Manutencoes from './pages/Manutencoes';
import Checklists from './pages/Checklists';
import Almoxarifado from './pages/Almoxarifado';
import Emprestimos from './pages/Emprestimos';
import Operacional from './pages/Operacional';
import Usuarios from './pages/Usuarios';
import CadastroUsuarios from './pages/CadastroUsuarios';
import SolicitarCadastro from './pages/SolicitarCadastro';
import AprovacaoCadastros from './pages/AprovacaoCadastros';
import Perfil from './pages/Perfil';
import Notificacoes from './pages/Notificacoes';
import DashboardFrota from './pages/DashboardFrota';
import HistoricoFuncionalManutencao from './pages/HistoricoFuncionalManutencao';

// Tema personalizado para o Corpo de Bombeiros
const theme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f', // Vermelho dos bombeiros
      light: '#ff6659',
      dark: '#9a0007',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1976d2', // Azul complementar
      light: '#63a4ff',
      dark: '#004ba0',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <TenantProvider>
          <NotificationProvider>
            <Router future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}>
              <Routes>
                {/* Rota de login */}
                <Route path="/login" element={<Login />} />
                
                {/* Rota pública para solicitação de cadastro */}
                <Route path="/solicitar-cadastro" element={<SolicitarCadastro />} />
                
                {/* Rotas protegidas */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  {/* Dashboard */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  
                  {/* Módulo Frota */}
                  <Route path="frota" element={<Frota />} />
                  <Route path="frota/viaturas" element={<Viaturas />} />
                  <Route path="frota/manutencoes" element={<Manutencoes />} />
                  <Route path="frota/checklists" element={<Checklists />} />
                  
                  {/* Módulo Almoxarifado */}
                  <Route path="almoxarifado/*" element={<Almoxarifado />} />
                  
                  {/* Módulo Cautelas */}
                  <Route path="emprestimos/*" element={<Emprestimos />} />
                  
                  {/* Módulo Operacional */}
                  <Route path="operacional/*" element={<Operacional />} />
                  
                  {/* Usuários (apenas admin/gestor) */}
                  {/* Rota específica de Histórico Funcional temporariamente desativada */}
                  <Route path="usuarios/historico" element={
                    <ProtectedRoute roles={['Administrador', 'Chefe']}>
                      <HistoricoFuncionalManutencao />
                    </ProtectedRoute>
                  } />
                  <Route path="usuarios/*" element={
                    <ProtectedRoute roles={['Administrador', 'Chefe']}>
                      <Usuarios />
                    </ProtectedRoute>
                  } />
                  
                  {/* Gestão de Pessoas */}
                  <Route path="gestao-pessoas/cadastro-militares" element={
                    <ProtectedRoute roles={['Administrador', 'Administrador']}>
                      <CadastroUsuarios />
                    </ProtectedRoute>
                  } />
                  
                  {/* Aprovação de Cadastros (apenas admin) */}
                  <Route path="gestao-pessoas/aprovacao-cadastros" element={
                    <ProtectedRoute roles={['Administrador']}>
                      <AprovacaoCadastros />
                    </ProtectedRoute>
                  } />
                  
                  {/* Perfil do usuário */}
                  <Route path="perfil" element={<Perfil />} />
                  
                  {/* Notificações */}
                  <Route path="notificacoes" element={<Notificacoes />} />
                  
                  <Route path="/frota/dashboard" element={<DashboardFrota />} />
                </Route>
                
                {/* Rota padrão - redirecionar para dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
          </NotificationProvider>
        </TenantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;