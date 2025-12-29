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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
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

  // --- Shift management state (frontend only) ---
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftError, setShiftError] = useState('');
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const emptyShiftForm = {
    name: '',
    start_time: '',
    end_time: '',
    description: '',
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  };
  const [shiftForm, setShiftForm] = useState(emptyShiftForm);

  const canManageShifts = isHR || isManager;

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

  // Load shifts once per mount (and when role changes)
  useEffect(() => {
    const loadShifts = async () => {
      setShiftsLoading(true);
      setShiftError('');
      try {
        const data = await api.get('/attendance/shifts/');
        const list = Array.isArray(data) ? data : [];
        setShifts(list);
      } catch (err) {
        console.error('Unable to load shifts:', err);
        setShifts([]);
        setShiftError('Unable to load shifts.');
        onNotify?.('Failed to fetch shifts from server.', 'error');
      } finally {
        setShiftsLoading(false);
      }
    };

    // Everyone can VIEW shifts; only HR/Manager can edit.
    loadShifts();
  }, [role, onNotify]);

  const handleShiftFieldChange = (field, value) => {
    setShiftForm((prev) => ({ ...prev, [field]: value }));
  };

  const openShiftDialogForCreate = () => {
    setEditingShift(null);
    setShiftForm(emptyShiftForm);
    setShiftDialogOpen(true);
  };

  const openShiftDialogForEdit = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name || '',
      start_time: shift.start_time || '',
      end_time: shift.end_time || '',
      description: shift.description || '',
      monday: !!shift.monday,
      tuesday: !!shift.tuesday,
      wednesday: !!shift.wednesday,
      thursday: !!shift.thursday,
      friday: !!shift.friday,
      saturday: !!shift.saturday,
      sunday: !!shift.sunday,
    });
    setShiftDialogOpen(true);
  };

  const closeShiftDialog = () => {
    setShiftDialogOpen(false);
    setEditingShift(null);
    setShiftForm(emptyShiftForm);
  };

  const handleSubmitShift = async () => {
    if (!canManageShifts) return;

    const payload = {
      name: shiftForm.name,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      description: shiftForm.description,
      monday: shiftForm.monday,
      tuesday: shiftForm.tuesday,
      wednesday: shiftForm.wednesday,
      thursday: shiftForm.thursday,
      friday: shiftForm.friday,
      saturday: shiftForm.saturday,
      sunday: shiftForm.sunday,
    };

    try {
      let result;
      if (editingShift && editingShift.id) {
        result = await api.patch(`/attendance/shifts/${editingShift.id}/`, payload);
        onNotify?.('Shift updated successfully.', 'success');
      } else {
        result = await api.post('/attendance/shifts/', payload);
        onNotify?.('Shift created successfully.', 'success');
      }

      // Update local list optimistically
      setShifts((prev) => {
        if (editingShift && editingShift.id) {
          return prev.map((s) => (s.id === result.id ? result : s));
        }
        return [...prev, result];
      });

      closeShiftDialog();
      setShiftError('');
    } catch (err) {
      console.error('Failed to save shift:', err);
      const message = err?.message || 'Failed to save shift.';
      setShiftError(message);
      onNotify?.(message, 'error');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!canManageShifts) return;
    const confirmed = window.confirm('Are you sure you want to delete this shift?');
    if (!confirmed) return;
    try {
      await api.delete(`/attendance/shifts/${shiftId}/`);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      onNotify?.('Shift deleted successfully.', 'success');
    } catch (err) {
      console.error('Failed to delete shift:', err);
      setShiftError('Failed to delete shift.');
      onNotify?.('Failed to delete shift.', 'error');
    }
  };

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

      {/* Shifts Management (connected to backend, frontend-only changes) */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Shifts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          View all defined shifts. HR and Managers can add or edit shifts; Admin has read-only access.
        </Typography>

        <Card>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ mb: 2 }}
            >
              <Typography variant="h6">Shift List</Typography>
              {canManageShifts && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openShiftDialogForCreate}
                  size="small"
                >
                  Add Shift
                </Button>
              )}
            </Stack>

            {shiftError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setShiftError('')}>
                {shiftError}
              </Alert>
            )}

            {shiftsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : shifts.length === 0 ? (
              <Alert severity="info">No shifts defined yet.</Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Time</strong></TableCell>
                    <TableCell><strong>Days</strong></TableCell>
                    {canManageShifts && (
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shifts.map((shift) => {
                    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                      .filter((d) => shift[d])
                      .map((d) => d.charAt(0).toUpperCase());
                    return (
                      <TableRow key={shift.id} hover>
                        <TableCell>{shift.name}</TableCell>
                        <TableCell>
                          {shift.start_time}  {shift.end_time}
                        </TableCell>
                        <TableCell>{days.length ? days.join(' ') : ''}</TableCell>
                        {canManageShifts && (
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openShiftDialogForEdit(shift)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteShift(shift.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={shiftDialogOpen} onClose={closeShiftDialog} fullWidth maxWidth="sm">
          <DialogTitle>{editingShift ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
          <DialogContent dividers>
            <TextField
              margin="normal"
              label="Name"
              fullWidth
              value={shiftForm.name}
              onChange={(e) => handleShiftFieldChange('name', e.target.value)}
              required
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Start Time"
                type="time"
                fullWidth
                value={shiftForm.start_time}
                onChange={(e) => handleShiftFieldChange('start_time', e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                required
              />
              <TextField
                label="End Time"
                type="time"
                fullWidth
                value={shiftForm.end_time}
                onChange={(e) => handleShiftFieldChange('end_time', e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                required
              />
            </Stack>
            <TextField
              margin="normal"
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={shiftForm.description}
              onChange={(e) => handleShiftFieldChange('description', e.target.value)}
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Days
              </Typography>
              <FormGroup row>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={shiftForm[day]}
                        onChange={(e) => handleShiftFieldChange(day, e.target.checked)}
                      />
                    }
                    label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  />
                ))}
              </FormGroup>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeShiftDialog}>Cancel</Button>
            {canManageShifts && (
              <Button onClick={handleSubmitShift} variant="contained">
                {editingShift ? 'Save' : 'Create'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Attendance;
