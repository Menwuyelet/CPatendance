import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  TextField,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
  LinearProgress,
  CircularProgress,
  Alert,
  TableContainer,
  InputAdornment,
  TablePagination,
  Divider,
  Breadcrumbs,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  People,
  EventNote,
  CheckCircle,
  Report,
  ArrowBack,
  Search,
  Refresh,
  Visibility,
  TrendingUp,
  Group,
  Settings,
  Person,
  Edit,
  Save,
  Cancel,
  Home,
  ChevronRight,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import { format, subDays } from 'date-fns';

const getStatusColor = (status) => {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (['present', 'approved', 'active', 'completed'].includes(s)) return 'success';
  if (['absent', 'rejected', 'inactive', 'declined'].includes(s)) return 'error';
  if (['remote', 'on leave', 'pending', 'in review'].includes(s)) return 'warning';
  return 'default';
};

// Map EmployeeSerializer payload from /api/employees/employees/ to the shape
// this dashboard expects for team members.
const mapEmployeeToTeamMember = (emp) => {
  const email = emp.user?.email || '';
  const primaryRole =
    emp.user?.roles?.[0]?.name ||
    (typeof emp.user?.roles?.[0] === 'string' ? emp.user.roles[0] : 'EMPLOYEE');

  return {
    id: emp.id,
    name: emp.full_name || email.split('@')[0] || 'Unknown',
    email,
    department: emp.department?.name || '',
    role: primaryRole,
    status: emp.is_active ? 'Active' : 'Inactive',
    // Attendance rate per-employee can be added later by aggregating
    // /api/attendance/attendance/; for now default to 0%.
    attendance_rate: 0,
  };
};

// ====================== LAYOUT WRAPPER ======================
const DashboardLayout = ({ children, title, breadcrumbs = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top App Bar */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'var(--bg-sidebar)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
            Attendance System
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton component={Link} to="/manager/settings">
              <Settings />
            </IconButton>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <Person />
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1400px', mx: 'auto', width: '100%' }}>
          {/* Breadcrumbs */}
          <Breadcrumbs separator={<ChevronRight fontSize="small" />} sx={{ mb: 3 }}>
            <Link to="/manager/dashboard" style={{ textDecoration: 'none', color: 'text.secondary' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Home fontSize="small" />
                <Typography variant="body2">Dashboard</Typography>
              </Stack>
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <Typography key={i} variant="body2" color={i === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}>
                {crumb}
              </Typography>
            ))}
          </Breadcrumbs>

          {/* Page Title */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Typography variant="h4" fontWeight="bold">
              {title}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Box>

          {children}
        </Box>
      </Box>
    </Box>
  );
};

