import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardHeader, CardContent, Typography, Button, CircularProgress,
  Alert, Stack, IconButton, Avatar, Divider, useTheme, alpha, Container,
  List, ListItem, ListItemAvatar, ListItemText, Paper
} from '@mui/material';
import {
  People, EventAvailable, Refresh, PersonAdd, Business, TrendingUp,
  SettingsSuggest, ChevronRight, Security
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';
import '../styles/admin-dashboard.css';

/* ----------------------------- Professional Card Design ----------------------------- */
const StyledCard = ({ children, theme }) => (
  <Card sx={{
    height: '100%',
    borderRadius: '20px',
    background: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.6) 
      : theme.palette.background.paper,
    backdropFilter: 'blur(15px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.3)'
      : '0 8px 32px rgba(0,0,0,0.05)',
    transition: 'box-shadow 0.2s ease',
    '&:hover': {
      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.12)}`,
    }
  }}>
    {children}
  </Card>
);

const AdminPanel = ({ onNotify }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    attendanceRate: 0,
    depts: 0
  });

  // Excess shifts state
  const [excessShiftEmployees, setExcessShiftEmployees] = useState([]);
  const MAX_SHIFTS_PER_DAY = 2;

  // Detect employees with excess shifts
  const detectExcessShifts = useCallback((employeeShifts, shifts) => {
    const excessEmployees = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const shiftsByEmployee = {};
    employeeShifts.forEach(assignment => {
      const employeeId = assignment.employee?.id || assignment.employee;
      if (!shiftsByEmployee[employeeId]) {
        shiftsByEmployee[employeeId] = {
          employee: assignment.employee,
          excessDays: []
        };
      }

      days.forEach(day => {
        if (assignment.shift && assignment.shift[day]) {
          const shiftsOnDay = employeeShifts.filter(a => {
            const empId = a.employee?.id || a.employee;
            return empId === employeeId && a.shift && a.shift[day];
          });

          if (shiftsOnDay.length > MAX_SHIFTS_PER_DAY) {
            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
            if (!shiftsByEmployee[employeeId].excessDays.includes(dayName)) {
              shiftsByEmployee[employeeId].excessDays.push(dayName);
            }
          }
        }
      });
    });

    Object.values(shiftsByEmployee).forEach(data => {
      if (data.excessDays.length > 0) {
        excessEmployees.push({
          employee: data.employee,
          excessDays: data.excessDays
        });
      }
    });

    return excessEmployees;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, attRes, depRes, shiftsRes, empShiftsRes] = await Promise.all([
        api.get('/employees/employees/').catch(() => []),
        api.get('/attendance/attendance/').catch(() => []),
        api.getAllDepartments().catch(() => []),
        api.get('/attendance/shifts/').catch(() => []),
        api.listEmployeeShifts().catch(() => []),
      ]);

      const employees = Array.isArray(empRes) ? empRes : empRes?.data || empRes?.results || [];
      const attendance = Array.isArray(attRes) ? attRes : attRes?.data || attRes?.results || [];
      const departments = Array.isArray(depRes) ? depRes : depRes?.data || depRes?.results || [];
      const shifts = Array.isArray(shiftsRes) ? shiftsRes : shiftsRes?.data || shiftsRes?.results || [];
      const employeeShifts = Array.isArray(empShiftsRes) ? empShiftsRes : empShiftsRes?.data || empShiftsRes?.results || [];

      // Detect excess shifts
      const excessShifts = detectExcessShifts(employeeShifts, shifts);
      setExcessShiftEmployees(excessShifts);

      // Logic for actual data
      const today = new Date().toISOString().slice(0, 10);
      const activeNow = attendance.filter(a => a.date === today && (a.status === 'PRESENT' || a.status === 'LATE'));

      setStats({
        totalEmployees: employees.length,
        presentToday: activeNow.length,
        attendanceRate: employees.length ? Math.round((activeNow.length / employees.length) * 100) : 0,
        depts: departments.length
      });
    } catch (err) {
      setError("Synchronisation failed. Reconnecting...");
    } finally {
      setLoading(false);
    }
  }, [detectExcessShifts]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Notify when excess shifts are detected
  useEffect(() => {
    if (excessShiftEmployees.length > 0 && !loading) {
      const firstExcess = excessShiftEmployees[0];
      const message = `⚠️ ${firstExcess.employee?.full_name || 'An employee'} has ${firstExcess.excessDays.length > 3 ? 'excess shifts' : 'more than 2 shifts on ' + firstExcess.excessDays.join(', ')}`;
      onNotify?.(message, 'warning');
    }
  }, [excessShiftEmployees, loading, onNotify]);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100%',
      maxWidth: '100vw', 
      overflowX: 'hidden', // Essential fix for the right-side gap
      bgcolor: 'background.default',
      // Dynamic background - only for dark mode
      backgroundImage: theme.palette.mode === 'dark' 
        ? `radial-gradient(at 0% 0%, ${alpha(theme.palette.primary.main, 0.1)} 0px, transparent 50%)`
        : 'none',
    }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 5 }, px: { xs: 1, sm: 2, md: 3 } }}>
        
        {/* Header Section */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={3} mb={6}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-1px' }}>
              Management Console
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time synchronization active • {new Date().toLocaleDateString()}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button 
              variant="contained" 
              startIcon={<PersonAdd />} 
              onClick={() => navigate('/users')}
              sx={{ borderRadius: '12px', px: 3, textTransform: 'none', fontWeight: 700 }}
            >
              Add Staff
            </Button>
            <IconButton onClick={fetchData} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>

        {error && <Alert severity="warning" sx={{ mb: 4, borderRadius: '12px' }}>{error}</Alert>}

        {/* KPI Grid: Self-adjusting width */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: 3, 
          mb: 6 
        }}>
          {[
            { label: 'Employees', val: stats.totalEmployees, icon: <People />, color: 'primary', sub: 'Total Records' },
            { label: 'Attendance', val: `${stats.attendanceRate}%`, icon: <EventAvailable />, color: 'success', sub: `${stats.presentToday} Present` },
            { label: 'Units', val: stats.depts, icon: <Business />, color: 'warning', sub: 'Departments' },
          ].map((stat, i) => (
            <StyledCard key={i} theme={theme}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">{stat.label}</Typography>
                    <Typography variant="h4" fontWeight="900" sx={{ my: 1 }}>{stat.val}</Typography>
                    <Typography variant="caption" sx={{ color: `${stat.color}.main`, fontWeight: 700 }}>{stat.sub}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(theme.palette[stat.color].main, 0.1), color: `${stat.color}.main`, width: 56, height: 56, borderRadius: '15px' }}>
                    {stat.icon}
                  </Avatar>
                </Stack>
              </CardContent>
            </StyledCard>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4 }}>
          {/* Main Action Hub */}
          <Box>
            <Typography variant="h6" fontWeight="800" mb={3}>Quick Directories</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {[
                { label: 'Attendance', path: '/attendance', icon: <TrendingUp />, color: '#10b981' },
                { label: 'Departments', path: '/companies', icon: <Business />, color: '#6366f1' },
                { label: 'Work Shifts', path: '/attendance/shifts', icon: <SettingsSuggest />, color: '#f59e0b' },
                { label: 'Biometrics', path: '/biometrics', icon: <Security />, color: '#ec4899' },
              ].map((item, i) => (
                <Paper
                  key={i}
                  onClick={() => navigate(item.path)}
                  sx={{
                    p: 3, borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: alpha(item.color, 0.05), border: '1px solid transparent', transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    '&:hover': { borderColor: item.color, bgcolor: alpha(item.color, 0.08) }
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: item.color, color: '#fff', borderRadius: '10px' }}>{item.icon}</Avatar>
                    <Typography variant="subtitle2" fontWeight="800">{item.label}</Typography>
                  </Stack>
                  <ChevronRight sx={{ color: 'text.disabled', fontSize: 18 }} />
                </Paper>
              ))}
            </Box>
          </Box>

          {/* Activity Logs */}
          <StyledCard theme={theme}>
            <CardHeader title={<Typography variant="h6" fontWeight="800">Recent Status</Typography>} />
            <Divider sx={{ opacity: 0.1 }} />
            <List sx={{ p: 0 }}>
              {[
                { t: 'Attendance Sync', s: `${stats.presentToday} checked in`, time: 'Live', c: 'success' },
                { t: 'Department Sync', s: `${stats.depts} departments active`, time: 'Live', c: 'info' },
              ].map((act, i) => (
                <ListItem key={i} sx={{ px: 3, py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(theme.palette[act.c].main, 0.1), color: `${act.c}.main` }}>
                      <Security fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={<Typography variant="body2" fontWeight="700">{act.t}</Typography>}
                    secondary={<Typography variant="caption">{act.s} • {act.time}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </StyledCard>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminPanel;