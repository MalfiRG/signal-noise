/**
 * Central control plane for the motion-policy author override.
 *
 * The override forces animations on regardless of the device tier. It is a
 * three-layer config: per-browser localStorage > build-time env var > unset.
 * See src/lib/motion.ts:readAuthorOverride for the read path that consults
 * both layers.
 *
 * Knobs and where to set them:
 *
 *   localStorage["digital-matrix-motion-override"]
 *     - Set in DevTools console: localStorage.setItem(KEY, "on")
 *     - Per-browser, per-origin. Wins over the env var when set to "on" or "off".
 *     - Use for personal preview without redeploying.
 *
 *   VITE_MOTION_OVERRIDE
 *     - Set in .env.local (local dev only) or Vercel env vars (production).
 *     - Build-time substitution; requires vite restart / Vercel redeploy.
 *     - Use to force animations on for ALL visitors (e.g. demo, A/B test).
 *
 * Precedence (top to bottom, first match wins):
 *   1. localStorage value of "on" or "off"   (browser-local override)
 *   2. VITE_MOTION_OVERRIDE === "on"          (build-time default)
 *   3. fall through to tier default in motion.ts (desktop=on, else=off)
 */

type OverrideValue = "on" | "off" | undefined;

function readBuildTimeOverride(): OverrideValue {
  const raw = import.meta.env.VITE_MOTION_OVERRIDE;
  if (raw === "on" || raw === "off") return raw;
  return undefined;
}

export const motionConfig = {
  storageKey: "digital-matrix-motion-override",
  buildTimeOverride: readBuildTimeOverride(),
} as const;
