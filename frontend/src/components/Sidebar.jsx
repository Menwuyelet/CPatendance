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

// Fixed layout constants (px/rem) - DO NOT use percentages
const LAYOUT = {
  SIDEBAR_WIDTH: 260,           // px - expanded sidebar
  SIDEBAR_COLLAPSED_WIDTH: 80,  // px - collapsed sidebar (tablet)
  SIDEBAR_MOBILE_WIDTH: 280,    // px - mobile drawer width
  HEADER_HEIGHT: 56,            // px - header height
  CONTENT_GAP: 1,               // px - fixed gap/border between sidebar and content
};

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

const Sidebar = memo(({ 
  user, 
  role, 
  userName, 
  notifications, 
  onLogout, 
  toast,
  // Controlled props from MainLayout (optional - for state sync)
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const location = useLocation();
  
  // Responsive breakpoints:
  // Mobile: < 768px (sidebar hidden, menu button)
  // Tablet: 768px - 1024px (sidebar collapsible)
  // Desktop: > 1024px (sidebar always visible)
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  
  // Internal collapsed state (fallback if not controlled)
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  // Mobile drawer state (always internal)
  const [mobileOpen, setMobileOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  const currentMenu = useMemo(() => MENU_CONFIG[role] || MENU_CONFIG.Employee, [role]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = useCallback((path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // Calculate sidebar width based on device and state
  const getSidebarWidth = () => {
    if (isMobile) return LAYOUT.SIDEBAR_MOBILE_WIDTH;
    if (isTablet && isCollapsed) return LAYOUT.SIDEBAR_COLLAPSED_WIDTH;
    if (isTablet) return LAYOUT.SIDEBAR_WIDTH;
    return LAYOUT.SIDEBAR_WIDTH; // Desktop always expanded
  };

  const sidebarWidth = getSidebarWidth();
  const showCollapseToggle = isTablet; // Only show collapse button on tablet
  const showMobileMenu = isMobile; // Only show menu button on mobile

  // Determine if sidebar content should show text labels
  const showLabels = !(isTablet && isCollapsed);

  return (
    <Box>
      
      {/* FIXED TOP HEADER */}
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          // Fixed positioning: sidebar width + gap (in px)
          left: isMobile ? 0 : `${sidebarWidth + LAYOUT.CONTENT_GAP}px`,
          height: `${LAYOUT.HEADER_HEIGHT}px`,
          bgcolor: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border-subtle)',
          zIndex: 1000,
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          px: '16px', // Fixed padding in px
          justifyContent: 'space-between',
        }}
      >
        {/* Mobile: Menu button | Tablet: Collapse toggle | Desktop: nothing */}
        {showMobileMenu && (
          <IconButton 
            onClick={() => setMobileOpen(!mobileOpen)} 
            sx={{ color: 'var(--text-primary)' }}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
        )}
        {showCollapseToggle && (
          <IconButton 
            onClick={handleToggleCollapse} 
            sx={{ color: 'var(--text-primary)' }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
        {/* Spacer for desktop when no toggle button */}
        {isDesktop && <Box sx={{ width: '40px' }} />}

        <Header user={user} onLogout={onLogout} notifications={notifications} />
      </Box>

      {/* MOBILE OVERLAY - only on mobile when drawer is open */}
      {isMobile && mobileOpen && (
        <Box
          onClick={() => setMobileOpen(false)}
          sx={{
            position: 'fixed', 
            inset: 0, 
            bgcolor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)', 
            zIndex: 1100
          }}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside style={{
        position: 'fixed',
        // Mobile: slide in/out | Tablet/Desktop: always at left:0
        left: isMobile && !mobileOpen ? `-${LAYOUT.SIDEBAR_MOBILE_WIDTH}px` : 0,
        top: 0,
        bottom: 0,
        width: `${sidebarWidth}px`,
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-secondary)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1200,
        overflowX: 'hidden',
        // Fixed border (visible gap between sidebar and content)
        borderRight: `${LAYOUT.CONTENT_GAP}px solid var(--border-subtle)`,
      }}>
        
        {/* LOGO / BRAND AREA */}
        <div style={{
          padding: '20px',
          height: `${LAYOUT.HEADER_HEIGHT}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: showLabels ? 'flex-start' : 'center',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
           <FingerprintIcon sx={{ color: 'var(--accent-strong)', fontSize: 30 }} />
           {showLabels && <span style={{ marginLeft: '10px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>CP PORTAL</span>}
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
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '12px', 
                  margin: '4px 0', 
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: active ? 'var(--accent-strong)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                  justifyContent: showLabels ? 'flex-start' : 'center',
                  gap: '12px', 
                  transition: 'all 0.2s ease',
                }}
                title={!showLabels ? item.text : undefined} // Tooltip when collapsed
              >
                <span style={{ fontSize: '20px', display: 'flex', flexShrink: 0 }}>{ICONS[item.icon]}</span>
                {showLabels && <span style={{ fontWeight: active ? '600' : '500', fontSize: '14px', whiteSpace: 'nowrap' }}>{item.text}</span>}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT AT BOTTOM */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onLogout}
            title={!showLabels ? 'Logout' : undefined}
            style={{
              width: '100%', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: showLabels ? 'flex-start' : 'center',
              gap: '12px', 
              padding: '12px', 
              borderRadius: '10px',
              border: 'none', 
              background: 'transparent', 
              color: '#ef4444',
              cursor: 'pointer'
            }}
          >
            <ExitToAppIcon />
            {showLabels && <span style={{ fontWeight: '600' }}>Logout</span>}
          </button>
        </div>
      </aside>
    </Box>
  );
});

// Export layout constants for use in other components
export { LAYOUT };

export default Sidebar;