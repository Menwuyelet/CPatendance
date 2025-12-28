import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Download } from '@mui/icons-material';

const Reports = ({ onNotify }) => {
  const handleExport = () => {
    // Placeholder: real export should call backend endpoint
    onNotify?.('Report export started (placeholder)', 'info');
  };

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Reports & Exports
      </Typography>
      <Card>
        <CardContent sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Box>
            <Typography variant="body1">Generate payroll, attendance, and compliance reports.</Typography>
            <Typography variant="caption" color="text.secondary">This is a placeholder UI — connect to backend export endpoints to enable CSV/PDF exports.</Typography>
          </Box>
          <Button startIcon={<Download />} variant="contained" onClick={handleExport} sx={{ ml: 'auto' }}>
            Export
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;
