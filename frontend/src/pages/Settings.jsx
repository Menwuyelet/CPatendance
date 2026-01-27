// src/pages/Settings.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save,
  Person,
  Email,
  DarkMode,
  Language,
  Security,
  Notifications,
  Visibility,
  VisibilityOff,
  Lock,
  Phone,
  Edit,
  CameraAlt,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import { useTheme } from '@mui/material/styles';

const Settings = ({ onNotify }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState({
    email: '',
    full_name: '',
    phone: '',
    position: '',
    department: '',
  });
  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: 'en',
    notifications: {
      email: true,
      push: true,
      reminders: true,
    },
    privacy: {
      profileVisible: true,
      attendancePublic: false,
    },
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Load user data and preferences
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load user data
      const userData = await api.getCurrentUser();
      const employeeData = await api.getMyEmployee();
      
      setUser({
        email: userData?.email || '',
        full_name: userData?.full_name || employeeData?.full_name || '',
        phone: employeeData?.phone || userData?.phone || '',
        position: employeeData?.position || '',
        department: employeeData?.department?.name || '',
      });
      
      // Load profile image if exists
      if (employeeData?.profile_picture) {
        setImagePreview(employeeData.profile_picture);
      }
      
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError('Failed to load user data. Please refresh the page.');
      onNotify?.('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        setPreferences(prev => ({
          ...prev,
          ...prefs,
          notifications: { ...prev.notifications, ...prefs.notifications },
          privacy: { ...prev.privacy, ...prefs.privacy },
        }));
        
        // Apply dark mode
        if (prefs.darkMode) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    loadPreferences();
  }, [loadUserData, loadPreferences]);

  // Handle user info changes
  const handleUserChange = (field) => (e) => {
    setUser(prev => ({ ...prev, [field]: e.target.value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle preference changes
  const handlePreferenceChange = (category, field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    
    setPreferences(prev => ({
      ...prev,
      [category]: category === 'darkMode' || category === 'language' 
        ? value 
        : { ...prev[category], [field]: value }
    }));
  };

  // Handle dark mode toggle
  const handleDarkModeToggle = (e) => {
    const checked = e.target.checked;
    handlePreferenceChange('darkMode')(e);
    
    if (checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // Handle password form changes
  const handlePasswordChange = (field) => (e) => {
    setPasswordForm(prev => ({ ...prev, [field]: e.target.value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => () => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    // Full name validation
    if (user.full_name && user.full_name.length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    }
    
    // Email validation
    if (user.email && !/\S+@\S+\.\S+/.test(user.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (user.phone && !/^[\d\s\-\+\(\)]{10,}$/.test(user.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate password change
  const validatePasswordChange = () => {
    const errors = {};
    
    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required';
    }
    
    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }
    
    if (!passwordForm.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      onNotify?.('Please upload a valid image (JPEG, PNG, GIF)', 'error');
      return;
    }
    
    if (file.size > maxSize) {
      onNotify?.('Image size must be less than 5MB', 'error');
      return;
    }
    
    setProfileImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Save user profile
  const saveUserProfile = async () => {
    try {
      // Update user info
      const updatedData = await api.patch('/accounts/users/me/', {
        full_name: user.full_name.trim(),
      });
      
      // Update employee info if available
      try {
        const employeeData = await api.getMyEmployee();
        if (employeeData?.id) {
          await api.patch(`/employees/employees/${employeeData.id}/`, {
            phone: user.phone.trim(),
          });
        }
      } catch (empErr) {
        console.warn('Could not update employee info:', empErr);
      }
      
      // Upload profile image if changed
      if (profileImage) {
        const formData = new FormData();
        formData.append('profile_picture', profileImage);
        
        try {
          await api.postForm('/employees/upload-profile-picture/', formData);
        } catch (imgErr) {
          console.warn('Could not upload profile image:', imgErr);
        }
      }
      
      return updatedData;
    } catch (err) {
      throw err;
    }
  };

  // Change password
  const changePassword = async () => {
    try {
      await api.post('/auth/change-password/', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      
      // Clear form
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      
      setPasswordDialogOpen(false);
      return true;
    } catch (err) {
      throw err;
    }
  };

  // Main save handler
  const handleSave = async () => {
    if (!validateForm()) {
      onNotify?.('Please fix validation errors', 'warning');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Save user profile
      await saveUserProfile();
      
      // Save preferences to localStorage
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      // Update local storage dark mode flag
      if (preferences.darkMode) {
        localStorage.setItem('darkMode', 'true');
      } else {
        localStorage.removeItem('darkMode');
      }
      
      setSuccess('Settings saved successfully!');
      onNotify?.('Settings updated successfully', 'success');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh user data
      await loadUserData();
      
    } catch (err) {
      console.error('Failed to save settings:', err);
      const errorMessage = err?.data?.detail || err?.message || 'Failed to save settings. Please try again.';
      setError(errorMessage);
      onNotify?.(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async () => {
    if (!validatePasswordChange()) {
      onNotify?.('Please fix password validation errors', 'warning');
      return;
    }
    
    try {
      setSaving(true);
      await changePassword();
      setSuccess('Password changed successfully!');
      onNotify?.('Password updated successfully', 'success');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to change password:', err);
      const errorMessage = err?.data?.detail || err?.message || 'Failed to change password. Please check your current password.';
      setError(errorMessage);
      onNotify?.(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '1200px', mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Settings
      </Typography>

      {/* Status Messages */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {success && (
          <Alert 
            severity="success" 
            icon={<CheckCircle />}
            onClose={() => setSuccess('')}
            sx={{ borderRadius: 2 }}
          >
            {success}
          </Alert>
        )}
        {error && (
          <Alert 
            severity="error" 
            icon={<ErrorIcon />}
            onClose={() => setError('')}
            sx={{ borderRadius: 2 }}
          >
            {error}
          </Alert>
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column - Profile & Account */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Profile Information */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person /> Profile Information
              </Typography>
              
              <Grid container spacing={3}>
                {/* Profile Image */}
                <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ position: 'relative', mb: 2 }}>
                    <Avatar
                      src={imagePreview}
                      sx={{ width: 120, height: 120, border: 2, borderColor: 'primary.main' }}
                    >
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </Avatar>
                    <Tooltip title="Change Profile Picture">
                      <IconButton
                        component="label"
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }}
                      >
                        <CameraAlt />
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleImageUpload}
                        />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Max 5MB • JPG, PNG, GIF
                  </Typography>
                </Grid>
                
                {/* Profile Form */}
                <Grid item xs={12} md={8}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={user.email}
                      disabled
                      error={!!validationErrors.email}
                      helperText={validationErrors.email}
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={user.full_name}
                      onChange={handleUserChange('full_name')}
                      error={!!validationErrors.full_name}
                      helperText={validationErrors.full_name}
                      required
                      InputProps={{
                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={user.phone}
                      onChange={handleUserChange('phone')}
                      error={!!validationErrors.phone}
                      helperText={validationErrors.phone}
                      InputProps={{
                        startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Position"
                      value={user.position}
                      disabled
                      InputProps={{
                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Department"
                      value={user.department}
                      disabled
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Password Security */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security /> Password & Security
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Password
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last changed: {new Date().toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<Lock />}
                      onClick={() => setPasswordDialogOpen(true)}
                    >
                      Change Password
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Paper>
          </Stack>
        </Grid>

        {/* Right Column - Preferences */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Appearance */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DarkMode /> Appearance
              </Typography>
              
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.darkMode}
                      onChange={handleDarkModeToggle}
                      color="primary"
                    />
                  }
                  label="Dark Mode"
                />
                
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={preferences.language}
                    label="Language"
                    onChange={handlePreferenceChange('language')}
                    startAdornment={<Language sx={{ mr: 1, color: 'text.secondary' }} />}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="am">አማርኛ</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Paper>

            {/* Notifications */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications /> Notifications
              </Typography>
              
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications.email}
                      onChange={handlePreferenceChange('notifications', 'email')}
                      color="primary"
                    />
                  }
                  label="Email Notifications"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications.push}
                      onChange={handlePreferenceChange('notifications', 'push')}
                      color="primary"
                    />
                  }
                  label="Push Notifications"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications.reminders}
                      onChange={handlePreferenceChange('notifications', 'reminders')}
                      color="primary"
                    />
                  }
                  label="Reminders"
                />
              </Stack>
            </Paper>

            {/* Privacy */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security /> Privacy
              </Typography>
              
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.privacy.profileVisible}
                      onChange={handlePreferenceChange('privacy', 'profileVisible')}
                      color="primary"
                    />
                  }
                  label="Profile Visible to Others"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.privacy.attendancePublic}
                      onChange={handlePreferenceChange('privacy', 'attendancePublic')}
                      color="primary"
                    />
                  }
                  label="Make Attendance Public"
                />
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{ px: 6, py: 1.5 }}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </Box>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Current Password"
              type={showPassword.current ? 'text' : 'password'}
              value={passwordForm.current_password}
              onChange={handlePasswordChange('current_password')}
              error={!!validationErrors.current_password}
              helperText={validationErrors.current_password}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={togglePasswordVisibility('current')} edge="end">
                    {showPassword.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            
            <TextField
              fullWidth
              label="New Password"
              type={showPassword.new ? 'text' : 'password'}
              value={passwordForm.new_password}
              onChange={handlePasswordChange('new_password')}
              error={!!validationErrors.new_password}
              helperText={validationErrors.new_password || 'Minimum 8 characters'}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={togglePasswordVisibility('new')} edge="end">
                    {showPassword.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPassword.confirm ? 'text' : 'password'}
              value={passwordForm.confirm_password}
              onChange={handlePasswordChange('confirm_password')}
              error={!!validationErrors.confirm_password}
              helperText={validationErrors.confirm_password}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={togglePasswordVisibility('confirm')} edge="end">
                    {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handlePasswordSubmit}
            disabled={saving}
          >
            {saving ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;