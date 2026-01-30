import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
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

  // Default date range: current month
  const defaultFrom = moment().startOf('month').format('YYYY-MM-DD');
  const defaultTo = moment().endOf('month').format('YYYY-MM-DD');

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      // FIXED: Use the correct endpoint with date filters
      const params = new URLSearchParams();
      params.append('date__gte', from);
      params.append('date__lte', to);
      
      // If employee, let backend filter by current user
      if (isEmployee) {
        params.append('mine', 'true');
      }
      
      const query = params.toString();
      const data = await api.get(`/attendance/attendance/${query ? `?${query}` : ''}`);
      
      // Handle response format
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data?.results && Array.isArray(data.results)) {
        list = data.results;
      } else if (data?.data && Array.isArray(data.data)) {
        list = data.data;
      }
      
      // Fetch employee data to enrich the attendance records
      let employeeMap = {};
      try {
        const employeesRes = await api.get('/employees/employees/');
        const employeesList = Array.isArray(employeesRes) ? employeesRes : employeesRes?.results || [];
        employeeMap = Object.fromEntries(
          employeesList.map(emp => [String(emp.id), emp])
        );
      } catch (empErr) {
        console.warn('Could not load employees:', empErr);
      }
      
      // Enrich attendance records with full employee data
      list = list.map(row => {
        const empId = String(row?.employee?.id || row?.employee || '');
        const fullEmployee = employeeMap[empId];
        
        if (fullEmployee) {
          return {
            ...row,
            employee: fullEmployee
          };
        }
        return row;
      });
      
      // Additional filtering for employees if backend doesn't support 'mine' param
      if (isEmployee && list.length > 0) {
        try {
          const user = await api.getCurrentUser();
          const userId = user?.id;
          if (userId) {
            list = list.filter(row => {
              const rowUserId = row?.employee?.user?.id || row?.user?.id;
              return String(rowUserId) === String(userId);
            });
          }
        } catch (userErr) {
          console.warn('Could not filter by user:', userErr);
        }
      }
      
      setRows(list);
    } catch (err) {
      console.error('Attendance load error:', err);
      
      // Check if it's a 404 error
      if (err?.status === 404) {
        setError('Attendance endpoint not found. Please contact administrator.');
      } else {
        setError('Unable to load attendance records. Please try again later.');
      }
      
      setRows([]);
      onNotify?.('Failed to fetch attendance data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [from, to, isEmployee]);

  // Real-time polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadAttendance, 30000);
    return () => clearInterval(interval);
  }, [from, to, isEmployee]);

  // Helper to safely get employee name
  const getEmployeeName = (row) => {
    if (!row) return '—';

    // Try to get employee object
    const employee = row?.employee;
    
    if (!employee) return 'No Employee Data';

    // Try different name sources in order of preference
    const name = employee?.full_name ||
                (employee?.first_name ? `${employee.first_name} ${employee.last_name || ''}`.trim() : '') ||
                employee?.user?.full_name ||
                (employee?.user?.first_name ? `${employee.user.first_name} ${employee.user.last_name || ''}`.trim() : '') ||
                employee?.employee_code ||
                (employee?.user?.email ? employee.user.email.split('@')[0] : '') ||
                row?.employee_name ||
                row?.name ||
                'Unknown Employee';
    
    return name.trim() || 'Unknown Employee';
  };

  const filteredRows = rows.filter((row) => {
    const status = (row?.status || '').toUpperCase();
    if (statusFilter !== 'ALL' && status !== statusFilter) return false;

    if (isEmployee || !search.trim()) return true;

    const searchLower = search.toLowerCase();
    const name = getEmployeeName(row).toLowerCase();
    const email = (row?.employee?.user?.email || row?.employee_email || '').toLowerCase();

    return name.includes(searchLower) || email.includes(searchLower);
  });

  const totalRecords = filteredRows.length;
  const presentCount = filteredRows.filter((r) => (r?.status || '').toUpperCase() === 'PRESENT').length;
  const lateCount = filteredRows.filter((r) => (r?.status || '').toUpperCase() === 'LATE').length;
  const absentCount = filteredRows.filter((r) => (r?.status || '').toUpperCase() === 'ABSENT').length;

  const totalHours = filteredRows.reduce((sum, r) => {
    if (r?.check_out_time && r?.check_in_time) {
      const diff = moment(r.check_out_time).diff(moment(r.check_in_time), 'seconds');
      return sum + diff / 3600;
    }
    return sum;
  }, 0).toFixed(2);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with live time */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="600">
          {heading}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Current Time: <strong>{currentTime}</strong>
        </Typography>
      </Stack>

      {/* Filters & Stats */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between" alignItems="flex-end">
            {/* Date range */}
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="From"
                type="date"
                size="small"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="To"
                type="date"
                size="small"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {/* Search & Status */}
            <Stack direction="row" spacing={2} alignItems="center">
              {!isEmployee && (
                <TextField
                  label="Search employee"
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ minWidth: 220 }}
                  placeholder="Name, code or email..."
                />
              )}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="PRESENT">Present</MenuItem>
                  <MenuItem value="LATE">Late</MenuItem>
                  <MenuItem value="ABSENT">Absent</MenuItem>
                  <MenuItem value="ON_LEAVE">On Leave</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {/* Stats Chips */}
          <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap' }}>
            <Chip label={`Total: ${totalRecords}`} color="primary" />
            <Chip label={`Present: ${presentCount}`} color="success" />
            <Chip label={`Late: ${lateCount}`} color="warning" />
            <Chip label={`Absent: ${absentCount}`} color="error" />
            <Chip label={`Total Hours: ${totalHours}`} color="info" />
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>
          ) : filteredRows.length === 0 ? (
            <Alert severity="info" sx={{ m: 3 }}>
              No attendance records found for the selected period and filters.
            </Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {!isEmployee && <TableCell><strong>Employee</strong></TableCell>}
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Clock In</strong></TableCell>
                  <TableCell><strong>Clock Out</strong></TableCell>
                  <TableCell><strong>Hours</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => {
                  const clockIn = row?.check_in_time
                    ? moment(row.check_in_time).format('hh:mm A')
                    : '—';

                  const clockOut = row?.check_out_time
                    ? moment(row.check_out_time).format('hh:mm A')
                    : '—';

                  const hours = row?.check_in_time && row?.check_out_time
                    ? moment(row.check_out_time).diff(moment(row.check_in_time), 'hours', true).toFixed(2)
                    : '—';

                  const status = (row?.status || '').toUpperCase();
                  let label = status || 'Unknown';
                  let color = 'default';

                  if (status === 'PRESENT') {
                    label = 'Present';
                    color = 'success';
                  } else if (status === 'LATE') {
                    label = 'Late';
                    color = 'warning';
                  } else if (status === 'ABSENT') {
                    label = 'Absent';
                    color = 'error';
                  } else if (status === 'ON_LEAVE') {
                    label = 'On Leave';
                    color = 'info';
                  }

                  const rowStyle = status === 'ABSENT' ? { backgroundColor: 'rgba(244, 67, 54, 0.08)' } : {};

                  return (
                    <TableRow key={row?.id || row?.date || Math.random()} hover sx={rowStyle}>
                      {!isEmployee && (
                        <TableCell>{getEmployeeName(row)}</TableCell>
                      )}
                      <TableCell>{row?.date || '—'}</TableCell>
                      <TableCell>{clockIn}</TableCell>
                      <TableCell>{clockOut}</TableCell>
                      <TableCell>{hours}</TableCell>
                      <TableCell>
                        <Chip label={label} color={color} size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AttendanceOverview;