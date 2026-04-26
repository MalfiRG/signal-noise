import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { setMockViewportWidth } from "@/test/setup";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

import { useReducedMotion } from "framer-motion";
import {
  useMotionPolicy,
  useItemVariant,
  useHeroStaggerVariant,
  reducedVariant,
  staggerItem,
  staggerItemCyber,
} from "@/lib/motion";

const mockUseReducedMotion = useReducedMotion as unknown as ReturnType<typeof vi.fn>;

describe("useMotionPolicy — localStorage author override edge cases", () => {
  beforeEach(() => {
    setMockViewportWidth(375);
    mockUseReducedMotion.mockReturnValue(false);
    localStorage.removeItem("digital-matrix-motion-override");
  });

  it("treats missing localStorage key as 'override off' (animations disabled on mobile)", () => {
    localStorage.removeItem("digital-matrix-motion-override");
    const { result } = renderHook(() => useMotionPolicy());
    expect(result.current.animationsDisabled).toBe(true);
  });

  it("treats arbitrary non-'on' value as 'override off'", () => {
    localStorage.setItem("digital-matrix-motion-override", "true");
    const { result: a } = renderHook(() => useMotionPolicy());
    expect(a.current.animationsDisabled).toBe(true);

    localStorage.setItem("digital-matrix-motion-override", "1");
    const { result: b } = renderHook(() => useMotionPolicy());
    expect(b.current.animationsDisabled).toBe(true);

    localStorage.setItem("digital-matrix-motion-override", "ON");
    const { result: c } = renderHook(() => useMotionPolicy());
    // spec §4 point 4 — exact "on" only, case-sensitive
    expect(c.current.animationsDisabled).toBe(true);
  });

  it("activates on exact string 'on'", () => {
    localStorage.setItem("digital-matrix-motion-override", "on");
    const { result } = renderHook(() => useMotionPolicy());
    expect(result.current.animationsDisabled).toBe(false);
  });

  it("override is ignored when prefers-reduced-motion is set (OS wins)", () => {
    localStorage.setItem("digital-matrix-motion-override", "on");
    mockUseReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useMotionPolicy());
    expect(result.current.animationsDisabled).toBe(true);
  });

  it("override is ignored when heroReplaySkip is true (replay-skip wins per spec §4 H7)", () => {
    setMockViewportWidth(1440);
    localStorage.setItem("digital-matrix-motion-override", "on");
    const { result } = renderHook(() => useMotionPolicy({ heroReplaySkip: true }));
    // spec §4 H7 — heroReplaySkip wins over authorOverride
    expect(result.current.animationsDisabled).toBe(true);
  });
});

describe("useMotionPolicy — localStorage read failure (private mode simulation)", () => {
  let origGetItem: typeof Storage.prototype.getItem;

  beforeEach(() => {
    setMockViewportWidth(1440);
    mockUseReducedMotion.mockReturnValue(false);
    origGetItem = Storage.prototype.getItem;
  });

  afterEach(() => {
    Storage.prototype.getItem = origGetItem;
  });

  it("falls back cleanly when localStorage.getItem throws (private mode / sandboxed iframe)", () => {
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error("The operation is insecure (Safari private browsing)");
    });

    const { result } = renderHook(() => useMotionPolicy());
    expect(result.current.tier).toBe("desktop");
    expect(result.current.animationsDisabled).toBe(false);
  });
});

// spec §5.3 — all downstream consumers must agree on animationsDisabled
describe("useMotionPolicy — cross-consumer coherence", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    localStorage.removeItem("digital-matrix-motion-override");
  });

  it("desktop + animations-on: all three consumers render cinematic variants", () => {
    setMockViewportWidth(1440);

    const { result: policy } = renderHook(() => useMotionPolicy());
    const { result: heroVariant } = renderHook(() => useHeroStaggerVariant());
    const { result: itemVariant } = renderHook(() => useItemVariant());

    expect(policy.current.animationsDisabled).toBe(false);
    expect(heroVariant.current).toBe(staggerItem);
    expect(itemVariant.current).toBe(staggerItemCyber);
  });

  it("tablet + no-override: all three consumers render reduced variants", () => {
    setMockViewportWidth(900);

    const { result: policy } = renderHook(() => useMotionPolicy());
    const { result: heroVariant } = renderHook(() => useHeroStaggerVariant());
    const { result: itemVariant } = renderHook(() => useItemVariant());

    expect(policy.current.animationsDisabled).toBe(true);
    expect(heroVariant.current).toBe(reducedVariant);
    expect(itemVariant.current).toBe(reducedVariant);
  });

  it("desktop + OS-reduced-motion: all three consumers render reduced variants (OS wins)", () => {
    setMockViewportWidth(1440);
    mockUseReducedMotion.mockReturnValue(true);

    const { result: policy } = renderHook(() => useMotionPolicy());
    const { result: heroVariant } = renderHook(() => useHeroStaggerVariant());
    const { result: itemVariant } = renderHook(() => useItemVariant());

    expect(policy.current.animationsDisabled).toBe(true);
    expect(heroVariant.current).toBe(reducedVariant);
    expect(itemVariant.current).toBe(reducedVariant);
  });

  it("mobile + author-override=on: all three consumers render cinematic variants", () => {
    setMockViewportWidth(375);
    localStorage.setItem("digital-matrix-motion-override", "on");

    const { result: policy } = renderHook(() => useMotionPolicy());
    const { result: heroVariant } = renderHook(() => useHeroStaggerVariant());
    const { result: itemVariant } = renderHook(() => useItemVariant());

    expect(policy.current.animationsDisabled).toBe(false);
    expect(heroVariant.current).toBe(staggerItem);
    expect(itemVariant.current).toBe(staggerItemCyber);
  });
});
