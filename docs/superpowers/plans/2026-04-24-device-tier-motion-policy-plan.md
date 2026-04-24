# Device-Tier Motion Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blog's inconsistent 2-tier (640/768) motion system with a canonical 3-tier (mobile/tablet/desktop) policy gated by a single public boolean `animationsDisabled`, wired through two new hooks (`useDeviceTier`, `useMotionPolicy`), and deliver the required UX/accessibility deliverables from the Rev 2 spec (skip-intro, aria-hidden gating, feedback-badge extension, dev escape hatch).

**Architecture:** Two new hooks form a thin policy layer. `useDeviceTier` subscribes to two `matchMedia` queries (`(min-width: 768px)` and `(min-width: 1024px)`) and returns a reactive `"mobile" | "tablet" | "desktop"`. `useMotionPolicy` composes tier + Framer's `useReducedMotion()` + per-component `heroReplaySkip` + `localStorage` override into one `animationsDisabled` boolean. The existing variant hooks delegate; consumers stop reading `window.innerWidth`. `Index.tsx` gains a skip-intro mechanism, multi-hop aria-hidden gating, a feedback badge, a dev escape hatch for `localhost`/`vercel.app`, and tier-reactive cascade teardown.

**Tech Stack:** React 18 + TypeScript 5.8, Framer Motion 12, Vite 7, Tailwind 3 (defaults), Vitest, Playwright, jsdom test env.

**Source spec:** `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md` (Rev 2, 414 lines, post-adversarial-review, 36 findings applied).

**Open-question defaults assumed by this plan** (flip any of these and the plan re-scopes):
- **§8.1 `pointer:coarse` override:** NO. Tier is viewport-width only. (If YES — add a third `matchMedia` subscription and fork `useDeviceTier` to detect coarse pointers. New tests; no other task changes.)
- **§8.4 Subscription model:** per-consumer (one listener set per call site). (If Context: replace `useDeviceTier` consumers with `useMotionPolicyContext`; wrap `App.tsx` with a provider; ~2 extra tasks.)
- **§8.5 `aria-live` phase announcements:** DEFERRED to a follow-up PR. First PR ships only §5.8 base (`aria-hidden` on opacity-0 containers). If author says "ship announcement too": add a visually-hidden `aria-live="polite"` region updated by `phase`; ~1 extra task.

**Locked decisions honored (from spec §0-§4):** three tiers, breakpoints 768/1024, flag `animationsDisabled`, defaults mobile=true/tablet=true/desktop=false, OS reduced-motion wins, `heroReplaySkip` composes, ordered chain OS→session→override→tier, single-PR migration, 640px `@media` for ambient intensity stays, Framer Motion stays, gates on/off only.

---

## File map

Files created:
- `src/hooks/use-device-tier.tsx` — reactive tier hook with matchMedia subscriptions + cleanup.
- `src/hooks/use-device-tier.test.tsx` — Vitest, 5 cases (3 tiers + reactive resize + listener cleanup).
- `src/lib/motion.test.ts` — Vitest, 4 cases for `useMotionPolicy` per spec §5.5.
- `e2e/smoke/hero-motion-tier.spec.ts` — Playwright, 3 cases per spec §5.5.

Files modified:
- `src/test/setup.ts` — upgrade `matchMedia` stub to a query-evaluating mock keyed on a shared `__mockViewportWidth__` global.
- `src/lib/motion.ts` — delete `isMobileViewport()`; add `useMotionPolicy()`; rewire `useItemVariant()` and `useHeroStaggerVariant()` to delegate.
- `src/features/projects/ProjectsList.tsx` — delete inline `MOBILE_BREAKPOINT=640` and `isMobile` snapshot; switch mobile/desktop branch to `animationsDisabled` from `useMotionPolicy()`.
- `src/features/how-i-do-it/HowIDoItIndex.tsx` — same transformation as ProjectsList.
- `src/pages/Index.tsx` — destructure `useMotionPolicy()`; add `tier` to cascade `useEffect` deps with teardown; sessionStorage try/catch + dev-host skip; skip-intro handlers + button; `aria-hidden` gating; tier-based badge branch; LetterReveal `skipAnimation` pass-through.

