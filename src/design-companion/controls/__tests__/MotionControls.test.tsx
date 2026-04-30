// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MotionControls } from '../MotionControls';

describe('MotionControls', () => {
  it('emits onChange for transition-duration', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <MotionControls value={{}} onChange={onChange}
        durations={['--motion-fast', '--motion-normal']}
        easings={['--ease-out-expo']} />,
    );
    fireEvent.change(getByLabelText('transition-duration'), { target: { value: '--motion-normal' } });
    expect(onChange).toHaveBeenLastCalledWith({ 'transition-duration': 'var(--motion-normal)' });
  });
});
