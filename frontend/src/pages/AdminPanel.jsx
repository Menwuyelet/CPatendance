import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { People, EventNote, Settings, Report, Security } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const recentActivities = [
  {
    id: 1,
    title: 'Alice Employee applied for vacation leave',
    time: '10 minutes ago',
    status: 'Pending',
  },
  {
    id: 2,
    title: 'Mike Manager checked in at Office',
    time: '25 minutes ago',
    status: 'Completed',
  },
  {
    id: 3,
    title: 'November payroll processing completed',
    time: '2 hours ago',
    status: 'Completed',
  },
  {
    id: 4,
    title: 'Emma Designer submitted travel expense',
    time: '3 hours ago',
    status: 'Pending',
  },
];

const upcomingEvents = [
  {
    id: 1,
    label: 'Team Meeting',
    date: '2024-12-15 · 10:00 AM',
  },
  {
    id: 2,
    label: 'John Admin Birthday',
    date: '2024-12-16 · All Day',
  },
  {
    id: 3,
    label: 'Payroll Processing',
    date: '2024-12-20 · 2:00 PM',
  },
];

const AdminPanel = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {/* Top metrics */}
      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Total Employees</Typography>
              <Typography variant="h5">156</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Present Today</Typography>
              <Typography variant="h5">142</Typography>
              <Typography variant="body2" color="textSecondary">
                8 employees on leave
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Monthly Payroll</Typography>
              <Typography variant="h5">$450,000</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Pending Approvals</Typography>
              <Typography variant="h5">12</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Feature shortcuts */}
      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <People sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">User Management</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Manage all employees, roles, and departments.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate('/users')}
              >
                Go to Users
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <EventNote sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">Attendance</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                View and audit company-wide time entries.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate('/attendance')}
              >
                Open Attendance
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Report sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">Reports</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Generate payroll and compliance reports.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate('/reports')}
              >
                View Reports
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Settings sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">System Settings</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Configure policies, holidays, and integrations.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Security fontSize="small" />}
                onClick={() => navigate('/config')}
              >
                Open Settings
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activity and upcoming events */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activities
              </Typography>
              <List dense>
                {recentActivities.map((item) => (
                  <ListItem key={item.id} divider>
                    <ListItemText
                      primary={item.title}
                      secondary={`${item.time} · ${item.status}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Events
              </Typography>
              <List dense>
                {upcomingEvents.map((event) => (
                  <ListItem key={event.id} divider>
                    <ListItemText primary={event.label} secondary={event.date} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminPanel;
