import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMotionPolicy } from "./motion";
import { setMockViewportWidth } from "@/test/setup";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

import { useReducedMotion } from "framer-motion";

describe("useMotionPolicy", () => {
  beforeEach(() => {
    setMockViewportWidth(1440);
    (useReducedMotion as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    localStorage.removeItem("digital-matrix-motion-override");
  });

  it("returns animationsDisabled=false on desktop with no reduced-motion", () => {
    setMockViewportWidth(1440);
    const { result } = renderHook(() => useMotionPolicy());
    expect(result.current.tier).toBe("desktop");
    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.animationsDisabled).toBe(false);
  });

  it("returns animationsDisabled=true on tablet regardless of reduced-motion", () => {
    setMockViewportWidth(900);
    const { result: a } = renderHook(() => useMotionPolicy());
    expect(a.current.tier).toBe("tablet");
    expect(a.current.animationsDisabled).toBe(true);

    (useReducedMotion as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { result: b } = renderHook(() => useMotionPolicy());
    expect(b.current.animationsDisabled).toBe(true);
  });

  it("OS reduced-motion forces animationsDisabled=true on desktop", () => {
    setMockViewportWidth(1440);
    (useReducedMotion as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { result } = renderHook(() => useMotionPolicy());
    expect(result.current.tier).toBe("desktop");
    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.animationsDisabled).toBe(true);
  });

  it("heroReplaySkip=true forces animationsDisabled=true on desktop (replay-skip beats tier)", () => {
    setMockViewportWidth(1440);
    const { result } = renderHook(() => useMotionPolicy({ heroReplaySkip: true }));
    expect(result.current.animationsDisabled).toBe(true);
  });

  it("localStorage override forces animationsDisabled=false on mobile (but not over reduced-motion)", () => {
    setMockViewportWidth(375);
    localStorage.setItem("digital-matrix-motion-override", "on");
    const { result: a } = renderHook(() => useMotionPolicy());
    expect(a.current.animationsDisabled).toBe(false);

    (useReducedMotion as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { result: b } = renderHook(() => useMotionPolicy());
    expect(b.current.animationsDisabled).toBe(true); // reduced-motion still wins
  });
});
