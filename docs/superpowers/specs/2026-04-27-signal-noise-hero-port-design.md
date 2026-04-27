# SIGNAL_NOISE Hero Port — Design Spec

**Date:** 2026-04-27
**Status:** HARD SPEC — pre-implementation. Authoritative source of truth for the SIGNAL_NOISE port until landed and graduated to ARCHITECTURE.md §12.
**Author:** Piotr Tarach (verbal brainstorm), transcribed by Claude 2026-04-27
**Source artifact:** `improvements/SIGNAL_NOISE.html` (single-file design prototype, 1,588 lines, generated 2026-04-26)
**Companion docs:** `DESIGN.md` (visual identity), `ARCHITECTURE.md` §6 (motion system), §7 (hero cascade), §12 (implementation notes), `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md`.

**Brainstorm decisions (locked):**
- Q1: Full hero replacement (no feature flag, accept full blast radius)
- Q2: Proportional clamp-based mobile reflow (B)
- Q3: Replace `AboutSection` fully (cat-block bio + versioned tools grid)
- Drop the rotated CERTIFIED seal entirely
- Drop the scan-sweep traveling line entirely
- D1: Live tweaks panel stays design-time-only (prototype HTML); not ported to React
- D2: Keep existing `hero-cascade-played` sessionStorage key
- D3: Data column desktop-only (`≥769px`)
- D4: Ambient chrome homepage-only; not site-wide
- D5: All new motion gated through existing `useMotionPolicy()`

---

## 0. Why this spec exists

