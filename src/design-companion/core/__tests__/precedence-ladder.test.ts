// __DESIGN_COMPANION_DEV_ONLY__
import { describe, it, expect, beforeEach } from 'vitest';
import { applyInlineStyle, applyLayerOverrides } from '../LivePreviewLayer';

describe('precedence ladder', () => {
  let el: HTMLElement;
  beforeEach(() => { el = document.createElement('div'); el.setAttribute('data-design-id', 'X'); document.body.appendChild(el); });
  it('applyInlineStyle sets inline style and reverts', () => {
    const h = applyInlineStyle(el, { padding: '2rem' });
    expect(el.style.padding).toBe('2rem');
    h.revert();
    expect(el.style.padding).toBe('');
  });
  it('applyLayerOverrides injects @layer overrides style and reverts', () => {
    const h = applyLayerOverrides('[data-design-id="X"]', { color: 'red' });
    const styles = document.head.querySelectorAll('style[data-design-companion="ephemeral"]');
    expect(styles.length).toBe(1);
    h.revert();
    expect(document.head.querySelectorAll('style[data-design-companion="ephemeral"]').length).toBe(0);
  });
});
