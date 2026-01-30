// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((message) => {
    setNotifications(prev => {
      // Prevent exact duplicates
      if (prev.some(n => n.message === message && !n.read)) return prev;

      const newNotif = {
        id: Date.now() + Math.random(),
        message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-GB'),
        read: false,
      };

      setUnreadCount(c => c + 1);
      return [newNotif, ...prev].slice(0, 50); // Keep max 50 notifications
    });
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (!notification || notification.read) return prev;
      
      setUnreadCount(c => Math.max(0, c - 1));
      return prev.map(n => n.id === id ? { ...n, read: true } : n);
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  }), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
