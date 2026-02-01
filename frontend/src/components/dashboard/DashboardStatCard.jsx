import React from 'react';
import { Avatar, Card, CardContent, Stack, Typography } from '@mui/material';

export default function DashboardStatCard({
  label,
  value,
  helperText,
  icon,
  color = 'primary',
  onClick,
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: '0.2s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : undefined,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {value}
            </Typography>
            {helperText && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {helperText}
              </Typography>
            )}
          </Stack>
          {icon && (
            <Avatar sx={{ bgcolor: `${color}.light`, width: 48, height: 48 }}>
              {icon}
            </Avatar>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
