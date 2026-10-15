'use client';

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  // Follows the OS setting via prefers-color-scheme.
  colorSchemes: {
    light: { palette: { background: { default: '#f6f7f9' } } },
    dark: true,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'var(--font-roboto), system-ui, sans-serif',
  },
});
