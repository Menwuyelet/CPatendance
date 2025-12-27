import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Avatar } from '@mui/material';
import { Notifications, Logout } from '@mui/icons-material';

const Header = ({ user, onLogout }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = now.toLocaleDateString();
  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        <IconButton aria-label="notifications">
          <Notifications />
        </IconButton>
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
