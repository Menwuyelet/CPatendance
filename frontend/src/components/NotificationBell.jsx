// src/components/NotificationBell.jsx
import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Divider,
} from '@mui/material';
import { Notifications, CheckCircle } from '@mui/icons-material';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleClick} sx={{ color: 'white' }}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 380, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" color="primary" onClick={markAllAsRead}>
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
                    secondary={`${notif.date} ${notif.time}`}
                    primaryTypographyProps={{ fontWeight: notif.read ? 'normal' : 'bold' }}
                  />
                  {!notif.read && (
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => markAsRead(notif.id)}
                        sx={{
                          bgcolor: 'error.main',
                          color: 'white',
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
    </>
  );
};

export default NotificationBell;