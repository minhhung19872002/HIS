import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr';
import { message } from 'antd';
import { useAuth } from './AuthContext';
import * as notificationApi from '../api/notification';
import type { NotificationDto } from '../api/notification';

interface NotificationContextType {
  notifications: NotificationDto[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  connected: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refresh: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  connected: false,
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notiRes, countRes] = await Promise.allSettled([
        notificationApi.getMyNotifications(30),
        notificationApi.getUnreadCount(),
      ]);
      if (notiRes.status === 'fulfilled' && notiRes.value.data) {
        setNotifications(notiRes.value.data);
      }
      if (countRes.status === 'fulfilled' && countRes.value.data) {
        setUnreadCount(countRes.value.data.count);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  }, []);

  // Connect to SignalR
  useEffect(() => {
    if (!isAuthenticated) {
      // Disconnect if logged out
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setConnected(false);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Fetch initial data
    fetchNotifications();

    // Build SignalR connection
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5106').replace(/\/api$/, '');
    const connection = new HubConnectionBuilder()
      .withUrl(`${apiBase}/hubs/notifications`, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('ReceiveNotification', (notification: NotificationDto) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      // Show a toast
      const typeMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
        Info: 'info', Success: 'success', Warning: 'warning', Error: 'error',
      };
      const msgType = typeMap[notification.notificationType] || 'info';
      message[msgType](`${notification.title}: ${notification.content}`);
    });

    connection.onreconnected(() => {
      setConnected(true);
      fetchNotifications();
    });

    connection.onclose(() => setConnected(false));

    connection.start()
      .then(() => setConnected(true))
      .catch(() => setConnected(false));

    connectionRef.current = connection;

    // Poll unread count every 60s as fallback
    const pollInterval = setInterval(() => {
      notificationApi.getUnreadCount()
        .then(res => { if (res.data) setUnreadCount(res.data.count); })
        .catch(() => {});
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      connection.stop();
      connectionRef.current = null;
    };
  }, [isAuthenticated, fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      refresh: fetchNotifications,
      markAsRead: handleMarkAsRead,
      markAllAsRead: handleMarkAllAsRead,
      connected,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
