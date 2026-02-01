// src/layout/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom'; 
import Sidebar, { LAYOUT } from '../components/Sidebar';
import { Box, useMediaQuery } from '@mui/material';

/**
 * MainLayout - Consistent responsive layout for all pages
 * 
 * Layout Rules:
 * - Fixed gap (px) between sidebar and main content with visible border
 * - Desktop (>1024px): Sidebar always visible, expanded
 * - Tablet (768-1024px): Sidebar collapsible
 * - Mobile (<768px): Sidebar hidden, accessible via menu button
 * 
 * All spacing uses fixed units (px/rem), NOT percentages
 * Gap/border remains static during zoom - only content visibility changes
 */
const MainLayout = ({ user, role, userName, notifications, onLogout }) => {
  // Responsive breakpoints matching Sidebar.jsx
  const isMobile  = useMediaQuery('(max-width: 767px)');
  const isTablet  = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  
  // Sidebar collapsed state - managed here and passed to Sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Force expanded sidebar on desktop (even after tablet collapse)
  useEffect(() => {
    if (isDesktop) {
      setIsCollapsed(false);
    }
  }, [isDesktop]);

  // Calculate fixed left margin for main content
  const getMainMarginLeft = () => {
    if (isMobile) {
      return 0; // No margin — sidebar is drawer on mobile
    }
    
    // Tablet: respect collapsed state
    if (isTablet) {
      return isCollapsed 
        ? LAYOUT.SIDEBAR_COLLAPSED_WIDTH + LAYOUT.CONTENT_GAP
        : LAYOUT.SIDEBAR_WIDTH + LAYOUT.CONTENT_GAP;
    }
    
    // Desktop: always full width sidebar
    return LAYOUT.SIDEBAR_WIDTH + LAYOUT.CONTENT_GAP;
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      overflowX: 'hidden', // Prevent horizontal scroll
    }}>
      {/* Sidebar - controlled collapse state */}
      <Sidebar 
        user={user} 
        role={role} 
        userName={userName} 
        onLogout={onLogout} 
        notifications={notifications}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(prev => !prev)}
      />
      
      {/* Main content area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          width: '100%',
          minWidth: 0,               // Prevents content from forcing width
          overflowX: 'hidden',
          
          // Fixed margin using px — never changes on zoom
          ml: `${getMainMarginLeft()}px`,
          
          // Reserve space for fixed header
          pt: `${LAYOUT.HEADER_HEIGHT}px`,
          
          display: 'flex',
          flexDirection: 'column',
          
          // Smooth transition only on tablet (collapse/expand)
          transition: isTablet ? 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          
          // Visible fixed gap using border (real px gap)
          borderLeft: isMobile 
            ? 'none' 
            : `${LAYOUT.CONTENT_GAP}px solid var(--border-subtle)`,
        }}
      >
        {/* Inner content wrapper with fixed padding */}
        <Box sx={{ 
          p: '24px',                 // Consistent fixed padding
          width: '100%',
          maxWidth: '100%',
          flexGrow: 1,
          overflowY: 'auto',         // Allow vertical scroll if needed
        }}>
          <Outlet /> 
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;