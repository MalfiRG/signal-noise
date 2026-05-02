// __DESIGN_COMPANION_DEV_ONLY__ (read-only draft for Phase 3.5)
//
// Draft adapter.config.ts for ScoutQL (the second consumer of the design-
// companion contract). Inspected source: SqoutQL_jobRadar/scoutQL/frontend/
// src/index.css @theme block (Tailwind v4).
//
// Curation matches the blog adapter's dual-role tilt-inclusive policy
// (spec §6.4): every token a user might realistically want to swap in the
// editor is exposed, even if the picker would have a long menu.
//
// motionTokens is OMITTED because ScoutQL has no motion design system in CSS
// (no --motion-*, no --ease-*, no --stagger-* tokens). Animations, where
// present, would be Tailwind utility classes — those are Tier-2 prop swaps,
// not CSS-var swaps.
import type { ProjectAdapter } from '../../../src/design-companion/types';

export const adapter: ProjectAdapter = {
  projectName: 'scoutql',
  cssVarPalette: [
    // Surface family (background, card, muted variants)
    '--color-background',
    '--color-foreground',
    '--color-card',
    '--color-card-foreground',
    '--color-muted',
    '--color-muted-foreground',
    // Structural (borders, input fields, focus ring)
    '--color-border',
    '--color-input',
    '--color-ring',
    // Accent (brand color + on-accent foreground)
    '--color-accent',
    '--color-accent-foreground',
    // Status semantics (destructive/success/warning/info)
    '--color-destructive',
    '--color-success',
    '--color-warning',
    '--color-info',
  ],
  // motionTokens omitted — ScoutQL has no motion-token CSS layer.
  // tailwindResolver and fileResolver are consumer-side wiring,
  // out of dry-run scope.
};
