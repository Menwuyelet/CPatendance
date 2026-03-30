import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { api } from './services/api.service.js';
import { NotificationProvider, useNotifications } from './context/NotificationContext';

// Core components loaded immediately
import Sidebar from './components/Sidebar.jsx';
// import Header from './components/Header.jsx';
import MainLayout from './layout/MainLayout.jsx';
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
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Config = lazy(() => import('./pages/Config.jsx'));

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ marginTop: '16px', color: '#64748b' }}>Loading...</p>
    </div>
  </div>
);

const normalizeRole = (value) => String(value || '').trim().replace(/[\s_-]/g, '').toUpperCase();

const resolveRole = (userData) => {
  const rawRoles = userData?.roles || userData?.user?.roles || [];
  const normalizedRoles = rawRoles
    .map((roleItem) => (typeof roleItem === 'string' ? roleItem : roleItem?.name))
    .map(normalizeRole)
    .filter(Boolean);

  if (normalizedRoles.includes('ADMIN')) return 'ADMIN';
  if (normalizedRoles.includes('MANAGER')) return 'MANAGER';

  const fallbackRole = normalizeRole(api.getUserRole(userData));
  if (fallbackRole === 'ADMIN' || fallbackRole === 'MANAGER') return fallbackRole;

  return null;
};

const getDashboardPathByRole = (role) => (role === 'MANAGER' ? '/manager/dashboard' : '/dashboard');

const isSafeRedirectPath = (path) => typeof path === 'string' && path.startsWith('/');

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ role: null, name: '' });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]); // recent notifications for header
  const { addNotification } = useNotifications();

  const notify = useCallback((message, type = 'success') => {
    if (!message) return;
    addNotification(message, type);
    setNotifications((prev) => [
      { id: Date.now(), message, type, time: new Date().toISOString() },
      ...prev,
    ].slice(0, 20));
  }, [addNotification]);

  // Check auth on load/refresh
  useEffect(() => {
    const checkAuth = async () => {
      if (!api.isAuthenticated()) {
        setLoading(false);
        return;
      }
      try {
        const userData = await api.getCurrentUser();
        const role = resolveRole(userData);
        const name = api.getUserDisplayName(userData);
        if (!role) {
          api.logout();
          return;
        }
        setUser({ role, name });
        navigate(getDashboardPathByRole(role), { replace: true });
      } catch {
        api.logout();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // After login - memoized for stability
  const handleLogin = useCallback(async (fromPath) => {
    try {
      const userData = await api.getCurrentUser();
      const role = resolveRole(userData);
      const name = api.getUserDisplayName(userData);
      if (!role) {
        notify('This account role is not allowed to access dashboard', 'error');
        api.logout();
        return;
      }
      setUser({ role, name });
      const target = isSafeRedirectPath(fromPath) ? fromPath : getDashboardPathByRole(role);
      navigate(target, { replace: true });
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
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* PUBLIC */}
        <Route
          path="/"
          element={<Login onLogin={handleLogin} onNotify={notify} />}
        />
        {/* PROTECTED */}
        <Route
          element={
            <MainLayout
              user={userObject}
              role={user.role}
              userName={user.name}
              notifications={notifications}
              onLogout={handleLogout}
            />
          }
        >
          {/* ADMIN */}
          {user.role === 'ADMIN' && (
            <>
              <Route path="/dashboard" element={<AdminPanel onNotify={notify} />} />
              <Route path="/biometrics" element={<Biometrics onNotify={notify} role="ADMIN" />} />
              <Route path="/reports" element={<Reports onNotify={notify} />} />
              <Route path="/config" element={<Config onNotify={notify} />} />
              <Route path="/users" element={<UserManagement scope="admin" onNotify={notify} />} />
              <Route path="/companies" element={<Departments onNotify={notify} />} />
              <Route path="/attendance" element={<AttendanceOverview role="ADMIN" onNotify={notify} />} />
              <Route path="/attendance/shifts" element={<Shifts role="ADMIN" onNotify={notify} />} />
              <Route path="/attendance/sessions" element={<AttendanceSessions role="ADMIN" onNotify={notify} />} />
              <Route path="/settings" element={<Settings onNotify={notify} />} />
              <Route path="/profile" element={<Profile onNotify={notify} />} />
            </>
          )}

          {/* MANAGER */}
          {user.role === 'MANAGER' && (
            <>
              <Route path="/dashboard" element={<ManagerDashboard onNotify={notify} />} />
              <Route path="/manager/dashboard" element={<ManagerDashboard onNotify={notify} />} />
              <Route path="/employees" element={<UserManagement scope="manager" onNotify={notify} />} />
              <Route path="/manager/employees" element={<UserManagement scope="manager" onNotify={notify} />} />
              <Route path="/companies" element={<Departments onNotify={notify} />} />
              <Route path="/manager/companies" element={<Departments onNotify={notify} />} />
              <Route path="/attendance" element={<AttendanceOverview role="MANAGER" onNotify={notify} />} />
              <Route path="/attendance/shifts" element={<Shifts role="MANAGER" onNotify={notify} />} />
              <Route path="/attendance/sessions" element={<AttendanceSessions role="MANAGER" onNotify={notify} />} />
              <Route path="/biometrics" element={<Biometrics onNotify={notify} role="MANAGER" />} />
              <Route path="/settings" element={<Settings onNotify={notify} />} />
              <Route path="/profile" element={<Profile onNotify={notify} />} />
              <Route path="/reports" element={<Reports onNotify={notify} />} />
              <Route path="/manager" element={<Navigate to="/manager/dashboard" replace />} />
            </>
          )}

          {/* MANAGER */}
          {/* {user.role === 'MANAGER' && (
            <>
              <Route path="/manager" element={<Navigate to="/manager/dashboard" replace />} />
              <Route path="/attendance" element={<AttendanceOverview role="MANAGER" onNotify={notify} />} />
              <Route path="/attendance/shifts" element={<Shifts role="MANAGER" onNotify={notify} />} />
              <Route path="/attendance/sessions" element={<AttendanceSessions role="MANAGER" onNotify={notify} />} />
              <Route path="/biometrics" element={<Biometrics onNotify={notify} role="MANAGER" />} />
              <Route path="/settings" element={<Settings onNotify={notify} />} />
            </>
          )} */}

          {/* EMPLOYEE */}
          {/* {user.role === 'Employee' && (
            <>
              <Route path="/dashboard" element={<EmployeeDashboard onNotify={notify} />} />
              <Route path="/attendance" element={<AttendanceOverview role="Employee" onNotify={notify} />} />
              <Route path="/settings" element={<Settings onNotify={notify} />} />
              <Route path="/biometrics" element={<Biometrics onNotify={notify} role="Employee" />} />
              <Route path="/reports" element={<Reports onNotify={notify} />} />
            </>
          )} */}
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  </NotificationProvider>
);


}

export default App;
