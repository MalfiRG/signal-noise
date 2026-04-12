/**
 * Motion Design System — The Digital Matrix
 *
 * Centralized motion variants, theme-aware hooks, and reduced-motion bridge.
 *
 * Two timing systems coexist (conscious trade-off, see spec §A9/Q8):
 *   - JS constants here are source of truth for Framer Motion animations.
 *   - CSS custom properties in index.css are source of truth for hover/ambient CSS effects.
 * Both share the same design intent but are not mechanically coupled.
 * If you change durations/easings here, update the corresponding CSS tokens too.
 */

import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import type { Variants } from "framer-motion";

// ---------------------------------------------------------------------------
// Theme detection
// ---------------------------------------------------------------------------

const CYBER_THEMES = ["cyberpunk", "cyberpunk-gold"];

// ---------------------------------------------------------------------------
// Page transition variants (spec §2, amended by A1, A2, A8)
// ---------------------------------------------------------------------------

export const pageTransition = {
  // Cyberpunk themes: horizontal glitch-cut with brightness flash
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
  // Classic themes (violet, amber): vertical fade-slide, expo-out
  classic: {
    initial: { opacity: 0, y: 12 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: { duration: 0.2 },
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

/** Individual item — classic themes (vertical slide + blur) */
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

/** Cyberpunk item — horizontal shift + brightness flash */
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
const staggerItemMobile: Variants = {
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
const reducedVariant: Variants = {
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
// Theme-variant bridge hooks (spec A2)
// ---------------------------------------------------------------------------

/**
 * Returns the correct page transition variant based on active theme
 * and reduced-motion preference. Uses Framer Motion's reactive
 * useReducedMotion hook (spec A4).
 */
export function usePageVariant() {
  const prefersReduced = useReducedMotion();
  const { theme } = useTheme();

  if (prefersReduced) return pageTransition.reduced;
  const isCyber = CYBER_THEMES.includes(theme ?? "");
  return isCyber ? pageTransition.cyberpunk : pageTransition.classic;
}

/**
 * Returns the correct reading-mode page transition.
 * 200ms opacity-only fade for content pages.
 */
export function useReadingPageVariant() {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return pageTransition.reduced;
  return pageTransition.reading;
}

/**
 * Returns the correct item stagger variant based on active theme,
 * viewport size, and reduced-motion preference (spec A2 + A4).
 */
export function useItemVariant(): Variants {
  const prefersReduced = useReducedMotion();
  const { theme } = useTheme();

  if (prefersReduced) return reducedVariant;
  if (isMobileViewport()) return staggerItemMobile;

  const isCyber = CYBER_THEMES.includes(theme ?? "");
  return isCyber ? staggerItemCyber : staggerItem;
}

/**
 * Returns true when the active theme is a cyberpunk variant.
 * Useful for conditionally applying CSS classes (glitch-hover, scanlines).
 */
export function useIsCyberTheme(): boolean {
  const { theme } = useTheme();
  return CYBER_THEMES.includes(theme ?? "");
}
