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
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  
  // Sidebar collapsed state - managed here and passed to Sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Reset collapsed state when switching to desktop
  useEffect(() => {
    if (isDesktop) {
      setIsCollapsed(false);
    }
  }, [isDesktop]);
  
  // Calculate main content margin based on viewport and sidebar state
  // Uses fixed px values to ensure gap doesn't change on zoom
  const getMainMarginLeft = () => {
    if (isMobile) return 0; // No margin on mobile (sidebar is hidden)
    if (isTablet && isCollapsed) {
      return LAYOUT.SIDEBAR_COLLAPSED_WIDTH + LAYOUT.CONTENT_GAP;
    }
    // Desktop or tablet expanded
    return LAYOUT.SIDEBAR_WIDTH + LAYOUT.CONTENT_GAP;
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      width: '100%', 
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
    }}>
      {/* Sidebar component with controlled collapsed state */}
      <Sidebar 
        user={user} 
        role={role} 
        userName={userName} 
        onLogout={onLogout} 
        notifications={notifications}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      
      {/* Main content area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          width: '100%',
          minWidth: 0, // Prevents children from pushing the width out
          // Fixed margin using px - does not change on zoom
          ml: isMobile ? 0 : `${getMainMarginLeft()}px`,
          // Fixed top padding for header
          pt: `${LAYOUT.HEADER_HEIGHT}px`,
          display: 'flex',
          flexDirection: 'column',
          // Smooth transition when sidebar collapses (tablet only)
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          // Visible left border creates the fixed "gap" effect
          borderLeft: isMobile ? 'none' : `${LAYOUT.CONTENT_GAP}px solid var(--border-subtle)`,
        }}
      >
        {/* Content container with fixed padding (px/rem) */}
        <Box sx={{ 
          p: '24px', // Fixed 24px padding
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}>
          <Outlet /> 
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
