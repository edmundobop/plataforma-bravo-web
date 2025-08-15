import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Frota from './pages/Frota';
import Almoxarifado from './pages/Almoxarifado';
import Emprestimos from './pages/Emprestimos';
import Operacional from './pages/Operacional';
import Usuarios from './pages/Usuarios';
import Perfil from './pages/Perfil';
import Notificacoes from './pages/Notificacoes';

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
        <NotificationProvider>
          <Router future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}>
            <Routes>
              {/* Rota de login */}
              <Route path="/login" element={<Login />} />
              
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
                <Route path="frota/*" element={<Frota />} />
                
                {/* Módulo Almoxarifado */}
                <Route path="almoxarifado/*" element={<Almoxarifado />} />
                
                {/* Módulo Cautelas */}
                <Route path="emprestimos/*" element={<Emprestimos />} />
                
                {/* Módulo Operacional */}
                <Route path="operacional/*" element={<Operacional />} />
                
                {/* Usuários (apenas admin/gestor) */}
                <Route path="usuarios/*" element={
                  <ProtectedRoute roles={['admin', 'gestor']}>
                    <Usuarios />
                  </ProtectedRoute>
                } />
                
                {/* Perfil do usuário */}
                <Route path="perfil" element={<Perfil />} />
                
                {/* Notificações */}
                <Route path="notificacoes" element={<Notificacoes />} />
              </Route>
              
              {/* Rota padrão - redirecionar para dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;