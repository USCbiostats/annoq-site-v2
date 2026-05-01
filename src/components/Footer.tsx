import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function Footer() {
  return (
    <Box component="footer" className="site-footer">
      <Container>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Box sx={{ maxWidth: 300 }}>
            <img src="/assets/images/logos/image-logo-yellow.gif" className="footer-logo" alt="IMAGE Project" />
            <Typography variant="body2"><strong>&copy; Copyright</strong> University of Southern California</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Stack component="ul" spacing={0.5} className="footer-links">
            <li><Link component={RouterLink} to="/about">About</Link></li>
            <li><Link component={RouterLink} to="/contact">Contact Us</Link></li>
            <li><Link component={RouterLink} to="/docs">Annotation Documentation</Link></li>
            <li><Link component={RouterLink} to="/cookie-policy">Cookie Policy</Link></li>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
