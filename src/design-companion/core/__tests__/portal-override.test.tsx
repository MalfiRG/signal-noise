// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { DesignOverridesContext, withDesignOverrides } from '../LivePreviewLayer';

const Inner = React.forwardRef<HTMLSpanElement, { variant: string }>(
  ({ variant }, ref) => <span ref={ref} data-variant={variant}>x</span>,
);
const WrappedInner = withDesignOverrides(Inner, 'Inner');

const Portaled: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [host] = React.useState(() => document.createElement('div'));
  React.useEffect(() => {
    document.body.appendChild(host);
    return () => {
      document.body.removeChild(host);
    };
  }, [host]);
  return createPortal(children, host);
};

describe('Tier 2 override reaches Radix-style portaled children', () => {
  it('override prop propagates through createPortal child', () => {
    const map = new Map([['Inner::App::0::abc', { variant: 'ghost' }]]);
    render(
      <DesignOverridesContext.Provider value={map}>
        <Portaled>
          <div data-design-id="Inner::App::0::abc">
            <WrappedInner variant="default" />
          </div>
        </Portaled>
      </DesignOverridesContext.Provider>,
    );
    const span = document.body.querySelector('[data-variant]');
    expect(span?.getAttribute('data-variant')).toBe('ghost');
  });
});
