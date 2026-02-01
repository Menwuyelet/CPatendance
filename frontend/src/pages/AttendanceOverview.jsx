import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
  alpha,
  IconButton,
  Tooltip,
  TableContainer
} from '@mui/material';

import {
  Search, CheckCircle, AccessTime, ErrorOutline,
  Assessment, Timelapse, Refresh
} from '@mui/icons-material';

import moment from 'moment-timezone';
import { api } from '../services/api.service.js';

const AttendanceOverview = ({ role, onNotify }) => {
  const isEmployee = role === 'Employee';
  const isManager = role === 'Manager';
  const isHR = role === 'HR';
  const isAdmin = role === 'Admin';

  const heading = isEmployee
    ? 'My Daily Attendance'
    : isManager
    ? 'Team Attendance View'
    : isHR || isAdmin
    ? 'Attendance Overview'
    : 'Attendance Records';

  // Live current time
  const [currentTime, setCurrentTime] = useState(
    moment().tz('Africa/Addis_Ababa').format('hh:mm A z')
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment().tz('Africa/Addis_Ababa').format('hh:mm A z'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter States
  const [from, setFrom] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(moment().endOf('month').format('YYYY-MM-DD'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('date__gte', from);
      params.append('date__lte', to);
      if (isEmployee) params.append('mine', 'true');
      
      const query = params.toString();
      const data = await api.get(`/attendance/attendance/${query ? `?${query}` : ''}`);
      
      let list = Array.isArray(data) ? data : (data?.results || data?.data || []);
      
      // Enrich with employee names if not present
      let employeeMap = {};
      try {
        const employeesRes = await api.get('/employees/employees/');
        const employeesList = Array.isArray(employeesRes) ? employeesRes : employeesRes?.results || [];
        employeeMap = Object.fromEntries(
          employeesList.map(emp => [String(emp.id), emp])
        );
      } catch (empErr) {
        console.warn('Could not load employee details for enrichment');
      }
      
      const enrichedList = list.map(row => {
        const empId = String(row?.employee?.id || row?.employee || '');
        return employeeMap[empId] ? { ...row, employee: employeeMap[empId] } : row;
      });

      setRows(enrichedList);
    } catch (err) {
      console.error('Attendance load error:', err);
      setError('Unable to load records. Check your connection or permissions.');
      onNotify?.('Failed to fetch attendance data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [from, to, isEmployee, onNotify]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Search and Status Filter Logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Status Filter
      const status = (row?.status || '').toUpperCase();
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

      // 2. Search Filter (Only for Admin/Manager)
      let matchesSearch = true;
      if (!isEmployee && search.trim()) {
        const searchLower = search.toLowerCase();
        const emp = row?.employee;
        const name = (emp?.full_name || `${emp?.first_name} ${emp?.last_name}` || row?.employee_name || '').toLowerCase();
        const code = (emp?.employee_code || '').toLowerCase();
        matchesSearch = name.includes(searchLower) || code.includes(searchLower);
      }

      return matchesStatus && matchesSearch;
    });
  }, [rows, statusFilter, search, isEmployee]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = filteredRows.length;
    const present = filteredRows.filter(r => r.status?.toUpperCase() === 'PRESENT').length;
    const late = filteredRows.filter(r => r.status?.toUpperCase() === 'LATE').length;
    const absent = filteredRows.filter(r => r.status?.toUpperCase() === 'ABSENT').length;
    const hours = filteredRows.reduce((sum, r) => {
      if (r.check_out_time && r.check_in_time) {
        return sum + moment(r.check_out_time).diff(moment(r.check_in_time), 'hours', true);
      }
      return sum;
    }, 0).toFixed(1);

    return { total, present, late, absent, hours };
  }, [filteredRows]);

  const getStatusChip = (status) => {
    const s = (status || '').toUpperCase();
    const config = {
      PRESENT: { label: 'Present', color: 'success' },
      LATE: { label: 'Late', color: 'warning' },
      ABSENT: { label: 'Absent', color: 'error' },
      ON_LEAVE: { label: 'On Leave', color: 'info' },
    };
    const { label, color } = config[s] || { label: s || 'Unknown', color: 'default' };
    return <Chip label={label} color={color} size="small" variant="soft" sx={{ fontWeight: 600 }} />;
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 4, gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="700" color="primary.dark">
            {heading}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track attendance for the selected period
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="subtitle2" sx={{ bgcolor: alpha('#000', 0.05), px: 2, py: 1, borderRadius: '10px' }}>
              🕒 {currentTime}
            </Typography>
            <Tooltip title="Refresh Data">
              <span>
                <IconButton onClick={loadAttendance} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>
        </Stack>
      </Stack>

      {/* Modern Filter Card */}
      <Card 
        sx={{ 
          mb: 4, 
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid',
          borderColor: alpha('#000', 0.05)
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <GridContainer>
            <Stack direction="row" spacing={2} sx={{ gridColumn: { lg: 'span 1' } }}>
              <TextField
                label="From" type="date" size="small" value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="To" type="date" size="small" value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Stack>

            {!isEmployee && (
              <TextField
                label="Search Staff" placeholder="Name or ID..." size="small"
                value={search} onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            )}

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter} label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="ALL">All Status</MenuItem>
                <MenuItem value="PRESENT">Present</MenuItem>
                <MenuItem value="LATE">Late</MenuItem>
                <MenuItem value="ABSENT">Absent</MenuItem>
              </Select>
            </FormControl>
          </GridContainer>

          <Divider sx={{ my: 3 }} />

          {/* Stats Section */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <StatChip icon={<Assessment />} label="Total" value={stats.total} color="primary" />
            <StatChip icon={<CheckCircle />} label="Present" value={stats.present} color="success" />
            <StatChip icon={<AccessTime />} label="Late" value={stats.late} color="warning" />
            <StatChip icon={<ErrorOutline />} label="Absent" value={stats.absent} color="error" />
            <StatChip icon={<Timelapse />} label="Worked" value={`${stats.hours}h`} color="info" />
          </Box>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <TableContainer>
          {loading ? (
            <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>
          ) : (
            <Table>
              <TableHead sx={{ bgcolor: alpha('#000', 0.02) }}>
                <TableRow>
                  {!isEmployee && <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>}
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Clock In</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Clock Out</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hours</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No attendance records found for this selection.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const duration = row.check_in_time && row.check_out_time 
                        ? moment(row.check_out_time).diff(moment(row.check_in_time), 'hours', true).toFixed(2)
                        : '—';
                    
                    return (
                      <TableRow key={row.id} hover>
                        {!isEmployee && (
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
                              {row.employee?.full_name || row.employee_name || 'Staff User'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.employee?.employee_code || 'N/A'}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell>{moment(row.date).format('MMM DD, YYYY')}</TableCell>
                        <TableCell>{row.check_in_time ? moment(row.check_in_time).format('hh:mm A') : '—'}</TableCell>
                        <TableCell>{row.check_out_time ? moment(row.check_out_time).format('hh:mm A') : '—'}</TableCell>
                        <TableCell>{duration}</TableCell>
                        <TableCell>{getStatusChip(row.status)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>
    </Box>
  );
};

// Internal Helper Components for cleanliness
const GridContainer = ({ children }) => (
  <Box sx={{ 
    display: 'grid', 
    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }, 
    gap: 3, 
    alignItems: 'end' 
  }}>
    {children}
  </Box>
);

const StatChip = ({ icon, label, value, color }) => (
  <Chip 
    icon={icon}
    label={`${label}: ${value}`}
    sx={{ 
      borderRadius: '12px', 
      fontWeight: 700, 
      px: 1,
      bgcolor: (theme) => alpha(theme.palette[color].main, 0.1),
      color: `${color}.main`,
      '& .MuiChip-icon': { color: 'inherit' }
    }}
  />
);

export default AttendanceOverview;