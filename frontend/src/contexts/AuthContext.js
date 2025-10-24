// =====================================================
// CONTEXTO DE AUTENTICAÇÃO - PLATAFORMA BRAVO
// =====================================================
//
// Contexto atualizado para trabalhar com a estrutura
// unificada de usuários (militares e civis) e o novo
// sistema de perfis hierárquicos.
//
// FUNCIONALIDADES:
// - Autenticação JWT
// - Gestão de perfis e permissões
// - Controle de acesso hierárquico
// - Verificação de unidades e setores
// - Persistência de sessão
//
// =====================================================

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
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          // Corrige caminho duplicado /api/api
          const response = await api.get('/auth/verify');
          setUser(response.data.user || null);
        } else {
          setUser(null);
        }
      } catch (error) {
        // Tratar 401/403 sem poluir o console
        const status = error?.response?.status;
        if (status !== 401 && status !== 403) {
          console.error('Erro ao verificar autenticação:', error);
        }
        localStorage.removeItem('token');
        setUser(null);
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

  // =====================================================
  // MÉTODOS DE AUTORIZAÇÃO ATUALIZADOS
  // =====================================================

  const hasRole = (roles) => {
    if (!user || !roles) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.perfil_nome) || roles.includes(user.papel);
    }
    return user.perfil_nome === roles || user.papel === roles;
  };

  const hasProfile = (profiles) => {
    if (!user || !profiles) return false;
    if (Array.isArray(profiles)) {
      return profiles.includes(user.perfil_nome);
    }
    return user.perfil_nome === profiles;
  };

  const hasLevel = (level) => {
    if (!user || !user.nivel_hierarquia) return false;
    return user.nivel_hierarquia <= level; // Menor número = maior hierarquia
  };

  const hasSector = (sectors) => {
    if (!user || !sectors) return false;
    if (Array.isArray(sectors)) {
      return sectors.includes(user.setor_nome) || sectors.includes(user.setor_id);
    }
    return user.setor_nome === sectors || user.setor_id === sectors;
  };

  const hasUnit = (units) => {
    if (!user || !units) return false;
    if (Array.isArray(units)) {
      return units.includes(user.unidade_nome) || units.includes(user.unidade_id);
    }
    return user.unidade_nome === units || user.unidade_id === units;
  };

  const hasPermission = (permissions) => {
    if (!user || !user.permissoes) return false;
    if (Array.isArray(permissions)) {
      return permissions.some(perm => user.permissoes.includes(perm));
    }
    return user.permissoes.includes(permissions);
  };

  // =====================================================
  // MÉTODOS DE VERIFICAÇÃO DE PERFIL
  // =====================================================

  const isAdmin = () => {
    return hasProfile('Administrador') || user?.papel === 'Administrador';
  };

  const isComandante = () => {
    return hasProfile('Comandante') || user?.papel === 'comandante';
  };

  const isChefe = () => {
    return hasProfile('Chefe') || user?.papel === 'chefe';
  };

  const isAuxiliar = () => {
    return hasProfile('Auxiliares') || user?.papel === 'auxiliar';
  };

  const isOperador = () => {
    return hasProfile('Operador') || user?.papel === 'Operador';
  };

  const isGestor = () => {
    return hasProfile(['Administrador', 'Comandante', 'Chefe']) || user?.papel === 'Chefe';
  };

  const isMilitar = () => {
    return user?.tipo === 'militar';
  };

  const isCivil = () => {
    return user?.tipo === 'civil';
  };

  // =====================================================
  // MÉTODOS DE CAPACIDADE/PERMISSÃO
  // =====================================================

  const canManageUsers = () => {
    return isAdmin() || isComandante() || isChefe() || hasLevel(2);
  };

  const canManageSystem = () => {
    return hasProfile('Administrador') || hasLevel(1);
  };

  const canViewReports = () => {
    return hasProfile(['Administrador', 'Comandante', 'Chefe']) || hasLevel(3);
  };

  const canEditProfile = (targetUserId) => {
    if (!user) return false;
    
    // Pode editar próprio perfil
    if (user.id === targetUserId) return true;
    
    // Administradores podem editar qualquer perfil
    if (isAdmin()) return true;
    
    // Comandantes podem editar perfis de nível inferior
    if (isComandante()) return true;
    
    return false;
  };

  const canAccessSector = (sectorId) => {
    if (!user) return false;
    
    // Administradores têm acesso a todos os setores
    if (isAdmin()) return true;
    
    // Verificar se pertence ao setor
    if (user.setor_id === sectorId) return true;
    
    // Comandantes podem acessar setores da sua unidade
    if (isComandante() && user.unidade_id) return true;
    
    return false;
  };

  const canAccessUnit = (unitId) => {
    if (!user) return false;
    
    // Administradores têm acesso a todas as unidades
    if (isAdmin()) return true;
    
    // Verificar se pertence à unidade
    if (user.unidade_id === unitId) return true;
    
    return false;
  };

  const getAccessibleSectors = () => {
    if (!user) return [];
    
    // Administradores têm acesso a todos os setores
    if (isAdmin()) return 'all';
    
    // Comandantes têm acesso aos setores da sua unidade
    if (isComandante()) return user.unidade_setores || [];
    
    // Outros usuários só têm acesso ao próprio setor
    return user.setor_id ? [user.setor_id] : [];
  };

  const getAccessibleUnits = () => {
    if (!user) return [];
    
    // Administradores têm acesso a todas as unidades
    if (isAdmin()) return 'all';
    
    // Outros usuários só têm acesso à própria unidade
    return user.unidade_id ? [user.unidade_id] : [];
  };

  // =====================================================
  // MÉTODOS DE INFORMAÇÃO DO USUÁRIO
  // =====================================================

  const getUserDisplayName = () => {
    if (!user) return '';
    
    if (isMilitar() && user.nome_guerra) {
      return `${user.posto_graduacao} ${user.nome_guerra}`;
    }
    
    return user.nome_completo || user.nome || '';
  };

  const getUserShortName = () => {
    if (!user) return '';
    
    if (isMilitar() && user.nome_guerra) {
      return user.nome_guerra;
    }
    
    const nomes = (user.nome_completo || user.nome || '').split(' ');
    if (nomes.length >= 2) {
      return `${nomes[0]} ${nomes[nomes.length - 1]}`;
    }
    
    return nomes[0] || '';
  };

  const getUserInfo = () => {
    if (!user) return null;
    
    return {
      id: user.id,
      nome: user.nome_completo,
      email: user.email,
      tipo: user.tipo,
      perfil: user.perfil_nome,
      nivel: user.nivel_hierarquia,
      unidade: user.unidade_nome,
      setor: user.setor_nome,
      funcao: user.funcao_nome,
      displayName: getUserDisplayName(),
      shortName: getUserShortName(),
      isMilitar: isMilitar(),
      isAdmin: isAdmin(),
      isGestor: isGestor(),
    };
  };

  const value = {
    // Estados básicos
    user,
    loading,
    isAuthenticated,
    
    // Métodos de autenticação
    login,
    logout,
    updateUser,
    
    // Métodos de verificação de perfil/papel
    hasRole,
    hasProfile,
    hasLevel,
    hasSector,
    hasUnit,
    hasPermission,
    
    // Verificações específicas de perfil
    isAdmin,
    isComandante,
    isChefe,
    isAuxiliar,
    isOperador,
    isGestor,
    isMilitar,
    isCivil,
    
    // Capacidades/Permissões
    canManageUsers,
    canManageSystem,
    canViewReports,
    canEditProfile,
    canAccessSector,
    canAccessUnit,
    
    // Métodos de acesso
    getAccessibleSectors,
    getAccessibleUnits,
    
    // Informações do usuário
    getUserDisplayName,
    getUserShortName,
    getUserInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};