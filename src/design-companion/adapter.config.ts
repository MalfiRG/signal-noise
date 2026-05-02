// __DESIGN_COMPANION_DEV_ONLY__
import type { ProjectAdapter } from './types';

// Palette + motion tokens grep-verified against `src/index.css` per [C12] /
// factual-grounding-protocol §spec-author-surface. cssVarPalette is dual-role
// per spec §6.4: (a) the color picker menu, (b) the deterministic-translator
// allowlist. Tokens omitted here fall through to the LLM gap path on translate.
export const adapter: ProjectAdapter = {
  projectName: 'the-digital-matrix',
  cssVarPalette: [
    // Brand triad + their foreground pairs
    '--primary',
    '--primary-foreground',
    '--accent',
    '--accent-foreground',
    '--learning',
    '--learning-foreground',
    // Surface family
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--popover',
    '--popover-foreground',
    '--muted',
    '--muted-foreground',
    '--secondary',
    '--secondary-foreground',
    // Structural
    '--border',
    '--input',
    '--ring',
    '--destructive',
    '--destructive-foreground',
    // Blog-prose
    '--prose-body',
    '--prose-quote',
  ],
  motionTokens: {
    durations: [
      '--motion-instant',
      '--motion-fast',
      '--motion-normal',
      '--motion-slow',
      '--motion-reveal',
    ],
    easings: [
      '--ease-out-expo',
      '--ease-out-back',
      '--ease-glitch',
      '--ease-mechanical',
      '--ease-default',
    ],
  },
};
