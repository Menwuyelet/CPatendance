import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

const Config = ({ onNotify }) => {
  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Configuration & Holidays
      </Typography>
      <Card>
        <CardContent sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Box>
            <Typography variant="body1">Manage system holidays, company-wide settings, and configuration.</Typography>
            <Typography variant="caption" color="text.secondary">This is a placeholder — link to specific settings pages as needed.</Typography>
          </Box>
          <Button startIcon={<SettingsIcon />} variant="contained" onClick={() => onNotify?.('Open settings (placeholder)', 'info')} sx={{ ml: 'auto' }}>
            Open Settings
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Config;
