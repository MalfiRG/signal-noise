// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { useInstanceId } from '../useInstanceId';

const Probe = () => {
  const ref = useRef<HTMLDivElement>(null);
  const id = useInstanceId(ref);
  return <div ref={ref} data-design-id="Foo::App::0::abc12345" data-id-readback={id ?? 'none'} />;
};

describe('useInstanceId', () => {
  it('reads data-design-id via the ref after layout effect resolves', async () => {
    const { container } = render(<Probe />);
    const node = container.querySelector('[data-design-id]');
    await waitFor(() => {
      expect(node?.getAttribute('data-id-readback')).toBe('Foo::App::0::abc12345');
    });
  });
  it('returns null when the ref-attached element has no data-design-id ancestor', async () => {
    const Loose = () => {
      const ref = useRef<HTMLDivElement>(null);
      const id = useInstanceId(ref);
      return <div ref={ref} data-id-readback={id ?? 'none'} />;
    };
    const { container } = render(<Loose />);
    await waitFor(() => {
      expect(container.firstElementChild?.getAttribute('data-id-readback')).toBe('none');
    });
  });
});
