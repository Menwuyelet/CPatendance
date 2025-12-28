// src/pages/Biometrics.jsx
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Paper,
  Stack,
  Avatar,
  Divider,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';

import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';

import {
  Fingerprint,
  Security,
  CameraAlt,
  HowToReg,
  PersonAdd,
  CheckCircleOutline,
  Schedule,
  Shield,
  Info,
} from '@mui/icons-material';

const Biometrics = ({ onNotify }) => {
  const [tabValue, setTabValue] = useState(0);
  const [employeeId, setEmployeeId] = useState('');

  const stats = {
    totalEnrolled: 0,
    activeToday: 0,
    totalRevoked: 0,
    securityLevel: 'High',
  };

  const handleEnrollClick = () => {
    if (!employeeId.trim()) {
      onNotify?.('Please enter an Employee ID', 'warning');
      return;
    }
    onNotify?.('Biometric enrollment will be available soon!', 'info');
    setEmployeeId('');
  };

  return (
    <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: '1600px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 7 }}>
        <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 2 }}>
          <Fingerprint sx={{ fontSize: 56, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" fontWeight="bold">
              Biometric System
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Advanced facial recognition for secure, contactless attendance
            </Typography>
          </Box>
          <Chip
            label="Coming Soon"
            color="warning"
            icon={<Schedule />}
            sx={{ ml: 'auto', px: 2, py: 1, fontWeight: 'bold', fontSize: '0.95rem' }}
          />
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {[
          { value: stats.totalEnrolled, label: 'Total Enrolled', icon: <HowToReg />, color: 'primary' },
          { value: stats.activeToday, label: 'Active Today', icon: <CheckCircleOutline />, color: 'success' },
          { value: stats.totalRevoked, label: 'Revoked', icon: <Shield />, color: 'error' },
          { value: stats.securityLevel, label: 'Security Level', icon: <Security />, color: 'info' },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: 6,
                bgcolor: `${stat.color}.light`,
                color: `${stat.color}.contrastText`,
                transition: 'transform 0.3s',
                '&:hover': { transform: 'translateY(-8px)' },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 5 }}>
                <Box sx={{ mb: 2 }}>
                  {React.cloneElement(stat.icon, { sx: { fontSize: 60, opacity: 0.9 } })}
                </Box>
                <Typography variant="h3" fontWeight="bold">
                  {stat.value}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs Section */}
      <Paper elevation={6} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            bgcolor: 'primary.main',
            '& .MuiTab-root': {
              color: 'white',
              opacity: 0.8,
              fontWeight: 'medium',
              py: 2.5,
            },
            '& .Mui-selected': {
              color: 'white',
              opacity: 1,
              fontWeight: 'bold',
            },
          }}
        >
          <Tab label="Overview" />
          <Tab label="Enrollment Process" />
          <Tab label="Security & Privacy" />
        </Tabs>

        <Box sx={{ p: { xs: 4, md: 6 } }}>
          {/* Overview */}
          {tabValue === 0 && (
            <Grid container spacing={6}>
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 5, borderRadius: 4, height: '100%', bgcolor: 'grey.50' }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Info sx={{ color: 'info.main' }} />
                    Current Status
                  </Typography>
                  <Alert severity="info" sx={{ borderRadius: 3, p: 3 }}>
                    <Typography variant="body1" fontWeight="medium">
                      Biometric system is under active development
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Facial recognition enrollment and verification will be available soon. Employees will enjoy touchless clock-in with enterprise-grade security.
                    </Typography>
                  </Alert>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 5, borderRadius: 4 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>
                    Key Benefits
                  </Typography>
                  <Timeline>
                    {[
                      { title: 'Touchless & Hygienic', desc: 'No physical contact required', color: 'primary' },
                      { title: 'Lightning Fast', desc: 'Verification in under 1 second', color: 'success' },
                      { title: 'Anti-Spoofing Protection', desc: 'Detects photos, videos, and masks', color: 'warning' },
                      { title: 'Privacy First', desc: 'Raw images deleted instantly', color: 'info' },
                    ].map((item, i) => (
                      <TimelineItem key={i}>
                        <TimelineSeparator>
                          <TimelineDot color={item.color} />
                          {i < 3 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="body1" fontWeight="medium">
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.desc}
                          </Typography>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Enrollment Process */}
          {tabValue === 1 && (
            <Grid container spacing={6}>
              <Grid item xs={12} lg={7}>
                <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
                  <CardHeader
                    title={<Typography variant="h5" fontWeight="bold">Enroll New Employee</Typography>}
                    subheader="Secure facial recognition setup"
                  />
                  <Divider />
                  <CardContent sx={{ pt: 4 }}>
                    <Stack spacing={5}>
                      <Paper
                        sx={{
                          height: 420,
                          borderRadius: 4,
                          bgcolor: 'grey.100',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '3px dashed',
                          borderColor: 'grey.400',
                        }}
                      >
                        <CameraAlt sx={{ fontSize: 100, color: 'grey.600', mb: 3 }} />
                        <Typography variant="h5" fontWeight="medium" color="text.secondary">
                          Camera Preview
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, textAlign: 'center', maxWidth: 400 }}>
                          Live face detection and alignment guide will appear here during real enrollment
                        </Typography>
                      </Paper>

                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="end">
                        <TextField
                          fullWidth
                          label="Employee ID"
                          placeholder="e.g., EMP-2025-001"
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          disabled
                          helperText="Enter a registered employee ID"
                          InputProps={{
                            startAdornment: <PersonAdd sx={{ color: 'action.disabled', mr: 2 }} />,
                          }}
                        />
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<Fingerprint />}
                          disabled
                          sx={{ px: 6, py: 2.2, borderRadius: 3 }}
                        >
                          Start Enrollment (Soon)
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={5}>
                <Card sx={{ borderRadius: 4, boxShadow: 6, height: '100%' }}>
                  <CardHeader title={<Typography variant="h5" fontWeight="bold">Enrollment Steps</Typography>} />
                  <Divider />
                  <CardContent sx={{ pt: 4 }}>
                    <Stack spacing={4}>
                      {[
                        'Enter registered Employee ID',
                        'Position face in camera view',
                        'System captures multiple angles',
                        'AI generates encrypted template',
                        'Raw images deleted permanently',
                        'Employee ready for touchless clock-in',
                      ].map((step, i) => (
                        <Stack direction="row" spacing={3} key={i} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: 'primary.main',
                              width: 48,
                              height: 48,
                              fontWeight: 'bold',
                            }}
                          >
                            {i + 1}
                          </Avatar>
                          <Typography variant="body1">{step}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Security & Privacy */}
          {tabValue === 2 && (
            <Grid container spacing={6}>
              <Grid item xs={12}>
                <Alert
                  severity="success"
                  icon={<Security sx={{ fontSize: 40 }} />}
                  sx={{ borderRadius: 4, p: 5, bgcolor: 'success.light', color: 'success.contrastText' }}
                >
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Your Privacy Is Our Priority
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    We follow the highest standards of data protection:
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 3 }}>
                    {[
                      'Raw face images are NEVER stored',
                      'Only mathematical templates are saved (irreversible)',
                      'Templates are encrypted at rest and in transit',
                      'No biometric data leaves your secure environment',
                      'Compliant with GDPR and privacy best practices',
                    ].map((point, i) => (
                      <Typography key={i} variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CheckCircleOutline sx={{ fontSize: 20 }} />
                        {point}
                      </Typography>
                    ))}
                  </Stack>
                </Alert>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Biometrics;