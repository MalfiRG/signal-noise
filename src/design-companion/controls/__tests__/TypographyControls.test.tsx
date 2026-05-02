// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TypographyControls } from '../TypographyControls';

describe('TypographyControls', () => {
  it('emits onChange for font-size + line-height (controlled-input contract)', () => {
    const onChange = vi.fn();
    const { getByLabelText, rerender } = render(<TypographyControls value={{}} onChange={onChange} />);
    fireEvent.change(getByLabelText('font-size'), { target: { value: '1.875rem' } });
    expect(onChange).toHaveBeenLastCalledWith({ 'font-size': '1.875rem' });
    rerender(<TypographyControls value={{ 'font-size': '1.875rem' }} onChange={onChange} />);
    fireEvent.change(getByLabelText('line-height'), { target: { value: '1.5' } });
    expect(onChange).toHaveBeenLastCalledWith({ 'font-size': '1.875rem', 'line-height': '1.5' });
  });
});