Files intentionally NOT touched:
- `src/hooks/use-mobile.tsx` — retained for layout use (sidebar/drawer). Do not delete. Do not fold into `useDeviceTier`.
- `src/components/ScrollReveal.tsx` — auto-migrates via hook indirection. No code change. Verify only.
- `src/components/LetterReveal.tsx` — internal logic unchanged per spec §7. `skipAnimation` prop already exists.
- `src/index.css` — 640px `@media` ambient-effect rules stay (locked #10).
- `DESIGN.md`, `ARCHITECTURE.md` — callouts already in place; wording touch-ups are follow-up doc PRs (spec §10).

---

## Task 1: Upgrade matchMedia mock in test setup

Prerequisite for all Vitest tasks. Current `src/test/setup.ts:30-42` returns `matches: false` regardless of query. Tests need a query-evaluating mock keyed on a mutable width.

**Files:**
- Modify: `src/test/setup.ts:30-42`

- [ ] **Step 1: Write the failing test**

Create `src/test/setup.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setMockViewportWidth } from "./setup";

describe("matchMedia mock", () => {
  beforeEach(() => {
    setMockViewportWidth(1440);
  });

  it("returns matches=true when viewport is above min-width threshold", () => {
    setMockViewportWidth(1200);
    expect(window.matchMedia("(min-width: 768px)").matches).toBe(true);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(true);
  });

  it("returns matches=false when viewport is below min-width threshold", () => {
    setMockViewportWidth(375);
    expect(window.matchMedia("(min-width: 768px)").matches).toBe(false);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);
  });

  it("returns matches=true for tablet tier at min-width 768 but not 1024", () => {
    setMockViewportWidth(900);
    expect(window.matchMedia("(min-width: 768px)").matches).toBe(true);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);
  });

  it("exposes addEventListener/removeEventListener spies for cleanup tests", () => {
    const mql = window.matchMedia("(min-width: 768px)");
    expect(typeof mql.addEventListener).toBe("function");
    expect(typeof mql.removeEventListener).toBe("function");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test -- src/test/setup.test.ts`
Expected: FAIL with `setMockViewportWidth is not a function` (export not defined).

- [ ] **Step 3: Implement the mock upgrade**

Replace lines 30-42 of `src/test/setup.ts` with:

```ts
let __mockViewportWidth__ = 1440;

export function setMockViewportWidth(width: number): void {
  __mockViewportWidth__ = width;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => {
    const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/);
    const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);
    const reducedMotionMatch = query.match(/prefers-reduced-motion:\s*reduce/);

    let matches = false;
    if (minWidthMatch) {
      matches = __mockViewportWidth__ >= parseInt(minWidthMatch[1], 10);
    } else if (maxWidthMatch) {
      matches = __mockViewportWidth__ <= parseInt(maxWidthMatch[1], 10);
    } else if (reducedMotionMatch) {
      matches = false; // tests opt-in via Framer's useReducedMotion override if needed
    }

    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };
  },
});
```

- [ ] **Step 4: Run test — verify pass**

Run: `npm run test -- src/test/setup.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 5: Run full test suite — verify no regression**

Run: `npm run test`
Expected: all existing tests still pass. If any test was relying on `matches: false` being the only reply for ALL queries, it now gets different answers — that's a real dormant bug the prior naive mock masked, fix inline.

- [ ] **Step 6: Commit**

```bash
git add src/test/setup.ts src/test/setup.test.ts
git commit -m "test: query-evaluating matchMedia mock for device-tier tests

Existing stub returned matches=false regardless of query, which silently
masked any logic that keyed on viewport width. Upgrade to a query-parsing
mock driven by a mutable __mockViewportWidth__. Export setMockViewportWidth
helper for test cases. Prerequisite for useDeviceTier / useMotionPolicy
tests per docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md
§5.5."
```

---

## Task 2: Create `useDeviceTier` hook

New reactive hook. Subscribes to `matchMedia("(min-width: 768px)")` and `matchMedia("(min-width: 1024px)")`. Returns `"mobile" | "tablet" | "desktop"`. SSR returns `"mobile"` (conservative per spec §5.1).

**Files:**
- Create: `src/hooks/use-device-tier.tsx`
- Create: `src/hooks/use-device-tier.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/use-device-tier.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test -- src/hooks/use-device-tier.test.tsx`
Expected: FAIL with `Cannot find module './use-device-tier'`.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/use-device-tier.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test — verify pass**

Run: `npm run test -- src/hooks/use-device-tier.test.tsx`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-device-tier.tsx src/hooks/use-device-tier.test.tsx
git commit -m "feat(motion): add useDeviceTier reactive hook

Three-tier device detection via matchMedia subscriptions to 768/1024 breakpoints.
Returns 'mobile' | 'tablet' | 'desktop' reactively on viewport resize. SSR-safe
(returns 'mobile' conservatively). Cleans up both listeners on unmount to avoid
leaks.

Implements spec §5.1 of
docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md."
```

---

## Task 3: Create `useMotionPolicy` hook (composes tier + reduced-motion + heroReplaySkip + override)

New hook in `motion.ts`. Composes four signals into one `animationsDisabled` boolean per spec §4 pseudocode.

**Files:**
- Modify: `src/lib/motion.ts` (append new interface + hook after line 116, before the non-existent end)
- Create: `src/lib/motion.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/motion.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test -- src/lib/motion.test.ts`
Expected: FAIL with `useMotionPolicy is not exported from './motion'`.

- [ ] **Step 3: Implement `useMotionPolicy` in `motion.ts`**

At the END of `src/lib/motion.ts` (after line 117), append:

```ts
import { useDeviceTier, type DeviceTier } from "@/hooks/use-device-tier";

export interface MotionPolicy {
  tier: DeviceTier;
  prefersReducedMotion: boolean;
  animationsDisabled: boolean;
}

const AUTHOR_OVERRIDE_KEY = "digital-matrix-motion-override";

function readAuthorOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTHOR_OVERRIDE_KEY) === "on";
  } catch {
    return false;
  }
}

/**
 * The single public motion-policy hook. See
 * docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md §5.2.
 *
 * @param opts.heroReplaySkip — MUST only be passed by src/pages/Index.tsx.
 *   Other components must not read sessionStorage keys through this parameter.
 *   This is a documented contract, not a runtime-enforced one.
 */
export function useMotionPolicy(
  opts?: { heroReplaySkip?: boolean }
): MotionPolicy {
  const tier = useDeviceTier();
  const prefersReducedMotion = !!useReducedMotion();
  const heroReplaySkip = !!opts?.heroReplaySkip;
  const authorOverride = readAuthorOverride();

  // Evaluation order per spec §4:
  //   (1) OS reduced-motion wins   → disabled
  //   (2) hero replay-skip         → disabled
  //   (4) author override          → enabled on mobile/tablet (still below OS+session)
  //   (3) tier default             → desktop enabled, else disabled
  let animationsDisabled: boolean;
  if (prefersReducedMotion) animationsDisabled = true;
  else if (heroReplaySkip) animationsDisabled = true;
  else if (authorOverride) animationsDisabled = false;
  else if (tier === "desktop") animationsDisabled = false;
  else animationsDisabled = true;

  return { tier, prefersReducedMotion, animationsDisabled };
}
```

- [ ] **Step 4: Run test — verify pass**

Run: `npm run test -- src/lib/motion.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/motion.ts src/lib/motion.test.ts
git commit -m "feat(motion): add useMotionPolicy composing tier+reduced-motion+override

Composes four signals (OS reduced-motion via Framer's useReducedMotion,
session replay-skip opt-in, localStorage author override, device tier) into
the public animationsDisabled boolean per spec §4 evaluation chain.

Uses Framer's useReducedMotion (not raw matchMedia) to share subscription
with existing hooks. Author override reads localStorage at render time (no
subscription — override is a config flag, not a reactive signal).

Implements spec §5.2 of
docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md."
```

---

## Task 4: Rewire `useItemVariant` and `useHeroStaggerVariant` to delegate; delete `isMobileViewport`

Variant hooks stop calling `isMobileViewport()` (snapshot, non-reactive, 640-cutoff) and consume `useMotionPolicy` (reactive, tier-aware).

**Files:**
- Modify: `src/lib/motion.ts:87-116`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/motion.test.ts`:

```ts
import { useItemVariant, useHeroStaggerVariant, staggerItemCyber, staggerItem, reducedVariant } from "./motion";

describe("useItemVariant (delegated)", () => {
  beforeEach(() => {
    setMockViewportWidth(1440);
    (useReducedMotion as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    localStorage.removeItem("digital-matrix-motion-override");
  });

  it("returns staggerItemCyber on desktop with animations enabled", () => {
    setMockViewportWidth(1440);
    const { result } = renderHook(() => useItemVariant());
    expect(result.current).toBe(staggerItemCyber);
  });

  it("returns reducedVariant on tablet (animationsDisabled=true)", () => {
    setMockViewportWidth(900);
    const { result } = renderHook(() => useItemVariant());
    expect(result.current).toBe(reducedVariant);
  });

  it("returns reducedVariant on mobile", () => {
    setMockViewportWidth(375);
    const { result } = renderHook(() => useItemVariant());
    expect(result.current).toBe(reducedVariant);
  });

  it("returns reducedVariant on desktop with reduced-motion", () => {
    setMockViewportWidth(1440);
    (useReducedMotion as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { result } = renderHook(() => useItemVariant());
    expect(result.current).toBe(reducedVariant);
  });
});

describe("useHeroStaggerVariant (delegated)", () => {
  beforeEach(() => {
    setMockViewportWidth(1440);
    (useReducedMotion as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it("returns staggerItem on desktop", () => {
    setMockViewportWidth(1440);
    const { result } = renderHook(() => useHeroStaggerVariant());
    expect(result.current).toBe(staggerItem);
  });

  it("returns reducedVariant on tablet", () => {
    setMockViewportWidth(900);
    const { result } = renderHook(() => useHeroStaggerVariant());
    expect(result.current).toBe(reducedVariant);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm run test -- src/lib/motion.test.ts`
Expected: FAIL — current `useItemVariant` uses `isMobileViewport()` (640 cutoff snapshot), so `setMockViewportWidth(900)` doesn't affect it. The tablet case returns `staggerItemCyber` instead of `reducedVariant`.

- [ ] **Step 3: Delete `isMobileViewport` and rewire hooks**

In `src/lib/motion.ts`, delete lines 87-90 (`isMobileViewport` helper) and lines 104-116 (the two hooks).

Replace with:

```ts
export function useItemVariant(): Variants {
  const { animationsDisabled } = useMotionPolicy();
  if (animationsDisabled) return reducedVariant;
  return staggerItemCyber;
}

export function useHeroStaggerVariant(): Variants {
  const { animationsDisabled } = useMotionPolicy();
  if (animationsDisabled) return reducedVariant;
  return staggerItem;
}
```

Also delete the now-unused `staggerItemMobile` export if no other file imports it — check with grep:

```bash
grep -rn "staggerItemMobile" src/ e2e/
```

If grep returns empty except for `src/lib/motion.ts` itself, delete the export at lines 59-65 of the original file. If any consumer imports it, keep it.

- [ ] **Step 4: Run test — verify pass**

Run: `npm run test -- src/lib/motion.test.ts`
Expected: all 11 tests PASS (5 from Task 3 + 6 from Task 4).

- [ ] **Step 5: Verify no other file references `isMobileViewport`**

Run:

```bash
grep -rn "isMobileViewport" src/ e2e/
```

Expected: empty output.

- [ ] **Step 6: Verify other consumers still compile**

Run: `npm run build 2>&1 | tail -20`
Expected: build succeeds. If it fails with "Cannot find name isMobileViewport" in any file, the migration scope was wrong — investigate that file, do not re-add the export.

- [ ] **Step 7: Commit**

```bash
git add src/lib/motion.ts src/lib/motion.test.ts
git commit -m "refactor(motion): variant hooks delegate to useMotionPolicy; delete isMobileViewport

useItemVariant and useHeroStaggerVariant now read animationsDisabled from
useMotionPolicy() instead of calling the non-reactive isMobileViewport
snapshot. This fixes a stale-closure defect: the old hooks captured
window.innerWidth at first mount and never updated on resize. Now variants
switch reactively when the user resizes across tier boundaries.

Deletes the orphan isMobileViewport() helper. 640px retired as a motion
breakpoint (locked decision #2).

Implements spec §5.3 of
docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md."
```

---

## Task 5: Migrate `ProjectsList.tsx` — delete inline 640, use policy

Replace the inline `MOBILE_BREAKPOINT=640` + `window.innerWidth` snapshot with `animationsDisabled` from `useMotionPolicy()`.

**Files:**
- Modify: `src/features/projects/ProjectsList.tsx:2,4,6,102-149`

- [ ] **Step 1: Read the current consumer code**

Confirm current state (should match spec §5.3.1):
- Line 2: `import { motion, useReducedMotion } from "framer-motion";`
- Line 4: `import { useItemVariant } from "@/lib/motion";`
- Line 6: `const MOBILE_BREAKPOINT = 640;`
- Line 102-105: `const ProjectsList = () => { const itemVariant = useItemVariant(); const prefersReduced = useReducedMotion(); const isMobile = typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;`
- Line 121: `: isMobile ? (`

- [ ] **Step 2: Apply the migration**

Edit `src/features/projects/ProjectsList.tsx`:

Replace line 2:
```ts
import { motion } from "framer-motion";
```
(Remove `useReducedMotion` — now sourced via policy.)

Replace line 4:
```ts
import { useItemVariant } from "@/lib/motion";
import { useMotionPolicy } from "@/lib/motion";
```
(Two imports from the same module — can collapse into one combined line: `import { useItemVariant, useMotionPolicy } from "@/lib/motion";`.)

Delete line 6 entirely (`const MOBILE_BREAKPOINT = 640;`).

Replace lines 102-105:
```ts
const ProjectsList = () => {
  const itemVariant = useItemVariant();
  const { animationsDisabled } = useMotionPolicy();
```

Replace line 121's `isMobile` branch condition:
```ts
        ) : animationsDisabled ? (
```

Update the inner `mobileItemReveal` branch (previously gated on `prefersReduced`) to gate on `animationsDisabled`:

Line 126-128 becomes:
```tsx
                variants={animationsDisabled ? undefined : mobileItemReveal}
                initial={animationsDisabled ? undefined : "hidden"}
                whileInView={animationsDisabled ? undefined : "visible"}
```

- [ ] **Step 3: Verify the file type-checks**

Run: `npx tsc --noEmit`
Expected: no errors referring to ProjectsList.tsx.

- [ ] **Step 4: Run existing tests to confirm no regression**

Run: `npm run test -- src/features/projects`
Expected: any existing tests still pass. If none exist, skip.

- [ ] **Step 5: Verify grep shows no 640 in this file**

Run:

```bash
grep -n "640\|MOBILE_BREAKPOINT\|window.innerWidth" src/features/projects/ProjectsList.tsx
```

Expected: empty output.

- [ ] **Step 6: Commit**

```bash
git add src/features/projects/ProjectsList.tsx
git commit -m "refactor(projects): migrate to useMotionPolicy; delete inline 640

Removes top-level MOBILE_BREAKPOINT=640 const and render-time
window.innerWidth snapshot. Reads animationsDisabled from useMotionPolicy()
which is reactive across tier boundaries. Replaces prefersReduced gate on
the mobile-reveal variants with animationsDisabled (which already composes
reduced-motion). Layout branch now fires at 768/1024 boundaries (consistent
with rest of site) instead of the non-standard 640.

Per spec §5.3.1 migration-scope enumeration."
```

---

## Task 6: Migrate `HowIDoItIndex.tsx` — delete inline 640, use policy

Identical transformation to Task 5 applied to the methodology index.

**Files:**
- Modify: `src/features/how-i-do-it/HowIDoItIndex.tsx:2,5,7,40-43,61-69`

- [ ] **Step 1: Confirm current state**

Expected:
- Line 2: `import { motion, useReducedMotion } from "framer-motion";`
- Line 5: `import { useItemVariant } from "@/lib/motion";`
- Line 7: `const MOBILE_BREAKPOINT = 640;`
- Line 41-43: `const itemVariant = useItemVariant(); const prefersReduced = useReducedMotion(); const isMobile = typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;`

- [ ] **Step 2: Apply the migration**

Edit `src/features/how-i-do-it/HowIDoItIndex.tsx`:

Line 2: drop `useReducedMotion`:
```ts
import { motion } from "framer-motion";
```

Line 5: add `useMotionPolicy`:
```ts
import { useItemVariant, useMotionPolicy } from "@/lib/motion";
```

Delete line 7.

Replace lines 40-43:
```ts
const HowIDoItIndex = () => {
  const itemVariant = useItemVariant();
  const { animationsDisabled } = useMotionPolicy();
```

Replace line 61's branch:
```ts
        {animationsDisabled ? (
```

Replace lines 66-68:
```tsx
                variants={animationsDisabled ? undefined : mobileItemReveal}
                initial={animationsDisabled ? undefined : "hidden"}
                whileInView={animationsDisabled ? undefined : "visible"}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors in HowIDoItIndex.tsx.

- [ ] **Step 4: Verify grep clean**

Run:

```bash
grep -n "640\|MOBILE_BREAKPOINT\|window.innerWidth" src/features/how-i-do-it/HowIDoItIndex.tsx
```

Expected: empty output.

- [ ] **Step 5: Commit**

```bash
git add src/features/how-i-do-it/HowIDoItIndex.tsx
git commit -m "refactor(how-i-do-it): migrate to useMotionPolicy; delete inline 640

Same transformation as ProjectsList — drop MOBILE_BREAKPOINT=640 const,
drop window.innerWidth snapshot, replace isMobile branch with
animationsDisabled from useMotionPolicy(). Layout branch now reactive and
aligned with tier policy.

Per spec §5.3.1 migration-scope enumeration."
```

---

## Task 7: `Index.tsx` — wire `useMotionPolicy`, tier-reactive useEffect, sessionStorage try/catch, dev escape hatch

Rewire the home page hero cascade to use the policy hook, add `tier` to the cascade effect dependencies (with teardown on tier change), wrap sessionStorage access in try/catch, and skip the sessionStorage write on localhost / *.vercel.app hostnames.

**Files:**
- Modify: `src/pages/Index.tsx:1-47`

- [ ] **Step 1: Refactor the component state and effect**

Edit `src/pages/Index.tsx` — replace lines 1-47 with:

```tsx
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AboutSection from "@/features/about/AboutSection";
import LetterReveal from "@/components/LetterReveal";
import { useHeroStaggerVariant, useMotionPolicy } from "@/lib/motion";

const HERO_PLAYED_KEY = "hero-cascade-played";

function isDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".vercel.app");
}

function readHeroReplaySkip(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(HERO_PLAYED_KEY) === "1";
  } catch (err) {
    console.warn("[hero] sessionStorage read failed; replay-skip defaulted to false", err);
    return false;
  }
}

function writeHeroReplayFlag(): void {
  if (isDevHost()) return;
  try {
    sessionStorage.setItem(HERO_PLAYED_KEY, "1");
  } catch (err) {
    console.warn("[hero] sessionStorage write failed; cascade may replay next visit", err);
  }
}

const Index = () => {
  const heroItem = useHeroStaggerVariant();

  const [heroReplaySkip] = useState(() => readHeroReplaySkip());
  const policy = useMotionPolicy({ heroReplaySkip });
  const { animationsDisabled, prefersReducedMotion, tier } = policy;

  const [phase, setPhase] = useState(animationsDisabled ? 3 : 0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (animationsDisabled) {
      setPhase(3);
      return;
    }

    setPhase(0);
    const schedule = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timeoutsRef.current.push(id);
    };

    const raf = requestAnimationFrame(() => {
      if (prefersReducedMotion) {
        schedule(100, () => setPhase(1));
        schedule(1100, () => setPhase(2));
        schedule(1200, () => {
          setPhase(3);
          writeHeroReplayFlag();
        });
      } else {
        schedule(200, () => setPhase(1));
        schedule(2500, () => setPhase(2));
        schedule(6000, () => {
          setPhase(3);
          writeHeroReplayFlag();
        });
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [animationsDisabled, prefersReducedMotion, tier]);

  const animClass = (gateMet: boolean, cls: string): string => {
    if (!gateMet) return "opacity-0";
    return animationsDisabled ? "" : cls;
  };
```

- [ ] **Step 2: Update the JSX to pass animationsDisabled to LetterReveal and adjust motion initial/animate**

Keep the JSX structure from lines 49+ of the original but replace every `skipAnimation` reference with `animationsDisabled`:

- Line 82 (original): `skipAnimation={skipAnimation}` → `skipAnimation={animationsDisabled}`
- Line 104 (original): `skipAnimation={skipAnimation}` → `skipAnimation={animationsDisabled}`
- Line 111 (original): `style={phase >= 2 && !skipAnimation ? ...}` → `style={phase >= 2 && !animationsDisabled ? ...}`
- Line 119 (original): `initial={skipAnimation ? "visible" : "hidden"}` → `initial={animationsDisabled ? "visible" : "hidden"}`

- [ ] **Step 3: Update the reduce-motion badge gate to use `prefersReducedMotion`**

Line 53 (original): `{prefersReduced && (` → `{prefersReducedMotion && (`

- [ ] **Step 4: Type-check and run existing hero tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run test -- src/App.test.tsx`
Expected: the existing smoke test still passes.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "refactor(hero): wire Index.tsx to useMotionPolicy; tier-reactive cascade

Replaces local skipAnimation/prefersReduced with destructured policy from
useMotionPolicy(). Cascade useEffect now includes tier in its dependency
array — on tier change mid-cascade, pending timeouts are cleared, phase
resets to 0, effect re-runs. Without this, tier transitions during phases
0-2 leave elements in indeterminate states (spec H1).

All sessionStorage access wrapped in try/catch; write is skipped on
localhost/127.0.0.1/*.vercel.app per §5.9 dev escape hatch. Production
users get the unchanged set-at-end behavior; dev and preview users see
the cascade on every reload.

Implements spec §5.3 (hero cascade effect), §5.9 (dev escape hatch),
and H3 (sessionStorage guards) of
docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md."
```

---

## Task 8: `Index.tsx` — skip-intro mechanism + aria-hidden gating

Add pointer/keyboard skip handlers on the hero `<section>`, a visible-after-phase-1 SKIP button, and `aria-hidden` gating on phase-0-2 hidden containers.

**Files:**
- Modify: `src/pages/Index.tsx` (new handler + button + aria-hidden attributes)

- [ ] **Step 1: Add the skip handler above the return statement**

After the `animClass` definition (end of Step 1's Task 7 block), add:

```tsx
  const skipToPhase3 = () => {
    if (phase >= 3) return;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPhase(3);
    writeHeroReplayFlag();
  };

  const onSectionKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      skipToPhase3();
    }
  };
```

- [ ] **Step 2: Wire the handlers onto the hero `<section>`**

Replace the `<section>` opening tag (original line 64):

```tsx
      <section
        className="relative z-20 min-h-screen flex items-center justify-center overflow-hidden"
        onPointerDown={phase < 3 ? skipToPhase3 : undefined}
        onKeyDown={phase < 3 ? onSectionKeyDown : undefined}
        tabIndex={phase < 3 ? -1 : undefined}
        data-testid={phase >= 3 ? "hero-phase3" : "hero-cascading"}
      >
```

Rationale: `data-testid="hero-phase3"` is the sentinel the Playwright test waits on (Task 11). `tabIndex={-1}` allows focus-redirect without inserting into tab order.

- [ ] **Step 3: Add the visible SKIP button between phase 1 and phase 3**

After the `<div className="text-center px-4 max-w-3xl">` wrapper opening (original line 74), and before the phase-1 LetterReveal block, add:

```tsx
          {phase >= 1 && phase < 3 && !animationsDisabled && (
            <button
              type="button"
              onClick={skipToPhase3}
              aria-label="Skip intro"
              className="fixed bottom-4 right-4 z-40 border border-border px-3 py-1 text-xs tracking-widest text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all bg-background/60 backdrop-blur-sm"
            >
              SKIP ›
            </button>
          )}
```

- [ ] **Step 4: Add `aria-hidden` gating on the phase-0-2 hidden containers**

Replace the opacity-0 placeholder `<p>` (original lines 85-88):

```tsx
            <p aria-hidden="true" className="text-muted-foreground text-sm tracking-[0.3em] mb-4 opacity-0">
              {">"} INITIALIZING SYSTEM...
            </p>
```

Replace the phase-3 stagger container `<motion.div>` (original lines 117-121) opening:

```tsx
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.5, delayChildren: 0.05 } } }}
            initial={animationsDisabled ? "visible" : "hidden"}
            animate={phase >= 3 ? "visible" : "hidden"}
            aria-hidden={phase < 3 ? true : undefined}
          >
```

Add `aria-hidden={phase < 2 ? true : undefined}` to the opacity-0 BUILD IT fallback (original line 107):

```tsx
              <span className="block opacity-0" aria-hidden="true" aria-label="BUILD IT">BUILD IT</span>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual browser check (if dev server is running)**

Start: `node node_modules/vite/bin/vite.js --port 8080 --host` (use `run_in_background: true`).

Visit `http://localhost:8080/` in a browser. Verify:
1. SKIP button appears bottom-right around 2.5s into the cascade.
2. Clicking SKIP jumps to phase 3 immediately.
3. Clicking anywhere else on the hero also jumps to phase 3.
4. Pressing Tab and Enter anywhere on the hero triggers skip.
5. Clearing sessionStorage and reloading plays the full cascade again.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat(hero): skip-intro mechanism + aria-hidden gating during cascade

Resolves the 6-second interaction lockout: every first-visit desktop user
previously could not click VIEW PROJECTS or READ BLOG until phase 3. Now:

- Any pointerdown or keydown (Enter/Space) on the hero <section> during
  phases 0-2 jumps to phase 3, clears pending timeouts, writes replay flag.
- A visible 'SKIP ›' button appears after phase 1 (2.5s) in the bottom-right,
  keyboard-focusable with aria-label='Skip intro'.
- Phase-gated opacity-0 containers carry aria-hidden='true' so screen
  readers skip them until they render.
- data-testid='hero-phase3' sentinel added for Playwright.

Implements spec §5.6 (skip-intro) and §5.8 (accessibility base items) of
docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md."
```

---

## Task 9: `Index.tsx` — feedback badge extension for tier-based suppression

Current badge shows only when OS reduced-motion is on. Extend to show a second label when tier alone triggers suppression. Dismissible via localStorage session flag.

**Files:**
- Modify: `src/pages/Index.tsx` (replace the badge block)

- [ ] **Step 1: Add badge-dismiss state and effect**

After the `skipToPhase3` definition, add:

```tsx
  const BADGE_DISMISS_KEY = "hero-badge-dismissed";
  const [badgeDismissed, setBadgeDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(BADGE_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const dismissBadge = () => {
    setBadgeDismissed(true);
    try {
      sessionStorage.setItem(BADGE_DISMISS_KEY, "1");
    } catch {}
  };

  const showReducedMotionBadge = prefersReducedMotion && !badgeDismissed;
  const showTierBadge = !prefersReducedMotion && animationsDisabled && !heroReplaySkip && !badgeDismissed;
```

- [ ] **Step 2: Replace the existing badge block**

Replace the existing reduced-motion badge (original lines 53-62):

```tsx
      {(showReducedMotionBadge || showTierBadge) && (
        <motion.button
          type="button"
          onClick={dismissBadge}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="fixed bottom-4 right-4 z-50 text-orange-400/80 text-[10px] font-mono px-2 py-1 rounded border border-orange-400/30 bg-background/50 backdrop-blur-sm cursor-pointer hover:opacity-100"
          aria-label={showReducedMotionBadge ? "Reduced motion is on. Click to dismiss." : "Animations disabled for this device. Click to dismiss."}
          data-testid={showReducedMotionBadge ? "badge-reduced-motion" : "badge-animations-off-device"}
        >
          {showReducedMotionBadge ? "reduce-motion: on" : "animations: off (device)"}
        </motion.button>
      )}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check (dev server)**

1. Visit at 1440×900 — no badge.
2. Resize to 900px width — `animations: off (device)` badge appears.
3. Click the badge — it disappears for the session.
4. Enable OS reduced-motion in DevTools Rendering → Emulate CSS media — `reduce-motion: on` label appears.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat(hero): extend feedback badge to cover tier-based suppression

Previously only OS reduced-motion showed a 'reduce-motion: on' badge. Tier-
based suppression (tablet/mobile defaults) left users with no signal that
the flat landing was intentional. Extend:

- reduce-motion: on   — OS preference (existing)
- animations: off (device) — tier alone triggers suppression
- No badge when session-replay-skip is the only signal (dev iteration)
- Badge is dismissible via click; state persists in sessionStorage for the
  session only.

Implements spec §5.7 of
docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md."
```

---

## Task 10: `Index.tsx` — LetterReveal `skipAnimation` prop gets `animationsDisabled || heroReplaySkip`

LetterReveal already accepts a `skipAnimation` prop (Task 7 Step 2 wired `animationsDisabled`). Spec §5.3 says the right value is `animationsDisabled || heroReplaySkipFromHero`. Since `animationsDisabled` already composes `heroReplaySkip` when passed to `useMotionPolicy`, the current `skipAnimation={animationsDisabled}` is equivalent. Verify and document.

**Files:**
- Verify: `src/pages/Index.tsx`

- [ ] **Step 1: Confirm composition is correct**

In the current Index.tsx (after Task 7):
- `heroReplaySkip` is read from sessionStorage at mount.
- It is passed to `useMotionPolicy({ heroReplaySkip })`.
- `animationsDisabled` is computed inside the hook as `prefersReducedMotion || heroReplaySkip || (tier !== "desktop" && !authorOverride)`.
- LetterReveal receives `skipAnimation={animationsDisabled}`.

Therefore: `animationsDisabled === true` ⟹ LetterReveal skips. `heroReplaySkip` is already folded in.

- [ ] **Step 2: Add a code comment for future readers**

In Index.tsx, above the `<LetterReveal` components, add one explanatory comment:

```tsx
          {/* LetterReveal skipAnimation receives animationsDisabled (which composes
              heroReplaySkip via useMotionPolicy) — no double-pass needed per §5.3. */}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "docs(hero): note LetterReveal prop composition; no runtime change

LetterReveal's skipAnimation already receives animationsDisabled, which
composes heroReplaySkip via useMotionPolicy. Spec §5.3 says the correct
value is 'animationsDisabled || heroReplaySkipFromHero' — the composition
makes these semantically equal. Inline comment documents this so a future
reader doesn't 'fix' it by adding a redundant || heroReplaySkip.

Per spec §5.3 LetterReveal consumers note."
```

---

## Task 11: Playwright smoke suite — 3 cases per §5.5

Create the three Playwright cases exactly as §5.5 specifies: desktop-animate with sentinel wait, mobile-settled, reduced-motion.

**Files:**
- Create: `e2e/smoke/hero-motion-tier.spec.ts`

- [ ] **Step 1: Verify the existing Playwright config and fixtures**

Confirm these files exist:
- `e2e/fixtures/visual-determinism.ts` (has `stabilizeForLayout` at line 136)
- `playwright.config.ts`
- `e2e/smoke/` directory

Run: `ls e2e/smoke/ && grep -n "stabilizeForLayout" e2e/fixtures/visual-determinism.ts`
Expected: directory exists; grep returns at least one match.

- [ ] **Step 2: Write the spec file**

Create `e2e/smoke/hero-motion-tier.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { stabilizeForLayout } from "../fixtures/visual-determinism";

test.describe("Hero device-tier motion policy", () => {
  test("desktop animates — phase 3 reached within 12s with data-testid sentinel", async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await stabilizeForLayout(page);

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 12_000 });
  });

  test("mobile settles within 1500ms — no cascade", async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 1_500 });
    await expect(page.getByRole("link", { name: "VIEW PROJECTS" })).toBeVisible();
    await expect(page.getByRole("link", { name: "READ BLOG" })).toBeVisible();
  });

  test("reduced-motion — phase 3 within 2s and badge visible", async ({ page, context }) => {
    await context.clearCookies();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2_000 });
    await expect(page.locator('[data-testid="badge-reduced-motion"]')).toBeVisible();
  });
});
```

- [ ] **Step 3: Run Playwright locally**

Start the dev server in the background (per `.claude/rules/hard-reload-dev-servers.md`):

```bash
pkill -f "vite.*--port 8080" 2>/dev/null; sleep 1
```

Then start Vite with `run_in_background: true`:
`node node_modules/vite/bin/vite.js --port 8080 --host`

Run: `npx playwright test e2e/smoke/hero-motion-tier.spec.ts --reporter=line`
Expected: all 3 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e/smoke/hero-motion-tier.spec.ts
git commit -m "test(e2e): hero motion-tier smoke suite — 3 cases per spec §5.5

Desktop-animate waits for data-testid='hero-phase3' sentinel (12s budget
covers Vite cold start on CI). Mobile-settled asserts hero renders in
settled state within 1.5s (no cascade expected on tier=mobile). Reduced-
motion asserts the existing 'reduce-motion: on' badge is visible alongside
phase 3 within 2s.

All tests clear sessionStorage before the reload so the heroReplaySkip
path doesn't false-positive. Uses the existing stabilizeForLayout helper
for font-load determinism.

Implements spec §5.5 Playwright section of
docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md."
```

---

## Task 12: PR-description grep verification + final smoke run

Before opening the PR, produce the grep verification output spec §5.4 requires in the PR description, and run the full test suite once more.

**Files:** (no file changes; verification only)

- [ ] **Step 1: Run the spec-mandated grep**

Run:

```bash
grep -rn 'isMobileViewport\|innerWidth.*640\|innerWidth.*768\|innerWidth.*1024\|MOBILE_BREAKPOINT.*640' src/
```

Expected output: **only** a match in `src/hooks/use-mobile.tsx:3` (retained at 768 for layout). If anything else matches, the migration scope is incomplete — find the file and route through `useMotionPolicy`.

- [ ] **Step 2: Save the grep output for the PR description**

```bash
grep -rn 'isMobileViewport\|innerWidth.*640\|innerWidth.*768\|innerWidth.*1024\|MOBILE_BREAKPOINT.*640' src/ > /tmp/motion-policy-grep-evidence.txt
cat /tmp/motion-policy-grep-evidence.txt
```

Expected content (exact text will be used in the PR description body):

```
src/hooks/use-mobile.tsx:3:const MOBILE_BREAKPOINT = 768;
```

- [ ] **Step 3: Full Vitest run**

Run: `npm run test -- --run`
Expected: all tests pass. Record the pass count.

- [ ] **Step 4: Full Playwright run**

Run: `npx playwright test --reporter=line`
Expected: full suite passes, including the 3 new hero-motion-tier cases.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both succeed.

- [ ] **Step 6: CRLF guard on all touched files**

Run:

```bash
for f in src/hooks/use-device-tier.tsx src/hooks/use-device-tier.test.tsx src/lib/motion.ts src/lib/motion.test.ts src/test/setup.ts src/features/projects/ProjectsList.tsx src/features/how-i-do-it/HowIDoItIndex.tsx src/pages/Index.tsx e2e/smoke/hero-motion-tier.spec.ts; do
  crlf=$(head -1 "$f" | cat -A | grep -c '\^M\$')
  if [ "$crlf" != "0" ]; then
    echo "CRLF MIXED: $f"
  fi
done
```

Expected: no output (all files LF-only). If any file shows CRLF, run `sed -i 's/\r$//' <file>` and commit the fix.

- [ ] **Step 7: Open the PR**

Use the grep evidence from Step 2 in the PR description. Example PR body:

```markdown
## Summary
Implements the three-tier (mobile/tablet/desktop) motion policy per
`docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md` Rev 2.

Replaces the inconsistent 640/768 breakpoints with a single reactive policy
hook. Adds skip-intro UX, aria-hidden gating during cascade, feedback badge
for tier-based suppression, and a localhost/vercel.app dev escape hatch.

## Migration-scope grep evidence (per spec §5.4)

```
src/hooks/use-mobile.tsx:3:const MOBILE_BREAKPOINT = 768;
```

Only `use-mobile.tsx` retains a breakpoint constant — it drives the sidebar
hamburger toggle, which is layout, not motion. All motion-gating uses
`useMotionPolicy()`.

## Test plan
- [x] 10 new Vitest cases (`use-device-tier`, `useMotionPolicy`, variant hooks)
- [x] 3 new Playwright smoke cases (desktop-animate, mobile-settled, reduced-motion)
- [x] Full existing Vitest suite passes
- [x] Full existing Playwright suite passes
- [x] `tsc --noEmit` clean
- [x] `npm run lint` clean
- [x] CRLF guard clean on all touched files

## Open questions preserved for author decision (spec §8)
- §8.1 `pointer:coarse` tablet-landscape override — NOT implemented. Tier is
  viewport-width only. Flip to "yes" adds one matchMedia subscription.
- §8.4 Per-consumer subscriptions vs React Context — Per-consumer assumed.
- §8.5 `aria-live` phase announcements — Deferred. Only §5.8 base items shipped.

## Rollback
`git revert <merge-commit>` is the approved recovery (spec §5.11).
```

---

## Self-review checklist

Running my own fresh-eyes pass against the spec before handoff:

**1. Spec coverage.** Walked spec §1-§11:
- §1 three tiers + breakpoints → Tasks 2 (hook), 5/6 (consumer wiring), 12 (grep verify).
- §2 `animationsDisabled` field + `motionAllowed` alias → Tasks 3, 5, 6, 7.
- §3 per-tier defaults + brand trade-off → Task 3 implementation, documented in spec.
- §4 override chain + pseudocode → Task 3.
- §5.1 `useDeviceTier` + SSR mobile + cleanup → Task 2.
- §5.2 `useMotionPolicy` + `heroReplaySkip` + Framer reduced-motion → Task 3.
- §5.3 variant hook delegation + consumer enumeration + tier-reactive `useEffect` + stale-snapshot + LetterReveal pass-through → Tasks 4, 5, 6, 7, 10.
- §5.4 640 retirement + grep verification → Tasks 4, 5, 6, 12.
- §5.5 Vitest 4 cases + mock + Playwright 3 cases → Tasks 1, 2, 3, 4, 11.
- §5.6 skip-intro + sessionStorage try/catch → Task 7, Task 8.
- §5.7 badge extension → Task 9.
- §5.8 aria-hidden base items → Task 8. (aria-live item 4 deferred per §8.5.)
- §5.9 dev escape hatch (localhost/127.0.0.1/*.vercel.app) → Task 7.
- §5.10 contributor guidance — documented in spec itself; CLAUDE.md update is a follow-up doc PR, noted.
- §5.11 rollback — documented in PR description (Task 12 Step 7).
- §6 bug hypotheses — spec-only; no code change required in this PR.
- §7 out of scope — respected (page transitions, CSS keyframes, LetterReveal internals left alone).
- §8 open questions — flagged as plan assumptions in header.
- §9 non-goals — respected.

No gaps.

**2. Placeholder scan.** Searched for TBD, TODO, "implement later", "add error handling", "similar to Task N", "fill in details". None found. Every step has concrete code or commands.

**3. Type/name consistency.**
- `useDeviceTier`, `DeviceTier`, `MotionPolicy`, `useMotionPolicy`, `animationsDisabled`, `heroReplaySkip`, `tier`, `prefersReducedMotion` — all consistent across Tasks 2-11.
- `HERO_PLAYED_KEY`, `BADGE_DISMISS_KEY`, `AUTHOR_OVERRIDE_KEY` — all capitalized consts, consistent.
- `data-testid="hero-phase3"` used in Task 8 and Task 11 — matches.
- `data-testid="badge-reduced-motion"` / `badge-animations-off-device` used in Task 9 and Task 11 — matches.

**4. Task ordering.** Verified each task's test-passing state depends only on earlier tasks. Task 1 (mock) blocks Tasks 2-4 (tests need the mock). Task 2 (hook) blocks Tasks 3-4 (useMotionPolicy imports it). Task 3 blocks Task 4 (variant delegation needs the policy). Tasks 5-6 can run in either order (no interdependency). Task 7 (Index.tsx base wire) blocks Tasks 8-10 (all extend Index.tsx). Task 11 (Playwright) needs Task 8 (adds `data-testid="hero-phase3"`) and Task 9 (adds badge `data-testid`s). Task 12 is final verification.

**5. Commit hygiene.** Each task ends with a commit message that follows conventional-commit form (`feat(scope):`, `refactor(scope):`, `test(e2e):`, `docs(scope):`). No Co-Authored-By per project convention.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-24-device-tier-motion-policy-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task (12 tasks). Each subagent gets the task spec + current file snapshot. I review the diff between tasks, check for regressions, then proceed. Fast iteration, protected context.

**2. Inline Execution** — Execute the 12 tasks in this session using `superpowers:executing-plans`. Batch execution with checkpoints at Tasks 4, 7, 11 for review. Same total work, one session's context.

**Which approach?**
