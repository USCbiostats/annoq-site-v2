import { Box, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { DataAccessTab } from './data/DataAccessTab';
import { DataVersionsTab } from './data/DataVersionsTab';
import { StatisticsTab } from './data/StatisticsTab';

const TABS = [
  { value: 'access', label: 'Data Access', render: () => <DataAccessTab /> },
  { value: 'versions', label: 'Data Versions', render: () => <DataVersionsTab /> },
  { value: 'statistics', label: 'Statistics', render: () => <StatisticsTab /> }
];

export function DataPage() {
  const { tab } = useParams();
  const navigate = useNavigate();

  // An unknown segment renders the default tab rather than 404ing, so a stale
  // or hand-typed URL still lands somewhere useful.
  const active = TABS.find((entry) => entry.value === tab) ?? TABS[0];

  return (
    <Container className="simple-page">
      <Typography variant="h3" gutterBottom>Data</Typography>
      <Paper className="supported-shell">
        <Box className="supported-tabs-wrap">
          <Tabs
            value={active.value}
            onChange={(_, value: string) => navigate(`/data/${value}`)}
            className="supported-tabs"
          >
            {TABS.map((entry) => (
              <Tab key={entry.value} value={entry.value} label={entry.label} />
            ))}
          </Tabs>
        </Box>
        {active.render()}
      </Paper>
    </Container>
  );
}
