// src/pages/Attendance.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Button,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { api } from '../services/api.service.js';

const Attendance = ({ role, onNotify }) => {
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

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(null);
  const [from, setFrom] = useState('2025-12-01');
  const [to, setTo] = useState('2025-12-31');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PRESENT, LATE, ABSENT
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadAttendance = async () => {
      setLoading(true);
      setError('');

      try {
        // Backend exposes: GET /api/attendance/attendance/ (scoped by user).
        // It does NOT understand from/to/scope query params, so we fetch
        // once and filter by date range on the frontend.
        const data = await api.get('/attendance/attendance/');
        const list = Array.isArray(data) ? data : [];

        const filteredByDate = list.filter((row) => {
          const d = row.date; // "YYYY-MM-DD"
          if (!d) return false;
          const afterFrom = !from || d >= from;
          const beforeTo = !to || d <= to;
          return afterFrom && beforeTo;
        });

        setRows(filteredByDate);
        
        // Check if user is currently clocked in (for employee view)
        if (isEmployee) {
          const today = new Date().toISOString().slice(0, 10);
          const todayRecords = filteredByDate.filter((r) => r.date === today);
          const activeRecord = todayRecords.find(
            (r) => r.check_in_time && !r.check_out_time
          );
          if (activeRecord) {
            setIsClockedIn(true);
            if (activeRecord.check_in_time) {
              const time = new Date(activeRecord.check_in_time).toLocaleTimeString();
              setLastActionTime(time);
            }
          } else {
            setIsClockedIn(false);
          }
        }
      } catch (err) {
        setError('Unable to load attendance records.');
        setRows([]);
        onNotify?.('Failed to fetch attendance data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
    // Important: do NOT depend on `onNotify` here, otherwise every toast
    // update from the parent will re-create the function and refetch.
  }, [from, to, isEmployee, isManager]);

  const filteredRows = rows.filter((row) => {
    const status = (row.status || '').toUpperCase();
    if (statusFilter !== 'ALL' && status !== statusFilter) return false;

    if (!isEmployee && search.trim()) {
      // Backend sends `employee` as an ID; we don't yet have the name here,
      // so search currently only applies to whatever `row.name` might be.
      const name = (row.name || '').toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const totalRecords = filteredRows.length;
  const presentCount = filteredRows.filter((r) => (r.status || '').toUpperCase() === 'PRESENT').length;
  const lateCount = filteredRows.filter((r) => (r.status || '').toUpperCase() === 'LATE').length;
  const absentCount = filteredRows.filter((r) => (r.status || '').toUpperCase() === 'ABSENT').length;

  const handleClockToggle = async () => {
    const action = isClockedIn ? 'out' : 'in';
    const now = new Date().toLocaleTimeString();

    try {
      if (!isClockedIn) {
        // CHECK-IN: POST /api/attendance/attendance/
        const response = await api.post('/attendance/attendance/', {});
        setIsClockedIn(true);
        setLastActionTime(now);
        onNotify?.(`Successfully clocked ${action}.`, 'success');
      } else {
        // CHECK-OUT: Need to find the current attendance record first
        // Get today's attendance records
        const today = new Date().toISOString().slice(0, 10);
        const records = await api.get(`/attendance/attendance/?date=${today}`);
        const todayRecords = Array.isArray(records) ? records : [];
        
        // Find the record that's checked in but not checked out
        const activeRecord = todayRecords.find(
          (r) => r.check_in_time && !r.check_out_time
        );
        
        if (activeRecord && activeRecord.id) {
          await api.put(`/attendance/attendance/${activeRecord.id}/`, {});
          setIsClockedIn(false);
          setLastActionTime(now);
          onNotify?.(`Successfully clocked ${action}.`, 'success');
        } else {
          throw new Error('No active attendance record found');
        }
      }
    } catch (err) {
      console.error('Clock action failed:', err);
      onNotify?.(`Failed to clock ${action}. ${err.message || 'Please try again.'}`, 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="600">
        {heading}
      </Typography>

      <Grid container spacing={4}>
        {/* Clock In/Out Card - Only for Employee */}
        {isEmployee && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Time Clock
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  color={isClockedIn ? 'error' : 'success'}
                  onClick={handleClockToggle}
                  sx={{ py: 2, fontSize: '1.1rem' }}
                >
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </Button>
                <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
                  Status: <strong>{isClockedIn ? 'Clocked In' : 'Clocked Out'}</strong>
                  {lastActionTime && <><br />Last: {lastActionTime}</>}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Attendance Table */}
        <Grid item xs={12} md={isEmployee ? 8 : 12}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                <Stack direction="row" spacing={2}>
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

                <Stack direction="row" spacing={2} alignItems="center">
                  {!isEmployee && (
                    <TextField
                      label="Search employee"
                      size="small"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      sx={{ minWidth: 200 }}
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
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Chip label={`Total: ${totalRecords}`} />
                <Chip label={`Present: ${presentCount}`} color="success" />
                <Chip label={`Late: ${lateCount}`} color="warning" />
                <Chip label={`Absent: ${absentCount}`} color="error" />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : rows.length === 0 ? (
                <Alert severity="info">No attendance records found for the selected period.</Alert>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      {!isEmployee && <TableCell><strong>Employee</strong></TableCell>}
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Clock In</strong></TableCell>
                      <TableCell><strong>Clock Out</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id} hover>
                        {!isEmployee && <TableCell>{row.employee /* UUID/ID */}</TableCell>}
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.check_in_time || '-'}</TableCell>
                        <TableCell>{row.check_out_time || '-'}</TableCell>
                        <TableCell>
                          {(() => {
                            const status = (row.status || '').toUpperCase();
                            const niceLabel =
                              status === 'PRESENT' ? 'Present' :
                              status === 'LATE' ? 'Late' :
                              status === 'ABSENT' ? 'Absent' :
                              status === 'ON_LEAVE' ? 'On Leave' : status || '-';
                            const color =
                              status === 'PRESENT' ? 'success' :
                              status === 'LATE' ? 'warning' :
                              status === 'ABSENT' ? 'error' : 'default';

                            return (
                              <Chip
                                label={niceLabel}
                                size="small"
                                color={color}
                              />
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Attendance;