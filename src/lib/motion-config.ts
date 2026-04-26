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
