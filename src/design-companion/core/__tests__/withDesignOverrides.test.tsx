// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import { DesignOverridesContext, withDesignOverrides } from '../LivePreviewLayer';

const RawButton = React.forwardRef<HTMLButtonElement, { variant: string; children?: React.ReactNode }>(
  ({ variant, children }, ref) => <button ref={ref} data-variant={variant}>{children}</button>,
);
const Wrapped = withDesignOverrides(RawButton, 'Button');

describe('withDesignOverrides', () => {
  it('override props win over parent props', () => {
    const map = new Map([['Button::App::0::abc', { variant: 'ghost' }]]);
    const { container } = render(
      <DesignOverridesContext.Provider value={map}>
        <div data-design-id="Button::App::0::abc">
          <Wrapped variant="default">x</Wrapped>
        </div>
      </DesignOverridesContext.Provider>,
    );
    expect(container.querySelector('button')?.getAttribute('data-variant')).toBe('ghost');
  });
  it('forwards refs through the HOC', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <DesignOverridesContext.Provider value={new Map()}>
        <Wrapped variant="default" ref={ref}>x</Wrapped>
      </DesignOverridesContext.Provider>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
