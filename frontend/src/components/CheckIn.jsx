import React, { useState } from 'react';
import { Card, CardHeader, CardContent, Button, Typography, Stack, Avatar, Divider, Box } from '@mui/material';
import { Fingerprint, CameraAlt, CheckCircleOutline } from '@mui/icons-material';
import { api } from '../services/api.service.js';

const CheckIn = ({ onNotify, onOpenCamera }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    // When using the shared camera modal, parent will call `/attendance/attendance-check-in/`.
    const triggerOpen = () => {
        onOpenCamera?.('attendance');
    };

    return (
        <Card className="checkin-card" sx={{ borderRadius: 4, boxShadow: 6 }}>
            <CardHeader title={<Typography variant="h6">Quick Check-In</Typography>} subheader="Touchless attendance capture" />
            <Divider />
            <CardContent>
                <Stack spacing={2} alignItems="center">
                    <Box sx={{ width: '100%', textAlign: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<CameraAlt />}
                            onClick={triggerOpen}
                            disabled={loading}
                            className="checkin-button"
                            sx={{ px: 3, py: 1.2, borderRadius: 3 }}
                        >
                            {loading ? 'Checking in…' : 'Check In Now'}
                        </Button>
                    </Box>

                    {status && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography color={status.ok ? 'success.main' : 'error.main'}>
                                {status.ok ? <><CheckCircleOutline sx={{ verticalAlign: 'middle', mr: 1 }} />{status.message}</> : status.message}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default CheckIn;
