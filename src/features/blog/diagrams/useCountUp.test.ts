import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useCountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns target immediately when active is false (reduced motion)", async () => {
    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(88000, 1.5, false));
    expect(result.current).toBe(88000);
  });

  it("returns target as initial value before first rAF tick", async () => {
    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(3000, 1.5, true));
    expect(result.current).toBe(3000);
  });

  it("counts up from 0 to target when active", async () => {
    let rafCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(100, 1, true));

    if (rafCallback) {
      act(() => {
        (rafCallback as FrameRequestCallback)(performance.now() + 500);
      });
      expect(result.current).toBe(50);
    }
  });

  it("cleans up rAF on unmount", async () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);

    const { useCountUp } = await import("./useCountUp");
    const { unmount } = renderHook(() => useCountUp(100, 1, true));

    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });

  it("works with DualWriteVsACID typical values (migration smoke test)", async () => {
    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(102568, 1.5, false));
    expect(result.current).toBe(102568);
  });
});
