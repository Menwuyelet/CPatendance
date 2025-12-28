// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Grid,
  Stack,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Person,
  Email,
  DarkMode,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';

const Settings = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState({
    email: '',
    full_name: '',
  });
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUserData();
    loadPreferences();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await api.get('/accounts/users/me/');
      setUser({
        email: userData.email || '',
        full_name: userData.full_name || userData.name || '',
      });
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        setDarkMode(prefs.darkMode || false);
        if (prefs.darkMode) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  };

  const handleUserChange = (field) => (e) => {
    setUser(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleDarkModeToggle = (e) => {
    const checked = e.target.checked;
    setDarkMode(checked);
    if (checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Save user data to backend
      const updatedData = await api.patch('/accounts/users/me/', {
        full_name: user.full_name,
      });

      // Update local state with response
      if (updatedData.full_name) {
        setUser(prev => ({ ...prev, full_name: updatedData.full_name }));
      }

      // Save preferences to localStorage
      localStorage.setItem('userPreferences', JSON.stringify({
        darkMode,
      }));

      setSuccess('Settings saved successfully!');
      onNotify?.('Settings updated', 'success');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to save settings');
      setError(errorMessage);
      onNotify?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={3}>
          {/* Profile Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person /> Profile
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={user.email}
                  disabled
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={user.full_name}
                  onChange={handleUserChange('full_name')}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DarkMode /> Appearance
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={handleDarkModeToggle}
                  color="primary"
                />
              }
              label="Dark Mode"
            />
          </Box>
        </Stack>
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ px: 4 }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;