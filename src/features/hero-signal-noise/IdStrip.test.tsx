import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

vi.mock("@/lib/motion", () => ({
  useMotionPolicy: vi.fn().mockReturnValue({ tier: "desktop", prefersReducedMotion: false, animationsDisabled: false }),
}));

import IdStrip from "./IdStrip";
import { useMotionPolicy } from "@/lib/motion";

describe("IdStrip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T12:34:56.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the 5 telemetry segments", () => {
    const { container } = render(<IdStrip />);
    const text = container.textContent ?? "";
    expect(text).toContain("NODE_07");
    expect(text).toContain("OP:");
    expect(text).toContain("PT");
    expect(text).toContain("TS:");
    expect(text).toContain("UTC:");
    expect(text).toContain("SEC:");
    expect(text).toContain("OK");
  });

  it("renders YYYY/MM/DD UTC date", () => {
    const { container } = render(<IdStrip />);
    expect(container.textContent).toContain("2026/04/27");
  });

  it("clears interval on unmount (no leaked timers)", () => {
    const { unmount } = render(<IdStrip />);
    const before = vi.getTimerCount();
    unmount();
    expect(vi.getTimerCount()).toBe(before - 1);
  });

  it("does NOT create an interval when animationsDisabled", () => {
    // mockReturnValue (persistent) required — setNow() in useEffect triggers a
    // re-render which calls useMotionPolicy() a second time; mockReturnValueOnce
    // is consumed on the first render and reverts to the default on re-render.
    (useMotionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      tier: "mobile",
      prefersReducedMotion: true,
      animationsDisabled: true,
    });
    const before = vi.getTimerCount();
    act(() => {
      render(<IdStrip />);
    });
    expect(vi.getTimerCount()).toBe(before); // no new interval
    // reset to default for subsequent tests
    (useMotionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      tier: "desktop",
      prefersReducedMotion: false,
      animationsDisabled: false,
    });
  });

  it("adds .motion-disabled class when animationsDisabled", () => {
    // mockReturnValue (persistent) required — same reason as the interval test above.
    (useMotionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      tier: "mobile",
      prefersReducedMotion: true,
      animationsDisabled: true,
    });
    const { container } = render(<IdStrip />);
    expect(container.querySelector(".id-strip")?.classList.contains("motion-disabled")).toBe(true);
    // reset to default for subsequent tests
    (useMotionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      tier: "desktop",
      prefersReducedMotion: false,
      animationsDisabled: false,
    });
  });

  it("advances the TS field every second when motion is on", () => {
    const { container } = render(<IdStrip />);
    const before = container.textContent;
    act(() => {
      vi.setSystemTime(new Date("2026-04-27T12:34:57.000Z"));
      vi.advanceTimersByTime(1000);
    });
    expect(container.textContent).not.toBe(before);
  });
});
