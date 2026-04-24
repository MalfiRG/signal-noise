import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDeviceTier } from "./use-device-tier";
import { setMockViewportWidth } from "@/test/setup";

describe("useDeviceTier", () => {
  beforeEach(() => {
    setMockViewportWidth(1440);
  });

  it("returns 'mobile' when viewport < 768px", () => {
    setMockViewportWidth(375);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("mobile");
  });

  it("returns 'tablet' when viewport is 768px-1023px", () => {
    setMockViewportWidth(900);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("tablet");
  });

  it("returns 'desktop' when viewport >= 1024px", () => {
    setMockViewportWidth(1440);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("desktop");
  });

  it("returns 'tablet' at exact 768 boundary", () => {
    setMockViewportWidth(768);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("tablet");
  });

  it("returns 'desktop' at exact 1024 boundary", () => {
    setMockViewportWidth(1024);
    const { result } = renderHook(() => useDeviceTier());
    expect(result.current).toBe("desktop");
  });

  it("cleans up matchMedia listeners on unmount (no leaks across 5 mount/unmount cycles)", () => {
    const addSpy = vi.fn();
    const removeSpy = vi.fn();
    const origMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: addSpy,
      removeEventListener: removeSpy,
      dispatchEvent: () => true,
    })) as unknown as typeof window.matchMedia;

    for (let i = 0; i < 5; i++) {
      const { unmount } = renderHook(() => useDeviceTier());
      unmount();
    }

    window.matchMedia = origMatchMedia;
    expect(addSpy).toHaveBeenCalledTimes(10); // 5 mounts × 2 subscriptions
    expect(removeSpy).toHaveBeenCalledTimes(10); // every add is paired with a remove
  });
});
