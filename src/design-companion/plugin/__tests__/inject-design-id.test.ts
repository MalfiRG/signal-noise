import { describe, it, expect } from 'vitest';
import { injectDesignIdInSource } from '../inject-design-id';

const transform = (code: string) =>
  injectDesignIdInSource(code, { filename: 'src/components/Foo.tsx' });

describe('injectDesignId — Phase 0 functional-component pattern', () => {
  it('adds data-design-id to the root JSX element of a functional component', () => {
    const input = `
      export function Foo() {
        return <div className="foo">hi</div>;
      }
    `;
    const out = transform(input).code;
    expect(out).toMatch(/<div\s+data-design-id="[^"]+"\s+className="foo"/);
  });

  it('does not duplicate the attribute on a re-run', () => {
    const once = transform(`export const Foo = () => <span/>;`).code ?? '';
    const twice = transform(once).code ?? once;
    const matches = (twice.match(/data-design-id=/g) ?? []).length;
    expect(matches).toBe(1);
  });

  it('returns null code when input has no JSX (skip non-design files cheaply)', () => {
    const out = transform(`export const x = 42;`);
    expect(out.code).toBe(null);
  });
});

describe('injectDesignId — Phase 2 auto-wrap [H2]', () => {
  it('auto-wraps a registered function declaration in withDesignOverrides', () => {
    const out = injectDesignIdInSource(
      `export function PostHeader(){return <h1/>;}`,
      { filename: 'src/components/PostHeader.tsx', registry: new Set(['PostHeader']) },
    ).code ?? '';
    expect(out).toMatch(/withDesignOverrides/);
    expect(out).toMatch(/PostHeader_inner/);
  });
});
