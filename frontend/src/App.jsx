import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import HRDashboard from './pages/HRPanel.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import Biometrics from './pages/Biometrics.jsx';
import PolicyConfig from './pages/PolicyConfig.jsx';
import Reports from './pages/Reports.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Attendance from './pages/Attendance.jsx';
import LeaveRequest from './pages/LeaveRequest.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';

function App() {
  const [user, setUser] = useState({ role: null }); // null = not logged in

  // Simple login simulation (replace with real auth later)
  const login = (role) => setUser({ role });

  if (!user.role) {
    return <Login onLogin={login} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      <Sidebar role={user.role} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header user={user} onLogout={() => setUser({ role: null })} />
        <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          <Routes>
            {/* Admin routes */}
            {user.role === 'Admin' && (
              <>
                <Route path="/dashboard" element={<AdminPanel />} />
                <Route
                  path="/users"
                  element={<UserManagement scope="admin" />}
                />
                <Route path="/config" element={<PolicyConfig />} />
                <Route
                  path="/attendance"
                  element={<Attendance role="Admin" />}
                />
                <Route path="/biometrics" element={<Biometrics />} />
                <Route
                  path="/reports"
                  element={<Reports scope="system" />}
                />
              </>
            )}

            {/* HR routes */}
            {user.role === 'HR' && (
              <>
                <Route path="/dashboard" element={<HRDashboard />} />
                <Route
                  path="/employees"
                  element={<UserManagement scope="hr" />}
                />
                <Route
                  path="/attendance"
                  element={<Attendance role="HR" />}
                />
                <Route
                  path="/leaves"
                  element={<LeaveRequest role="HR" />}
                />
                <Route
                  path="/reports"
                  element={<Reports scope="hr" />}
                />
              </>
            )}

            {/* Manager routes (keep nested) */}
            {user.role === 'Manager' && (
              <Route path="/*" element={<ManagerDashboard />} />
            )}

            {/* Employee routes */}
            {user.role === 'Employee' && (
              <>
                <Route path="/dashboard" element={<EmployeeDashboard />} />
                <Route
                  path="/attendance"
                  element={<Attendance role="Employee" />}
                />
                <Route
                  path="/leaves"
                  element={<LeaveRequest role="Employee" />}
                />
                <Route
                  path="/reports"
                  element={<Reports scope="personal" />}
                />
              </>
            )}

            {/* Fallback: redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
