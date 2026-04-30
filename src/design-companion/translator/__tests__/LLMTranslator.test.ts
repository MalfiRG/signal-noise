// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect } from 'vitest';
import { LLMTranslator } from '../LLMTranslator';
import { DeterministicTranslator } from '../DeterministicTranslator';
import type { CssEdit, PropEdit } from '../../types';

const t = new LLMTranslator(new DeterministicTranslator());

describe('LLMTranslator', () => {
  it('passes through applied outcomes from the deterministic layer', () => {
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

  it('promotes deterministic css-gap to delegate (Tailwind utility case)', () => {
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
    expect(r.kind).toBe('delegate');
    if (r.kind === 'delegate') {
      expect(r.reason).toMatch(/no inline style/);
    }
  });

  it('promotes deterministic prop-gap to delegate (literal not found)', () => {
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
    expect(r.kind).toBe('delegate');
    if (r.kind === 'delegate') {
      expect(r.reason).toMatch(/prop literal not found/);
    }
  });
});
