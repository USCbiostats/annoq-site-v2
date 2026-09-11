import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

// The shell layout is what is under test here, so stand the search workspace
// down rather than dragging annotation fetching into the render.
vi.mock('./features/search/SearchWorkspace', () => ({
  SearchWorkspace: () => <div className="search-shell" />
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('app shell viewport lock', () => {
  it('locks the shell to the viewport on the search route', () => {
    const { container } = renderAt('/search');
    expect(container.querySelector('.app-shell--locked')).toBeInTheDocument();
  });

  it('leaves other routes free to scroll the page', () => {
    const { container } = renderAt('/about');
    expect(container.querySelector('.app-shell')).toBeInTheDocument();
    expect(container.querySelector('.app-shell--locked')).not.toBeInTheDocument();
  });
});

// annoq-site-v2#22 retires the beta button and folds data access into a Data
// menu item. /version itself stays -- the release notes still link to it.
describe('primary navigation', () => {
  it('no longer shows the TopMed beta release button', () => {
    renderAt('/');
    expect(screen.queryByRole('link', { name: 'TopMed Beta Release' })).toBeNull();
  });

  it('exposes a Data nav item', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Data' })).toHaveAttribute('href', '/data');
  });

  it('drops the old Data Access nav item', () => {
    renderAt('/');
    expect(screen.queryByRole('link', { name: 'Data Access' })).toBeNull();
  });

  it('redirects /data to the access tab', () => {
    renderAt('/data');
    expect(screen.getByRole('tab', { name: 'Data Access' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
