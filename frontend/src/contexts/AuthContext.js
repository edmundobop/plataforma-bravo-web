import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar se há token salvo no localStorage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Configurar token no header da API
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verificar se o token ainda é válido
          const response = await api.get('/auth/verify');
          if (response.data.user) {
            setUser(response.data.user);
            setIsAuthenticated(true);
          } else {
            // Token inválido, remover
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        // Token inválido, remover
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, senha) => {
    try {
      const response = await api.post('/auth/login', { email, senha });
      const { token, user: userData } = response.data;

      // Salvar token no localStorage
      localStorage.setItem('token', token);
      
      // Configurar token no header da API
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Atualizar estado
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Erro no login:', error);
      const message = error.response?.data?.error || 'Erro ao fazer login';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // Tentar fazer logout no servidor
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout no servidor:', error);
    } finally {
      // Limpar dados locais independentemente do resultado
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  };

  const hasRole = (roles) => {
    if (!user || !roles) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.papel);
    }
    return user.papel === roles;
  };

  const hasSector = (sectors) => {
    if (!user || !sectors) return false;
    if (Array.isArray(sectors)) {
      return sectors.includes(user.setor);
    }
    return user.setor === sectors;
  };

  const isAdmin = () => {
    return user?.papel === 'admin';
  };

  const isGestor = () => {
    return user?.papel === 'gestor';
  };

  const isOperador = () => {
    return user?.papel === 'operador';
  };

  const canManageUsers = () => {
    return hasRole(['admin', 'gestor']);
  };

  const canManageSystem = () => {
    return hasRole(['admin']);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    hasRole,
    hasSector,
    isAdmin,
    isGestor,
    isOperador,
    canManageUsers,
    canManageSystem,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};