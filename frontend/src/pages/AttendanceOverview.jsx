// src/pages/AttendanceOverview.jsx
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

  const [from, setFrom] = useState('2025-12-01');
  const [to, setTo] = useState('2025-12-31');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadAttendance = async () => {
      setLoading(true);
      setError('');
      try {
        // Use the correct attendance endpoint
        const data = await api.get('/attendance/attendance/');
        const list = Array.isArray(data) ? data : [];
        const filteredByDate = list.filter((row) => {
          const d = row.date;
          if (!d) return false;
          const afterFrom = !from || d >= from;
          const beforeTo = !to || d <= to;
          return afterFrom && beforeTo;
        });
        setRows(filteredByDate);
      } catch (err) {
        setError('Unable to load attendance records.');
        setRows([]);
        onNotify?.('Failed to fetch attendance data.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadAttendance();
  }, [from, to, isEmployee, onNotify]);

  const filteredRows = rows.filter((row) => {
    const status = (row.status || '').toUpperCase();
    if (statusFilter !== 'ALL' && status !== statusFilter) return false;
    if (!isEmployee && search.trim()) {
      const name = (row.employee?.full_name || row.employee_name || row.name || '').toLowerCase();
      const email = (row.employee?.user?.email || row.employee_email || '').toLowerCase();
      const searchLower = search.toLowerCase();
      if (!name.includes(searchLower) && !email.includes(searchLower)) return false;
    }
    return true;
  });

  const totalRecords = filteredRows.length;
  const presentCount = filteredRows.filter((r) => (r.status || '').toUpperCase() === 'PRESENT').length;
  const lateCount = filteredRows.filter((r) => (r.status || '').toUpperCase() === 'LATE').length;
  const absentCount = filteredRows.filter((r) => (r.status || '').toUpperCase() === 'ABSENT').length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="600">
        {heading}
      </Typography>

      <Grid container spacing={4}>
        {/* Attendance Table */}
        <Grid size={{ xs: 12 }}>
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
                        {!isEmployee && (
                          <TableCell>
                            {row.employee?.full_name || row.employee_name || row.employee || 'Unknown'}
                          </TableCell>
                        )}
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.check_in_time ? new Date(row.check_in_time).toLocaleString() : '-'}</TableCell>
                        <TableCell>{row.check_out_time ? new Date(row.check_out_time).toLocaleString() : '-'}</TableCell>
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

export default AttendanceOverview;

