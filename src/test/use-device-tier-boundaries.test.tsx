// Spec §1 tier table + §5.3 reactive transition coverage
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
    // spec §1 width-only tier rule (§8.1 pointer:coarse override is open question, not shipping)
    currentWidth = 810;
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("tablet");

    act(() => {
      currentWidth = 1080;
      fireAllRegistered();
    });
    expect(result.current).toBe("desktop");
  });
});
