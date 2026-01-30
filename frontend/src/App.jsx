// src/App.jsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { api } from './services/api.service.js';
import { NotificationProvider } from './context/NotificationContext';

// Core components loaded immediately
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import Login from './pages/Login.jsx';

// Lazy load page components for better initial load performance
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'));
const Biometrics = lazy(() => import('./pages/Biometrics.jsx'));
const HRDashboard = lazy(() => import('./pages/HRPanel.jsx'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard.jsx'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard.jsx'));
const UserManagement = lazy(() => import('./pages/UserManagement.jsx'));
const AttendanceOverview = lazy(() => import('./pages/AttendanceOverview.jsx'));
const Shifts = lazy(() => import('./pages/Shifts.jsx'));
const AttendanceSessions = lazy(() => import('./pages/AttendanceSessions.jsx'));
const Departments = lazy(() => import('./pages/Departments.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Config = lazy(() => import('./pages/Config.jsx'));

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

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
      } catch {
        api.logout();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // After login - memoized for stability
  const handleLogin = useCallback(async () => {
    try {
      const userData = await api.getCurrentUser();
      const role = api.getUserRole(userData);
      const name = api.getUserDisplayName(userData);
      setUser({ role, name });
      navigate(role === 'Manager' ? '/manager/dashboard' : '/dashboard', { replace: true });
    } catch {
      notify('Login successful but profile failed to load', 'error');
      api.logout();
    }
  }, [navigate, notify]);

  // Logout handler - memoized
  const handleLogout = useCallback(() => {
    api.logout();
    setUser({ role: null, name: '' });
    navigate('/');
  }, [navigate]);

  // Memoize user object to prevent unnecessary re-renders
  // Must be before early returns to maintain hooks order
  const userObject = useMemo(() => ({ role: user.role, name: user.name }), [user.role, user.name]);

  // Layout styles - memoized
  const layoutStyles = useMemo(() => ({
    container: { display: 'flex', height: '100vh', backgroundColor: 'var(--bg-primary)' },
    content: { flex: 1, display: 'flex', flexDirection: 'column' },
    main: { flex: 1, padding: '24px', overflow: 'auto' }
  }), []);

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
    <NotificationProvider>
      <div style={layoutStyles.container}>
        <Sidebar role={user.role} userName={user.name} onLogout={handleLogout} />
        <div style={layoutStyles.content}>
          <Header user={userObject} onLogout={handleLogout} notifications={notifications} />
          <Toast message={toast.message} type={toast.type} />
          <main style={layoutStyles.main}>
            <Suspense fallback={<PageLoader />}>
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
                    <Route path="/biometrics" element={<Biometrics onNotify={notify} role={user.role} />} />
                    <Route path="/settings" element={<Settings onNotify={notify} />} />
                  </>
                )}
                {/* EMPLOYEE */}
                {user.role === 'Employee' && (
                  <>
                    <Route path="/dashboard" element={<EmployeeDashboard onNotify={notify} />} />
                    <Route path="/attendance" element={<AttendanceOverview role="Employee" onNotify={notify} />} />
                    <Route path="/settings" element={<Settings onNotify={notify} />} />
                    <Route path="/biometrics" element={<Biometrics onNotify={notify} role={user.role} />} />
                  </>
                )}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}

export default App;
