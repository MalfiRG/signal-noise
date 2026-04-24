# Device-Tier Motion Policy — Design Spec

**Date:** 2026-04-24 (original) — Rev 2 same day
**Status:** Rev 2 — post-adversarial-review. HARD SPEC — not yet implemented.
            Authoritative source of truth for all future motion-system work.
**Author:** Piotr Tarach (verbal), transcribed by Claude 2026-04-24
**Review:** 5-agent adversarial team (adversarial-tl-reviewer, reviewer-consistency,
            reviewer-coverage, ux-reviewer, socratic-challenger).
**Findings applied:** 6 critical, 11 high, 11 medium, 8 low + 3 open-questions
                      converted to new spec sections. 3 open questions retained
                      for user decision (§8.1, §8.4, §8.5).
**Scope:** The three-tier (mobile / tablet / desktop) animation policy for The Digital Matrix. Supersedes the ad-hoc 2-tier (mobile ≤640 / else) logic currently in `src/lib/motion.ts` and `src/hooks/use-mobile.tsx`.
**Companion docs:** `DESIGN.md` §7 Motion Design, `ARCHITECTURE.md` §6 Motion Design System, `ARCHITECTURE.md` §7 Hero Cascade Architecture.
**Trigger:** The current code has TWO inconsistent breakpoints for the same concept (`use-mobile.tsx` at `<768`, `motion.ts` at `<=640`), no tablet tier at all, and the hero cascade occasionally fails to play on desktop. The three-tier policy was decided in conversation but never written down — this spec closes that gap.

Tailwind version note: this spec pins 768px and 1024px as PIXEL values, not Tailwind named breakpoints. The project currently uses Tailwind CSS 3, whose defaults are `md=768px` and `lg=1024px`. The `tailwind.config.ts` does NOT override `screens`, so defaults apply. If Tailwind is ever upgraded to v4+ (where the breakpoint system changed), this spec must be re-validated and `tailwind.config.ts` must explicitly define `md: '768px'` and `lg: '1024px'` to prevent silent drift.

---

## 0. Why this spec exists

> Design intent that lives only in head-memory drifts out of code. Over six months of feature work, the blog's motion system grew a 640px mobile fork without a tablet branch; reduced-motion, session-replay-skip, and a 768px mobile hook stacked on top without a coordinating policy. The result is a hero cascade whose behavior on a tablet or a return-visit desktop reload is impossible to predict from reading `Index.tsx` alone.

This spec pins the policy. Future motion work MUST cite this document by filename in the plan.

---

## 1. The three tiers (canonical)

Tailwind's native breakpoints govern. No custom pixel values — the blog already uses Tailwind `md:`/`lg:` utilities and those must agree with the motion policy.

| Tier     | Viewport width         | Tailwind breakpoint  | Example device                      |
|----------|------------------------|----------------------|-------------------------------------|
| Mobile   | `< 768px`              | below `md`           | iPhone 15 Pro (393px), Galaxy S24   |
| Tablet   | `>= 768px && < 1024px` | `md` but below `lg`  | iPad Mini (768–1024 portrait)       |
| Desktop  | `>= 1024px`            | `lg` and above       | Laptop, external monitor            |

Rationale:
- **768** matches `src/hooks/use-mobile.tsx:3` (`MOBILE_BREAKPOINT = 768`). The existing 640 cutoff in `src/lib/motion.ts:89` is INCONSISTENT and must be retired.
- **1024** is Tailwind's `lg` — already the breakpoint for the blog TOC sidebar (`DESIGN.md:322` → `hidden lg:block`).
- Portrait tablets (~768×1024) and landscape tablets (~1024×768) deliberately land in different tiers. That is desired: a landscape iPad can render the cinematic experience; a portrait iPad shouldn't try.

Orientation notes (illustrative, not normative — the tier rule is viewport width alone):

- iPad mini (744×1133 portrait) → tier=mobile in portrait; tier=desktop in landscape (1133px ≥ 1024).
- iPad 10th gen (810×1080) → tier=tablet in BOTH orientations. This popular consumer model never reaches desktop tier.
- iPad Pro 11" (834×1194) → tier=tablet portrait; tier=desktop landscape.
- iPad Pro 12.9" (1024×1366) → tier=desktop in both orientations.

