// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Snackbar, Alert } from '@mui/material'; // ← added for visible toasts

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Snackbar state for visible toast
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState('success');

  const addNotification = useCallback((message, severity = 'success') => {
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

    // Show visible Snackbar
    setSnackMessage(message);
    setSnackSeverity(severity);
    setSnackOpen(true);
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

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  }), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll]);

  const handleSnackClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackOpen(false);
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <Snackbar
        open={snackOpen}
        autoHideDuration={6000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ '& .MuiSnackbar-root': { position: 'fixed' } }}
      >
        <Alert 
          onClose={handleSnackClose} 
          severity={snackSeverity} 
          variant="filled"
          sx={{ 
            width: '100%',
            minWidth: '300px',
            maxWidth: '500px',
            boxShadow: 4,
            fontWeight: 'bold',
            fontSize: '14px',
            '& .MuiAlert-message': {
              fontWeight: 'bold',
            },
          }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
