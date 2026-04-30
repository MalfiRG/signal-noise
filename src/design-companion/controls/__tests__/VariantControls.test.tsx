// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { VariantControls } from '../VariantControls';

describe('VariantControls', () => {
  it('emits onChange with selected variant', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <VariantControls value="default" variants={['default', 'ghost', 'outline']} onChange={onChange} />,
    );
    fireEvent.change(getByLabelText('variant'), { target: { value: 'ghost' } });
    expect(onChange).toHaveBeenCalledWith('ghost');
  });
});
