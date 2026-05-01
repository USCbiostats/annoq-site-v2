import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Box, Button, Drawer, IconButton, Stack, Toolbar, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Link as RouterLink, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { SearchProvider } from './features/search/searchState';
import { AnnotationSelectionProvider } from './features/annotations/AnnotationSelectionProvider';
import { SearchWorkspace } from './features/search/SearchWorkspace';
import { AboutPage, ContactPage, CookiePolicyPage, HomePage, NewsPage, VersionPage } from './pages/StaticPages';
import { DocsPage } from './pages/DocsPage';
import { SupportedAnnotationsPage } from './pages/SupportedAnnotationsPage';

const nav = [
  { label: 'News', to: '/release' },
  { label: 'Supported Annotations', to: '/detail' },
  { label: 'Data Access', to: '/docs/services' },
  { label: 'About', to: '/about' },
  { label: 'Help/Tutorial', to: '/docs' }
];

export default function App() {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const navLinks = nav.map((item) => (
    <Button key={item.to} component={RouterLink} to={item.to} color="inherit" onClick={() => setOpen(false)}>
      {item.label}
    </Button>
  ));

  return (
    <Box className="app-shell">
      <AppBar position="sticky" color="inherit" elevation={1}>
        <Toolbar variant="dense">
          {isMobile && (
            <IconButton edge="start" onClick={() => setOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography component={RouterLink} to="/" className="brand" variant="h6">
            AnnoQ
          </Typography>
          <Stack direction="row" spacing={0} className="launch-buttons">
            <Button component={RouterLink} to="/search" variant="outlined">Launch Query UI</Button>
            <Button component={RouterLink} to="/docs/tutorials/ui-query" variant="outlined">UI Tutorial</Button>
          </Stack>
          <Box sx={{ flex: 1 }} />
          {!isMobile && <Stack direction="row">{navLinks}</Stack>}
        </Toolbar>
      </AppBar>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <Stack sx={{ width: 260, p: 1 }}>{navLinks}</Stack>
      </Drawer>
      <AnnotationSelectionProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchProvider><SearchWorkspace /></SearchProvider>} />
          <Route path="/detail" element={<SupportedAnnotationsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/release" element={<NewsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />
          <Route path="/version" element={<VersionPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:section" element={<DocsPage />} />
          <Route path="/docs/:section/:page" element={<DocsPage />} />
        </Routes>
      </AnnotationSelectionProvider>
      {location.pathname !== '/search' && <Footer />}
    </Box>
  );
}
