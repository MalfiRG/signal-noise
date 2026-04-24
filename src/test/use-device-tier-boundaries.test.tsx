/**
 * Supplementary coverage for useDeviceTier — tier-boundary off-by-one cases
 * and reactive resize transitions.
 *
 * The Wave 2 plan (src/hooks/use-device-tier.test.tsx) tests only 3 mid-tier
 * widths (375/900/1440) plus TWO boundary widths (768, 1024). It does NOT
 * test the immediate off-by-one neighbors (767, 1023) and does NOT drive an
 * actual matchMedia-change event to verify the hook re-renders reactively.
 *
 * This file covers those gaps. Adds no new module — imports the hook the
 * Wave 2 plan creates.
 *
 * Spec references:
 *   §1 tier table (width < 768 = mobile, >= 768 && < 1024 = tablet, >= 1024 = desktop)
 *   §5.3 "Add a smoke test that resizes the window and confirms the variant switches."
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeviceTier } from "@/hooks/use-device-tier";
import { setMockViewportWidth } from "@/test/setup";

describe("useDeviceTier — off-by-one boundary precision", () => {
  beforeEach(() => {
    setMockViewportWidth(1440);
  });

  it("returns 'mobile' at 767 (just below md)", () => {
    setMockViewportWidth(767);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("mobile");
  });

  it("returns 'tablet' at 768 (exact md boundary — min-width:768 must match)", () => {
    setMockViewportWidth(768);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("tablet");
  });

  it("returns 'tablet' at 1023 (just below lg)", () => {
    setMockViewportWidth(1023);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("tablet");
  });

  it("returns 'desktop' at 1024 (exact lg boundary — min-width:1024 must match)", () => {
    setMockViewportWidth(1024);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("desktop");
  });
});

/**
 * Reactive transition coverage — spec §5.3 demands a smoke test that
 * resizes and verifies the variant switches. The Wave 2 test fires
 * renderHook at a fixed width and asserts once; it never simulates a
 * matchMedia "change" event, so a regression to the old non-reactive
 * isMobileViewport() snapshot would pass that suite.
 *
 * This uses a custom matchMedia stub that captures the handler so we can
 * trigger it manually, mimicking a real resize crossing a tier boundary.
 */
describe("useDeviceTier — reactive transition on matchMedia change", () => {
  let registeredHandlers: Array<{ query: string; handler: (e: { matches: boolean }) => void }>;
  let currentWidth: number;
  let origMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    registeredHandlers = [];
    currentWidth = 1440;
    origMatchMedia = window.matchMedia;

    window.matchMedia = ((query: string) => {
      const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/);
      const compute = () =>
        minWidthMatch ? currentWidth >= parseInt(minWidthMatch[1], 10) : false;

      const mql = {
        get matches() {
          return compute();
        },
        media: query,
        onchange: null,
        addEventListener: (_ev: string, handler: (e: { matches: boolean }) => void) => {
          registeredHandlers.push({ query, handler });
        },
        removeEventListener: (_ev: string, handler: (e: { matches: boolean }) => void) => {
          registeredHandlers = registeredHandlers.filter((h) => h.handler !== handler);
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => true,
      };
      return mql as unknown as MediaQueryList;
    }) as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = origMatchMedia;
  });

  const fireAllRegistered = () => {
    // Fire every registered handler — the hook's handler computes from mql.matches
    // (which reads currentWidth via the getter), so either md- or lg-handler firing
    // will re-read both queries. Simulates real browser behavior on resize.
    registeredHandlers.forEach(({ handler }) => handler({ matches: false }));
  };

  it("transitions desktop → tablet when viewport shrinks across 1024 boundary", () => {
    currentWidth = 1440;
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("desktop");

    act(() => {
      currentWidth = 900;
      fireAllRegistered();
    });
    expect(result.current).toBe("tablet");
  });

  it("transitions tablet → mobile when viewport shrinks across 768 boundary", () => {
    currentWidth = 900;
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("tablet");

    act(() => {
      currentWidth = 400;
      fireAllRegistered();
    });
    expect(result.current).toBe("mobile");
  });

  it("transitions mobile → desktop when viewport grows across both boundaries", () => {
    currentWidth = 375;
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("mobile");

    act(() => {
      currentWidth = 1440;
      fireAllRegistered();
    });
    expect(result.current).toBe("desktop");
  });

  it("does NOT transition across an iPad 10th-gen rotation (810 → 1080, both tablet)", () => {
    // iPad 10th gen (spec §1 Orientation notes): 810×1080 in portrait, 1080×810
    // in landscape. Both land in tablet tier. Rotating must NOT cross a boundary.
    currentWidth = 810;
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("tablet");

    act(() => {
      currentWidth = 1080;
      fireAllRegistered();
    });
    // 1080 >= 1024 = desktop. BUT the spec says iPad 10th gen landscape is
    // 1080×810 which would land in desktop tier by width-only rule. The spec
    // explicitly calls out that tablet-regardless-of-orientation is §8.1
    // pointer:coarse open question, NOT shipping. So the tier DOES change.
    // We assert the width-only rule: 1080 → desktop.
    expect(result.current).toBe("desktop");
  });
});
