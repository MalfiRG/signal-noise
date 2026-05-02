// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SelectionOverlay } from '../SelectionOverlay';

describe('SelectionOverlay', () => {
  it('calls onSelect on click of an element with data-design-id', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <div>
        <SelectionOverlay onSelect={onSelect}>
          <div data-design-id="Foo::App::0::abc12345">click me</div>
        </SelectionOverlay>
      </div>,
    );
    const target = container.querySelector('[data-design-id]')!;
    fireEvent.click(target);
    expect(onSelect).toHaveBeenCalledWith('Foo::App::0::abc12345', target);
  });
  it('clears selection on ESC', () => {
    const onSelect = vi.fn();
    render(<SelectionOverlay onSelect={onSelect}><span/></SelectionOverlay>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSelect).toHaveBeenCalledWith(null, null);
  });
});
