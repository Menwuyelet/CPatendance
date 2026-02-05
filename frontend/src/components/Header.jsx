// src/components/Header.jsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Popover,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Divider,
} from '@mui/material';
import { Notifications, Logout, CheckCircle, DarkMode, LightMode } from '@mui/icons-material';
import { useNotifications } from '../context/NotificationContext';

const Header = memo(({ user, onLogout }) => {
  // Get notifications from context with safe fallback
  const notificationContext = useNotifications();
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead = () => {},
    markAllAsRead = () => {},
  } = notificationContext || {};

  const [now, setNow] = useState(new Date());
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // Dark mode default to true (dark mode as default)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default to dark mode
    return true;
  });

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleBellClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Memoize date/time formatting
  const dateLabel = useMemo(() => now.toLocaleDateString('en-GB'), [now]);
  const timeLabel = useMemo(() => now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [now]);
  
  // Memoize user initial
  const userInitial = useMemo(() => 
    user?.name?.[0]?.toUpperCase() || user?.role?.[0] || '?'
  , [user?.name, user?.role]);

  // Text color based on theme
  const textColor = darkMode ? '#ffffff' : '#1a1a1a';
  const bgColor = darkMode ? '#0a0a0a' : '#ffffff';
  const secondaryTextColor = darkMode ? '#a0a0a0' : '#666666';

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      width: '100%',
      height: '100%',
    }}>
      <Typography 
        variant="h8" 
        sx={{ 
          flexGrow: 1, 
          fontWeight: 'bold',
          background: darkMode 
            ? 'linear-gradient(45deg, #ffffff 30%, #cc0000 90%)'
            : 'linear-gradient(45deg, #000000 30%, #cc0000 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '1.25rem',
        }}
      >
        Attendance Management System
      </Typography>

      <Typography variant="body2" sx={{ 
        mr: 3, 
        minWidth: 140, 
        textAlign: 'right',
        color: textColor,
        fontWeight: 500,
      }}>
        {dateLabel}
        <span style={{ 
          fontSize: '1rem', 
          paddingLeft: 10, 
          fontWeight: 'bold',
          color: textColor,
        }}>{timeLabel}</span>
      </Typography>

      <Typography variant="body2" sx={{ 
        mr: 3,
        color: textColor,
        fontWeight: 500,
      }}>
        Role: <strong>{user?.role || 'Unknown'}</strong>
      </Typography>

      {/* Notification Bell */}
      <IconButton 
        onClick={handleBellClick} 
        sx={{ 
          mr: 1,
          color: textColor,
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      {/* Dark Mode Toggle */}
      <IconButton 
        onClick={toggleDarkMode} 
        sx={{ 
          mr: 1,
          bgcolor: darkMode ? '#cc0000' : '#f5f5f5',
          color: darkMode ? '#ffffff' : '#000000',
          border: '1px solid',
          borderColor: darkMode ? '#cc0000' : '#ddd',
          '&:hover': { 
            bgcolor: darkMode ? '#990000' : '#e0e0e0',
            borderColor: darkMode ? '#990000' : '#ccc',
          },
          width: 36,
          height: 36,
        }}
        title={darkMode ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
      >
        {darkMode ? <LightMode sx={{ fontSize: 20 }} /> : <DarkMode sx={{ fontSize: 20 }} />}
      </IconButton>

      {/* Notification Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ 
          sx: { 
            width: 380, 
            maxHeight: 500, 
            mt: 1,
            bgcolor: bgColor,
            color: textColor,
          } 
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: textColor }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead} color="primary">
                Mark all as done
              </Button>
            )}
          </Box>
          <Divider sx={{ borderColor: darkMode ? '#2a2a2a' : '#e0e0e0' }} />

          {notifications.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center', color: secondaryTextColor }}>
              No notifications yet
            </Typography>
          ) : (
            <List>
              {notifications.map((notif) => (
                <ListItem
                  key={notif.id}
                  sx={{
                    bgcolor: notif.read ? 'transparent' : darkMode ? 'rgba(102, 126, 234, 0.1)' : 'action.hover',
                    borderRadius: 2,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={notif.message}
                    secondary={`${notif.date} • ${notif.time}`}
                    primaryTypographyProps={{
                      fontWeight: notif.read ? 'normal' : 'bold',
                      variant: 'body2',
                      sx: { color: textColor },
                    }}
                    secondaryTypographyProps={{ 
                      variant: 'caption',
                      sx: { color: secondaryTextColor },
                    }}
                  />
                  {!notif.read && (
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => markAsRead(notif.id)}
                        sx={{
                          bgcolor: 'error.main',
                          color: 'white',
                          width: 36,
                          height: 36,
                          '&:hover': { bgcolor: 'error.dark' },
                        }}
                      >
                        <CheckCircle fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>

      {/* User Avatar */}
      <IconButton sx={{ mx: 1 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 30, height: 30 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {userInitial}
          </Typography>
        </Avatar>
      </IconButton>
    </Box>
  );
});

Header.displayName = 'Header';

export default Header;