// ====================== DASHBOARD HOME ======================
const ManagerDashboardHome = () => {
  const [stats, setStats] = useState({
    teamCount: 0,
    presentToday: 0,
    pendingApprovals: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');

      // Use real Django endpoints:
      // - /api/employees/employees/ (scoped team for this manager/HR)
      // - /api/attendance/attendance/ (scoped attendance records)
      const [employeesRes, attendanceRes] = await Promise.all([
        api.get('/employees/employees/'),
        api.get('/attendance/attendance/'),
      ]);

      const employees = Array.isArray(employeesRes) ? employeesRes : [];
      const attendance = Array.isArray(attendanceRes) ? attendanceRes : [];

      const teamCount = employees.length;

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayRecords = attendance.filter((a) => a.date === todayStr);
      const presentToday = todayRecords.filter((a) => {
        const status = (a.status || '').toUpperCase();
        return status === 'PRESENT' || status === 'LATE';
      }).length;

      const pendingApprovals = todayRecords.filter(
        (a) => (a.status || '').toUpperCase() === 'ON_LEAVE',
      ).length;

      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const weeklyRecords = attendance.filter((a) => {
        if (!a.date) return false;
        const d = new Date(a.date);
        return d >= sevenDaysAgo && d <= now;
      });
      const weeklyPresent = weeklyRecords.filter(
        (a) => (a.status || '').toUpperCase() === 'PRESENT',
      ).length;
      const attendanceRate = weeklyRecords.length > 0
        ? Math.round((weeklyPresent / weeklyRecords.length) * 100)
        : 0;

      setStats({ teamCount, presentToday, pendingApprovals, attendanceRate });
    } catch (err) {
      setError('Unable to load dashboard data. Please check your manager permissions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Manager Dashboard">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manager Dashboard">
      {error && <Alert severity="warning" sx={{ mb: 4 }}>{error}</Alert>}

      {/* Stats Grid */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        {[
          { label: 'Team Size', value: stats.teamCount, icon: <Group />, color: 'primary', desc: 'Total members' },
          { label: 'Present Today', value: stats.presentToday, icon: <CheckCircle />, color: 'success', desc: 'Clocked in' },
          { label: 'Pending Approvals', value: stats.pendingApprovals, icon: <EventNote />, color: 'warning', desc: 'Awaiting review' },
          { label: 'Weekly Attendance', value: `${stats.attendanceRate}%`, icon: <TrendingUp />, color: 'info', desc: 'Last 7 days' },
        ].map((item, i) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={i}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2" gutterBottom>
                      {item.desc}
                    </Typography>
                    <Typography variant="h3" fontWeight="bold" color={`${item.color}.main`}>
                      {item.value}
                    </Typography>
                    <Typography variant="h6" fontWeight="medium" mt={1}>
                      {item.label}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${item.color}.light`, width: 64, height: 64 }}>
                    {React.cloneElement(item.icon, { sx: { fontSize: 36, color: `${item.color}.main` } })}
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Action Cards */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 4, '&:hover': { boxShadow: 8 } }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" alignItems="center" mb={3}>
                <People sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">Team Management</Typography>
                  <Typography color="text.secondary">Monitor attendance & performance</Typography>
                </Box>
              </Box>
              <Box mt="auto">
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    to="/manager/team"
                    startIcon={<People />}
                    fullWidth
                  >
                    View Team Members
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    to="/manager/reports"
                    startIcon={<Report />}
                    fullWidth
                  >
                    Generate Reports
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', boxShadow: 4, '&:hover': { boxShadow: 8 } }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" alignItems="center" mb={3}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">Approval Center</Typography>
                  <Typography color="text.secondary">Review pending requests</Typography>
                </Box>
              </Box>
              <Box mt="auto">
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  component={Link}
                  to="/manager/approvals"
                  startIcon={<CheckCircle />}
                  fullWidth
                >
                  Review {stats.pendingApprovals} Pending Request{stats.pendingApprovals !== 1 ? 's' : ''}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
};

// ====================== TEAM OVERVIEW ======================
const TeamOverviewPage = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => { fetchTeam(); }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      // Use the real employees endpoint scoped by the current manager/HR user.
      const data = await api.get('/employees/employees/');
      const employees = Array.isArray(data) ? data : [];
      setTeam(employees.map(mapEmployeeToTeamMember));
    } catch (err) {
      alert('Failed to load team members. Check permissions.');
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = team.filter(m => {
    const q = search.toLowerCase();
    return (
      (!search || 
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q)
      ) &&
      (deptFilter === 'all' || m.department === deptFilter) &&
      (statusFilter === 'all' || m.status?.toLowerCase() === statusFilter.toLowerCase())
    );
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const departments = ['all', ...new Set(team.map(m => m.department).filter(Boolean))];

  return (
    <DashboardLayout title="Team Overview" breadcrumbs={['Team Overview']}>
      <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')}><Cancel /></IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} label="Department">
                  {departments.map(d => (
                    <MenuItem key={d} value={d}>
                      {d === 'all' ? 'All Departments' : d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ boxShadow: 4 }}>
        <CardContent>
          {loading ? (
            <Box textAlign="center" py={10}><CircularProgress /></Box>
          ) : team.length === 0 ? (
            <Alert severity="info">No team members found. You may not have manager access.</Alert>
          ) : filtered.length === 0 ? (
            <Alert severity="info">No members match your search criteria.</Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Employee</strong></TableCell>
                      <TableCell><strong>Department</strong></TableCell>
                      <TableCell><strong>Role</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Attendance Rate</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map(member => (
                      <TableRow key={member.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.main' }}>{member.name?.[0] || '?'}</Avatar>
                            <Box>
                              <Typography fontWeight="medium">{member.name || 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">{member.email}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{member.department || '—'}</TableCell>
                        <TableCell>{member.role || '—'}</TableCell>
                        <TableCell>
                          <Chip label={member.status || '—'} size="small" color={getStatusColor(member.status)} />
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress variant="determinate" value={member.attendance_rate || 0} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
                            <Typography variant="body2" fontWeight="medium">{member.attendance_rate || 0}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Attendance History">
                            <IconButton onClick={() => navigate(`/manager/attendance/${member.id}`)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// ====================== PROFILE SETTINGS ======================
const ProfileSettingsPage = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.get('/accounts/users/me/');
      setProfile(data);
      setFormData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // The backend currently exposes only GET /api/accounts/users/me/.
    // Persisting profile changes would require a dedicated endpoint.
    alert('Profile editing via API is not implemented on the backend yet.');
    setEditing(false);
  };

  if (loading) return <DashboardLayout title="Settings"><CircularProgress /></DashboardLayout>;

  return (
    <DashboardLayout title="My Profile & Settings" breadcrumbs={['Settings']}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ boxShadow: 4 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h5" fontWeight="bold">Personal Information</Typography>
                <Button
                  variant={editing ? "outlined" : "contained"}
                  color={editing ? "error" : "primary"}
                  startIcon={editing ? <Cancel /> : <Edit />}
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? 'Cancel' : 'Edit Profile'}
                </Button>
              </Box>

              <Grid container spacing={3}>
                <Grid size={12} textAlign="center" mb={2}>
                  <Avatar sx={{ width: 120, height: 120, mx: 'auto', fontSize: 48, bgcolor: 'primary.main' }}>
                    {profile?.name?.[0] || 'U'}
                  </Avatar>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Full Name" fullWidth value={editing ? formData.name || '' : profile?.name || '—'}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={!editing} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Email Address" fullWidth value={profile?.email || '—'} disabled />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Department" fullWidth value={editing ? formData.department || '' : profile?.department || '—'}
                    onChange={e => setFormData({ ...formData, department: e.target.value })} disabled={!editing} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Role" fullWidth value={profile?.role || 'Manager'} disabled />
                </Grid>
              </Grid>

              {editing && (
                <Box mt={5} textAlign="right">
                  <Button variant="contained" size="large" startIcon={<Save />} onClick={handleSave}>
                    Save Changes
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ boxShadow: 4, height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Account Settings</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography color="text.secondary" paragraph>
                Advanced settings like password change, notifications, and theme preferences coming soon.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
};

// Placeholder Pages
const ApprovalCenterPage = () => (
  <DashboardLayout title="Approval Center" breadcrumbs={['Approvals']}>
    <Alert severity="info">Approval center implementation coming soon.</Alert>
  </DashboardLayout>
);

const TeamReportsPage = () => (
  <DashboardLayout title="Team Reports" breadcrumbs={['Reports']}>
    <Alert severity="info">Report generation features coming soon.</Alert>
  </DashboardLayout>
);

// ====================== MAIN ROUTER ======================
const ManagerDashboard = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<ManagerDashboardHome />} />
      <Route path="/team" element={<TeamOverviewPage />} />
      <Route path="/approvals" element={<ApprovalCenterPage />} />
      <Route path="/reports" element={<TeamReportsPage />} />
      <Route path="/settings" element={<ProfileSettingsPage />} />
      <Route path="*" element={<ManagerDashboardHome />} />
    </Routes>
  );
};

export default ManagerDashboard;