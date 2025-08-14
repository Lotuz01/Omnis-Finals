'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useNotifications, useSystemNotifications, type Notification } from '@/hooks/use-notifications';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  notifySuccess: (title: string, message: string, action?: Notification['action']) => void;
  notifyError: (title: string, message: string, action?: Notification['action']) => void;
  notifyWarning: (title: string, message: string, action?: Notification['action']) => void;
  notifyInfo: (title: string, message: string, action?: Notification['action']) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const notificationsHook = useNotifications();
  const systemNotifications = useSystemNotifications();

  const value: NotificationsContextType = {
    ...notificationsHook,
    ...systemNotifications
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
}

// Hook para facilitar o uso das notificações do sistema
export function useNotify() {
  const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotificationsContext();
  return { notifySuccess, notifyError, notifyWarning, notifyInfo };
}