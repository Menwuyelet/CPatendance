import React from 'react';
import { Box, Breadcrumbs, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * DashboardPage
 * - Consistent maxWidth + padding
 * - Standard header (title/subtitle)
 * - Optional breadcrumbs
 * - Optional actions (right side)
 */
export default function DashboardPage({
  title,
  subtitle,
  breadcrumbs = [],
  actions = null,
  children,
  maxWidth = 1400,
}) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        width: '100%',
        mx: 'auto',
        maxWidth,
        px: { xs: 1.5, sm: 2.5, md: 3 },
        py: { xs: 2, md: 3 },
      }}
    >
      {breadcrumbs?.length > 0 && (
        <Breadcrumbs sx={{ mb: 2 }}>
          {breadcrumbs.map((b, idx) => (
            <Typography
              key={`${b?.label || 'crumb'}-${idx}`}
              variant="body2"
              color={idx === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}
              sx={{
                maxWidth: isPhone ? 140 : 280,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {b?.label || ''}
            </Typography>
          ))}
        </Breadcrumbs>
      )}

      {(title || subtitle || actions) && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography variant={isPhone ? 'h5' : 'h4'} fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>

          {actions && (
            <Box sx={{ width: { xs: '100%', md: 'auto' } }}>
              {actions}
            </Box>
          )}
        </Stack>
      )}

      {children}
    </Box>
  );
}
