// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ColorControls } from '../ColorControls';

describe('ColorControls', () => {
  it('emits onChange with the palette token when a swatch is clicked', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <ColorControls
        value={{}} onChange={onChange}
        palette={['--accent-violet', '--accent-amber']}
      />,
    );
    fireEvent.click(getByText('--accent-violet'));
    expect(onChange).toHaveBeenLastCalledWith({ color: 'var(--accent-violet)' });
  });
  it('rejects an unsafe custom color and surfaces a panel error', () => {
    const onChange = vi.fn();
    const { getByLabelText, getByRole } = render(
      <ColorControls value={{}} onChange={onChange} palette={[]} />,
    );
    fireEvent.change(getByLabelText('custom color'), { target: { value: 'url(http://evil)' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(getByRole('alert').textContent).toContain('rejected');
  });
});
