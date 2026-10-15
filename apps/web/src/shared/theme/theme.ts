'use client';

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  // Follows the OS setting via prefers-color-scheme.
  colorSchemes: { light: true, dark: true },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'var(--font-roboto), system-ui, sans-serif',
  },
});
