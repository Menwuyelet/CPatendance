import React from 'react';
import { Outlet } from 'react-router-dom'; 
import Sidebar from '../components/Sidebar';

const MainLayout = ({ user, role, userName, notifications, onLogout }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* The Sidebar component we built previously */}
      <Sidebar 
        user={user} 
        role={role} 
        userName={userName} 
        notifications={notifications} 
        onLogout={onLogout} 
      />

      {/* This is where the page content lives */}
      <main style={{ 
        flexGrow: 1, 
        padding: '24px',
        marginTop: '64px', // Matches Header height
        transition: 'margin-left 0.3s ease',
        width: '100%',
        backgroundColor: 'var(--bg-main)', // Use your main background color
        minHeight: 'calc(100vh - 64px)',
        overflowX: 'hidden'
      }}>
        <Outlet /> 
      </main>
    </div>
  );
};

export default MainLayout;