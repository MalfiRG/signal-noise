/**
 * Motion Design System — The Digital Matrix
 *
 * Centralized motion variants and reduced-motion bridge.
 *
 * Two timing systems coexist (conscious trade-off, see spec §A9/Q8):
 *   - JS constants here are source of truth for Framer Motion animations.
 *   - CSS custom properties in index.css are source of truth for hover/ambient CSS effects.
 * Both share the same design intent but are not mechanically coupled.
 * If you change durations/easings here, update the corresponding CSS tokens too.
 *
 * Single-theme codebase: Night City (cyberpunk-gold) is the only theme.
 * Multi-theme branching has been collapsed; mobile/reduced-motion guards remain.
 */

import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

// ---------------------------------------------------------------------------
// Page transition variants (spec §2, amended by A1, A2, A8)
// ---------------------------------------------------------------------------

export const pageTransition = {
  // Default: horizontal glitch-cut with brightness flash
  // steps(12) at 250ms ≈ 21ms/step — mechanical character, still smooth (A8)
  cyberpunk: {
    initial: { opacity: 0, x: -8, filter: "brightness(1.5)" },
    animate: {
      opacity: 1,
      x: 0,
      filter: "brightness(1)",
      transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      opacity: 0,
      x: 8,
      filter: "brightness(1.5)",
      transition: { duration: 0.15 },
    },
  },
  // Reading mode: fast opacity-only fade (A1 — content priority)
  reading: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  },
  // Reduced motion: instant snap
  reduced: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
  },
} as const;

// ---------------------------------------------------------------------------
// Scroll-reveal variants (spec §3)
// ---------------------------------------------------------------------------

/** Container variant — orchestrates staggered children */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

/**
 * Subtle stagger item — vertical slide + blur. Used by Index.tsx Phase 3 hero
 * stagger (subtitle/buttons/scroll hint). The hero already runs heavy entrance
 * theater (hero-glitch-entrance, hero-stamp-entrance); this subtle variant
 * deliberately doesn't compete. Other pages use staggerItemCyber via useItemVariant().
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/** Default stagger item — horizontal shift + brightness flash (cyber feel) */
export const staggerItemCyber: Variants = {
  hidden: {
    opacity: 0,
    x: -12,
    filter: "brightness(1.8) blur(2px)",
  },
  visible: {
    opacity: 1,
    x: 0,
    filter: "brightness(1) blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/** Mobile item — opacity only, no blur/transform (spec §8.3) */
export const staggerItemMobile: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/** Reduced motion — instant, no animation */
export const reducedVariant: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

// ---------------------------------------------------------------------------
// Word reveal variants (spec §6.2 — subheadline)
// ---------------------------------------------------------------------------

export const wordRevealContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

export const wordRevealItem: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// ---------------------------------------------------------------------------
// Mobile breakpoint detection (matches spec §8.3 threshold)
// ---------------------------------------------------------------------------

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 640;
}

// ---------------------------------------------------------------------------
// Variant-selection hooks (spec A2 + A4)
// ---------------------------------------------------------------------------

/**
 * Returns the page transition variant respecting reduced-motion preference.
 */
export function usePageVariant() {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return pageTransition.reduced;
  return pageTransition.cyberpunk;
}

/**
 * Returns the reading-mode page transition (200ms opacity-only fade).
 */
export function useReadingPageVariant() {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return pageTransition.reduced;
  return pageTransition.reading;
}

/**
 * Default item stagger variant for non-hero pages.
 * Respects mobile viewport + reduced-motion preference.
 */
export function useItemVariant(): Variants {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return reducedVariant;
  if (isMobileViewport()) return staggerItemMobile;
  return staggerItemCyber;
}

/**
 * Hero stagger variant — subtle vertical slide that doesn't compete with the
 * hero's entrance theater. Used by Index.tsx Phase 3 (subtitle/buttons/scroll hint).
 * Respects mobile viewport + reduced-motion preference (parity with useItemVariant).
 */
export function useHeroStaggerVariant(): Variants {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return reducedVariant;
  if (isMobileViewport()) return staggerItemMobile;
  return staggerItem;
}
