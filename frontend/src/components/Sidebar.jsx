import React, { useMemo, useCallback, memo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from './Header'; // Your existing Header component

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
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { IconButton, useMediaQuery, Box } from '@mui/material';

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

const Sidebar = memo(({ user, role, userName, notifications, onLogout, toast }) => {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentMenu = useMemo(() => MENU_CONFIG[role] || MENU_CONFIG.Employee, [role]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = useCallback((path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // Sidebar Width logic
  const sidebarWidth = isMobile ? '280px' : isCollapsed ? '80px' : '260px';

  return (
    <Box sx={{ display: 'flex' }}>
      
      {/* FIXED TOP HEADER */}
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: isMobile ? 0 : sidebarWidth, // Header starts after sidebar
          height: '46px',
          bgcolor: 'var(--bg-sidebar)',
          // borderBottom: '1px solid var(--border-subtle)',
          zIndex: 1000,
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          px: 1,
          justifyContent: 'space-between',
          fontSize: '0.6rem'
        }}
      >
        {/* Toggle button shows on mobile OR desktop inside header */}
        <IconButton 
          onClick={() => isMobile ? setMobileOpen(!mobileOpen) : setIsCollapsed(!isCollapsed)} 
          sx={{ color: 'var(--text-primary)' }}
        >
          {isMobile ? <MenuIcon width={26} height={26} /> : isCollapsed ? <ChevronRightIcon width={24} height={24} /> : <ChevronLeftIcon width={24} height={24} />}
        </IconButton>

        <Header user={user} onLogout={onLogout} notifications={notifications} />
      </Box>

      {/* MOBILE OVERLAY */}
      {isMobile && mobileOpen && (
        <Box
          onClick={() => setMobileOpen(false)}
          sx={{
            position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)', zIndex: 1100
          }}
        />
      )}

      {/* SIDEBAR ASIDE */}
      <aside style={{
        position: 'fixed',
        left: isMobile && !mobileOpen ? '-280px' : 0, // Slide out on mobile
        top: 0,
        bottom: 0,
        width: sidebarWidth,
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-secondary)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1200, // Above overlay
        overflowX: 'hidden',
        borderRight: '1px solid var(--border-subtle)',
      }}>
        
        {/* LOGO / BRAND AREA */}
        <div style={{
          padding: '20px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
           <FingerprintIcon sx={{ color: 'var(--accent-strong)', fontSize: 30 }} />
           {!isCollapsed && <span style={{ marginLeft: 10, fontWeight: 700, color: 'var(--text-primary)' }}>CP PORTAL</span>}
        </div>

        {/* NAVIGATION LINKS */}
        <nav style={{ flex: 1, padding: '16px 8px', overflowY: 'auto' }}>
          {currentMenu.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '12px', margin: '4px 0', borderRadius: '10px',
                  textDecoration: 'none',
                  color: active ? 'var(--accent-strong)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: '12px', transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '20px', display: 'flex' }}>{ICONS[item.icon]}</span>
                {!isCollapsed && <span style={{ fontWeight: active ? '600' : '500', fontSize: '14px' }}>{item.text}</span>}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT AT BOTTOM */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '12px', padding: '12px', borderRadius: '10px',
              border: 'none', background: 'transparent', color: '#ef4444',
              cursor: 'pointer'
            }}
          >
            <ExitToAppIcon />
            {!isCollapsed && <span style={{ fontWeight: '600' }}>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT SPACING - This pushes the page content so it doesn't hide under the fixed Header/Sidebar */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        pt: '80px', // Space for Header
        pl: isMobile ? '20px' : `calc(${sidebarWidth} + 20px)`, // Space for Sidebar
        pr: '20px',
        transition: 'padding-left 0.3s ease'
      }}>
        {/* Your Routes/Content go here */}
      </Box>
    </Box>
  );
});

export default Sidebar;