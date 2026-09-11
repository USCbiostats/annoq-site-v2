import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function DataAccessTab() {
  return (
    <Box className="data-tab-body">
      <Typography className="data-prose">
        AnnoQ data can be accessed programmatically via{' '}
        <Link component={RouterLink} to="/docs/services">Services</Link>.
      </Typography>
    </Box>
  );
}
