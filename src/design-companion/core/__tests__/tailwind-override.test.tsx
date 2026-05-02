import { describe, it, expect } from 'vitest';
import { applyInlineStyle } from '../LivePreviewLayer';

describe('Tailwind v4 cascade-layer interaction', () => {
  it('inline style beats a Tailwind utility-class padding', () => {
    const el = document.createElement('div');
    el.className = 'p-4';
    document.body.appendChild(el);
    const h = applyInlineStyle(el, { padding: '2rem' });
    expect(el.style.padding).toBe('2rem');
    h.revert();
    document.body.removeChild(el);
  });
});
