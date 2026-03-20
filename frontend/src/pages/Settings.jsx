// src/pages/Settings.jsx
import React, { useState, useEffect, useContext } from 'react';
import { api } from '../services/api.service.js';
import { ThemeContext } from '../index.jsx';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Stack,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Avatar,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Person,
  Email,
  Badge,
  Lock,
  Save,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  Security,
  DarkMode,
  LightMode,
  Notifications,
  NotificationsOff,
  Phone,
  Timer,
  History,
  VerifiedUser,
  ExitToApp,
  Computer,
  Brightness4,
  Brightness7,
  AutoMode,
  WbSunny,
} from '@mui/icons-material';

// Dashboard Layout
const DashboardLayout = ({ children, title, breadcrumbs = [], actions, isMobile }) => (
  <Box sx={{ width: '100%', maxWidth: '1320px', mx: 'auto', px: { xs: 0.5, sm: 1 } }}>
    <Box sx={{ mb: { xs: 2.5, sm: 4 } }}>
      <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {breadcrumbs.length > 0 && (
          <>
            <Typography color="text.secondary">/</Typography>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <Typography color={idx === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}>
                  {crumb.label}
                </Typography>
                {idx < breadcrumbs.length - 1 && <Typography color="text.secondary">/</Typography>}
              </React.Fragment>
            ))}
          </>
        )}
      </Box>
      {actions && <Box sx={{ mt: 2 }}>{actions}</Box>}
    </Box>
    {children}
  </Box>
);

