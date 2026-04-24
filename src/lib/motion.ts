import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useDeviceTier, type DeviceTier } from "@/hooks/use-device-tier";

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
  const { animationsDisabled } = useMotionPolicy();
  if (animationsDisabled) return reducedVariant;
  return staggerItemCyber;
}

export function useHeroStaggerVariant(): Variants {
  const { animationsDisabled } = useMotionPolicy();
  if (animationsDisabled) return reducedVariant;
  return staggerItem;
}

export interface MotionPolicy {
  tier: DeviceTier;
  prefersReducedMotion: boolean;
  animationsDisabled: boolean;
}

const AUTHOR_OVERRIDE_KEY = "digital-matrix-motion-override";

function readAuthorOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTHOR_OVERRIDE_KEY) === "on";
  } catch {
    return false;
  }
}

/**
 * The single public motion-policy hook. See
 * docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md §5.2.
 *
 * @param opts.heroReplaySkip — MUST only be passed by src/pages/Index.tsx.
 *   Other components must not read sessionStorage keys through this parameter.
 *   This is a documented contract, not a runtime-enforced one.
 */
export function useMotionPolicy(
  opts?: { heroReplaySkip?: boolean }
): MotionPolicy {
  const tier = useDeviceTier();
  const prefersReducedMotion = !!useReducedMotion();
  const heroReplaySkip = !!opts?.heroReplaySkip;
  const authorOverride = readAuthorOverride();

  // Evaluation order per spec §4:
  //   (1) OS reduced-motion wins   → disabled
  //   (2) hero replay-skip         → disabled
  //   (4) author override          → enabled on mobile/tablet (still below OS+session)
  //   (3) tier default             → desktop enabled, else disabled
  let animationsDisabled: boolean;
  if (prefersReducedMotion) animationsDisabled = true;
  else if (heroReplaySkip) animationsDisabled = true;
  else if (authorOverride) animationsDisabled = false;
  else if (tier === "desktop") animationsDisabled = false;
  else animationsDisabled = true;

  return { tier, prefersReducedMotion, animationsDisabled };
}
