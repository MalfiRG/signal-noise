// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BottomDrawer } from '../BottomDrawer';

describe('BottomDrawer', () => {
  it('renders header + content + actions in document order', () => {
    const { container } = render(
      <BottomDrawer header={<div data-id="h" />} content={<div data-id="c" />} actions={<div data-id="a" />} />,
    );
    const ids = Array.from(container.querySelectorAll('[data-id]')).map(n => n.getAttribute('data-id'));
    expect(ids).toEqual(['h', 'c', 'a']);
  });
});
