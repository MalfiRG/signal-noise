// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SpacingControls } from '../SpacingControls';

describe('SpacingControls', () => {
  it('emits onChange with a CSS edits object on each input', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <SpacingControls value={{}} onChange={onChange} />,
    );
    fireEvent.change(getByLabelText('padding'), { target: { value: '1.5rem' } });
    expect(onChange).toHaveBeenLastCalledWith({ padding: '1.5rem' });
  });
});
