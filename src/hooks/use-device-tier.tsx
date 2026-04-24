import { useState, useEffect } from "react";

export type DeviceTier = "mobile" | "tablet" | "desktop";

const MD_QUERY = "(min-width: 768px)";
const LG_QUERY = "(min-width: 1024px)";

function computeTier(matchesMd: boolean, matchesLg: boolean): DeviceTier {
  if (matchesLg) return "desktop";
  if (matchesMd) return "tablet";
  return "mobile";
}

function readInitialTier(): DeviceTier {
  if (typeof window === "undefined") return "mobile";
  try {
    return computeTier(
      window.matchMedia(MD_QUERY).matches,
      window.matchMedia(LG_QUERY).matches,
    );
  } catch {
    return "mobile";
  }
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(readInitialTier);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    let mqlMd: MediaQueryList;
    let mqlLg: MediaQueryList;
    try {
      mqlMd = window.matchMedia(MD_QUERY);
      mqlLg = window.matchMedia(LG_QUERY);
    } catch {
      return;
    }

    const update = () => setTier(computeTier(mqlMd.matches, mqlLg.matches));

    mqlMd.addEventListener("change", update);
    mqlLg.addEventListener("change", update);
    update();

    return () => {
      mqlMd.removeEventListener("change", update);
      mqlLg.removeEventListener("change", update);
    };
  }, []);

  return tier;
}
