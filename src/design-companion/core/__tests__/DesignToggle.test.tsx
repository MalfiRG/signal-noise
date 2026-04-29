// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DesignToggle } from '../DesignToggle';

const LocationProbe = () => {
  const loc = useLocation();
  return <span data-testid="loc">{loc.pathname}{loc.search}</span>;
};

const renderAt = (initial: string) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="*" element={<><DesignToggle /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );

describe('DesignToggle', () => {
  it('renders the floating button on a non-design route', () => {
    const { getByRole } = renderAt('/');
    expect(getByRole('button', { name: /design this page/i })).toBeTruthy();
  });
  it('hides itself on /__design routes', () => {
    const { queryByRole } = renderAt('/__design');
    expect(queryByRole('button', { name: /design this page/i })).toBeNull();
  });
  it('navigates to /__design with focus= query on click', () => {
    const { getByRole, getByTestId } = renderAt('/blog/some-post');
    fireEvent.click(getByRole('button', { name: /design this page/i }));
    expect(getByTestId('loc').textContent).toBe('/__design?focus=%2Fblog%2Fsome-post');
  });
});
