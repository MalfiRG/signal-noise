import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PanelLayoutToggle, useLayoutChoice } from '../PanelLayoutToggle';

const Probe = () => {
  const [v, set] = useLayoutChoice();
  return (
    <div>
      <span data-cur>{v}</span>
      <PanelLayoutToggle value={v} onChange={set} />
    </div>
  );
};

describe('PanelLayoutToggle', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to right-sidebar', () => {
    const { container } = render(<Probe />);
    expect(container.querySelector('[data-cur]')?.textContent).toBe('right-sidebar');
  });

  it('persists choice to localStorage', () => {
    const { getByText } = render(<Probe />);
    fireEvent.click(getByText('Bottom drawer'));
    expect(localStorage.getItem('design-companion:panel-layout')).toBe('bottom-drawer');
  });
});
