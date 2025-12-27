import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  TextField,
  Stack,
} from '@mui/material';
import { People, EventNote, CheckCircle, Report } from '@mui/icons-material';

// Simple mock data for UI behaviour only (no real database)
const MOCK_TEAM = [
  { id: 1, name: 'John Doe', role: 'Sales Executive', status: 'Present' },
  { id: 2, name: 'Jane Smith', role: 'Account Manager', status: 'On Leave' },
  { id: 3, name: 'Alex Lee', role: 'Sales Lead', status: 'Present' },
];

const MOCK_APPROVALS = [
  { id: 101, employee: 'Jane Smith', type: 'Annual Leave', days: 3, status: 'Pending' },
  { id: 102, employee: 'Alex Lee', type: 'Work From Home', days: 1, status: 'Pending' },
];

const ManagerDashboardHome = () => (
  <>
    <Typography variant="h4" gutterBottom>
      Manager Dashboard
    </Typography>
    <Grid container spacing={4}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <People sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
              <Typography variant="h6">My Team</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              View your team list and high‑level status.
            </Typography>
            <Button size="small" variant="contained" component={Link} to="/team">
              Open team view
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <CheckCircle sx={{ fontSize: 40, color: '#4caf50', mr: 2 }} />
              <Typography variant="h6">Approvals</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Handle leave and attendance approvals for your team.
            </Typography>
            <Button
              size="small"
              variant="contained"
              component={Link}
              to="/approvals"
            >
              Go to approvals
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <Report sx={{ fontSize: 40, color: '#3f51b5', mr: 2 }} />
              <Typography variant="h6">Reports</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Download basic team‑level reports once APIs are ready.
            </Typography>
            <Button size="small" variant="contained" component={Link} to="/reports">
              Go to reports
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </>
);

const TeamOverviewPage = () => {
  const [search, setSearch] = useState('');

  const filteredTeam = MOCK_TEAM.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Team Overview
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search team
          </Typography>
          <TextField
            label="Search by name"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Team members (mock UI only)
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTeam.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>No team members match this search.</TableCell>
                </TableRow>
              ) : (
                filteredTeam.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      <Chip
                        label={member.status}
                        size="small"
                        color={member.status === 'Present' ? 'success' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Replace MOCK_TEAM with a real response from /api/manager/team when your
            backend is ready.
          </Typography>
        </CardContent>
      </Card>
    </>
  );
};

const ApprovalCenterPage = () => {
  const [items, setItems] = useState(MOCK_APPROVALS);

  const handleUpdateStatus = (id, status) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Approval Center
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pending items (mock data)
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No pending items.</TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.employee}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.days}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        size="small"
                        color={
                          item.status === 'Approved'
                            ? 'success'
                            : item.status === 'Rejected'
                            ? 'error'
                            : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleUpdateStatus(item.id, 'Approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleUpdateStatus(item.id, 'Rejected')}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            When you have an API (e.g. /api/manager/approvals), load items from
            there and send status updates back to the server.
          </Typography>
        </CardContent>
      </Card>
    </>
  );
};

const TeamReportsPage = () => (
  <>
    <Typography variant="h4" gutterBottom>
      Team Reports
    </Typography>
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick exports
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          These buttons are disabled until you plug in your reporting service.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" size="small" disabled>
            Export attendance (CSV)
          </Button>
          <Button variant="contained" size="small" disabled>
            Export leave summary (CSV)
          </Button>
        </Stack>
      </CardContent>
    </Card>
  </>
);

const ManagerDashboard = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<ManagerDashboardHome />} />
      <Route path="/team" element={<TeamOverviewPage />} />
      <Route path="/approvals" element={<ApprovalCenterPage />} />
      <Route path="/reports" element={<TeamReportsPage />} />
      <Route path="*" element={<Typography>Page coming soon...</Typography>} />
    </Routes>
  );
};

export default ManagerDashboard;
