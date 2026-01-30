// src/components/Sidebar.jsx
import React, { useMemo, useCallback, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Domain as DomainIcon,
  CalendarToday as CalendarTodayIcon,
  Settings as SettingsIcon,
  Groups as GroupsIcon,
  EventNote as EventNoteIcon,
  Schedule as ScheduleIcon,
  ExitToApp as ExitToAppIcon,
  Fingerprint as FingerprintIcon,
} from '@mui/icons-material';

// Menu configuration - defined outside component to prevent recreation
const MENU_CONFIG = {
  Admin: [
    { text: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { text: 'User Management', icon: 'people', path: '/users' },
    { text: 'Departments', icon: 'domain', path: '/companies' },
    { text: 'Attendance', icon: 'calendar', path: '/attendance' },
    { text: 'Shifts', icon: 'schedule', path: '/attendance/shifts' },
    { text: 'Sessions', icon: 'event', path: '/attendance/sessions' },
    { text: 'Biometrics', icon: 'fingerprint', path: '/biometrics' },
    { text: 'Settings', icon: 'settings', path: '/settings' },
  ],
  HR: [
    { text: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { text: 'Employees', icon: 'people', path: '/employees' },
    { text: 'Attendance', icon: 'calendar', path: '/attendance' },
    { text: 'Shifts', icon: 'schedule', path: '/attendance/shifts' },
    { text: 'Sessions', icon: 'event', path: '/attendance/sessions' },
    { text: 'Biometrics', icon: 'fingerprint', path: '/biometrics' },
    { text: 'Settings', icon: 'settings', path: '/settings' },
  ],
  Manager: [
    { text: 'Dashboard', icon: 'dashboard', path: '/manager/dashboard' },
    { text: 'Team', icon: 'groups', path: '/manager/team' },
    { text: 'Attendance', icon: 'calendar', path: '/attendance' },
    { text: 'Shifts', icon: 'schedule', path: '/attendance/shifts' },
    { text: 'Sessions', icon: 'event', path: '/attendance/sessions' },
    { text: 'Biometrics', icon: 'fingerprint', path: '/biometrics' },
    { text: 'Settings', icon: 'settings', path: '/settings' },
  ],
  Employee: [
    { text: 'My Dashboard', icon: 'dashboard', path: '/dashboard' },
    { text: 'My Attendance', icon: 'event', path: '/attendance' },
    { text: 'Biometrics', icon: 'fingerprint', path: '/biometrics' },
    { text: 'Settings', icon: 'settings', path: '/settings' },
  ],
};

// Icon mapping
const ICONS = {
  dashboard: <DashboardIcon />,
  people: <PeopleIcon />,
  domain: <DomainIcon />,
  calendar: <CalendarTodayIcon />,
  settings: <SettingsIcon />,
  groups: <GroupsIcon />,
  event: <EventNoteIcon />,
  schedule: <ScheduleIcon />,
  fingerprint: <FingerprintIcon />,
};

// Styles defined outside component
const styles = {
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '260px',
    backgroundColor: 'var(--bg-sidebar)',
    color: 'var(--text-primary)',
    fontFamily: '"Inter", system-ui, sans-serif',
    boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
    overflowY: 'auto',
  },
  userSection: {
    padding: '1.5rem',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
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
  },
  nav: { flex: 1, padding: '1rem 0.5rem' },
  bottomSection: {
    marginTop: 'auto',
    padding: '1.5rem',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};

const Sidebar = memo(({ role, userName, onLogout }) => {
  const location = useLocation();
  const currentMenu = useMemo(() => MENU_CONFIG[role] || MENU_CONFIG.Employee, [role]);

  const isActive = useCallback((path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // Get link styles based on active state
  const getLinkStyle = useCallback((active) => ({
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
  }), []);

  return (
    <div className="sidebar" style={styles.sidebar}>
      {/* User Profile Section */}
      <div style={styles.userSection}>
        <div style={styles.avatar}>
          {userName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>
            {userName || 'User'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {role?.toLowerCase() || 'employee'}
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={styles.nav}>
        {currentMenu.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={getLinkStyle(active)}
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
              <span style={{ opacity: active ? 1 : 0.7, display: 'flex', alignItems: 'center', fontSize: '20px' }}>
                {ICONS[item.icon]}
              </span>
              <span>{item.text}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div style={styles.bottomSection}>
        <button
          onClick={onLogout}
          type="button"
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

        <div style={{
          padding: '10px',
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: '500',
        }}>
          System: <span style={{ color: '#22c55e' }}>● Online</span>
        </div>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