Consequence: the "landscape iPad gets cinema" heuristic is only true for iPad mini, iPad Pro 11", and iPad Pro 12.9" — not iPad 10th gen. The §8.1 open question about `pointer: coarse` override would change this.

---

## 2. The flag

The policy exposes ONE boolean to consumer code:

```ts
animationsDisabled: boolean
```

Semantics: `true` = render elements in their settled state without entrance animations; `false` = play the full cascade.

`animationsDisabled` is the field name inside the `MotionPolicy` object returned by `useMotionPolicy()`. It is not a standalone module export. Consumer code destructures:

```ts
const { animationsDisabled } = useMotionPolicy();
```

The `MotionPolicy` interface also exposes `prefersReducedMotion: boolean` and `tier: DeviceTier` as secondary fields, and `useMotionPolicy(opts)` accepts `opts.heroReplaySkip: boolean`. These are secondary public surface; the flag consumers should gate on is always `animationsDisabled` (the composed result), not the inputs.

When consuming in JSX, alias to a positive form locally: `const motionAllowed = !animationsDisabled;`. Avoid raw `!animationsDisabled` in ternaries — double-negation is a copy-paste bug source. The public contract stays `animationsDisabled`; `motionAllowed` is a read-friendly local alias only.

The `animationsDisabled` semantic applies to entrance animations within a single page (hero cascade, stagger items, LetterReveal). It does NOT apply to route transitions (`usePageVariant`, `useReadingPageVariant`) — those are governed separately by `prefersReducedMotion` alone.

Inverted positive form (`motionAllowed = !animationsDisabled`) is acceptable in helper hooks if readability demands it, but the public export and the conditional in components MUST use `animationsDisabled` — that is the vocabulary of this spec and the mental model the author uses.

---

## 3. Per-tier default policy

| Tier     | `animationsDisabled` default | Motion profile                                                               |
|----------|------------------------------|-------------------------------------------------------------------------------|
| Mobile   | `true`                       | No entrance motion — elements render in settled state (reducedVariant). No opacity fades, no transforms, no blur. |
| Tablet   | `true`                       | Same as mobile — no entrance motion.                                          |
| Desktop  | `false`                      | Full cinematic: hero 3-phase cascade, stagger with blur, brightness/glitch entrance, letter-reveal. |

**Desktop is the ONLY tier where animations play by default.** Mobile and tablet are opt-in, never opt-out.

Mobile/tablet brand trade-off (accepted, documented):

DESIGN.md §1 describes the site as "every surface has weight, every motion has function" — a cyberdeck boot-sequence brand. That brand is DESKTOP-ONLY by this spec. Mobile and tablet first-visits render in settled state with no entrance theater. This is an accepted trade-off for:

