import { createTheme, ThemeOptions } from '@mui/material/styles';

// Material 3 Color Palette (Baseline)
const m3Tokens = {
  primary: '#1b57b1', // From Stitch export
  onPrimary: '#ffffff',
  primaryContainer: '#d8e2ff',
  onPrimaryContainer: '#001a41',
  secondary: '#585e71',
  onSecondary: '#ffffff',
  secondaryContainer: '#dce2f9',
  onSecondaryContainer: '#151b2c',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#410002',
  background: '#f6f7f8', // From Stitch export
  onBackground: '#121821',
  surface: '#f6f7f8',
  onSurface: '#121821',
  surfaceVariant: '#e1e2ec',
  onSurfaceVariant: '#44474f',
  outline: '#74777f',
};

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: m3Tokens.primary,
      contrastText: m3Tokens.onPrimary,
    },
    secondary: {
      main: m3Tokens.secondary,
      contrastText: m3Tokens.onSecondary,
    },
    error: {
      main: m3Tokens.error,
      contrastText: m3Tokens.onError,
    },
    background: {
      default: m3Tokens.background,
      paper: '#ffffff',
    },
    text: {
      primary: m3Tokens.onBackground,
      secondary: m3Tokens.onSurfaceVariant,
    },
  },
  typography: {
    fontFamily: '"Roboto Flex", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: 'none',
          border: '1px solid #e1e2ec',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
};

const m3Theme = createTheme(themeOptions);

export default m3Theme;
