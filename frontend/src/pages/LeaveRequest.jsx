import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Stack,
} from '@mui/material';

const LeaveRequest = ({ role, onNotify }) => {
  const isEmployee = role === 'Employee';
  const heading = isEmployee
    ? 'My Leave Requests'
    : role === 'Manager'
    ? 'Department Leave Approval Center'
    : role === 'HR'
    ? 'Company-wide Leave Management'
    : 'System Leave Oversight';

  const [form, setForm] = useState({
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [requests, setRequests] = useState([
    {
      id: 1,
      employee: 'John Doe',
      type: 'Vacation',
      dates: '2025-12-28 → 2025-12-30',
      status: 'Pending',
    },
    {
      id: 2,
      employee: 'Jane Smith',
      type: 'Sick',
      dates: '2025-12-20 → 2025-12-21',
      status: 'Approved',
    },
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason) {
      alert('Please fill all fields');
      return;
    }

    const newRequest = {
      id: requests.length + 1,
      employee: 'You',
      type: form.type,
      dates: `${form.startDate} → ${form.endDate}`,
      status: 'Pending',
    };

    setRequests((prev) => [newRequest, ...prev]);
    setForm({ type: 'Vacation', startDate: '', endDate: '', reason: '' });
    if (onNotify) {
      onNotify('Leave request submitted (mock).');
    }
  };

  const canApprove = role === 'Manager' || role === 'HR' || role === 'Admin';

  const handleApprove = (id, status) => {
    if (!canApprove) return;
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? {
              ...req,
              status,
            }
          : req
      )
    );
    if (onNotify) {
      onNotify(`Request ${status.toLowerCase()} (mock).`);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        {heading}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        This page lets employees submit leave requests and lets managers / HR /
        Admin review and update them. All data is in local state only.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Requests
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {!isEmployee && <TableCell>Employee</TableCell>}
                    <TableCell>Type</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Status</TableCell>
                    {canApprove && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      {!isEmployee && <TableCell>{request.employee}</TableCell>}
                      <TableCell>{request.type}</TableCell>
                      <TableCell>{request.dates}</TableCell>
                      <TableCell>
                        <Chip
                          label={request.status}
                          size="small"
                          color={
                            request.status === 'Approved'
                              ? 'success'
                              : request.status === 'Rejected'
                              ? 'error'
                              : 'warning'
                          }
                        />
                      </TableCell>
                      {canApprove && (
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              variant="outlined"
                              size="small"
                              color="success"
                              onClick={() => handleApprove(request.id, 'Approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              onClick={() => handleApprove(request.id, 'Rejected')}
                            >
                              Reject
                            </Button>
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isEmployee ? 'Submit New Leave Request' : 'Review & Actions'}
              </Typography>

              {isEmployee ? (
                <Box
                  component="form"
                  onSubmit={handleSubmit}
                  sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
                >
                  <FormControl size="small" fullWidth>
                    <InputLabel id="leave-type-label">Type</InputLabel>
                    <Select
                      labelId="leave-type-label"
                      label="Type"
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                    >
                      <MenuItem value="Vacation">Vacation</MenuItem>
                      <MenuItem value="Sick">Sick</MenuItem>
                      <MenuItem value="Paternity">Paternity</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Start date"
                    type="date"
                    name="startDate"
                    size="small"
                    value={form.startDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />

                  <TextField
                    label="End date"
                    type="date"
                    name="endDate"
                    size="small"
                    value={form.endDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />

                  <TextField
                    label="Reason"
                    name="reason"
                    size="small"
                    value={form.reason}
                    onChange={handleChange}
                    multiline
                    minRows={3}
                    fullWidth
                  />

                  <Button type="submit" variant="contained" size="small">
                    Submit request
                  </Button>
                </Box>
              ) : (
                <>
                  <Typography variant="body2" color="textSecondary">
                    • Review pending requests in the table on the left.
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Use Approve / Reject buttons to update status.
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Later, this will call a backend LeaveRequests API.
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LeaveRequest;
