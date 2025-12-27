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
  IconButton,
} from '@mui/material';
import { Delete } from '@mui/icons-material';

const Biometrics = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [enrollments, setEnrollments] = useState([
    {
      id: 1,
      employeeId: 'EMP-001',
      status: 'Enrolled',
      method: 'Face',
      lastSeen: '2025-12-26 09:05',
    },
    {
      id: 2,
      employeeId: 'EMP-010',
      status: 'Enrolled',
      method: 'Face',
      lastSeen: '2025-12-26 08:55',
    },
  ]);

  const handleEnroll = () => {
    if (!employeeId.trim()) return;
    const nextId = enrollments.length
      ? Math.max(...enrollments.map((e) => e.id)) + 1
      : 1;
    setEnrollments((prev) => [
      {
        id: nextId,
        employeeId: employeeId.trim(),
        status: 'Enrolled',
        method: 'Face',
        lastSeen: 'Not yet used',
      },
      ...prev,
    ]);
    setEmployeeId('');
  };

  const handleRemove = (id) => {
    setEnrollments((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Facial Recognition &amp; Biometrics (Optional)
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        This is a mock UI for managing facial recognition enrollment. In a real
        deployment, this would connect to a secure verification service and
        store only non-reversible biometric templates (feature vectors).
      </Typography>

      <Grid container spacing={3}>
        {/* Enrollment workflow description */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Enrollment Workflow (concept)
              </Typography>
              <ol style={{ paddingLeft: '1.25rem' }}>
                <li>Employee is identified and authenticated.</li>
                <li>High-quality face image is captured from a camera.</li>
                <li>
                  A feature vector (template) is generated on the server using a
                  computer vision model.
                </li>
                <li>Template is stored encrypted in the database.</li>
              </ol>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Important: raw face images should never be stored, only the
                anonymised template. Access to this data must be restricted.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Mock controls + enrollment list */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Enrollment Controls (mock)
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                These controls do not send data anywhere yet. They only document
                the intended UX.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="Employee ID"
                  size="small"
                  fullWidth
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="E.g. EMP-001"
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleEnroll}
                >
                  Mark enrolled
                </Button>
              </Box>
              <Button
                variant="outlined"
                size="small"
                sx={{ mr: 1 }}
              >
                Start camera (mock)
              </Button>
              <Button variant="outlined" size="small">
                Test verification (mock)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Enrolled Templates (mock data)
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Employee ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Last Seen</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrollments.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell>{e.employeeId}</TableCell>
                      <TableCell>{e.status}</TableCell>
                      <TableCell>{e.method}</TableCell>
                      <TableCell>{e.lastSeen}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemove(e.id)}
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
      </Grid>
    </Box>
  );
};

export default Biometrics;
