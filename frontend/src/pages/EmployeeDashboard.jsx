import { Grid, Card, CardContent, Typography, Button } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const [clockedIn, setClockedIn] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Typography variant="h4" gutterBottom>
        My Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Status
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {clockedIn ? 'You are currently clocked in.' : 'You are not clocked in.'}
                    </Typography>
                    <Button
                      variant="contained"
                      color={clockedIn ? 'error' : 'success'}
                      fullWidth
                      onClick={() => setClockedIn(!clockedIn)}
                    >
                      {clockedIn ? 'Clock Out' : 'Clock In'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

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
                  </CardContent>
                </Card>
              </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Balance
              </Typography>
              <Typography>Annual: 12 days</Typography>
              <Typography>Sick: 5 days</Typography>
              <Typography>Other: 3 days</Typography>
              <Button
                variant="text"
                size="small"
                sx={{ mt: 1, p: 0 }}
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

export default EmployeeDashboard;
