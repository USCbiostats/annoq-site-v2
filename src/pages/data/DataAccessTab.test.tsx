import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DataAccessTab } from './DataAccessTab';

describe('DataAccessTab', () => {
  it('links to the services documentation', () => {
    render(<MemoryRouter><DataAccessTab /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/docs/services');
  });
});
