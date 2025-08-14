'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Função para adicionar uma nova notificação
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    
    // Mostrar toast
    const toastFunction = {
      info: toast.info,
      success: toast.success,
      warning: toast.warning,
      error: toast.error
    }[notification.type];

    toastFunction(notification.title, {
      description: notification.message,
      action: notification.action ? {
        label: notification.action.label,
        onClick: notification.action.onClick
      } : undefined
    });
  }, []);

  // Função para marcar notificação como lida
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // Função para marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // Função para remover notificação
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Função para limpar todas as notificações
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Atualizar contador de não lidas
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Notificações iniciais removidas - apenas notificações relevantes para administradores serão exibidas

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };
}

// Hook para notificações do sistema
export function useSystemNotifications() {
  const { addNotification } = useNotifications();

  const notifySuccess = useCallback((title: string, message: string, action?: Notification['action']) => {
    addNotification({ title, message, type: 'success', action });
  }, [addNotification]);

  const notifyError = useCallback((title: string, message: string, action?: Notification['action']) => {
    addNotification({ title, message, type: 'error', action });
  }, [addNotification]);

  const notifyWarning = useCallback((title: string, message: string, action?: Notification['action']) => {
    addNotification({ title, message, type: 'warning', action });
  }, [addNotification]);

  const notifyInfo = useCallback((title: string, message: string, action?: Notification['action']) => {
    addNotification({ title, message, type: 'info', action });
  }, [addNotification]);

  return {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  };
}