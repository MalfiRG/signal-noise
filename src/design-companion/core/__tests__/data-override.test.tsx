// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import { DesignOverridesContext, withDesignOverrides, applyDataOverride } from '../LivePreviewLayer';

const Inner = React.forwardRef<HTMLDivElement, { style?: React.CSSProperties }>(
  ({ style }, ref) => <div ref={ref} data-style={JSON.stringify(style)} />,
);
const Wrapped = withDesignOverrides(Inner, 'Inner');

describe('data-design-override HOC merge', () => {
  it('merges data-design-override JSON into rendered style prop', () => {
    const el = document.createElement('div');
    el.setAttribute('data-design-id', 'Inner::App::0::abc');
    document.body.appendChild(el);
    applyDataOverride(el, { padding: '2rem' });
    const { container } = render(
      <DesignOverridesContext.Provider value={new Map()}>
        <div data-design-id="Inner::App::0::abc">
          <Wrapped style={{ color: 'red' }} />
        </div>
      </DesignOverridesContext.Provider>,
    );
    const node = container.querySelector('[data-style]');
    const style = JSON.parse(node?.getAttribute('data-style') ?? '{}');
    expect(style.color).toBe('red');
    expect(style.padding).toBe('2rem');
    document.body.removeChild(el);
  });
});