const Settings = ({ role, onNotify }) => {
  // Use ThemeContext for consistent theme management
  const { mode, toggleTheme } = useContext(ThemeContext);
  const isDarkMode = mode === 'dark';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  
  // Theme options
  const themes = [
    { id: 'light', name: 'Light', icon: <Brightness7 /> },
    { id: 'dark', name: 'Dark', icon: <Brightness4 /> },
  ];
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    leaveRequests: true,
    attendanceAlerts: true,
    weeklyReports: false,
  });
  
  // Session management state
  const [activeSessions, setActiveSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  
  // Activity log state
  const [activityLog, setActivityLog] = useState([]);
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    // Load all data in parallel for better performance
    Promise.all([
      loadUserData(),
      loadDepartments(),
      loadNotificationPrefs(),
      loadSessions(),
      loadActivityLog(),
    ]).catch(err => console.error('Failed to load settings data:', err));
  }, []);

  const loadDepartments = async () => {
    // Only HR, Admin, and Manager roles need departments
    if (!['HR', 'Admin', 'Manager'].includes(role)) {
      return;
    }
    try {
      const res = await api.get('/employees/departments/').catch(() => ({ results: [] }));
      const list = Array.isArray(res) ? res : res?.results || [];
      setDepartments(list);
    } catch {
      // Silently handle permission errors
    }
  };

  const loadNotificationPrefs = () => {
    const saved = localStorage.getItem('notificationPrefs');
    if (saved) {
      setNotificationPrefs(JSON.parse(saved));
    }
  };
  
  const loadSessions = () => {
    // Simulated active sessions
    const sessions = [
      { id: 1, device: 'Chrome on Windows', location: 'Addis Ababa, Ethiopia', lastActive: 'Now', current: true },
      { id: 2, device: 'Safari on iPhone', location: 'Addis Ababa, Ethiopia', lastActive: '2 hours ago', current: false },
    ];
    setActiveSessions(sessions);
  };
  
  const loadActivityLog = () => {
    // Simulated activity log
    const activities = [
      { id: 1, action: 'Login', device: 'Chrome on Windows', location: 'Addis Ababa, Ethiopia', time: new Date().toISOString() },
      { id: 2, action: 'Password Change', device: 'Chrome on Windows', location: 'Addis Ababa, Ethiopia', time: new Date(Date.now() - 86400000).toISOString() },
      { id: 3, action: 'Profile Update', device: 'Safari on iPhone', location: 'Addis Ababa, Ethiopia', time: new Date(Date.now() - 172800000).toISOString() },
    ];
    setActivityLog(activities);
  };
  
  const loadUserData = async () => {
    setLoading(true);
    setError('');
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Unable to load user data:', err);
      setError('Unable to load user data.');
      onNotify?.('Failed to fetch user data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.updateUser(user.id, { email: user.email });
      setSuccess('Settings saved successfully.');
      onNotify?.('Settings saved successfully.', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save settings.');
      onNotify?.(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEmployeeSave = async () => {
    if (!user?.employee) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const employeeData = {
        full_name: user.employee.full_name,
        employee_code: user.employee.employee_code,
        department: user.employee.department?.id || null,
      };
      await api.put(`/employees/employees/${user.employee.id}/`, employeeData);
      setSuccess('Employee information saved successfully.');
      onNotify?.('Employee information saved successfully.', 'success');
    } catch (err) {
      console.error('Failed to save employee information:', err);
      setError(err.message || 'Failed to save employee information.');
      onNotify?.(err.message || 'Failed to save employee information.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      localStorage.setItem('notificationPrefs', JSON.stringify(notificationPrefs));
      setSuccess('Notification preferences saved successfully.');
      onNotify?.('Notification preferences saved.', 'success');
    } catch (err) {
      setError('Failed to save notification preferences.');
      onNotify?.('Failed to save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handle2FAToggle = async () => {
    try {
      if (twoFactorEnabled) {
        setTwoFactorEnabled(false);
        onNotify?.('Two-factor authentication disabled.', 'success');
      } else {
        setTwoFactorEnabled(true);
        setShow2FASetup(true);
        onNotify?.('Two-factor authentication enabled.', 'success');
      }
    } catch (err) {
      setError('Failed to update 2FA settings.');
      onNotify?.('Failed to update 2FA.', 'error');
    }
  };

  const handleLogoutSession = (sessionId) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    onNotify?.('Session terminated successfully.', 'success');
  };

  const handleLogoutAll = () => {
    setActiveSessions(prev => prev.filter(s => s.current));
    onNotify?.('All other sessions logged out.', 'success');
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    try {
      await api.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onNotify?.('Password changed successfully.', 'success');
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordError(err.message || 'Failed to change password.');
      onNotify?.(err.message || 'Failed to change password.', 'error');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Account Settings" isMobile={isMobile}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Account Settings"
      breadcrumbs={[{ label: 'Settings' }]}
      isMobile={isMobile}
    >
      {error && !user && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Notification Preferences Card */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  {notificationPrefs.emailNotifications ? <Notifications fontSize="large" /> : <NotificationsOff fontSize="large" />}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">Notification Preferences</Typography>
                  <Typography color="text.secondary">Manage your notification settings</Typography>
                </Box>
              </Stack>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: { xs: 1.25, sm: 0 }, p: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'grey.50', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Email />
                    <Box>
                      <Typography fontWeight="medium">Email Notifications</Typography>
                      <Typography variant="body2" color="text.secondary">Receive updates via email</Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={notificationPrefs.emailNotifications}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    color="primary"
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: { xs: 1.25, sm: 0 }, p: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'grey.50', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Timer />
                    <Box>
                      <Typography fontWeight="medium">Attendance Alerts</Typography>
                      <Typography variant="body2" color="text.secondary">Get notified about attendance issues</Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={notificationPrefs.attendanceAlerts}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, attendanceAlerts: e.target.checked }))}
                    color="primary"
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: { xs: 1.25, sm: 0 }, p: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'grey.50', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <History />
                    <Box>
                      <Typography fontWeight="medium">Weekly Reports</Typography>
                      <Typography variant="body2" color="text.secondary">Receive weekly attendance summaries</Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={notificationPrefs.weeklyReports}
                    onChange={(e) => setNotificationPrefs(prev => ({ ...prev, weeklyReports: e.target.checked }))}
                    color="primary"
                  />
                </Box>
              </Stack>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  onClick={handleNotificationSave}
                  disabled={saving}
                  fullWidth={isMobile}
                >
                  Save Preferences
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Session Management Card */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <Computer fontSize="large" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="bold">Active Sessions</Typography>
                  <Typography color="text.secondary">Manage your active sessions</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowSessions(!showSessions)}
                  fullWidth={isMobile}
                >
                  {showSessions ? 'Hide' : 'View'}
                </Button>
              </Stack>

              {showSessions && (
                <Stack spacing={2}>
                  {activeSessions.map(session => (
                    <Box key={session.id} sx={{ p: 2, bgcolor: session.current ? 'primary.light' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'grey.50'), borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}>
                        <Box>
                          <Typography fontWeight="medium">{session.device}</Typography>
                          <Typography variant="body2" color="text.secondary">{session.location}</Typography>
                          <Typography variant="body2" color={session.current ? 'primary.main' : 'text.secondary'}>
                            {session.current ? '✓ Current session' : `Last active: ${session.lastActive}`}
                          </Typography>
                        </Box>
                        {!session.current && (
                          <IconButton
                            color="error"
                            onClick={() => handleLogoutSession(session.id)}
                            title="Terminate session"
                          >
                            <ExitToApp />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  ))}
                  
                  {activeSessions.length > 1 && (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<ExitToApp />}
                      onClick={handleLogoutAll}
                      fullWidth
                    >
                      Logout All Other Sessions
                    </Button>
                  )}
                </Stack>
              )}

              {!showSessions && (
                <Typography color="text.secondary">Click "View" to see your active sessions across devices.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Security Card - 2FA */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: twoFactorEnabled ? 'success.main' : 'warning.main', width: 56, height: 56 }}>
                  <VerifiedUser fontSize="large" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="bold">Two-Factor Authentication</Typography>
                  <Typography color="text.secondary">Add an extra layer of security</Typography>
                </Box>
                <Switch
                  checked={twoFactorEnabled}
                  onChange={handle2FAToggle}
                  color="success"
                />
              </Stack>

              {twoFactorEnabled && (
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle color="success" />
                    <Typography fontWeight="medium">Two-factor authentication is enabled</Typography>
                  </Box>
                </Box>
              )}

              {show2FASetup && !twoFactorEnabled && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Setup instructions will be sent to your email.
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary">
                Protect your account by enabling two-factor authentication. You'll need to enter a code from your authenticator app when signing in.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity Log Card */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                  <History fontSize="large" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="bold">Activity Log</Typography>
                  <Typography color="text.secondary">Recent account activity</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowActivityLog(!showActivityLog)}
                  fullWidth={isMobile}
                >
                  {showActivityLog ? 'Hide' : 'View'}
                </Button>
              </Stack>

              {showActivityLog && (
                <Stack spacing={1}>
                  {activityLog.map(activity => (
                    <Box key={activity.id} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, p: 1.5, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'grey.50', borderRadius: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight="medium">{activity.action}</Typography>
                        <Typography variant="body2" color="text.secondary">{activity.device}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(activity.time).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}

              {!showActivityLog && (
                <Typography color="text.secondary">Click "View" to see your recent account activity.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Appearance */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 2, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={2}>
                <Avatar sx={{ bgcolor: isDarkMode ? 'grey.700' : 'primary.main', width: 48, height: 48 }}>
                  {isDarkMode ? <Brightness4 /> : <Brightness7 />}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="600">Appearance</Typography>
                  <Typography variant="body2" color="text.secondary">Theme settings</Typography>
                </Box>
              </Stack>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                <Button
                  variant={!isDarkMode ? 'contained' : 'outlined'}
                  onClick={() => isDarkMode && toggleTheme()}
                  startIcon={<Brightness7 />}
                  sx={{ flex: 1, py: 1.5, borderRadius: 2 }}
                >
                  Light
                </Button>
                <Button
                  variant={isDarkMode ? 'contained' : 'outlined'}
                  onClick={() => !isDarkMode && toggleTheme()}
                  startIcon={<Brightness4 />}
                  sx={{ flex: 1, py: 1.5, borderRadius: 2 }}
                >
                  Dark
                </Button>
              </Box>

              <Box sx={{ mt: 2, p: 1.5, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'grey.50', borderRadius: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: { xs: 1, sm: 0 } }}>
                <Typography variant="body2" color="text.secondary">
                  Active: {isDarkMode ? 'Dark Mode 🌙' : 'Light Mode ☀️'}
                </Typography>
                <Chip 
                  label={isDarkMode ? '🌙 Dark' : '☀️ Light'}
                  size="small"
                  sx={{ 
                    bgcolor: isDarkMode ? 'grey.700' : 'primary.light',
                    color: isDarkMode ? '#fff' : 'primary.main',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* User Information Card */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <Person fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">User Information</Typography>
                  <Typography color="text.secondary">Manage your personal details</Typography>
                </Box>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={user?.full_name || ''}
                    disabled
                    helperText="Full name cannot be changed"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    value={user?.email || ''}
                    onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Email /></InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Role"
                    value={role || ''}
                    disabled
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Badge /></InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  onClick={handleSave}
                  disabled={saving}
                  fullWidth={isMobile}
                >
                  {saving ? 'Saving...' : 'Save User Changes'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Employee Information Card */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                  <Badge fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">Employee Information</Typography>
                  <Typography color="text.secondary">Update your employee profile</Typography>
                </Box>
              </Stack>

              {user?.employee ? (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Employee Code"
                      value={user.employee.employee_code || ''}
                      onChange={(e) => setUser(prev => ({
                        ...prev,
                        employee: { ...prev.employee, employee_code: e.target.value }
                      }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={user.employee.department?.id || ''}
                        onChange={(e) => setUser(prev => ({
                          ...prev,
                          employee: { ...prev.employee, department: { id: e.target.value } }
                        }))}
                        label="Department"
                      >
                        <MenuItem value="">Select Department</MenuItem>
                        {departments.map(dept => (
                          <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Status"
                      value={user.employee.is_active ? 'Active' : 'Inactive'}
                      disabled
                    />
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">No employee profile associated with this account.</Alert>
              )}

              {user?.employee && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                    onClick={handleEmployeeSave}
                    disabled={saving}
                    fullWidth={isMobile}
                  >
                    {saving ? 'Saving...' : 'Save Employee Info'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Password Change Card */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <Lock fontSize="large" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="bold">Change Password</Typography>
                  <Typography color="text.secondary">Update your password for security</Typography>
                </Box>
                <Button
                  variant={showPasswordForm ? "outlined" : "contained"}
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  fullWidth={isMobile}
                >
                  {showPasswordForm ? 'Hide' : 'Change Password'}
                </Button>
              </Stack>

              {showPasswordForm && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Current Password"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))} edge="end">
                                {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="New Password"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        helperText="At least 8 characters"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))} edge="end">
                                {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))} edge="end">
                                {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>

                  {passwordError && (
                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => setPasswordError('')}>
                      {passwordError}
                    </Alert>
                  )}

                  {passwordSuccess && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Password changed successfully!
                    </Alert>
                  )}

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<Lock />}
                      onClick={handlePasswordChange}
                      fullWidth={isMobile}
                    >
                      Update Password
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Account Permissions Card */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <Security fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">Account Permissions</Typography>
                  <Typography color="text.secondary">Your access levels and permissions</Typography>
                </Box>
              </Stack>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Current Role</Typography>
                    <Chip 
                      label={role} 
                      color={role === 'Admin' ? 'error' : role === 'HR' ? 'secondary' : role === 'Manager' ? 'primary' : 'default'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Access Level</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {role === 'Admin' ? 'Full administrative access' :
                       role === 'HR' ? 'Human Resources & employee management' :
                       role === 'Manager' ? 'Team management & reporting' :
                       'Standard employee access'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
};

export default Settings;
