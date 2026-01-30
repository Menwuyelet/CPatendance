// src/components/Toast.jsx
import React, { useEffect, memo, useMemo } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { CheckCircle, Info, Warning, Error as ErrorIcon, Close } from '@mui/icons-material';

// Toast configuration - defined outside component
const TOAST_CONFIG = {
  success: { icon: <CheckCircle />, color: '#4caf50', bg: '#e8f5e9' },
  info: { icon: <Info />, color: '#2196f3', bg: '#e3f2fd' },
  warning: { icon: <Warning />, color: '#ff9800', bg: '#fff8e1' },
  error: { icon: <ErrorIcon />, color: '#f44336', bg: '#ffebee' },
};

const Toast = memo(({ message, type = 'success', onClose }) => {
  // Auto-dismiss timer
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onClose?.(), 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  // Get config for current type
  const { icon, color, bg } = useMemo(() => 
    TOAST_CONFIG[type] || TOAST_CONFIG.success
  , [type]);

  if (!message) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        minWidth: 320,
        maxWidth: 420,
        bgcolor: bg,
        borderLeft: `6px solid ${color}`,
        borderRadius: 2,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        p: 2,
        animation: 'slideIn 0.4s ease-out',
        zIndex: 1300,
        '@keyframes slideIn': {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
      }}
    >
      <Box sx={{ color, mr: 2, display: 'flex' }}>
        {icon}
      </Box>
      <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: 500 }}>
        {message}
      </Typography>
      <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
});

Toast.displayName = 'Toast';

export default Toast;
