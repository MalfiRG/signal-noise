// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect } from 'vitest';
import { DeterministicTranslator } from '../DeterministicTranslator';
import type { CssEdit, PropEdit } from '../../types';

const t = new DeterministicTranslator();

describe('DeterministicTranslator', () => {
  it('substitutes a literal CSS property in a style={...} block', () => {
    const src = `<div style={{ padding: '1rem' }}/>`;
    const edit: CssEdit = {
      type: 'css',
      component: 'X',
      file: 'x.tsx',
      instance_id: 'X::A::0::abc12345',
      source_hash: 'def67890',
      selector: '.x',
      changes: { padding: '1.5rem' },
    };
    const r = t.applyIntent(edit, src);
    expect(r.kind).toBe('applied');
    if (r.kind === 'applied') {
      expect(r.updatedSource).toContain(`padding: '1.5rem'`);
    }
  });

  it('substitutes a prop value when the prop appears textually with the from value', () => {
    const src = `<Button variant="default">x</Button>`;
    const edit: PropEdit = {
      type: 'prop',
      component: 'Button',
      file: 'x.tsx',
      instance_id: 'Button::A::0::abc12345',
      source_hash: 'def67890',
      prop: 'variant',
      from: 'default',
      to: 'ghost',
    };
    const r = t.applyIntent(edit, src);
    expect(r.kind).toBe('applied');
    if (r.kind === 'applied') {
      expect(r.updatedSource).toContain(`variant="ghost"`);
    }
  });

  it('returns gap when the source pattern is not deterministic (Tailwind utility)', () => {
    const src = `<div className="p-4"/>`;
    const edit: CssEdit = {
      type: 'css',
      component: 'X',
      file: 'x.tsx',
      instance_id: 'X::A::0::abc12345',
      source_hash: 'def67890',
      selector: '.x',
      changes: { padding: '1.5rem' },
    };
    const r = t.applyIntent(edit, src);
    expect(r.kind).toBe('gap');
  });

  it('returns gap when the prop literal is not found in source', () => {
    const src = `<Button variant="primary">x</Button>`;
    const edit: PropEdit = {
      type: 'prop',
      component: 'Button',
      file: 'x.tsx',
      instance_id: 'Button::A::0::abc12345',
      source_hash: 'def67890',
      prop: 'variant',
      from: 'default',
      to: 'ghost',
    };
    const r = t.applyIntent(edit, src);
    expect(r.kind).toBe('gap');
  });

  it('preserves the original quote style on CSS substitution', () => {
    const src = `<div style={{ color: "red" }}/>`;
    const edit: CssEdit = {
      type: 'css',
      component: 'X',
      file: 'x.tsx',
      instance_id: 'X::A::0::abc12345',
      source_hash: 'def67890',
      selector: '.x',
      changes: { color: 'blue' },
    };
    const r = t.applyIntent(edit, src);
    expect(r.kind).toBe('applied');
    if (r.kind === 'applied') {
      expect(r.updatedSource).toContain(`color: "blue"`);
    }
  });
});
