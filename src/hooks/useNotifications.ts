import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade';
  read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

// In-memory notifications store (will be replaced with DB later)
const notificationsStore: Notification[] = [];

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Generate mock notifications for demo
  const generateMockNotifications = useCallback((): Notification[] => {
    return [
      {
        id: '1',
        title: 'New Token Detected',
        message: 'PUMP token passed all risk checks with 85% score',
        type: 'success',
        read: false,
        created_at: new Date(Date.now() - 5 * 60000).toISOString(),
        metadata: { tokenAddress: 'pump123...', riskScore: 85 }
      },
      {
        id: '2',
        title: 'Trade Executed',
        message: 'Bought 0.5 SOL worth of MEME token',
        type: 'trade',
        read: false,
        created_at: new Date(Date.now() - 15 * 60000).toISOString(),
        metadata: { amount: 0.5, token: 'MEME' }
      },
      {
        id: '3',
        title: 'Price Alert',
        message: 'BONK increased 25% in the last hour',
        type: 'info',
        read: true,
        created_at: new Date(Date.now() - 60 * 60000).toISOString(),
      },
      {
        id: '4',
        title: 'Liquidity Warning',
        message: 'Low liquidity detected on SCAM token',
        type: 'warning',
        read: true,
        created_at: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      },
      {
        id: '5',
        title: 'Bot Activated',
        message: 'Liquidity bot is now running with your settings',
        type: 'success',
        read: true,
        created_at: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
      },
    ];
  }, []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // For now, use mock data - can be replaced with DB later
      const mockNotifications = generateMockNotifications();
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [generateMockNotifications]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    return newNotification;
  }, []);

  // Delete a notification
  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    addNotification,
    deleteNotification,
    clearAll,
    refresh: loadNotifications,
  };
}
