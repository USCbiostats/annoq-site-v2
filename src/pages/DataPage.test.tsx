import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DataPage } from './DataPage';

// The tab bodies have their own tests; the shell is what is under test here.
vi.mock('./data/DataAccessTab', () => ({ DataAccessTab: () => <div>access body</div> }));
vi.mock('./data/DataVersionsTab', () => ({ DataVersionsTab: () => <div>versions body</div> }));
vi.mock('./data/StatisticsTab', () => ({ StatisticsTab: () => <div>statistics body</div> }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/data/:tab" element={<DataPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DataPage', () => {
  it('offers the three tabs from the issue', () => {
    renderAt('/data/access');
    expect(screen.getByRole('tab', { name: 'Data Access' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Data Versions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Statistics' })).toBeInTheDocument();
  });

  it('renders the body named by the route param', () => {
    renderAt('/data/statistics');
    expect(screen.getByText('statistics body')).toBeInTheDocument();
    expect(screen.queryByText('access body')).toBeNull();
  });

  it('marks the routed tab as selected', () => {
    renderAt('/data/versions');
    expect(screen.getByRole('tab', { name: 'Data Versions' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('falls back to the access tab for an unknown segment', () => {
    renderAt('/data/nonsense');
    expect(screen.getByText('access body')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Data Access' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
