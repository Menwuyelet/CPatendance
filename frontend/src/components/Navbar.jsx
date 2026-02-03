import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge, IconButton } from '@mui/material';
import { Notifications } from '@mui/icons-material';
import { useNotifications } from '../context/NotificationContext';

const Navbar = ({ role, onLogout, theme = 'dark', onToggleTheme }) => {
  const location = useLocation();
  const { unreadCount } = useNotifications() || {};

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-logo">CAMS</span>
        <span className="navbar-title">Attendance Management System</span>
      </div>
      <div className="navbar-right">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        {unreadCount > 0 && (
          <IconButton color="inherit" sx={{ ml: 1 }}>
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
        )}
        {role ? (
          <>
            <span className="navbar-role">Role: {role}</span>
            {location.pathname !== '/login' && (
              <button className="btn btn-secondary" onClick={onLogout}>
                Logout
              </button>
            )}
          </>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;