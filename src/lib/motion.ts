import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useDeviceTier, type DeviceTier } from "@/hooks/use-device-tier";
import { motionConfig } from "@/lib/motion-config";

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

export interface MotionPolicy {
  tier: DeviceTier;
  prefersReducedMotion: boolean;
  animationsDisabled: boolean;
}

// Module-level latch so the console.info fires once per page load, not on
// every hook call. Prevents log spam when several components use useMotionPolicy.
let authorOverrideWarned = false;

function readAuthorOverride(): boolean {
  // Layer 1 — per-browser localStorage. Wins over build-time default when set.
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(motionConfig.storageKey);
      if (stored === "on") {
        if (!authorOverrideWarned) {
          authorOverrideWarned = true;
          console.info(
            `[digital-matrix] motion override active (localStorage): ${motionConfig.storageKey} = 'on'`,
          );
        }
        return true;
      }
      if (stored === "off") return false;
    } catch {
      // localStorage may throw in private mode; fall through to env var.
    }
  }
  // Layer 2 — build-time env var (VITE_MOTION_OVERRIDE).
  return motionConfig.buildTimeOverride === "on";
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

  // Evaluation order per spec §4 pseudocode + §10 H7 resolution.
  // Numbers match spec §4 override numbering (NOT execution order):
  //   prefersReducedMotion → disabled (§4 item 1; highest priority)
  //   heroReplaySkip       → disabled (§4 item 2)
  //   authorOverride       → enabled  (§4 item 4; checked 3rd per H7)
  //   tier default         → desktop=false else=true (§4 item 3; checked 4th per H7)
  let animationsDisabled: boolean;
  if (prefersReducedMotion) animationsDisabled = true;
  else if (heroReplaySkip) animationsDisabled = true;
  else if (authorOverride) animationsDisabled = false;
  else if (tier === "desktop") animationsDisabled = false;
  else animationsDisabled = true;

  return { tier, prefersReducedMotion, animationsDisabled };
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
