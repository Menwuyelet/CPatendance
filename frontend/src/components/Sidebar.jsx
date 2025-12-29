// src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Material-UI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import DomainIcon from '@mui/icons-material/Domain';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupsIcon from '@mui/icons-material/Groups';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
const Sidebar = ({ role, userName, onLogout }) => {
  const location = useLocation();

  const menuItems = {
    Admin: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'User Management', icon: <PeopleIcon />, path: '/users' },
      { text: 'Departments', icon: <DomainIcon />, path: '/companies' },
  { text: 'Attendance', icon: <CalendarTodayIcon />, path: '/attendance' },
  { text: 'Biometrics', icon: <FingerprintIcon />, path: '/biometrics' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ],
    HR: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Employees', icon: <PeopleIcon />, path: '/employees' },
      { text: 'Attendance', icon: <CalendarTodayIcon />, path: '/attendance' },
      { text: 'Biometrics', icon: <FingerprintIcon />, path: '/biometrics' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ],
    Manager: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/manager/dashboard' },
      { text: 'Team', icon: <GroupsIcon />, path: '/manager/team' },
      { text: 'Biometrics', icon: <FingerprintIcon />, path: '/manager/biometrics' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/manager/settings' },
    ],
    Employee: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'My Attendance', icon: <EventNoteIcon />, path: '/attendance' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ],
  };

  const currentMenu = menuItems[role] || menuItems.Employee;

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div
      className="sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-primary)',
        fontFamily: '"Inter", system-ui, sans-serif',
        boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
        overflowY: 'auto',
      }}
    >
      {/* User Profile Section */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}
        >
          {userName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>
            {userName || 'User'}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              textTransform: 'capitalize',
            }}
          >
            {role?.toLowerCase() || 'employee'}
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: '1rem 0.5rem' }}>
        {currentMenu.map((item) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.text}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                margin: '4px 8px',
                borderRadius: '10px',
                textDecoration: 'none',
                color: active ? 'var(--accent-strong)' : 'var(--text-muted)',
                backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                transition: 'all 0.25s ease',
                fontSize: '14.5px',
                fontWeight: active ? '600' : '500',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <span
                style={{
                  opacity: active ? 1 : 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '20px',
                }}
              >
                {item.icon}
              </span>
              <span>{item.text}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - Only Logout & Status */}
      <div
        style={{
          marginTop: 'auto',
          padding: '1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Logout Button */}
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <ExitToAppIcon style={{ fontSize: '20px' }} />
          <span>Logout</span>
        </button>

        {/* System Status */}
        <div
          style={{
            padding: '10px',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: '500',
          }}
        >
          System: <span style={{ color: '#22c55e' }}>● Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;