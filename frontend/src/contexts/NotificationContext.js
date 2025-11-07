import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Snackbar, Alert } from '@mui/material';
import { useAuth } from './AuthContext';
import api from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Carregar notificações do servidor
  const loadNotifications = async () => {
    try {
      const response = await api.get('/notificacoes', {
        params: { limit: 50 }
      });
      
      setNotifications(response.data.notificacoes);
      setUnreadCount(response.data.nao_lidas);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  // Conectar ao Socket.IO quando o usuário estiver autenticado
  useEffect(() => {
    // Temporariamente desabilitado para evitar erros de conexão
    // TODO: Implementar autenticação JWT adequada para Socket.io
    if (false && isAuthenticated && user) {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Conectado ao servidor de notificações');
      });

      newSocket.on('disconnect', () => {
        console.log('Desconectado do servidor de notificações');
      });

      // Escutar novas notificações
      newSocket.on('nova_notificacao', (notificacao) => {
        setNotifications(prev => [notificacao, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Mostrar snackbar para notificações importantes
        if (['warning', 'error'].includes(notificacao.tipo)) {
          showSnackbar(notificacao.titulo, notificacao.tipo);
        }
      });

      // Escutar atualizações de notificações
      newSocket.on('notificacao_atualizada', (notificacao) => {
        setNotifications(prev => 
          prev.map(n => n.id === notificacao.id ? notificacao : n)
        );
        
        if (notificacao.lida) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      });

      // Escutar quando todas as notificações são marcadas como lidas
      newSocket.on('todas_notificacoes_lidas', () => {
        setNotifications(prev => 
          prev.map(n => ({ ...n, lida: true }))
        );
        setUnreadCount(0);
      });

      setSocket(newSocket);

      // Carregar notificações iniciais
      loadNotifications();

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, user]);

  // Carregar notificações iniciais mesmo sem socket habilitado
  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotifications();
    }
  }, [isAuthenticated, user]);

  // Marcar notificação como lida
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notificacoes/${notificationId}/lida`);
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, lida: true } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    try {
      await api.put('/notificacoes/todas/lidas');
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, lida: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  };

  // Deletar notificação
  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notificacoes/${notificationId}`);
      
      const notification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      if (notification && !notification.lida) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  // Deletar todas as notificações lidas
  const deleteReadNotifications = async () => {
    try {
      await api.delete('/notificacoes/lidas');
      
      setNotifications(prev => 
        prev.filter(n => !n.lida)
      );
    } catch (error) {
      console.error('Erro ao deletar notificações lidas:', error);
    }
  };

  // Mostrar snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Fechar snackbar
  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Criar notificação (para admins/gestores)
  const createNotification = async (notificationData) => {
    try {
      const response = await api.post('/notificacoes', notificationData);
      showSnackbar('Notificação enviada com sucesso', 'success');
      return response.data;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      showSnackbar('Erro ao enviar notificação', 'error');
      throw error;
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    loadNotifications,
    showSnackbar,
    createNotification,
    socket
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Snackbar para notificações em tempo real */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={closeSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};