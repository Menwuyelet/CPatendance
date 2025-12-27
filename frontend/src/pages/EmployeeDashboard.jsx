import { Grid, Card, CardContent, Typography, Button, Box, Chip, Stack } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';

const EmployeeDashboard = () => {
  const [clockedIn, setClockedIn] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(null);
  const navigate = useNavigate();

  const handleClockToggle = async () => {
    const now = new Date().toLocaleTimeString();
    const nextStatus = !clockedIn;
    try {
      const action = nextStatus ? 'in' : 'out';
      // CHECK-IN: POST /api/attendance/attendance/
      // CHECK-OUT: PUT /api/attendance/attendance/{id}/ (id not actually used)
      if (nextStatus) {
        await api.post('/attendance/attendance/', {});
      } else {
        await api.put('/attendance/attendance/self/', {});
      }
    } catch (error) {
      // Fallback: local-only update if backend is not ready
      console.warn('Clock API failed, keeping local state only:', error);
    }
    setClockedIn(nextStatus);
    setLastActionTime(now);
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        My Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Status & quick actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status
              </Typography>
              <Typography variant="body1" gutterBottom>
                {clockedIn ? 'You are currently clocked in.' : 'You are not clocked in.'}
              </Typography>
              {lastActionTime && (
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Last action at {lastActionTime}
                </Typography>
              )}
              <Button
                variant="contained"
                color={clockedIn ? 'error' : 'success'}
                fullWidth
                onClick={handleClockToggle}
                sx={{ mb: 1 }}
              >
                {clockedIn ? 'Clock Out' : 'Clock In'}
              </Button>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/attendance')}
                >
                  View attendance
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate('/reports')}
                >
                  My reports
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Today shift */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today&apos;s Shift
              </Typography>
              <Typography>09:00 – 17:00 (1h break)</Typography>
              <Typography variant="body2" color="textSecondary">
                Location: Head Office
              </Typography>
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Quick tips
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • Remember to clock in at the start and clock out at the end of your shift.
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • If your shift time is wrong, contact your manager or HR.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Leave balance */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Balance
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip label="Annual: 12 days" color="primary" size="small" />
                <Chip label="Sick: 5 days" color="success" size="small" />
              </Stack>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Other: 3 days
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => navigate('/leaves')}
              >
                View / request leave
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default EmployeeDashboard;
