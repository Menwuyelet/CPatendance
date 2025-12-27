import { Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
import { Dashboard, People, EventNote, Report } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// HR dashboard is now a clean hub for features – no demo data or fake database
const HRDashboard = () => {
  const navigate = useNavigate();

  return (
    <>
      <Typography variant="h4" gutterBottom>
        HR Dashboard
      </Typography>

      {/* Top row: high‑level HR areas that match the HR sidebar */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Dashboard sx={{ fontSize: 36, color: '#1976d2', mr: 1.5 }} />
                <Typography variant="h6">Overview</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Central landing page for HR to access all core features.
              </Typography>
              <Button variant="outlined" size="small" onClick={() => navigate('/dashboard')}>
                Stay on overview
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <People sx={{ fontSize: 36, color: '#4caf50', mr: 1.5 }} />
                <Typography variant="h6">Employees</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Add, edit and deactivate employee profiles. No data is loaded until you connect your backend.
              </Typography>
              <Button variant="contained" size="small" onClick={() => navigate('/employees')}>
                Go to employees
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <EventNote sx={{ fontSize: 36, color: '#ff9800', mr: 1.5 }} />
                <Typography variant="h6">Attendance</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                View and audit company attendance. This screen will use real records once APIs are wired.
              </Typography>
              <Button variant="contained" size="small" onClick={() => navigate('/attendance')}>
                Go to attendance
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <EventNote sx={{ fontSize: 36, color: '#9c27b0', mr: 1.5 }} />
                <Typography variant="h6">Leaves</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Approve or reject leave requests and track balances. Currently shows UI only, no demo database.
              </Typography>
              <Button variant="contained" size="small" onClick={() => navigate('/leaves')}>
                Go to leaves
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Second row: reporting and helper text */}
      <Grid container spacing={4} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Report sx={{ fontSize: 36, color: '#3f51b5', mr: 1.5 }} />
                <Typography variant="h6">Reports &amp; Analytics</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Generate HR reports (headcount, attendance, leave usage). Once your API is ready, this page will pull real metrics instead of demo data.
              </Typography>
              <Button variant="contained" size="small" onClick={() => navigate('/reports')}>
                Go to reports
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Getting started for HR
              </Typography>
              <Typography variant="body2" color="textSecondary">
                • Use <b>Employees</b> (in the sidebar) to maintain your employee master data.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                • Use <b>Attendance</b> to review daily presence/absence once integrated with biometrics or timesheets.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                • Use <b>Leaves</b> to manage approvals and leave policies.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                • Use <b>Reports</b> to export HR summaries for payroll and compliance.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default HRDashboard;
