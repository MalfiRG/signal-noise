/**
 * Motion Design System — see ARCHITECTURE.md §6 + DESIGN.md §7.
 *
 * Two timing systems coexist by design:
 *   - JS constants here drive Framer Motion variants.
 *   - CSS custom properties in index.css drive hover/ambient effects.
 * They share design intent but are not mechanically coupled — when changing
 * durations or easings, update both sides.
 */

import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

export const pageTransition = {
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
  reading: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
  reduced: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
  },
} as const;

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

/**
 * Subtle entrance — used by the Index hero Phase 3 stagger so it doesn't
 * compete with the heavy headline theater above. Other pages use the
 * cyber variant via useItemVariant().
 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export const staggerItemCyber: Variants = {
  hidden: { opacity: 0, x: -12, filter: "brightness(1.8) blur(2px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "brightness(1) blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export const staggerItemMobile: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export const reducedVariant: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

export const wordRevealContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
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

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 640;
}

export function usePageVariant() {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return pageTransition.reduced;
  return pageTransition.cyberpunk;
}

export function useReadingPageVariant() {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return pageTransition.reduced;
  return pageTransition.reading;
}

export function useItemVariant(): Variants {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return reducedVariant;
  if (isMobileViewport()) return staggerItemMobile;
  return staggerItemCyber;
}

/**
 * Hero stagger — subtle variant that doesn't compete with the hero's
 * entrance theater. See ARCHITECTURE.md §6 for the cyber-vs-subtle rationale.
 */
export function useHeroStaggerVariant(): Variants {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return reducedVariant;
  if (isMobileViewport()) return staggerItemMobile;
  return staggerItem;
}
