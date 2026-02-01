// src/components/Header.jsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  AppBar,
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
import { Notifications, Logout, CheckCircle } from '@mui/icons-material';
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

  const handleBellClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
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

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h8" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Attendance Management System
        </Typography>

        <Typography variant="body2" sx={{ mr: 3, minWidth: 140, textAlign: 'right' }}>
          {dateLabel}
          <span style={{ fontSize: '1rem', paddingLeft: 10, fontWeight: 'bold' }}>{timeLabel}</span>
        </Typography>

        <Typography variant="body2" sx={{ mr: 3 }}>
          Role: <strong>{user?.role || 'Unknown'}</strong>
        </Typography>

        {/* Notification Bell */}
        <IconButton onClick={handleBellClick} sx={{ mr: 1 }}>
          <Badge badgeContent={unreadCount} color="error">
            <Notifications />
          </Badge>
        </IconButton>

        {/* Notification Popover */}
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { width: 380, maxHeight: 500, mt: 1 } }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Button size="small" onClick={markAllAsRead} color="primary">
                  Mark all as done
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />

            {notifications.length === 0 ? (
              <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                No notifications yet
              </Typography>
            ) : (
              <List>
                {notifications.map((notif) => (
                  <ListItem
                    key={notif.id}
                    sx={{
                      bgcolor: notif.read ? 'transparent' : 'action.hover',
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
                      }}
                      secondaryTypographyProps={{ variant: 'caption' }}
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

        {/* Logout */}
        <IconButton onClick={onLogout} color="inherit">
          <Logout />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
});

Header.displayName = 'Header';

export default Header;