// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api.service.js';
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
} from '@mui/icons-material';

// Dashboard Layout
const DashboardLayout = ({ children, title, breadcrumbs = [], actions }) => (
  <Box sx={{ width: '100%' }}>
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);

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
    loadUserData();
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await api.get('/employees/departments/').catch(() => ({ results: [] }));
      const list = Array.isArray(res) ? res : res?.results || [];
      setDepartments(list);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
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
      <DashboardLayout title="Account Settings">
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
    >
      {error && !user && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* User Information Card */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
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
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
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
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
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
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
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
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Current Role</Typography>
                    <Chip 
                      label={role} 
                      color={role === 'Admin' ? 'error' : role === 'HR' ? 'secondary' : role === 'Manager' ? 'primary' : 'default'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
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
