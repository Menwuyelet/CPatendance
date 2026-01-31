import React from 'react';
import { Outlet } from 'react-router-dom'; 
import Sidebar from '../components/Sidebar';
import { Box } from '@mui/material';

const MainLayout = ({ user, role, userName, notifications, onLogout }) => {
  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar user={user} role={role} userName={userName} onLogout={onLogout} />
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          width: '100%', 
          minWidth: 0, // Prevents children from pushing the width out
          mt: '64px',  // Header offset
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* This is the container for EVERY page */}
        <Box sx={{ p: 3 }}>
          <Outlet /> 
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;