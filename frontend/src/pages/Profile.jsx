import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  TextField,
  Stack,
  Button,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Person, Badge, Phone, VpnKey, Visibility, VisibilityOff, Save, Refresh } from '@mui/icons-material';
import { api } from '../services/api.service.js';

const getRoleLabel = (roles = []) => {
  const names = (Array.isArray(roles) ? roles : [])
    .map((r) => (typeof r === 'string' ? r : r?.name))
    .filter(Boolean)
    .map((r) => String(r).toUpperCase());

  if (names.includes('ADMIN')) return 'ADMIN';
  if (names.includes('MANAGER')) return 'MANAGER';
  return names[0] || 'UNKNOWN';
};

const Profile = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const roleLabel = useMemo(() => getRoleLabel(user?.roles), [user?.roles]);
  const userInitial = useMemo(() => {
    const name = user?.full_name || user?.employee_code || 'U';
    return String(name).charAt(0).toUpperCase();
  }, [user?.full_name, user?.employee_code]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const me = await api.getCurrentUser();
      setUser(me);
    } catch (err) {
      const message = err?.message || 'Unable to load profile data.';
      setError(message);
      onNotify?.(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handlePasswordChange = async () => {
    setError('');
    setSuccess('');

    if (!passwordForm.currentPassword) {
      setError('Current password is required.');
      return;
    }
    if (!passwordForm.newPassword) {
      setError('New password is required.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword,
      );
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully.');
      onNotify?.('Password changed successfully.', 'success');
    } catch (err) {
      const message = err?.message || 'Failed to change password.';
      setError(message);
      onNotify?.(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress size={52} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
        My Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View account details and update your password.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardHeader title="Profile Details" />
            <Divider />
            <CardContent>
              <Stack spacing={2} alignItems="flex-start">
                <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 28, fontWeight: 700 }}>
                  {userInitial}
                </Avatar>

                <TextField
                  fullWidth
                  label="Full Name"
                  value={user?.full_name || ''}
                  InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }}
                />
                <TextField
                  fullWidth
                  label="Employee Code"
                  value={user?.employee_code || ''}
                  InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><Badge fontSize="small" /></InputAdornment> }}
                />
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={user?.phone_number || 'Not set'}
                  InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }}
                />

                <Stack direction="row" spacing={1}>
                  <Chip label={roleLabel} color={roleLabel === 'ADMIN' ? 'error' : 'primary'} />
                  <Chip label={user?.is_active ? 'Active' : 'Inactive'} color={user?.is_active ? 'success' : 'default'} variant={user?.is_active ? 'filled' : 'outlined'} />
                </Stack>

                <Button variant="outlined" startIcon={<Refresh />} onClick={loadProfile}>
                  Refresh Profile
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardHeader title="Change Password" />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type={showPassword.current ? 'text' : 'password'}
                  label="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><VpnKey fontSize="small" /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => ({ ...prev, current: !prev.current }))} edge="end">
                          {showPassword.current ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  type={showPassword.next ? 'text' : 'password'}
                  label="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><VpnKey fontSize="small" /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => ({ ...prev, next: !prev.next }))} edge="end">
                          {showPassword.next ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  type={showPassword.confirm ? 'text' : 'password'}
                  label="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><VpnKey fontSize="small" /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))} edge="end">
                          {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Save />}
                    onClick={handlePasswordChange}
                    disabled={saving}
                  >
                    {saving ? 'Updating...' : 'Update Password'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;
