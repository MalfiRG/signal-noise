// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
export interface MotionControlsProps {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  durations: string[];
  easings: string[];
}
export const MotionControls: React.FC<MotionControlsProps> = ({ value, onChange, durations, easings }) => {
  const set = (k: string, v: string) => {
    const next = { ...value };
    if (v === '') delete next[k]; else next[k] = `var(${v})`;
    onChange(next);
  };
  return (
    <fieldset className="design-companion-motion">
      <legend>Motion</legend>
      <label>
        transition-duration
        <select aria-label="transition-duration" defaultValue=""
          onChange={e => set('transition-duration', e.target.value)}>
          <option value="">—</option>
          {durations.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <label>
        transition-timing-function
        <select aria-label="transition-timing-function" defaultValue=""
          onChange={e => set('transition-timing-function', e.target.value)}>
          <option value="">—</option>
          {easings.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <button
        type="button"
        className="design-companion-replay"
        aria-label="replay motion on selected element"
        onClick={() => {
          const el = document.querySelector('[data-design-selected]') as HTMLElement | null;
          if (!el) {
            console.warn('[design-companion] replay: no element selected — click an element in the page first');
            return;
          }
          const computed = getComputedStyle(el);
          const computedMs = parseFloat(computed.transitionDuration) * 1000 || 0;
          // Use computed value if it resolved to anything > 0, else fall back to a visible default.
          // Do NOT clamp legitimate sub-second durations upward — that hides the user's choice.
          const ms = computedMs > 0 ? computedMs : 600;
          const easing = computed.transitionTimingFunction || 'ease-in-out';
          console.info('[design-companion] replay', { id: el.getAttribute('data-design-id'), durationMs: ms, easing, computedTransitionDuration: computed.transitionDuration });
          // 1. Restart any CSS @keyframes animation via reflow trick
          const origAnim = el.style.animation;
          el.style.animation = 'none';
          void el.offsetHeight;
          el.style.animation = origAnim;
          // 2. Play a one-shot demo using duration + easing — opacity AND scale so SOMETHING is always visible
          el.animate(
            [
              { opacity: 1, transform: 'scale(1)', offset: 0 },
              { opacity: 0.15, transform: 'scale(0.96)', offset: 0.5 },
              { opacity: 1, transform: 'scale(1)', offset: 1 },
            ],
            { duration: ms, easing, composite: 'replace' },
          );
        }}
      >
        ▶ replay motion
      </button>
      <button
        type="button"
        className="design-companion-replay"
        aria-label="clear sessionStorage hero gates and reload"
        onClick={() => {
          // Hero cascade gates itself behind sessionStorage["hero-cascade-played"] so it
          // only animates once per session. Dev-mode override — wipe the gate, reload,
          // hero plays fresh.
          try { sessionStorage.removeItem('hero-cascade-played'); } catch { /* ignore */ }
          window.location.reload();
        }}
      >
        ↻ replay hero (clears session gate)
      </button>
    </fieldset>
  );
};
