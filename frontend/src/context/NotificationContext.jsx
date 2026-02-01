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
        key={snackMessage}
        open={snackOpen}
        autoHideDuration={6000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbar-root': { position: 'fixed', zIndex: 9999, bottom: '24px', left: '50%', transform: 'translateX(-50%)' } }}
      >
        <Alert 
          onClose={handleSnackClose} 
          severity={snackSeverity} 
          variant="outlined"
          sx={{ 
            width: '100%',
            minWidth: '300px',
            maxWidth: '500px',
            boxShadow: 6,
            fontWeight: 'bold',
            fontSize: '15px',
            bgcolor: '#fff',
            color: snackSeverity === 'success' ? '#2e7d32' : snackSeverity === 'error' ? '#d32f2f' : snackSeverity === 'warning' ? '#ed6c02' : '#0288d1',
            '& .MuiAlert-message': {
              fontWeight: 'bold',
              color: snackSeverity === 'success' ? '#2e7d32' : snackSeverity === 'error' ? '#d32f2f' : snackSeverity === 'warning' ? '#ed6c02' : '#0288d1',
            },
            '& .MuiAlert-icon': {
              color: snackSeverity === 'success' ? '#2e7d32' : snackSeverity === 'error' ? '#d32f2f' : snackSeverity === 'warning' ? '#ed6c02' : '#0288d1',
            },
          }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