> The SIGNAL_NOISE prototype is a single-file static HTML/CSS/JS design exploration that proves out a more distinctive hero: HUD corner brackets, ID-strip telemetry bar, vertical data column, asymmetric BREAK / BUILD / PROVE typography, cat-block bio, versioned tools grid. The live blog already implements the underlying CSS token surface and motion-policy framework, so the port is additive — but porting requires (a) a state-machine extension that does not regress recent a11y work (#54, #55, #58, #59), (b) a real fix for the asymmetric mobile-overflow bug, and (c) a faithful translation of the prototype's vanilla cascade into the existing React state machine.

The spec pins design decisions resolved during the 2026-04-27 brainstorm so future implementation work can cite a single document.

---

## 1. Scope

### In scope

- New feature folder `src/features/hero-signal-noise/`
- New components: `HeroSignalNoise`, `HeroChrome`, `HudBrackets`, `DataColumn`, `IdStrip`
- Rewrite of `src/features/about/AboutSection.tsx` to cat-block bio + versioned tools grid
- Wire the new hero into `src/pages/Index.tsx` (replace the hero `<section>`)
- New global CSS classes in `src/index.css` (`.grid-tex`, `.data-column`, `.dc-track`, `.hud-bracket`, `.id-strip`, `.cat-block`, `.cat-head`, `.cursor-blink`, `.tools-grid`, `.badge`, `.ver`)
- Mobile-reflow CSS (clamp-based asymmetric padding) replacing the prototype's hardcoded `-213px / -224px` inline negative margins
- Playwright e2e specs for cascade, mobile reflow, about-section
- Vitest unit tests for `HeroSignalNoise`, `IdStrip`
- Visual-regression baseline updates at 375 / 768 / 1280 / 1920 px
- Extension of the visual-determinism Playwright fixture to freeze the ID-strip live clock

### Out of scope

- The live tweaks panel (`/*EDITMODE-BEGIN*/` JSON in the prototype). Stays as a design-time tool inside `improvements/SIGNAL_NOISE.html`. Re-tuning the design happens in the prototype, then re-translates here.
- The rotated CERTIFIED seal (rejected during brainstorm)
- The scan-sweep traveling line (rejected during brainstorm — distracting)
- Site-wide ambient chrome on routes other than `/`. Future work; not in v1.
- New CSS tokens or keyframes. The port reuses everything already defined in `src/index.css` (`--primary`, `--accent`, `--matrix-glow`, `--matrix-text-glow`, `--hero-orb-primary`, `--hero-orb-accent`; keyframes `hero-glitch-flash/cyan/magenta`, `hero-stamp`, `letter-reveal`, `glitch-slice`).
- The `MatrixRain` component (already removed in PR #27; not coming back).
- A feature flag or VITE env var to A/B the new hero. Q1=A explicitly rejected the flagged-rollout option.

---

## 2. Design decisions — locked

### 2.1 Hero replacement strategy (Q1)

**Decision: full substitution.** `Index.tsx` hero `<section>` becomes a thin wrapper that renders `<HeroSignalNoise />`. No feature flag. Iteration happens on the regressed page.

**Rationale:** the user explicitly accepted full blast radius to maximize iteration speed. A flagged rollout would require maintaining two heroes and slow the iteration loop the user values.

### 2.2 Mobile reflow (Q2)

**Decision: proportional clamp-based padding.** Replace the prototype's inline `margin: 0 0 0 -213px` (BREAK row) and `margin: 0 -224px 0 0` (PROVE row) with `padding-left: clamp(0px, 6vw, 48px)` and `padding-right: clamp(0px, 6vw, 48px)`.

**Rationale:** asymmetric look survives at all viewports, never clips. At `375px` the offsets are ~22 px (subtle), at `1920px` they cap at 48 px (matches design intent). The lower bound `0px` ensures the layout never overflows the container.

**Layout flip:** below `641px`, the asymmetric placement is removed entirely — all three rows centered. Asymmetric look is intentional for `≥641px`.

### 2.3 About section (Q3)

**Decision: replace fully.** `AboutSection` is rewritten with the cat-block bio frame (`$ cat ~/profile.txt` terminal styling) and the 5-category versioned tools grid (Pytest v8.x, Playwright v1.58, etc.). The current pill-style tools rendering is retired.

**Rationale:** halfway adoption creates a stylistic discontinuity at the hero/about boundary. The cat-block frame echoes the hero's terminal-line `> INITIALIZING SYSTEM...` aesthetic; together they form one design language.

### 2.4 Cert seal — dropped

**Decision: removed.** No `.seal` class, no `seal-stamp` keyframe usage, no rotated yellow circle.

**Rationale:** simplifies the hero (one fewer animation, one fewer DOM node in the right row), reduces visual clutter, doesn't carry the "research / execute / certify" metaphor the user finds compelling.

### 2.5 Scan-sweep — dropped

**Decision: removed.** No `<ScanSweep />` component, no mount of `.scan-sweep::before`. The class definition stays in `index.css` (it's a pre-existing utility) but no DOM element activates it.

**Rationale:** the user found the 6 s traveling line distracting. This is the most attention-grabbing ambient layer — removing it reduces visual noise without losing the cyberpunk aesthetic (HUD brackets + data column + grid texture + scanline still carry the look).

### 2.6 Live tweaks panel (D1)

**Decision: design-time only.** The `/*EDITMODE-BEGIN*/.../*EDITMODE-END*/` self-tuning JSON block stays in `improvements/SIGNAL_NOISE.html`. Re-tuning the design happens by editing the prototype HTML, viewing in browser, and re-translating to React. The React side ships without it.

**Rationale:** the panel mutates and re-serializes the source HTML — that workflow doesn't translate to a React component. Keeping it design-time-only avoids dragging a complex authoring tool into the production bundle.

### 2.7 sessionStorage cascade key (D2)

**Decision: keep `hero-cascade-played`.** The prototype's `sn-cascade-played` is not adopted.

**Rationale:** the existing key already integrates with `useMotionPolicy({ heroReplaySkip })`, the three-state badge logic, the dev-build write-skip warning, and the Vercel preview environment detection. Migrating to `sn-cascade-played` would require touching all four call sites for zero functional gain.

### 2.8 Data column visibility (D3)

**Decision: desktop-only (`≥769px`).** Hidden via media query on tablet and mobile.

**Rationale:** matches the prototype's default. The vertical data column reads as decorative noise on narrow viewports; on desktop it adds peripheral motion that reinforces the cyberpunk frame. The 769 px cutoff aligns with the device-tier motion policy spec's mobile/tablet boundary.

### 2.9 Ambient chrome scope (D4)

**Decision: homepage-only in v1.** `<HeroChrome />` is mounted inside `Index.tsx`, not `App.tsx`. Other routes (`/projects`, `/blog`, `/skills`, `/how-i-do-it`) render unchanged.

**Rationale:** scoping to homepage limits regression surface and keeps the hero's identity strong. Site-wide chrome can be considered later if the homepage iteration converges on a look the user wants everywhere.

### 2.10 Motion gating (D5)

**Decision: all new motion gates through `useMotionPolicy()`.** No new viewport-detection logic, no new `useReducedMotion` calls outside the existing hook.

**Rationale:** the device-tier motion policy spec (`2026-04-24-...`) is the single source of truth for "should this animate?" Adding ad-hoc detection would fork the policy.

---

## 3. Component decomposition

New feature folder: `src/features/hero-signal-noise/`.

### 3.1 `HeroSignalNoise`

**Path:** `src/features/hero-signal-noise/HeroSignalNoise.tsx`
**Role:** renders the hero `<section>` content — telemetry strip + asymmetric BREAK / BUILD / PROVE headline + sub + CTAs. **Stateless w.r.t. cascade** — receives `phase`, `animationsDisabled`, `prefersReducedMotion`, and ref-to-CTA via props from `Index.tsx`.
**Replaces:** the JSX inside the existing `<section>` block in `Index.tsx` (from `<div className="text-center px-4 max-w-3xl">` through its closing `</div>`). The `<section>` wrapper itself stays in `Index.tsx`.
**Does NOT own:** cascade state machine, SKIP button, badge, scanline. Those stay in `Index.tsx` because the SKIP button's stacking-context constraint (`// SKIP must be top-level fragment child — Wave 3 B2 stacking-context`) prevents moving it into a child component, and SKIP/badge render conditions depend on `phase` — therefore the state machine stays at the same level as SKIP/badge, i.e. `Index.tsx`.
**Renders inside it:** `<IdStrip />` plus the three asymmetric headline rows plus the existing `<motion.div>` CTA wrap.

### 3.2 `HeroChrome`

**Path:** `src/features/hero-signal-noise/HeroChrome.tsx`
**Role:** ambient-chrome bundle. Renders the four background layers as siblings of `HeroSignalNoise`.
**Mounts:** `<GridTexture />` (a thin div with `.grid-tex`), `<HudBrackets />`, `<DataColumn />`. Does NOT mount `<ScanSweep />` (dropped).
**Where used:** rendered as a sibling of `<HeroSignalNoise />` inside `Index.tsx`, before the about section.

### 3.3 `HudBrackets`

**Path:** `src/features/hero-signal-noise/HudBrackets.tsx`
**Role:** four fixed-position L-shaped corner brackets at viewport edges.
**Sizing:** 28×28 px desktop, 18×18 px below `641px`.
**Render gate:** always (purely static — no animation, no motion-policy check needed).

### 3.4 `DataColumn`

**Path:** `src/features/hero-signal-noise/DataColumn.tsx`
**Role:** right-edge vertical data feed in Share Tech Mono characters, 18 px wide, autoscrolling via `dc-scroll` keyframe (26 s linear infinite).
**Content:** generated client-side — random characters from `0-9 A-F . - / # *`, ~120 lines, repeated for seamless loop.
**Render gate:** `≥769px` viewport (CSS `display: none` below). When `animationsDisabled === true`, `animation: none` is applied via `useMotionPolicy()` consumer pattern (the column still renders statically, just doesn't scroll).

### 3.5 `IdStrip`

**Path:** `src/features/hero-signal-noise/IdStrip.tsx`
**Role:** telemetry-bar above the headline. Renders five segments separated by `//`: `NODE_07`, `OP: PT`, `TS: HH:MM:SS` (live), `UTC: YYYY/MM/DD`, `SEC: OK`.
**Live clock:** `setInterval(updateClock, 1000)` inside a `useEffect` with cleanup. Format: 24-hour HH:MM:SS for `TS`, `YYYY/MM/DD` for the UTC date.
**Reduced-motion:** clock continues ticking (it's information, not animation). The blink-pulse on `SEC: OK` is suppressed when `animationsDisabled === true`.
**Visual-determinism note:** the Playwright fixture must override `Date.now()` and `new Date()` to a fixed instant before render so visual baselines are stable. See §8.1.

### 3.6 What the DOM tree looks like

`Index.tsx` keeps its existing top-level fragment structure. The state machine (phase, motion policy, replay flag, badge tri-state) stays in `Index.tsx`. The hero `<section>` wrapper stays in `Index.tsx` too — only its inner content delegates to `HeroSignalNoise`. `HeroChrome` is a new sibling rendered inside `Index.tsx`.

```
Index.tsx fragment:
<>
  <div className="scanline ..." />          // existing — unchanged, stays here
  <HeroChrome>                              // NEW — sibling, mounts ambient layers
    <GridTexture />
    <HudBrackets />
    <DataColumn />
  </HeroChrome>
  {showBadge && <BadgeButton />}            // existing tri-state badge — unchanged, stays here
  {phase>=1 && phase<3 && !disabled &&
     <SkipButton />}                        // existing — must remain top-level fragment child
                                            // (Wave 3 B2 stacking-context); stays here
  <section className="..." data-testid={...}>
    <div className="absolute ... orb-primary" />  // existing hero orbs — stay
    <div className="absolute ... orb-accent"  />
    <HeroSignalNoise                        // NEW — receives phase + motion props
      phase={phase}
      animationsDisabled={animationsDisabled}
      prefersReducedMotion={prefersReducedMotion}
      viewProjectsRef={viewProjectsRef}
    />
  </section>
  <AboutSection />                          // rewritten — cat-block + versioned tools grid
</>
```

---

## 4. CSS architecture

### 4.1 What gets reused (already in `src/index.css`)

- Tokens: `--primary`, `--accent`, `--matrix-glow`, `--matrix-text-glow`, `--hero-orb-primary`, `--hero-orb-accent`, `--background`, `--foreground`, `--muted-foreground`, `--border`, `--card`.
- Keyframes: `hero-glow`, `hero-glow-mobile`, `hero-glitch-flash`, `hero-glitch-cyan`, `hero-glitch-magenta`, `hero-stamp`, `letter-reveal`, `glitch-slice`, `glitch-slice-alt`, `cursor-blink`.
- Utility classes: `.text-glow`, `.box-glow`, `.scanline`, `.glitch-hover`, `.hero-glitch-entrance`, `.hero-stamp-entrance`.

### 4.2 New classes to add to `src/index.css`

| Class | Role |
|---|---|
| `.grid-tex` | Fixed 64 px grid overlay with radial mask, `z-index: 5` |
| `.hud-bracket`, `.hud-bracket.tl/.tr/.bl/.br` | Corner L brackets |
| `.data-column`, `.dc-track` | Right-edge data feed and autoscroll track |
| `@keyframes dc-scroll` | Linear top-to-bottom column scroll, 26 s infinite |
| `.id-strip` | Telemetry bar layout + `seg / div` children styling |
| `.cat-block`, `.cat-head` | About-section bio frame |
| `.cursor-blink::after` | Terminal-cursor blink (already has `cursor-blink` keyframe in production CSS) |
| `.tools-grid`, `.tools-grid h4` | Tools grid layout (5 categories) |
| `.badge`, `.badge .ver` | Versioned tool badge |

All new classes use `hsl(var(--token) / alpha)` form — no hex literals. Per `DESIGN.md`'s convention.

### 4.3 The mobile-reflow patch

The prototype's hardcoded inline negative margins are replaced. The new hero rows use this rule structure:

- `.hero-h .h-row.left` — `padding-left: clamp(0px, 6vw, 48px)` at `≥641px`, `0` and `justify-content: center` below
- `.hero-h .h-row.right` — `padding-right: clamp(0px, 6vw, 48px)` at `≥641px`, `0` and `justify-content: center` below
- `.hero-h .h-row.center` — always `justify-content: center`

No JS is involved in the layout decision. CSS-only.

### 4.4 What the `improvements/SIGNAL_NOISE.html` prototype contains that we DON'T port

- The two duplicated `@keyframes hero-glitch-cyan` blocks (lines ~440 and ~448 — bug in the prototype; the second one wins). We use the production `index.css` version which is canonical.
- The orphaned `letter-spacing: 0.3em; margin: 0 0 16px 0;` block at prototype lines ~302–304 (dangling outside any selector — a syntactically invalid copy/paste artifact).
- The orphaned `line-height: 1.625; margin: 0 0 32px 0;` block at prototype lines ~485–487 (same kind of artifact).
- The `/*EDITMODE-BEGIN*/.../*EDITMODE-END*/` JSON block (per D1, design-time only).
- All `<style>` content is translated from one global block into `index.css` with proper selectors. No inline `style="..."` attributes carry forward.

---

## 5. State machine integration

### 5.1 Existing 4-phase cascade in `Index.tsx`

The current state machine has phases 0/1/2/3 driven by a `useEffect` that schedules `setTimeout` callbacks based on `useMotionPolicy()` output. SKIP button is rendered when `phase >= 1 && phase < 3 && !animationsDisabled`. Replay flag (`hero-cascade-played`) is written at phase 3.

### 5.2 The port's mapping

| Prototype phase | Existing phase | Action |
|---|---|---|
| 1 (terminal line letter-reveal) | 1 | No change. Already works. |
| 2a (BREAK glitch entrance) | 2 | No change. Already works (`.hero-glitch-entrance` class). |
| 2b (BUILD letter-reveal) | 2 | No change. Already works. |
| 2c (PROVE stamp entrance) | 2 | **ADD** `.hero-stamp-entrance` class to PROVE row at phase ≥ 2. The keyframe `hero-stamp` already exists in `index.css`. The prototype's `animation-delay: 4800ms` does NOT carry forward; we use the production pattern of `animationDelay: "2.2s"` already present in the live `Index.tsx` for PROVE so the relative timing inside the existing phase-2 `setTimeout` window is preserved. |
| 3 (CTAs visible) | 3 | No change. Already works. |

**Net change:** the state machine itself is not modified — it stays in `Index.tsx` verbatim. What changes is (a) the JSX inside the hero `<section>` now delegates to `<HeroSignalNoise />` (which receives `phase`/motion-policy/refs as props), (b) a new `<IdStrip />` renders inside `HeroSignalNoise` before the headline, and (c) the PROVE row gains the `.hero-stamp-entrance` class.

### 5.3 The IdStrip clock

The clock is independent of the cascade. It renders at phase 0+ with a placeholder (`--:--:--`) and starts ticking once the component mounts:

```
useEffect(() => {
  const tick = () => {
    setNow(new Date());
  };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

Reduced-motion: the `tick` interval still runs (the clock displays current time — it's informational). The `.pulse` blink animation on the `SEC: OK` indicator is gated through `useMotionPolicy()` and replaced with a static dot when `animationsDisabled`.

### 5.4 What we explicitly preserve

| Behavior | Lives in | Moves? |
|---|---|---|
| `hero-cascade-played` sessionStorage key (write at phase 3, read at mount via `readHeroReplaySkip()`) | `Index.tsx` | Stays |
| Dev-build skip warning (`devHostWriteSkipWarned` static-flag pattern) | `Index.tsx` | Stays |
| Three-state badge (`reduce-motion: on` / `motion: off (session)` / `motion: off (device)`) and dismiss handler | `Index.tsx` | Stays |
| SKIP button render gate + click handler + `setTimeout(focus, 0)` refocus on `viewProjectsRef` | `Index.tsx` | Stays (must remain top-level fragment child per Wave 3 B2 stacking-context) |
| `data-testid="hero-phase3"` / `"hero-cascading"` attribute on the hero `<section>` | `Index.tsx` | Stays (section wrapper itself stays) |
| `inert` prop on the CTA wrap until phase 3 (Wave 3 B5 / F-UX-05) | Inside `HeroSignalNoise` | Moves with the CTA wrap JSX |
| `viewProjectsRef` ref attached to the VIEW PROJECTS link | Created in `Index.tsx`, passed to `HeroSignalNoise` as a prop, attached inside the child | Ref ownership stays in parent; ref attachment moves to child |

Net behavior change: zero. Only relocation — and only the inert+ref-attachment relocate; everything else stays in `Index.tsx`.

---

## 6. Mobile-fit strategy — full breakpoint table

| Viewport width | Hero rows | Padding offsets | Data column | HUD brackets | ID-strip layout |
|---|---|---|---|---|---|
| `≤640px` | Centered stack | All rows centered, no padding | Hidden | 18×18 px | Wraps to 2 lines |
| `641–768px` | Centered stack | All centered | Hidden | 28×28 px | Single row |
| `769–1023px` | Asymmetric | `clamp(0, 6vw, 48px)` | Visible | 28×28 px | Single row |
| `≥1024px` | Asymmetric | `clamp(0, 6vw, 48px)` (caps at 48 px ≥800 px viewport) | Visible | 28×28 px | Single row |

**Implementation:** purely CSS media queries on `.hero-h .h-row.left/.right`, `.data-column`, `.hud-bracket`, `.id-strip`. No JS-side viewport detection.

**Why `≤640px` removes asymmetry entirely instead of relying on clamp's lower bound:** at `375px` the asymmetric padding evaluates to `clamp(0, 22.5px, 48px) = 22.5px`. That's enough offset to make the layout look intentionally asymmetric on a phone where it reads as a layout glitch. Below `641px` we want centered-stack to communicate "this is the small-screen layout", not "the asymmetric layout is sort-of-working".

---

## 7. About-section rewrite

### 7.1 Current `AboutSection`

Plain prose paragraphs + pill-style tools list (rendered from a static array). Already exists at `src/features/about/AboutSection.tsx`.

### 7.2 New structure

Two-column grid (single column below `1024px`):

**Left column — bio:**
- Cat-block frame with `border-left: 2px solid hsl(var(--primary) / 0.5)` and `background: hsl(var(--card) / 0.4)`
- Header line: `<span class="pmt">$</span> cat <span class="file">~/profile.txt</span> <span class="meta">— 1.2k // utf-8</span>`
- Three paragraphs (existing bio text, no edits — bio content stays the same; only the frame changes)
- Final paragraph carries `class="cursor-blink"` for the trailing terminal-cursor effect
- Social icons row (GitHub, LinkedIn — existing)

**Right column — tools grid:**
- Five category sections, each with `<h4>` category name + `<div class="row">` of badges
- Categories (per the prototype): Test Automation, Languages, CI/CD & DevOps, Test Management, AI & Tooling
- Badge format: `<span class="badge">Name <span class="ver">version</span></span>`
- Data source: a static `toolsByCategory` array in `src/features/about/tools-data.ts` — versioned. See §11.2 for the version-staleness concern.

### 7.3 ASCII separator line

Below the about-grid, the prototype renders an ASCII separator (`━━━━━━━━━━━━━━ // END_OF_FILE ━━━━━━━━━━━━━━`). Port keeps this as `<div class="ascii-div">` — pure decorative, `aria-hidden="true"`.

---

## 8. Testing plan

### 8.1 Visual-determinism fixture extension

The existing Playwright visual-determinism fixture freezes animations via init script. We add a `freezeClockViaInitScript` step that runs before page load and overrides `Date.now()` and `new Date()` to a fixed instant (e.g., `2026-04-27T12:00:00Z`). Without this, the IdStrip's live clock makes every snapshot pixel-different and visual regression noise blows up.

Add the helper to the visual-determinism fixture file (path lives in `e2e/fixtures/`). Existing tests must pass after the addition (the override is a no-op for components that don't read clock).

### 8.2 New e2e specs

| File | What it verifies |
|---|---|
| `e2e/hero-signal-noise-cascade.spec.ts` | Phase 0 → 3 progression at desktop viewport. SKIP button refocus. Replay-skip on second visit (sessionStorage). Reduced-motion short-circuit (immediate phase 3). |
| `e2e/hero-signal-noise-mobile.spec.ts` | 375 / 414 / 768 px viewports. Assert no horizontal overflow (`page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)`). Assert centered-stack layout below 641 / asymmetric at 769+. |
| `e2e/about-section-rewrite.spec.ts` | Cat-block bio renders with `$ cat ~/profile.txt` header. Versioned badges render. Categories render in expected order. |

### 8.3 Visual regression baselines

New baselines at viewports 375, 768, 1280, 1920 for the homepage. Run with `--update-snapshots=missing` initially, then human-review before committing.

### 8.4 Vitest unit tests

| File | What it covers |
|---|---|
| `src/features/hero-signal-noise/HeroSignalNoise.test.tsx` | Phase advancement on motion=on. Phase 3 immediate on motion=off. Badge tri-state logic. inert toggle. |
| `src/features/hero-signal-noise/IdStrip.test.tsx` | Initial placeholder render. Clock format (HH:MM:SS, YYYY/MM/DD). Cleanup on unmount (`clearInterval` called). Blink suppression under reduced motion. |
| `src/features/about/AboutSection.test.tsx` | Cat-block renders. Tools grid renders all 5 categories. |

### 8.5 Existing tests that must stay green

- `e2e/blog-rendering.spec.ts`, `e2e/reading-mode.spec.ts`, `e2e/responsive.spec.ts` — must pass unchanged.
- `src/lib/motion.test.ts` — motion policy unchanged; tests should not need edits.
- `src/hooks/use-device-tier.test.tsx` — unchanged.

---

## 9. Migration steps

1. Create branch `feat/signal-noise-hero-port` from `main`.
2. Add new feature folder `src/features/hero-signal-noise/` with the five components.
3. Append new CSS classes + keyframe to `src/index.css`. No edits to existing rules — purely additive.
4. Rewrite `src/features/about/AboutSection.tsx`. Add `src/features/about/tools-data.ts`.
5. Edit `src/pages/Index.tsx`:
   - Keep the existing top-level fragment structure (scanline div, badge button, SKIP button — all stay where they are; the SKIP-button stacking-context constraint requires it)
   - Keep the cascade state machine in `Index.tsx` (phase, useEffect, useMotionPolicy, badge tri-state, replay-flag helpers, sessionStorage keys)
   - Add `<HeroChrome />` as a new fragment sibling between scanline and the hero `<section>`
   - Inside the existing `<section>` wrapper, replace the inner `<div className="text-center px-4 max-w-3xl">...</div>` content block with `<HeroSignalNoise phase={phase} animationsDisabled={animationsDisabled} prefersReducedMotion={prefersReducedMotion} viewProjectsRef={viewProjectsRef} />`
   - Verify no duplicate renders (badge, SKIP, scanline appear exactly once)
6. Extend `e2e/fixtures/` visual-determinism helper with `freezeClockViaInitScript`.
7. Add new e2e specs (8.2) and vitest specs (8.4).
8. Run full test suite. Update visual baselines after manual review.
9. Open PR with reference to this spec by filename. Require self-review per PR template.
10. Merge to `main` → Vercel auto-deploys.

---

## 10. Rollback

In order of cost (cheapest first):

1. **Per-component disable** — comment out a single JSX line in `HeroChrome` to drop `<DataColumn />`, or in `HeroSignalNoise` to drop `<IdStrip />`. One-line diff. Use this for iteration.
2. **Hero-only rollback** — `git revert` the `Index.tsx` swap commit; keep the `AboutSection` rewrite (or revert it separately). Two reverts.
3. **Full rollback** — `git revert` the merge commit. One revert. Restores the previous hero AND the previous `AboutSection`.

No feature-flag rollback because there is no feature flag (Q1=A).

---

## 11. Open questions / risks

### 11.1 The `inert` prop on the CTA wrap

The current `Index.tsx` uses React 19's boolean `inert` prop on the CTA wrap before phase 3. When the JSX moves into `HeroSignalNoise`, this must be preserved verbatim. The prop is type-checked by React 19 — TypeScript will catch a regression, but a behavioral check belongs in the cascade e2e spec.

### 11.2 Versioned tool badges and rot

Hardcoding `Pytest v8.x` in the tools grid means the badge will lie when Pytest 9 ships. Options:
- Refresh manually on each major bump (current approach for hardcoded strings — acceptable for low-frequency updates).
- Add a `// TODO(piotr, #N)` comment with a tracking issue to refresh quarterly.
- Drop the version annotations entirely if they're high-cost / low-signal in the long run. This is a v1.1 decision, not v1 — for now we ship versions per the prototype.

### 11.3 Visual-determinism fixture compatibility

If the fixture is implemented as a Playwright init script, the clock-freeze helper must run BEFORE any component mounts. Verify the existing animation-freeze pattern's hook ordering. Add a regression check that shows `Date.now()` returns the frozen instant on first paint.

### 11.4 Data-column performance at low device tier

The vertical scroll runs continuously when on. At desktop tier it's fine (we already burn animation budget on hero orbs). On low-end laptops the linear-gradient mask plus animation may cost ~1ms/frame. If profiling reveals this is hot on a tier-2 device, gate via `useMotionPolicy()` (currently CSS-only via media query, but could be elevated to JS-side opt-out).

---

## 12. Decision provenance

All decisions in §2 trace to the 2026-04-27 brainstorm session (Claude + Piotr). Visual companion mockups reside in `.superpowers/brainstorm/<session>/content/`:
- `mobile-reflow.html` — three phone-frames showing strategies A/B/C; user clicked B
- `about-scope.html` — three about-section scope cards A/B/C; user clicked A

The brainstorm server protocol is documented in `~/.claude/rules/brainstorm-server-network.md` (rule) and `~/.claude/scripts/brainstorm-restart.sh` (helper).

---

*End of spec. Implementation plan to be written by `superpowers:writing-plans` skill in next stage.*
