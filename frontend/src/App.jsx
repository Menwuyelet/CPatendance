// src/App.jsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import Login from './pages/Login.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import HRDashboard from './pages/HRPanel.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Attendance from './pages/Attendance.jsx';
import Departments from './pages/Departments.jsx';
import Settings from './pages/Settings.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import { api } from './services/api.service.js';

function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState({ role: null, name: '' });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  };

  // Role detection based on `roles` coming from backend (accounts.Role)
  const getRoleFromUserData = (userData) => {
    console.log('User data from backend:', JSON.stringify(userData, null, 2));
    console.log('Raw roles:', userData.roles, 'User roles:', userData.user?.roles);

    // `roles` may be an array of strings (['ADMIN', 'HR', ...])
    // or an array of objects ([{ id, name: 'ADMIN' }, ...])
    // and it can be at root (/accounts/users/me/) or nested under `user` (login response)
    const rawRoles = userData.roles || userData.user?.roles || [];

    const roleNames = rawRoles
      .map((r) => {
        if (typeof r === 'string') {
          return r;
        } else if (r && typeof r === 'object' && r.name) {
          return r.name;
        }
        return null;
      })
      .filter(Boolean)
      .map((r) => r.toUpperCase());
    
    console.log('Processed role names:', roleNames);

    if (roleNames.length > 0) {
      if (roleNames.includes('ADMIN')) {
        console.log(' Role detected from backend: Admin');
        return 'Admin';
      }
      if (roleNames.includes('HR')) {
        console.log(' Role detected from backend: HR');
        return 'HR';
      }
      if (roleNames.includes('MANAGER')) {
        console.log(' Role detected from backend: Manager');
        return 'Manager';
      }
      if (roleNames.includes('EMPLOYEE')) {
        console.log(' Role detected from backend: Employee');
        return 'Employee';
      }
    }

    // Fallback: single `role` string field if backend ever sends it
    if (userData.role) {
      const role = String(userData.role).trim();
      if (['Admin', 'HR', 'Manager', 'Employee'].includes(role)) {
        console.log(' Role detected from single role field:', role);
        return role;
      }
    }

    console.log(' Default role: Employee');
    return 'Employee';
  };

  // Check auth on load/refresh
  useEffect(() => {
    const checkAuth = async () => {
      if (!api.isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const userData = await api.get('/accounts/users/me/');

        const role = getRoleFromUserData(userData);
        const name = userData.full_name || 
                     userData.name || 
                     (userData.first_name && userData.last_name 
                       ? `${userData.first_name} ${userData.last_name}` 
                       : userData.email?.split('@')[0] || 'User');

        setUser({ role, name });
        // Redirect based on role
        if (role === 'Manager') {
          navigate('/manager/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Auth failed:', err);
        api.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // After login
  const handleLogin = async () => {
    try {
      const userData = await api.get('/accounts/users/me/');

      const role = getRoleFromUserData(userData);
      const name = userData.full_name || 
                   userData.name || 
                   (userData.first_name && userData.last_name 
                     ? `${userData.first_name} ${userData.last_name}` 
                     : userData.email?.split('@')[0] || 'User');

      setUser({ role, name });
      // Redirect based on role
      if (role === 'Manager') {
        navigate('/manager/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Profile load failed:', err);
      notify('Login successful but profile failed to load', 'error');
      api.logout();
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser({ role: null, name: '' });
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5',
        fontSize: '28px',
        color: '#333'
      }}>
        Loading CAMS...
      </div>
    );
  }

  if (!user.role) {
    return <Login onLogin={handleLogin} onNotify={notify} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      <Sidebar role={user.role} userName={user.name} onLogout={handleLogout} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header user={{ role: user.role, name: user.name }} onLogout={handleLogout} />
        <Toast message={toast.message} type={toast.type} />

        <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          <Routes>
            {/* ADMIN */}
            {user.role === 'Admin' && (
              <>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<AdminPanel onNotify={notify} />} />
                <Route path="/users" element={<UserManagement scope="admin" onNotify={notify} />} />
                <Route path="/companies" element={<Departments onNotify={notify} />} />
                <Route path="/attendance" element={<Attendance role="Admin" onNotify={notify} />} />
                <Route path="/settings" element={<Settings onNotify={notify} />} />
              </>
            )}

            {/* HR */}
            {user.role === 'HR' && (
              <>
                <Route path="/dashboard" element={<HRDashboard />} />
                <Route path="/employees" element={<UserManagement scope="hr" onNotify={notify} />} />
                <Route path="/companies" element={<Departments onNotify={notify} />} />
                <Route path="/attendance" element={<Attendance role="HR" onNotify={notify} />} />
                <Route path="/settings" element={<Settings onNotify={notify} />} />
              </>
            )}

            {/* MANAGER */}
            {user.role === 'Manager' && (
              <Route path="/manager/*" element={<ManagerDashboard />} />
            )}

            {/* EMPLOYEE */}
            {user.role === 'Employee' && (
              <>
                <Route path="/dashboard" element={<EmployeeDashboard />} />
                <Route path="/attendance" element={<Attendance role="Employee" onNotify={notify} />} />
                <Route path="/settings" element={<Settings onNotify={notify} />} />
              </>
            )}

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;