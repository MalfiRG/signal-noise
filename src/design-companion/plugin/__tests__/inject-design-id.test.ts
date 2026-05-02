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

describe('injectDesignId — 15-pattern AST coverage matrix [Risk 1 final]', () => {
  const cases: Array<[string, string]> = [
    ['forwardRef',           `export const X = React.forwardRef((p, ref) => <div ref={ref}/>);`],
    ['memo',                 `export const X = React.memo(() => <div/>);`],
    // Plan §4919 'lazy import' case dropped — degenerate: no JSX in source so
    // id-injection assertion can't pass (early-skip returns null code). Plan
    // amendment §12 captured for META session-close.
    ['generics',             `export function X<T>(p: { v: T }) { return <div data-v={String(p.v)}/>; }`],
    ['render props',         `export const X = ({ render }) => render(<div/>);`],
    ['HOC-wrapped',          `export const X = withFoo(() => <div/>);`],
    ['default export fn',    `export default function X(){ return <div/>; }`],
    ['default export arrow', `const X = () => <div/>; export default X;`],
    ['arrow fn const',       `export const X = () => <div/>;`],
    ['anonymous default',    `export default () => <div/>;`],
    ['fragment',             `export const X = () => <><span/><span/></>;`],
    ['conditional jsx',      `export const X = ({ on }) => on ? <a/> : <b/>;`],
    ['list map',             `export const X = ({ xs }) => xs.map(x => <li key={x}>{x}</li>);`],
    ['portal',               `export const X = () => createPortal(<div/>, document.body);`],
    ['typescript narrow',    `export const X = (p: { v?: string }) => <div title={p.v ?? ''}/>;`],
  ];

  it.each(cases)('injects an id on pattern: %s', (_label, code) => {
    const out = injectDesignIdInSource(code, { filename: 'x.tsx' }).code ?? '';
    expect(out).toMatch(/data-design-id="/);
  });

  // Per H9: each pattern is also tested against auto-wrap. Patterns in the
  // WRAP class must emit `withDesignOverrides`; patterns in the SKIP class
  // must NOT emit it.
  const wrapCases: Array<[string, string, 'wrap' | 'skip']> = cases.map(([label, code]) => {
    const skip = /anonymous default|^re-export/.test(label);
    return [label, code, skip ? 'skip' : 'wrap'];
  });

  it.each(wrapCases)('auto-wrap on pattern: %s → %s', (_label, code, expected) => {
    const out = injectDesignIdInSource(code, {
      filename: 'x.tsx',
      registry: new Set(['X']),
    }).code ?? '';
    if (expected === 'wrap') expect(out).toMatch(/withDesignOverrides/);
    else expect(out).not.toMatch(/withDesignOverrides/);
  });
});
