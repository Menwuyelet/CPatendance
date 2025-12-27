import React, { useState } from 'react';
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
} from '@mui/material';

const Attendance = ({ role, onNotify }) => {
  const isEmployee = role === 'Employee';
  const isManager = role === 'Manager';
  const isHR = role === 'HR';

  const heading = isEmployee
    ? 'My Daily Attendance'
    : isManager
    ? 'Team Attendance View'
    : isHR
    ? 'Company Attendance Overview'
    : 'System-wide Attendance Audit';

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(null);
  const [from, setFrom] = useState('2025-12-01');
  const [to, setTo] = useState('2025-12-31');

  const rows = [
    {
      id: 1,
      employee: 'John Doe',
      date: '2025-12-26',
      in: '09:00',
      out: '17:30',
      status: 'Present',
    },
    {
      id: 2,
      employee: 'Jane Smith',
      date: '2025-12-25',
      in: '09:15',
      out: '18:00',
      status: 'Late',
    },
  ];

  const handleClockToggle = () => {
    const now = new Date().toLocaleTimeString();
    setIsClockedIn((prev) => !prev);
    setLastActionTime(now);
    if (onNotify) {
      onNotify(
        isClockedIn
          ? 'Clocked out successfully (mock)'
          : 'Clocked in successfully (mock)'
      );
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        {heading}
      </Typography>

      <Grid container spacing={3}>
        {isEmployee && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Live Time Tracking (mock)
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Use this control to clock-in / clock-out. It only updates local
                  state for now.
                </Typography>
                <Button
                  variant="contained"
                  color={isClockedIn ? 'error' : 'success'}
                  fullWidth
                  onClick={handleClockToggle}
                  sx={{ mb: 1 }}
                >
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </Button>
                <Typography variant="body2" color="textSecondary">
                  Status: {isClockedIn ? 'Currently clocked-in' : 'Currently clocked-out'}
                  {lastActionTime && ` (last at ${lastActionTime})`}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={isEmployee ? 8 : 12}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} alignItems="center">
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
                <Stack direction="row" spacing={1}>
                  {(isManager || isHR) && (
                    <Chip label="Late arrivals" size="small" color="warning" />
                  )}
                  {isHR && (
                    <Chip label="Overtime" size="small" color="info" />
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendance records (mock data)
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {!isEmployee && <TableCell>Employee</TableCell>}
                    <TableCell>Date</TableCell>
                    <TableCell>Clock-in</TableCell>
                    <TableCell>Clock-out</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      {!isEmployee && <TableCell>{row.employee}</TableCell>}
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.in}</TableCell>
                      <TableCell>{row.out}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={row.status === 'Present' ? 'success' : 'warning'}
                          variant={row.status === 'Present' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Attendance;
