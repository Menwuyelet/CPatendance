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
  Divider,
  Switch,
  FormControlLabel,
  Stack,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Save,
  AccessTime,
  CalendarMonth,
  Palette,
  AddCircle,
  Delete as DeleteIcon,
  CurrencyExchange,   // ← FIXED: Was missing!
  Schedule,
  BusinessCenter,
  DarkMode
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';

const SETTINGS_KEY = 'companySettings';

const Settings = ({ onNotify }) => {
  const [tabValue, setTabValue] = useState(0);

  const [settings, setSettings] = useState({
    workStartTime: '09:00',
    workEndTime: '18:00',
    gracePeriodMinutes: 15,
    overtimeEligibleAfter: 40,
    allowHalfDay: true,
    weekendWorking: false,
    currency: 'USD',
    payrollDay: 28,
    fiscalYearStart: '01-01',
    darkMode: false,
    holidays: [], // { name: string, date: 'YYYY-MM-DD' }
  });

  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState(dayjs());

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));

        // Apply dark mode
        if (parsed.darkMode) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    } catch (e) {
      console.error('Failed to load saved settings:', e);
      setError('Could not load previous settings');
    }
  }, []);

  // Generic input change
  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  // Toggle switches
  const handleToggle = (field) => (e) => {
    const checked = e.target.checked;
    setSettings(prev => ({ ...prev, [field]: checked }));

    if (field === 'darkMode') {
      if (checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  };

  // Add holiday
  const handleAddHoliday = () => {
    if (!newHolidayName.trim()) {
      setError('Holiday name is required');
      setTimeout(() => setError(''), 4000);
      return;
    }

    const dateStr = newHolidayDate.format('YYYY-MM-DD');
    const newHoliday = { name: newHolidayName.trim(), date: dateStr };

    setSettings(prev => ({
      ...prev,
      holidays: [...prev.holidays, newHoliday]
    }));

    setNewHolidayName('');
    setNewHolidayDate(dayjs());
    setSuccess('Holiday added successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Remove holiday
  const handleRemoveHoliday = (index) => {
    setSettings(prev => ({
      ...prev,
      holidays: prev.holidays.filter((_, i) => i !== index)
    }));
    setSuccess('Holiday removed');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Save all settings
  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSuccess('All settings saved successfully!');
      onNotify?.('Settings updated', 'success');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError('Failed to save settings. Please try again.');
      onNotify?.('Save failed', 'error');
      setTimeout(() => setError(''), 4000);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Configure company policies, working hours, payroll, holidays, and appearance
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              bgcolor: 'primary.main',
              '& .MuiTab-root': { color: 'white', opacity: 0.8 },
              '& .Mui-selected': { color: 'white', opacity: 1, fontWeight: 'bold' }
            }}
          >
            <Tab label="General" />
            <Tab label="Working Hours" />
            <Tab label="Payroll" />
            <Tab label="Holidays" />
            <Tab label="Appearance" />
          </Tabs>

          <Box sx={{ p: 4 }}>
            {/* General */}
            {tabValue === 0 && (
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Currency"
                      value={settings.currency}
                      onChange={handleChange('currency')}
                      helperText="Default currency for payroll and reports"
                      InputProps={{
                        startAdornment: <CurrencyExchange sx={{ mr: 2, color: 'text.secondary' }} />
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Fiscal Year Start"
                      value={settings.fiscalYearStart}
                      onChange={handleChange('fiscalYearStart')}
                      placeholder="MM-DD"
                      helperText="e.g., 04-01 for April fiscal year start"
                      InputProps={{
                        startAdornment: <BusinessCenter sx={{ mr: 2, color: 'text.secondary' }} />
                      }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            )}

            {/* Working Hours */}
            {tabValue === 1 && (
              <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                  <Stack spacing={4}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Check-in Time"
                          type="time"
                          value={settings.workStartTime}
                          onChange={handleChange('workStartTime')}
                          InputLabelProps={{ shrink: true }}
                          InputProps={{
                            startAdornment: <AccessTime sx={{ mr: 2, color: 'text.secondary' }} />
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Check-out Time"
                          type="time"
                          value={settings.workEndTime}
                          onChange={handleChange('workEndTime')}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      fullWidth
                      label="Grace Period (minutes)"
                      type="number"
                      value={settings.gracePeriodMinutes}
                      onChange={handleChange('gracePeriodMinutes')}
                      inputProps={{ min: 0, max: 60 }}
                      helperText="Allowed late arrival without penalty"
                    />

                    <Stack direction="row" spacing={6} alignItems="center">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.weekendWorking}
                            onChange={handleToggle('weekendWorking')}
                            color="primary"
                          />
                        }
                        label="Weekend is a working day"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.allowHalfDay}
                            onChange={handleToggle('allowHalfDay')}
                            color="primary"
                          />
                        }
                        label="Allow half-day leaves"
                      />
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>
            )}

            {/* Payroll */}
            {tabValue === 2 && (
              <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                  <Stack spacing={4}>
                    <TextField
                      fullWidth
                      label="Overtime Eligible After"
                      type="number"
                      value={settings.overtimeEligibleAfter}
                      onChange={handleChange('overtimeEligibleAfter')}
                      helperText="Standard working hours per week before overtime"
                      InputProps={{
                        endAdornment: <Typography sx={{ ml: 1, color: 'text.secondary' }}>hours/week</Typography>,
                        startAdornment: <Schedule sx={{ mr: 2, color: 'text.secondary' }} />
                      }}
                      inputProps={{ min: 30, max: 60 }}
                    />
                    <TextField
                      fullWidth
                      label="Payroll Processing Day"
                      type="number"
                      value={settings.payrollDay}
                      onChange={handleChange('payrollDay')}
                      helperText="Day of month when payroll is processed"
                      inputProps={{ min: 1, max: 31 }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            )}

            {/* Holidays */}
            {tabValue === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonth /> Company Holidays
                </Typography>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Holiday Name"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      placeholder="e.g., Independence Day"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <DatePicker
                      label="Date"
                      value={newHolidayDate}
                      onChange={setNewHolidayDate}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddCircle />}
                      onClick={handleAddHoliday}
                      sx={{ height: '56px' }}
                    >
                      Add Holiday
                    </Button>
                  </Grid>
                </Grid>

                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto', borderRadius: 2 }}>
                  <List>
                    {settings.holidays.length === 0 ? (
                      <ListItem>
                        <ListItemText
                          primary="No holidays configured"
                          secondary="Add company-wide non-working days"
                        />
                      </ListItem>
                    ) : (
                      settings.holidays.map((holiday, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={holiday.name}
                            secondary={dayjs(holiday.date).format('dddd, MMMM D, YYYY')}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Remove holiday">
                              <IconButton onClick={() => handleRemoveHoliday(index)}>
                                <DeleteIcon color="error" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))
                    )}
                  </List>
                </Paper>
              </Box>
            )}

            {/* Appearance */}
            {tabValue === 4 && (
              <Box maxWidth={600}>
                <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Palette /> Theme & Appearance
                </Typography>

                <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.darkMode}
                        onChange={handleToggle('darkMode')}
                        color="primary"
                        size="large"
                        icon={<DarkMode />}
                      />
                    }
                    label={
                      <Stack direction="row" alignItems="center" gap={1}>
                        <DarkMode />
                        <Typography variant="body1" fontWeight="medium">
                          Dark Mode
                        </Typography>
                      </Stack>
                    }
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, ml: 7 }}>
                    Enable dark theme across the entire application for better viewing in low light
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Save Button */}
        <Box sx={{ mt: 6, textAlign: 'right' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleSave}
            sx={{
              px: 6,
              py: 1.8,
              borderRadius: 3,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)'
            }}
          >
            Save All Settings
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default Settings;