1. Performance (mobile GPUs struggle with blur and brightness transforms).
2. User expectations (touch devices rarely see cinematic intros).
3. Single-author reality (the author's primary review surface is desktop).

A future spec may define a lightweight mobile entrance (opacity-only stagger, no transforms, no blur, ≤800ms total) as a middle tier. Until then, mobile and tablet see the settled page on first visit.

---

## 4. Overrides (stacked, highest priority wins)

The flag is computed from four signals, evaluated in this order:

1. **OS reduced-motion preference** — Framer Motion's `useReducedMotion()` (see §5.2 for signal implementation details).
   → forces `animationsDisabled = true` on EVERY tier. Non-negotiable (WCAG 2.3.3). Badge "reduce-motion: on" stays visible as today (`Index.tsx:53-62`).

   Only `prefers-reduced-motion: reduce` is evaluated. `prefers-reduced-transparency` (macOS) and `prefers-contrast` are NOT gated. Blur-heavy variants may eventually warrant `prefers-reduced-transparency` support — future spec.

2. **Per-session replay-skip** — `sessionStorage["hero-cascade-played"] === "1"`
   → forces `animationsDisabled = true` for THIS component only (the hero), NOT globally. Prevents re-playing the 6-second theater on every back-navigation within one session. Already implemented at `Index.tsx:8,14-17,30,37` — the tier flag MUST compose with it, not replace it.

3. **Device tier default** — §3 table above. Applied when (1) and (2) do not trigger.

4. **Explicit author override** — a localStorage opt-in for users who want animations regardless of tier:

   ```
   localStorage["digital-matrix-motion-override"] = "on"
   ```

   forces `animationsDisabled = false` on mobile and tablet (still respects OS reduced-motion). No UI is provided in this migration — the author can set the key via DevTools. A future spec may add a UI toggle.

Evaluation pseudocode:

```ts
function computeAnimationsDisabled(opts: {
  tier: "mobile" | "tablet" | "desktop";
  prefersReducedMotion: boolean;
  heroReplaySkip: boolean;    // only the hero cascade passes this (renamed from sessionReplaySkip)
  authorOverride: boolean;    // localStorage["digital-matrix-motion-override"] === "on"
}): boolean {
  if (opts.prefersReducedMotion) return true;        // (1) OS wins
  if (opts.heroReplaySkip)       return true;        // (2) per-component skip
  if (opts.authorOverride)       return false;       // (4) explicit user opt-in
  if (opts.tier === "desktop")   return false;       // (3a) desktop = on
  return true;                                       // (3b) mobile/tablet = off
}
```

---

## 5. Implementation contract

This spec MUST be implemented as a single PR. No partial rollouts — the current 2-tier system is brittle, and splitting the migration leaves a half-tier hybrid that is worse than either endpoint.

### 5.1 New hook: `useDeviceTier()`

Location: `src/hooks/use-device-tier.tsx` (new file).

```ts
export type DeviceTier = "mobile" | "tablet" | "desktop";

export function useDeviceTier(): DeviceTier {
  // Reads window.innerWidth, subscribes to matchMedia("(min-width: 768px)")
  // AND matchMedia("(min-width: 1024px)"). Returns reactively on resize.
  // SSR-safe: returns "mobile" during SSR (conservative — see rationale below).
}
```

SSR default: `useDeviceTier()` returns `"mobile"` during SSR. Rationale: `"mobile"` is the stricter tier; the worst-case hydration mismatch for a desktop user is an extra render cycle, not a visible animation flash. Mobile users hydrate cleanly into their correct tier. This matches the 'conservative defaults' pattern used throughout this spec.

Cleanup contract: the hook MUST register both mql references inside the same `useEffect` and return a cleanup function that calls `.removeEventListener("change", handler)` on BOTH. Verification: a lifecycle test that mounts and unmounts the hook 5 times and checks that no dangling listeners remain (via a mock that counts add/remove calls).

### 5.2 New hook: `useMotionPolicy()`

Location: `src/lib/motion.ts` (add to existing file).

```ts
export interface MotionPolicy {
  tier: DeviceTier;
  prefersReducedMotion: boolean;
  animationsDisabled: boolean;      // composed per §4
}

export function useMotionPolicy(opts?: { heroReplaySkip?: boolean }): MotionPolicy;
```

`useMotionPolicy` MUST call `useReducedMotion()` from `framer-motion` for the OS-reduced-motion signal. Do NOT call `window.matchMedia("(prefers-reduced-motion: reduce)")` directly — that creates a duplicate subscription to the same signal alongside the existing Framer-based hooks (`usePageVariant`, `useReadingPageVariant`, `useItemVariant`, `useHeroStaggerVariant`).

JSDoc contract on the `MotionPolicy` interface: `heroReplaySkip` MUST only be passed by `src/pages/Index.tsx`. Other components must not read sessionStorage keys through this parameter. This is a documented contract, not a runtime-enforced one — violations will pass typecheck.

### 5.3 Variant hooks MUST consume the policy

Current hooks `useItemVariant()` and `useHeroStaggerVariant()` in `motion.ts:104-116` DELEGATE to `isMobileViewport()` at `motion.ts:87-90`, which hard-codes the 640 cutoff. After this spec lands, those hooks MUST delegate to `useMotionPolicy()` instead, and `isMobileViewport()` is deleted.

- `animationsDisabled === true` → return `reducedVariant` (the existing `{ opacity: 1 }` no-op).
- `animationsDisabled === false` + hero context → `staggerItem`.
- `animationsDisabled === false` + page context → `staggerItemCyber`.

The orphan helper `isMobileViewport()` at `motion.ts:87-90` is deleted as part of this migration.

`useIsMobile()` in `src/hooks/use-mobile.tsx` is retained — it serves layout purposes (sidebar hamburger toggle, drawer breakpoint) and is NOT a motion hook. Do not delete or merge into `useDeviceTier`.

The existing `Index.tsx:12` uses a local alias `const prefersReduced = useReducedMotion()`. When wiring `useMotionPolicy()` into `Index.tsx`, that local assignment becomes redundant — destructure `prefersReducedMotion` from the policy return instead. The aliasing is a migration-trap: do not leave `prefersReduced` and `prefersReducedMotion` coexisting in the same file.

The current `isMobileViewport()` is a render-time snapshot (no subscription). `useItemVariant()` and `useHeroStaggerVariant()` therefore do NOT re-compute when the viewport resizes — a stale-closure defect in the current code. `useDeviceTier()` MUST use a matchMedia subscription so that variant hook consumers re-render on resize. Add a smoke test that resizes the window and confirms the variant switches.

The `useEffect` in `Index.tsx` that schedules the phase cascade MUST include `tier` (from `useMotionPolicy()`) in its dependency array. On tier change mid-cascade: clear pending `setTimeout` IDs, reset `phase` to 0, re-run the effect. Without this, tier transitions during phases 0-2 leave elements in indeterminate states.

#### §5.3.1 Consumers

All files that must be touched in the migration PR:

- `src/features/projects/ProjectsList.tsx` (lines 4, 103, 105) — consumer of `useItemVariant()` AND has inline `MOBILE_BREAKPOINT=640` for layout branching. The inline 640 layout branch at line 105 MUST also be migrated to 768 in the same PR — it does NOT auto-migrate via hook indirection.
- `src/features/how-i-do-it/HowIDoItIndex.tsx` (lines 5, 41, 43) — same pattern as ProjectsList. The inline 640 layout branch at line 43 MUST also be migrated to 768.
- `src/components/ScrollReveal.tsx` (lines 2, 28) — consumer of `useItemVariant()`. Auto-migrates because it consumes the hook, not raw variants.
- `src/pages/Index.tsx` (lines 6, 11) — consumer of `useHeroStaggerVariant()`. Auto-migrates via hook indirection.

`ScrollReveal.tsx` and `Index.tsx` auto-migrate because they consume hooks, not raw variants. `ProjectsList.tsx:105` and `HowIDoItIndex.tsx:43` have INLINE 640 layout branches that must ALSO be migrated to 768 in the same PR.

LetterReveal consumers: `LetterReveal.tsx` accepts a `skipAnimation` prop. Callers (`Index.tsx` INITIALIZING SYSTEM line, BUILD IT headline) MUST pass `skipAnimation={animationsDisabled || sessionReplaySkipFromHero}`. The internal LetterReveal logic is unchanged.

### 5.4 Retire the 640 breakpoint

No code in `src/` may reference `640` as a motion breakpoint after this change. The mobile `@media` CSS rules in `src/index.css` that target 640px for ambient-effect softening (scan-sweep kill, glow softening) are a SEPARATE concern and remain at 640 for now — they govern visual intensity, not motion gating. Document the distinction at the top of the relevant `@media` block.

PR-description grep verification — include the following command output in the PR description:

```bash
grep -rn 'isMobileViewport\|innerWidth.*640\|innerWidth.*768\|innerWidth.*1024\|MOBILE_BREAKPOINT.*640' src/
```

Expected result: empty except for `src/hooks/use-mobile.tsx` (retained at 768 for layout-only use).

### 5.5 Tests

#### Vitest

Four Vitest cases at minimum (see `DESIGN.md:348` and the blog's existing `src/test/` setup):

1. `useMotionPolicy` returns `animationsDisabled: false` on desktop with no reduced-motion.
2. `useMotionPolicy` returns `animationsDisabled: true` on tablet regardless of reduced-motion.
3. OS reduced-motion forces `true` on desktop.
4. `useDeviceTier` returns `"tablet"` when `matchMedia("(min-width: 768px)")` matches and `matchMedia("(min-width: 1024px)")` does not.

Test infrastructure: jsdom does not implement `window.matchMedia`. Tests that exercise `useDeviceTier` or `useMotionPolicy` MUST stub `matchMedia` in `src/test/setup.ts`:

```ts
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: evaluateQueryAgainstWidth(query, mockViewportWidth),
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),      // legacy
  removeListener: vi.fn(),   // legacy
  dispatchEvent: vi.fn(),
}));
```

Test cases MUST call the exported `setMockViewportWidth(width: number)` helper before each case to control the returned tier. The mock parses `(min-width: Npx)` queries against the shared width global; no separate factory function is needed.

#### Playwright

Three Playwright smoke cases in `e2e/`:

1. **Desktop-animate**: load `/` at 1440×900 in a FRESH browser context with clear sessionStorage. Assert hero `<section>` reaches phase 3 within 12s using `waitFor` with a `data-testid="hero-phase3"` sentinel, NOT a fixed 7-second window. Use the existing `stabilizeForLayout` helper from `e2e/fixtures/visual-determinism.ts`. Rationale: Vite dev server cold start on CI runners adds 3-5s, and the cascade is already 6s. 7s leaves 1s of headroom — a flake factory.

2. **Mobile-settled**: load `/` at 375×812, assert hero `<section>` reaches settled state within 1500ms. No `data-testid="hero-phase3"` required — assert that all phase-3 elements are visible at t=1500ms.

3. **Reduced-motion**: load `/` at 1440×900 with `page.emulateMedia({ reducedMotion: "reduce" })`, assert phase 3 within 2s AND assert the "reduce-motion: on" badge is visible.

### 5.6 Skip-intro mechanism (required deliverable)

Because the full cascade is 6 seconds (phase 3 at 6000ms) and the CTAs render with `animate="hidden"` until phase 3, the first-visit desktop experience locks out clicks for 6 seconds. The migration MUST include a skip-intro affordance.

Minimum implementation:

1. Any `pointerdown` or `keydown` (Enter/Space) on the `<section>` element during phases 0-2 sets `phase=3` immediately, cancels pending timeouts via `clearTimeout`, and writes `sessionStorage["hero-cascade-played"] = "1"`.
2. A **visible** "SKIP ›" button (`aria-label="Skip intro"`) appears as soon as phase 1 is reached (~200ms after mount, well before the 2.5s phase-2 transition). Bottom-right corner, focusable via native button semantics (no explicit `tabIndex` needed), keyboard-activatable via Enter/Space on focus. The button renders OUTSIDE the hero `<section>` to avoid stacking-context traps — see §5.6 fix-cycle commit `6fa19c4`.
3. The button is removed from the DOM once phase reaches 3.

Rationale: this resolves (a) the interaction-lockout accessibility issue and (b) the keyboard-navigation gap where invisible focusable elements (the CTAs under `animate="hidden"`) appear in tab order before phase 3.

All `sessionStorage.getItem` and `sessionStorage.setItem` calls MUST be wrapped in `try/catch`. On exception (private browsing, quota exceeded, iOS WebView), default `heroReplaySkip = false` (always replay) and log once to `console.warn`. The migration includes updating `Index.tsx:14-17` and `Index.tsx:30,37` to this pattern.

### 5.7 User feedback for suppressed animations

The existing "reduce-motion: on" badge (`Index.tsx:53-62`) fires only when `prefersReducedMotion` is true. With the new tier-based suppression path, this creates an asymmetric feedback model: tablet users get identical flat visuals but no badge.

Tri-state badge (final, post-Wave-3 F-UX-03 + F-CONS-05 convergence):

- `reduce-motion: on` when OS preference is active.
- `motion: off (session)` when `heroReplaySkip` is the active cause (session replay-skip) — informs returning visitors why the cascade is skipped.
- `motion: off (device)` when tier (mobile/tablet) is the active cause — informs first-time visitors why the page rendered flat.
- Badge is dismissible. Click sets a `localStorage` flag (`hero-badge-dismissed`) to suppress cross-session. Persists until `localStorage` is cleared. Rationale: the states it communicates (OS preference, device class) are long-lived, not session-transient.

### 5.8 Accessibility during the cascade (phases 0-2)

During phases 0-2 on desktop, elements with `animate="hidden"` render at opacity 0 but remain in the accessibility tree and tab order. This is a known accessibility gap. The migration MUST:

1. Apply `aria-hidden="true"` to the phase-3-gated `motion.div` (`Index.tsx` lines 117-151 container) while `phase < 3`. Remove `aria-hidden` when phase reaches 3.
2. The opacity-0 INITIALIZING SYSTEM placeholder (`Index.tsx:85-88`) must also be `aria-hidden`.
3. Skip-intro button (per §5.6) is the keyboard-accessible escape.
4. An `aria-live="polite"` region announcing phase progression ("System initialized", "Hero loaded") for screen reader users is a candidate feature — see §8.5 open question. Do not ship in first PR.

### 5.9 Development escape hatch

The `sessionStorage["hero-cascade-played"]` flag persisting across reloads interferes with dev iteration. Mitigate by NOT writing the flag on local/preview hostnames:

```ts
const isDevHost = location.hostname === "localhost"
               || location.hostname === "127.0.0.1"
               || location.hostname.endsWith(".vercel.app");
if (!isDevHost) {
  try { sessionStorage.setItem(HERO_PLAYED_KEY, "1"); } catch {}
}
```

Production users (custom domain) get the full "set-at-end" behavior. Dev and Vercel preview users always see the cascade on every reload. Zero user-facing impact on production; full iteration ergonomics in dev.

### 5.10 Contributor guidance

New components needing animation gating MUST use `useMotionPolicy()`. Do not re-implement device detection inline. Do not compare `window.innerWidth` to literal breakpoint values. Do not bypass to `isMobileViewport` (deleted).

A repository `CLAUDE.md` entry (`TechnicalBlog/technical-blog/the-digital-matrix/CLAUDE.md` §Styling Rules) SHOULD be added in a follow-up doc PR pointing contributors to this hook. An optional ESLint rule banning `innerWidth` comparisons against 640/768/1024 is a future enhancement.

### 5.11 Rollback

Approved recovery if the merged PR causes a production regression:

```
git revert <merge-commit>
```

Because this migration is a single self-contained PR, the revert is clean — no cascading undo of feature-flag flips or staged state migrations. No feature-flag kill switch is provided; the change is small enough that a revert is faster.

---

## 6. Known bug this spec unblocks

Observation (2026-04-24): "digital matrix repo does not do animations on desktop, animate is turned off on the desktop for stage 1, 2, 3 transitions."

Hypotheses (unconfirmed; do not ship a fix until verified):

**A.** `sessionStorage["hero-cascade-played"]` persists across reloads within the same tab, keeping `phase=3` and skipping all cascade classes. Verify: DevTools → Application → Session Storage → delete the key → reload. [most likely — matches the observation of "always off on desktop"]

**B.** `requestAnimationFrame` never fires because the browser tab was backgrounded at mount time (Chrome throttles background tabs). Verify: hard-reload with DevTools open, check phase-state log.

**C.** React StrictMode double-invoke (dev only) — the first effect run sets sessionStorage before phase ticks complete, and the second run sees the flag and skips. Verify: disable StrictMode temporarily, reload.

The fix for whichever hypothesis confirms is OUTSIDE this spec. The dev escape hatch (§5.9) mitigates all three hypotheses in dev without resolving the root cause.

---

## 7. Out of scope for this spec

- Page-transition variants (`pageTransition.cyberpunk/reading/reduced`) — `usePageVariant()` and `useReadingPageVariant()` govern ROUTE transitions (not content entrance), gate only on `prefersReducedMotion`, and are unchanged by this migration. The `animationsDisabled` flag does NOT apply to them. This means: a tablet user gets content-entrance-disabled but route-transitions-still-play. That is the intentional scope — route transitions are brief (200ms) and carry navigation affordance, not content theater. If a future spec wants to tier-gate route transitions, it must make that decision explicitly.
- CSS keyframe ambient animations (`animate-hero-glow-slow`, `animate-hero-glow-slower`, scanline) — these are viewport-size-softened via `@media` in `index.css`, not motion-tier-gated. Intentional: they carry the "cyberdeck is alive" mood at zero perceptual cost.
- `LetterReveal.tsx`'s internal logic is out of scope; consumers handle the flag pass-through (see §5.3 for the consumer instruction).

---

## 8. Open questions

1. **Tablet landscape** — a 10" iPad in landscape is 1024×768 and lands in the desktop tier. Does the author want a "tablet regardless of orientation" override via `matchMedia("(pointer: coarse)")`? Decide before implementation, don't leave it ambiguous.

2. **Author override** — §4 point 4 now has an explicit localStorage mechanism. If a future blog post needs a "quiet this page" flag (per-route rather than per-user), propose the API here before coding.

3. ~~**Dev replay**~~ — RESOLVED. See §5.9 (dev escape hatch).

4. **Subscription model: per-consumer vs React Context** — `useMotionPolicy()` currently (per §5.2) establishes subscriptions inside each consumer. A page with 20 stagger children becomes 60 active listeners (20 × (matchMedia 768 + matchMedia 1024 + useReducedMotion)). Alternative: wrap at `App.tsx` root with a `MotionPolicyContext`, one subscription broadcast via context.

   Cost of the current model: listener count scales linearly with consumers. Cost of context model: re-renders propagate to the whole subtree on tier change (all consumers re-evaluate their memoization).

   Decide before implementation. Default if the user does not resolve: per-consumer subscriptions (simpler, no Context plumbing).

5. **Screen-reader `aria-live` region** — §5.8 item 4 proposes an `aria-live="polite"` region announcing phase progression for screen reader users. Decision needed before shipping a follow-up PR: (a) announce each phase transition, (b) announce only the final phase-3 state, (c) skip entirely. The §5.8 base items (aria-hidden on opacity-0 elements) ship in the first PR regardless of this decision.

---

## 9. Non-goals

This spec does NOT decide:
- The ambient background effect intensity per tier.
- Which specific Framer Motion easing curves or durations run per tier (stagger item definitions stay as-is).
- Whether tablet should ever get a "light cinematic" variant (an explicit middle profile). If that emerges as a need, write a new spec — do not quietly widen §3.

---

## 10. Resolutions Applied in Rev 2

This section records curator decisions made under ambiguity during the Rev 2 pass.

**C3 SSR default:** Brief offered "conservative" as the recommended direction for §5.1 SSR default. Applied `"mobile"` (stricter tier) per the explicit brief rationale. Desktop users pay one extra render cycle; mobile users hydrate cleanly.

**C2 parameter rename:** `sessionReplaySkip` renamed to `heroReplaySkip` throughout the spec (§4, §5.2, §5.3) to make the scope contract explicit at the API surface.

**H7 pseudocode ordering:** The `authorOverride` check is placed after `heroReplaySkip` and before the tier check. This means: if the user has explicitly opted in to animations AND the hero replay-skip fires, replay-skip still wins (the cascade does not replay twice per session even if the user opted in). This is the most conservative ordering.

**M4 DESIGN.md callout notation drift:** DESIGN.md §7 callout writes `tablet 768–1023`; this spec writes `>= 768 && < 1024`. Numerically equivalent for integer pixels, but notationally inconsistent. A follow-up doc PR should align DESIGN.md to use the spec's explicit half-open interval form. (Curator cannot edit DESIGN.md — scope constraint.)

**L1 ARCHITECTURE.md wording:** ARCHITECTURE.md §6 callout simplifies the current state as "2-tier 640px cutoff" — this is directionally correct but elides the 768 mobile hook. A follow-up doc PR should update the callout to "inconsistent 640/768 breakpoints (no tablet tier)". (Curator cannot edit ARCHITECTURE.md — scope constraint.)

**L2 closing line:** The spec was UNTRACKED at time of Rev 2 write. The "in the same commit" claim from Rev 1 is removed. Cross-reference line now reads: "Cross-referenced from `DESIGN.md` §7 and `ARCHITECTURE.md` §6."

---

## 11. Spec expiry triggers

Reopen this spec if any of the following occur:

1. Tailwind is upgraded to v4+ and default `md`/`lg` breakpoints change OR the breakpoint API changes.
2. Framer Motion's `useReducedMotion` API changes or is removed.
3. A new device tier is proposed (e.g., "ultrawide" at ≥1920px, "watch" at <320px).
4. The §8.1 pointer:coarse override is resolved with "yes" — that fundamentally changes tier resolution.
5. A future spec adds a light-cinema mobile entrance profile (per §9 non-goal escape clause).

Otherwise, the spec remains authoritative.

---

*Spec authored 2026-04-24 during the `blog-visual-bugs-fix` session. Cross-referenced from `DESIGN.md` §7 and `ARCHITECTURE.md` §6.*
