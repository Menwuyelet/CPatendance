import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

const PolicyConfig = () => {
  // Shifts CRUD
  const [shifts, setShifts] = useState([
    { id: 1, name: 'Standard', hours: '09:00 - 17:30 (Mon-Fri)' },
    { id: 2, name: 'Night Shift', hours: '22:00 - 06:00' },
    { id: 3, name: 'Flexible', hours: 'Core hours 10:00 - 15:00' },
  ]);
  const [shiftForm, setShiftForm] = useState({ id: null, name: '', hours: '' });

  const handleShiftChange = (e) => {
    const { name, value } = e.target;
    setShiftForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleShiftSubmit = (e) => {
    e.preventDefault();
    if (!shiftForm.name || !shiftForm.hours) return;

    if (shiftForm.id) {
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftForm.id ? { ...shiftForm } : s))
      );
    } else {
      const nextId = shifts.length ? Math.max(...shifts.map((s) => s.id)) + 1 : 1;
      setShifts((prev) => [...prev, { ...shiftForm, id: nextId }]);
    }
    setShiftForm({ id: null, name: '', hours: '' });
  };

  const handleShiftEdit = (shift) => {
    setShiftForm(shift);
  };

  const handleShiftDelete = (id) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    if (shiftForm.id === id) {
      setShiftForm({ id: null, name: '', hours: '' });
    }
  };

  // Leave types CRUD
  const [leaveTypes, setLeaveTypes] = useState([
    { id: 1, name: 'Vacation', allowance: '20 days / year' },
    { id: 2, name: 'Sick', allowance: '10 days / year' },
    { id: 3, name: 'Paternity', allowance: '5 days / year' },
  ]);
  const [leaveForm, setLeaveForm] = useState({ id: null, name: '', allowance: '' });

  const handleLeaveChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeaveSubmit = (e) => {
    e.preventDefault();
    if (!leaveForm.name || !leaveForm.allowance) return;

    if (leaveForm.id) {
      setLeaveTypes((prev) =>
        prev.map((lt) => (lt.id === leaveForm.id ? { ...leaveForm } : lt))
      );
    } else {
      const nextId = leaveTypes.length
        ? Math.max(...leaveTypes.map((lt) => lt.id)) + 1
        : 1;
      setLeaveTypes((prev) => [...prev, { ...leaveForm, id: nextId }]);
    }
    setLeaveForm({ id: null, name: '', allowance: '' });
  };

  const handleLeaveEdit = (leave) => {
    setLeaveForm(leave);
  };

  const handleLeaveDelete = (id) => {
    setLeaveTypes((prev) => prev.filter((lt) => lt.id !== id));
    if (leaveForm.id === id) {
      setLeaveForm({ id: null, name: '', allowance: '' });
    }
  };

  // Holidays CRUD
  const [holidays, setHolidays] = useState([
    { id: 1, name: "New Year's Day", date: '2025-01-01' },
    { id: 2, name: 'Independence Day', date: '2025-07-04' },
    { id: 3, name: 'Foundation Day', date: '2025-09-01' },
  ]);
  const [holidayForm, setHolidayForm] = useState({
    id: null,
    name: '',
    date: '',
  });

  const handleHolidayChange = (e) => {
    const { name, value } = e.target;
    setHolidayForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleHolidaySubmit = (e) => {
    e.preventDefault();
    if (!holidayForm.name || !holidayForm.date) return;

    if (holidayForm.id) {
      setHolidays((prev) =>
        prev.map((h) => (h.id === holidayForm.id ? { ...holidayForm } : h))
      );
    } else {
      const nextId = holidays.length
        ? Math.max(...holidays.map((h) => h.id)) + 1
        : 1;
      setHolidays((prev) => [...prev, { ...holidayForm, id: nextId }]);
    }
    setHolidayForm({ id: null, name: '', date: '' });
  };

  const handleHolidayEdit = (holiday) => {
    setHolidayForm(holiday);
  };

  const handleHolidayDelete = (id) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    if (holidayForm.id === id) {
      setHolidayForm({ id: null, name: '', date: '' });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Policies &amp; System Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Define organization-wide rules such as working hours, shifts, leave types,
        holidays, and approval workflows. All data here is mock and stored only
        in browser state.
      </Typography>

      <Grid container spacing={3}>
        {/* Shifts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Working Hours &amp; Shifts
              </Typography>
              <Box component="form" onSubmit={handleShiftSubmit} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <TextField
                    label="Shift name"
                    size="small"
                    fullWidth
                    name="name"
                    value={shiftForm.name}
                    onChange={handleShiftChange}
                  />
                  <TextField
                    label="Hours / pattern"
                    size="small"
                    fullWidth
                    name="hours"
                    value={shiftForm.hours}
                    onChange={handleShiftChange}
                  />
                </Stack>
                <Button type="submit" variant="contained" size="small">
                  {shiftForm.id ? 'Update shift' : 'Add shift'}
                </Button>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id} hover>
                      <TableCell>{shift.name}</TableCell>
                      <TableCell>{shift.hours}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleShiftEdit(shift)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleShiftDelete(shift.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Leave types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Types
              </Typography>
              <Box component="form" onSubmit={handleLeaveSubmit} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <TextField
                    label="Type name"
                    size="small"
                    fullWidth
                    name="name"
                    value={leaveForm.name}
                    onChange={handleLeaveChange}
                  />
                  <TextField
                    label="Allowance"
                    size="small"
                    fullWidth
                    name="allowance"
                    value={leaveForm.allowance}
                    onChange={handleLeaveChange}
                    placeholder="e.g. 20 days / year"
                  />
                </Stack>
                <Button type="submit" variant="contained" size="small">
                  {leaveForm.id ? 'Update type' : 'Add type'}
                </Button>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Allowance</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveTypes.map((lt) => (
                    <TableRow key={lt.id} hover>
                      <TableCell>{lt.name}</TableCell>
                      <TableCell>{lt.allowance}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleLeaveEdit(lt)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleLeaveDelete(lt.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Holidays */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Organization Holidays
              </Typography>
              <Box component="form" onSubmit={handleHolidaySubmit} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <TextField
                    label="Holiday name"
                    size="small"
                    fullWidth
                    name="name"
                    value={holidayForm.name}
                    onChange={handleHolidayChange}
                  />
                  <TextField
                    label="Date"
                    type="date"
                    size="small"
                    name="date"
                    value={holidayForm.date}
                    onChange={handleHolidayChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
                <Button type="submit" variant="contained" size="small">
                  {holidayForm.id ? 'Update holiday' : 'Add holiday'}
                </Button>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holidays.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>{h.name}</TableCell>
                      <TableCell>{h.date}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleHolidayEdit(h)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleHolidayDelete(h.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Approval workflow - read-only description for now */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Approval Workflow (concept)
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                In the backend, approval chains can be configured per leave type
                and per department. A common pattern is:
              </Typography>
              <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                <li>Employee → Manager → HR for leave requests</li>
                <li>Critical policy changes require Admin approval</li>
              </ul>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PolicyConfig;
