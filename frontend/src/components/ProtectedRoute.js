import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles, sectors }) => {
  const { user, loading, isAuthenticated, hasRole, hasSector } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Carregando...
        </Typography>
      </Box>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o usuário tem o papel necessário
  if (roles && !hasRole(roles)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
        p={3}
      >
        <Typography variant="h4" color="error" gutterBottom>
          Acesso Negado
        </Typography>
        <Typography variant="body1" color="textSecondary" textAlign="center">
          Você não tem permissão para acessar esta página.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Papel necessário: {Array.isArray(roles) ? roles.join(', ') : roles}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Seu papel: {user?.papel}
        </Typography>
      </Box>
    );
  }

  // Verificar se o usuário pertence ao setor necessário
  if (sectors && !hasSector(sectors)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
        p={3}
      >
        <Typography variant="h4" color="error" gutterBottom>
          Acesso Negado
        </Typography>
        <Typography variant="body1" color="textSecondary" textAlign="center">
          Você não tem permissão para acessar esta página.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Setor necessário: {Array.isArray(sectors) ? sectors.join(', ') : sectors}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Seu setor: {user?.setor}
        </Typography>
      </Box>
    );
  }

  // Verificar se o usuário está ativo
  if (!user?.ativo) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
        p={3}
      >
        <Typography variant="h4" color="warning.main" gutterBottom>
          Conta Inativa
        </Typography>
        <Typography variant="body1" color="textSecondary" textAlign="center">
          Sua conta foi desativada. Entre em contato com o administrador.
        </Typography>
      </Box>
    );
  }

  // Se passou por todas as verificações, renderizar o componente
  return children;
};

export default ProtectedRoute;