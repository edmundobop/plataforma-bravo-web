import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const TenantContext = createContext();

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentUnit, setCurrentUnit] = useState(null);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unitsLoaded, setUnitsLoaded] = useState(false);

  // Carregar unidades disponíveis quando o usuário estiver autenticado
  useEffect(() => {
    if (isAuthenticated && user && !unitsLoaded) {
      loadAvailableUnits();
    } else if (!isAuthenticated) {
      // Limpar dados quando não autenticado
      setCurrentUnit(null);
      setAvailableUnits([]);
      setUnitsLoaded(false);
    }
  }, [isAuthenticated, user, unitsLoaded]);

  // Carregar unidade salva no localStorage - só executa quando as unidades são carregadas pela primeira vez
  useEffect(() => {
    if (availableUnits.length > 0 && !currentUnit) {
      console.log('🏢 TenantContext - Definindo currentUnit...');
      console.log('📋 Available units:', availableUnits);
      console.log('👤 User:', user);
      
      const savedUnitId = localStorage.getItem('currentUnitId');
      console.log('💾 Saved unit ID from localStorage:', savedUnitId);
      
      if (savedUnitId) {
        const savedUnit = availableUnits.find(unit => unit.id === parseInt(savedUnitId));
        if (savedUnit) {
          console.log('✅ Usando unidade salva:', savedUnit);
          setCurrentUnit(savedUnit);
          // Configurar header para requisições
          api.defaults.headers.common['X-Tenant-ID'] = savedUnit.id.toString();
          return;
        }
      }
      
      // Se não há unidade salva ou ela não está disponível, usar a unidade de lotação
      if (user?.unidade_id) {
        const lotacaoUnit = availableUnits.find(unit => unit.id === user.unidade_id);
        if (lotacaoUnit) {
          console.log('🏠 Usando unidade de lotação:', lotacaoUnit);
          setCurrentUnit(lotacaoUnit);
          localStorage.setItem('currentUnitId', lotacaoUnit.id.toString());
          // Configurar header para requisições
          api.defaults.headers.common['X-Tenant-ID'] = lotacaoUnit.id.toString();
        }
      } else if (availableUnits.length > 0) {
        // Fallback: usar a primeira unidade disponível
        console.log('🔄 Usando primeira unidade disponível:', availableUnits[0]);
        setCurrentUnit(availableUnits[0]);
        localStorage.setItem('currentUnitId', availableUnits[0].id.toString());
        // Configurar header para requisições
        api.defaults.headers.common['X-Tenant-ID'] = availableUnits[0].id.toString();
      }
    } else if (availableUnits.length === 0 && unitsLoaded) {
      console.log('⚠️ Nenhuma unidade disponível');
    }
  }, [availableUnits, currentUnit, user, unitsLoaded]);

  // Fallback: se não houver unidades carregadas, ainda assim definir currentUnit pela lotação do usuário
  useEffect(() => {
    if (isAuthenticated && user && !currentUnit && unitsLoaded && availableUnits.length === 0) {
      const savedUnitId = localStorage.getItem('currentUnitId');
      if (savedUnitId) {
        const unitObj = {
          id: parseInt(savedUnitId),
          nome: user.unidade_nome || `Unidade ${savedUnitId}`,
          tipo: user.unidade_tipo || 'Unidade',
          sigla: user.unidade_sigla || null,
        };
        setCurrentUnit(unitObj);
        api.defaults.headers.common['X-Tenant-ID'] = savedUnitId.toString();
      } else if (user?.unidade_id) {
        const unitObj = {
          id: user.unidade_id,
          nome: user.unidade_nome || `Unidade ${user.unidade_id}`,
          tipo: user.unidade_tipo || 'Unidade',
          sigla: user.unidade_sigla || null,
        };
        setCurrentUnit(unitObj);
        localStorage.setItem('currentUnitId', user.unidade_id.toString());
        api.defaults.headers.common['X-Tenant-ID'] = user.unidade_id.toString();
      }
    }
  }, [isAuthenticated, user, currentUnit, unitsLoaded, availableUnits]);

  const loadAvailableUnits = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenant/units');
      setAvailableUnits(response.data.units || []);
      setUnitsLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      setAvailableUnits([]);
      setUnitsLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const switchUnit = async (unitId) => {
    try {
      const unit = availableUnits.find(u => u.id === unitId);
      if (!unit) {
        throw new Error('Unidade não encontrada');
      }

      // Verificar se o usuário tem acesso à unidade
      await api.get(`/tenant/check-access/${unitId}`);
      
      // Atualizar unidade atual
      setCurrentUnit(unit);
      localStorage.setItem('currentUnitId', unitId.toString());
      
      // Configurar header para próximas requisições
      api.defaults.headers.common['X-Tenant-ID'] = unitId.toString();
      
      return { success: true, unit };
    } catch (error) {
      console.error('Erro ao trocar unidade:', error);
      const message = error.response?.data?.error || 'Erro ao trocar unidade';
      return { success: false, error: message };
    }
  };

  const refreshUnits = async () => {
    await loadAvailableUnits();
  };

  const hasAccessToUnit = (unitId) => {
    return availableUnits.some(unit => unit.id === unitId);
  };

  const isCurrentUnit = (unitId) => {
    return currentUnit?.id === unitId;
  };

  const getUserRole = (unitId = null) => {
    const targetUnitId = unitId || currentUnit?.id;
    if (!targetUnitId) return null;
    
    const unit = availableUnits.find(u => u.id === targetUnitId);
    return unit?.role_unidade || null;
  };

  const canManageUnit = (unitId = null) => {
    const role = getUserRole(unitId);
    return ['Administrador', 'Chefe'].includes(role);
  };

  const isLotacaoUnit = () => {
    return currentUnit?.id === user?.unidade_id;
  };

  // Configurar header da API quando a unidade atual mudar
  useEffect(() => {
    if (currentUnit) {
      api.defaults.headers.common['X-Tenant-ID'] = currentUnit.id.toString();
    } else {
      delete api.defaults.headers.common['X-Tenant-ID'];
    }
  }, [currentUnit]);

  const value = {
    currentUnit,
    availableUnits,
    loading,
    switchUnit,
    refreshUnits,
    hasAccessToUnit,
    isCurrentUnit,
    getUserRole,
    canManageUnit,
    isLotacaoUnit,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};