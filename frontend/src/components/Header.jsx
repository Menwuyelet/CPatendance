import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Avatar, Badge, Menu, MenuItem, ListItemText } from '@mui/material';
import { Notifications, Logout } from '@mui/icons-material';

const Header = ({ user, onLogout, notifications = [] }) => {
  const [now, setNow] = useState(new Date());
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = now.toLocaleDateString();
  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const recent = notifications.slice(0, 5);

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Attendance Management System
        </Typography>
        <Typography variant="body2" sx={{ mr: 2 }}>
          {dateLabel} {timeLabel}
        </Typography>
        <Typography variant="body2" sx={{ mr: 2 }}>
          Role: {user.role}
        </Typography>
        <IconButton aria-label="notifications" onClick={handleOpenMenu}>
          <Badge color="error" badgeContent={notifications.length} max={9}>
            <Notifications />
          </Badge>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleCloseMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {recent.length === 0 ? (
            <MenuItem disabled>
              <ListItemText primary="No notifications yet" />
            </MenuItem>
          ) : (
            recent.map((n) => (
              <MenuItem key={n.id} onClick={handleCloseMenu}>
                <ListItemText
                  primary={n.message}
                  secondary={new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
              </MenuItem>
            ))
          )}
        </Menu>
        <IconButton aria-label="user profile">
          <Avatar>{user.role?.[0] || '?'}</Avatar>
        </IconButton>
        <IconButton aria-label="logout" onClick={onLogout}>
          <Logout />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
