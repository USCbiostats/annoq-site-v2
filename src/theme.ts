import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#183153'
    },
    secondary: {
      main: '#ebc336'
    },
    background: {
      default: '#f6f8fb'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      fontWeight: 700,
      letterSpacing: 0
    }
  },
  shape: {
    borderRadius: 6
  },
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: {
          textTransform: 'uppercase'
        }
      }
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff'
        }
      }
    }
  }
});
