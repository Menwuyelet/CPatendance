// src/App.jsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import Login from './pages/Login.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Biometrics from './pages/Biometrics.jsx';
import HRDashboard from './pages/HRPanel.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import UserManagement from './pages/UserManagement.jsx';
import AttendanceOverview from './pages/AttendanceOverview.jsx';
import Shifts from './pages/Shifts.jsx';
import AttendanceSessions from './pages/AttendanceSessions.jsx';
import Departments from './pages/Departments.jsx';
import Settings from './pages/Settings.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import { api } from './services/api.service.js';
import Reports from './pages/Reports.jsx';
import Config from './pages/Config.jsx';

// ONLY THIS LINE ADDED
import { NotificationProvider } from './context/NotificationContext';

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ role: null, name: '' });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [notifications, setNotifications] = useState([]); // recent notifications for header

  const notify = useCallback((message, type = 'success') => {
    if (!message) return;
    setToast({ message, type });
    // Store last 20 notifications (newest first)
    setNotifications((prev) => [
      { id: Date.now(), message, type, time: new Date().toISOString() },
      ...prev,
    ].slice(0, 20));
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }, []);

  // Check auth on load/refresh
  useEffect(() => {
    const checkAuth = async () => {
      if (!api.isAuthenticated()) {
        setLoading(false);
        return;
      }
      try {
        const userData = await api.getCurrentUser();
        const role = api.getUserRole(userData);
        const name = api.getUserDisplayName(userData);
        setUser({ role, name });
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
      const userData = await api.getCurrentUser();
      const role = api.getUserRole(userData);
      const name = api.getUserDisplayName(userData);
      setUser({ role, name });
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
    // ONLY THIS WRAPPER ADDED
    <NotificationProvider>
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
        <Sidebar role={user.role} userName={user.name} onLogout={handleLogout} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header
            user={{ role: user.role, name: user.name }}
            onLogout={handleLogout}
            notifications={notifications}
          />
          <Toast message={toast.message} type={toast.type} />
          <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
            <Routes>
              {/* ADMIN */}
              {user.role === 'Admin' && (
                <>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<AdminPanel onNotify={notify} />} />
                  <Route path="/biometrics" element={<Biometrics onNotify={notify} role={user.role} />} />
                  <Route path="/reports" element={<Reports onNotify={notify} />} />
                  <Route path="/config" element={<Config onNotify={notify} />} />
                  <Route path="/users" element={<UserManagement scope="admin" onNotify={notify} />} />
                  <Route path="/companies" element={<Departments onNotify={notify} />} />
                  <Route path="/attendance" element={<AttendanceOverview role="Admin" onNotify={notify} />} />
                  <Route path="/attendance/shifts" element={<Shifts role="Admin" onNotify={notify} />} />
                  <Route path="/attendance/sessions" element={<AttendanceSessions role="Admin" onNotify={notify} />} />
                  <Route path="/settings" element={<Settings onNotify={notify} />} />
                </>
              )}
              {/* HR */}
              {user.role === 'HR' && (
                <>
                  <Route path="/dashboard" element={<HRDashboard onNotify={notify} />} />
                  <Route path="/employees" element={<UserManagement scope="hr" onNotify={notify} />} />
                  <Route path="/companies" element={<Departments onNotify={notify} />} />
                  <Route path="/attendance" element={<AttendanceOverview role="HR" onNotify={notify} />} />
                  <Route path="/attendance/shifts" element={<Shifts role="HR" onNotify={notify} />} />
                  <Route path="/attendance/sessions" element={<AttendanceSessions role="HR" onNotify={notify} />} />
                  <Route path="/biometrics" element={<Biometrics onNotify={notify} role={user.role} />} />
                  <Route path="/settings" element={<Settings onNotify={notify} />} />
                </>
              )}
              {/* MANAGER */}
              {user.role === 'Manager' && (
                <>
                  <Route path="/manager/*" element={<ManagerDashboard onNotify={notify} />} />
                  <Route path="/attendance" element={<AttendanceOverview role="Manager" onNotify={notify} />} />
                  <Route path="/attendance/shifts" element={<Shifts role="Manager" onNotify={notify} />} />
                  <Route path="/attendance/sessions" element={<AttendanceSessions role="Manager" onNotify={notify} />} />
                  {/* ADDED: Biometrics for Manager */}
                  <Route path="/biometrics" element={<Biometrics onNotify={notify} role={user.role} />} />
                  {/* ADDED: Settings for Manager (was missing before, but consistent with others) */}
                  <Route path="/settings" element={<Settings onNotify={notify} />} />
                </>
              )}
              {/* EMPLOYEE */}
              {user.role === 'Employee' && (
                <>
                  <Route path="/dashboard" element={<EmployeeDashboard onNotify={notify} />} />
                  <Route path="/attendance" element={<AttendanceOverview role="Employee" onNotify={notify} />} />
                  <Route path="/settings" element={<Settings onNotify={notify} />} />
                  {/* ADDED: Biometrics for Employee */}
                  <Route path="/biometrics" element={<Biometrics onNotify={notify} role={user.role} />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}

export default App;