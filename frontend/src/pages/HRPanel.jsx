// src/pages/HRPanel.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Paper,
  Divider,
  Avatar,
  Chip,
  LinearProgress,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  People,
  EventNote,
  Assessment,
  CheckCircle,
  PersonAdd,
  TrendingDown,
  Download,
  Search,
  Refresh as RefreshIcon,
  AccessTime,
  Schedule,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';
import { DashboardPage, DashboardStatCard } from '../components/dashboard';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const HRDashboard = ({ onNotify }) => {
  const navigate = useNavigate();

  // Real data states
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    activeToday: 0,
    newThisMonth: 0,
    absenteeismRate: 0,
    lateArrivals: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Clock-in states
  const [activeSession, setActiveSession] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(null);

  // Filter states
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  // Session states
  const [sessions, setSessions] = useState([]);
  const [searchSession, setSearchSession] = useState('');
  const [filterSessionStatus, setFilterSessionStatus] = useState('ALL');
  const [filterSessionDate, setFilterSessionDate] = useState('');

  // Fetch HR data function
  const fetchHRData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      // Use real Django endpoints
      const employeesRes = await api.get('/employees/employees/').catch(() => ({ results: [] }));
      const attendanceRes = await api.get('/attendance/attendance/').catch(() => ({ results: [] }));
      const departmentsRes = await api.get('/employees/departments/').catch(() => ({ results: [] }));
      const sessionsRes = await api.listAttendanceSessions({}).catch(() => []);

      const employeesData = Array.isArray(employeesRes) ? employeesRes : employeesRes?.results || [];
      const attendanceData = Array.isArray(attendanceRes) ? attendanceRes : attendanceRes?.results || [];
      const departmentsList = Array.isArray(departmentsRes) ? departmentsRes : departmentsRes?.results || [];

      setEmployees(employeesData);
      setAttendanceRecords(attendanceData);
      setDepartments(departmentsList);
      setSessions(Array.isArray(sessionsRes) ? sessionsRes : []);

      // Calculate statistics
      const totalEmployees = employeesData.length;
      const activeEmployees = employeesData.filter((emp) => emp.is_active !== false).length;

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayRecords = attendanceData.filter((r) => r.date === todayStr);
      const activeToday = todayRecords.filter((r) => {
        const status = (r.status || '').toUpperCase();
        return status === 'PRESENT' || status === 'LATE';
      }).length;

      const lateArrivals = todayRecords.filter((r) => (r.status || '').toUpperCase() === 'LATE').length;

      const absentToday = totalEmployees - activeToday;
      const absenteeismRate = totalEmployees > 0 ? Math.round((absentToday / totalEmployees) * 100) : 0;

      const thisMonthStart = startOfMonth(new Date());
      const thisMonthEnd = endOfMonth(new Date());
      const newThisMonth = employeesData.filter((emp) => {
        const createdAt = emp.created_at ? new Date(emp.created_at) : null;
        return createdAt && createdAt >= thisMonthStart && createdAt <= thisMonthEnd;
      }).length;

      setStats({
        totalEmployees,
        activeEmployees,
        activeToday,
        newThisMonth,
        absenteeismRate,
        lateArrivals,
      });

      // Generate recent activity
      const activity = [];
      if (newThisMonth > 0) {
        activity.push({
          type: 'new_employee',
          message: `${newThisMonth} new employee(s) joined this month`,
          timestamp: format(new Date(), 'MMM dd, yyyy'),
        });
      }
      if (lateArrivals > 0) {
        activity.push({
          type: 'late_clockin',
          message: `${lateArrivals} late arrival(s) today`,
          timestamp: format(new Date(), 'MMM dd, yyyy'),
        });
      }
      if (activeToday > 0) {
        activity.push({
          type: 'attendance',
          message: `${activeToday} employees present today`,
          timestamp: format(new Date(), 'MMM dd, yyyy'),
        });
      }
      setRecentActivity(activity.slice(0, 8));

    } catch (err) {
      console.error('Failed to load HR dashboard data:', err);
      setError('Unable to load dashboard data. Please try again.');
      onNotify?.('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onNotify]);

  // Load clock-in state
  const loadClockInState = useCallback(async () => {
    try {
      const user = await api.getCurrentUser();
      const emp = await api.getMyEmployee().catch(() => null);
      
      // Check active sessions
      try {
        const sessions = await api.listAttendanceSessions({ active: true });
        const activeSessions = Array.isArray(sessions) ? sessions.filter(s => s.is_active) : [];
        
        if (activeSessions.length > 0) {
          setActiveSession(activeSessions[0]);
        }
      } catch (sessionErr) {
        console.error('Failed to load sessions:', sessionErr);
      }

      // Get last check-in time
      if (emp?.id) {
        const today = new Date().toISOString().slice(0, 10);
        try {
          const attendance = await api.get(`/attendance/attendance/?date=${today}`);
          const todayRecords = Array.isArray(attendance) ? attendance : [];
          const userRecord = todayRecords.find(
            (r) => String(r.employee?.id || r.employee) === String(emp.id)
          );
          if (userRecord && userRecord.check_in_time) {
            setLastActionTime(new Date(userRecord.check_in_time).toLocaleTimeString());
          }
        } catch (attendanceErr) {
          console.error('Failed to load attendance:', attendanceErr);
        }
      }
    } catch (err) {
      console.error('Failed to load clock-in state:', err);
    }
  }, []);

  // Handle clock-in
  const handleClockIn = async (embedding) => {
    setScanSubmitting(true);
    try {
      await api.clockIn(embedding);
      onNotify?.('Clock-in successful!', 'success');
      setScanOpen(false);
      loadClockInState();
      fetchHRData();
    } catch (err) {
      console.error('Clock-in failed:', err);
      onNotify?.('Clock-in failed. Please try again.', 'error');
    } finally {
      setScanSubmitting(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchHRData();
    loadClockInState();
  }, [fetchHRData, loadClockInState]);

  // Handle refresh
  const handleRefresh = () => {
    fetchHRData(true);
  };

  // Get activity icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'new_employee': return <PersonAdd color="primary" />;
      case 'leave_approved': return <CheckCircle color="success" />;
      case 'late_clockin': return <AccessTime color="warning" />;
      case 'attendance': return <EventNote color="info" />;
      default: return <EventNote />;
    }
  };

  // Filter employees with attendance
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = !searchQuery ||
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = filterDepartment === 'ALL' ||
      String(emp.department?.id || '') === String(filterDepartment);

    return matchesSearch && matchesDept;
  }).map((emp) => {
    const record = attendanceRecords.find(
      (r) => String(r.employee?.id || r.employee) === String(emp.id) &&
             (!filterDate || r.date === filterDate)
    );
    return { ...emp, attendanceRecord: record };
  }).filter((emp) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ABSENT') return !emp.attendanceRecord;
    return emp.attendanceRecord?.status === filterStatus;
  }).slice(0, 10);

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = !searchSession ||
      session.shift?.name?.toLowerCase().includes(searchSession.toLowerCase());
    
    const matchesStatus = filterSessionStatus === 'ALL' ||
      session.status === filterSessionStatus;
    
    const matchesDate = !filterSessionDate ||
      session.date === filterSessionDate;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'SCHEDULED': return 'warning';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  return (
    <DashboardPage
      title="HR Dashboard"
      subtitle="Workforce management and insights"
      actions={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
            startIcon={<RefreshIcon />}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            color="primary" 
            onClick={() => navigate('/employees')}
          >
            Manage Employees
          </Button>
        </Stack>
      }
      disablePadding
    >
      {/* Loading indicator */}
      {(loading || refreshing) && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Clock In/Out Card */}
      <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                Daily Clock-In
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {activeSession 
                  ? `Active session: ${activeSession.shift?.name || 'Unknown'}` 
                  : 'No active session available'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              color="success"
              onClick={() => setScanOpen(true)}
              disabled={!activeSession || scanSubmitting}
              sx={{ px: 4, minWidth: 150 }}
            >
              {scanSubmitting ? 'Submitting...' : 'Scan Face'}
            </Button>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography variant="body2" fontWeight="medium">
                {activeSession ? 'Session Active' : 'No Active Session'}
              </Typography>
              {lastActionTime && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Last check-in: {lastActionTime}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <FaceCaptureDialog
        open={scanOpen}
        title="Scan Face for Attendance"
        onClose={() => setScanOpen(false)}
        onCaptured={handleClockIn}
      />

      {/* Key Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <DashboardStatCard
            label="Total Employees"
            value={stats.totalEmployees}
            helperText={`${stats.activeEmployees} active`}
            icon={<People />}
            color="primary"
            onClick={() => navigate('/employees')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <DashboardStatCard
            label="Present Today"
            value={stats.activeToday}
            helperText={`${stats.lateArrivals} late`}
            icon={<CheckCircle />}
            color="success"
            onClick={() => navigate('/attendance')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <DashboardStatCard
            label="Absenteeism"
            value={`${stats.absenteeismRate}%`}
            helperText="Today"
            icon={<TrendingDown />}
            color={stats.absenteeismRate > 20 ? 'error' : 'warning'}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <DashboardStatCard
            label="Late Arrivals"
            value={stats.lateArrivals}
            helperText="Today"
            icon={<AccessTime />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Employee Attendance Tracking */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Employee Attendance Today
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  label="Department"
                >
                  <MenuItem value="ALL">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="PRESENT">Present</MenuItem>
                  <MenuItem value="ABSENT">Absent</MenuItem>
                  <MenuItem value="LATE">Late</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Attendance Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Check-In</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Check-Out</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No employees found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow 
                      key={emp.id}
                      sx={{ 
                        '&:hover': { bgcolor: 'grey.50' },
                        bgcolor: emp.attendanceRecord?.status === 'ABSENT' ? 'error.50' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                            {emp.full_name?.charAt(0) || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {emp.full_name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {emp.employee_code || 'N/A'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{emp.department?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={emp.attendanceRecord?.status || 'ABSENT'}
                          color={
                            emp.attendanceRecord?.status === 'PRESENT' ? 'success' :
                            emp.attendanceRecord?.status === 'LATE' ? 'warning' :
                            emp.attendanceRecord?.status === 'ABSENT' ? 'error' : 'default'
                          }
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>{emp.attendanceRecord?.check_in_time || '-'}</TableCell>
                      <TableCell>{emp.attendanceRecord?.check_out_time || '-'}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => navigate(`/attendance?employee=${emp.id}`)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Recent Activity & Sessions */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Activity
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Stack spacing={2}>
                  {[...Array(4)].map((_, i) => <Skeleton key={i} height={60} />)}
                </Stack>
              ) : recentActivity.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No recent activity</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {recentActivity.map((activity, index) => (
                    <ListItem 
                      key={index}
                      sx={{ 
                        px: 0,
                        borderBottom: index < recentActivity.length - 1 ? 1 : 0,
                        borderColor: 'divider'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          {getActivityIcon(activity.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.message}
                        secondary={activity.timestamp}
                        primaryTypographyProps={{ fontWeight: 'medium' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance Sessions */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Sessions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {/* Session Filters */}
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search sessions..."
                    value={searchSession}
                    onChange={(e) => setSearchSession(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterSessionStatus}
                      onChange={(e) => setFilterSessionStatus(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="ALL">All Status</MenuItem>
                      <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                      <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                      <MenuItem value="COMPLETED">Completed</MenuItem>
                      <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Date"
                    value={filterSessionDate}
                    onChange={(e) => setFilterSessionDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              {loading ? (
                <Stack spacing={2}>
                  {[...Array(3)].map((_, i) => <Skeleton key={i} height={60} />)}
                </Stack>
              ) : filteredSessions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No sessions found</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {filteredSessions.slice(0, 5).map((session) => (
                    <ListItem 
                      key={session.id}
                      sx={{ 
                        px: 0,
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.light' }}>
                          <EventNote />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={session.shift?.name || 'Unknown Shift'}
                        secondary={`${session.date || 'No date'} • ${session.start_time || 'No time'}`}
                        primaryTypographyProps={{ fontWeight: 'medium' }}
                      />
                      <Chip 
                        size="small" 
                        label={session.status || 'UNKNOWN'} 
                        color={getStatusColor(session.status)} 
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardPage>
  );
};

// Face Capture Dialog Component
const FaceCaptureDialog = ({ open, title, onClose, onCaptured }) => {
  const [capturing, setCapturing] = useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  };

  React.useEffect(() => {
    if (open) {
      startCamera();
    }
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [open]);

  const handleCapture = async () => {
    setCapturing(true);
    // Simulate face capture - in real app, use face recognition library
    setTimeout(() => {
      // Generate mock embedding for demo
      const mockEmbedding = new Float32Array(512).map(() => Math.random());
      onCaptured(mockEmbedding);
      setCapturing(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ width: '100%', maxWidth: 400, borderRadius: 8, bgcolor: '#000' }} 
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Position your face in the camera frame
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleCapture}
          disabled={capturing}
          startIcon={capturing ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {capturing ? 'Capturing...' : 'Capture Face'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HRDashboard;
