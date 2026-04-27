# SIGNAL_NOISE Hero Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the `improvements/SIGNAL_NOISE.html` design prototype into the live Digital Matrix blog by adding five new components in `src/features/hero-signal-noise/`, rewriting `AboutSection` to a cat-block + versioned tools grid, layering ambient chrome (HUD brackets, grid texture, vertical data column) on the homepage only, and replacing the hero `<section>` content with a stateless `HeroSignalNoise` child that receives cascade phase + motion-policy from `Index.tsx` via props.

**Architecture:** Additive port. The 4-phase cascade state machine in `Index.tsx` is unchanged — `HeroSignalNoise` is stateless w.r.t. cascade and receives `phase`, `animationsDisabled`, `prefersReducedMotion`, and `viewProjectsRef` as props. SKIP button, badge, scanline, and the hero `<section>` wrapper all stay in `Index.tsx` because of the SKIP button's stacking-context constraint. Mobile reflow uses `clamp(0px, 6vw, 48px)` padding (CSS-only, no JS viewport detection). Asymmetric layout activates at `≥768px` (Tailwind `md`); below that the hero stacks centered. Two new keyframes (`dc-scroll`, `cursor-blink`) and ~15 new global CSS classes land in `src/index.css`.

**Tech Stack:** React 18 + TypeScript 5.8, Framer Motion 12, Vite 7, Tailwind 3, Vitest, Playwright, jsdom test env, react-router-dom 6.

**Source spec:** `docs/superpowers/specs/2026-04-27-signal-noise-hero-port-design.md` (Rev 2, 488 lines, post-adversarial-review, 35 findings applied — commit `b1cfd55`).

**Status:** Rev 2 — post-adversarial-review (32 findings applied: 4 critical, 9 high, 8 medium, 4 low + 7 traceability set findings). 2-agent adversarial team: `traceability-auditor`, `adversarial-tl-reviewer`. Findings consolidated and applied by `curator` agent.

**Plan-level extensions beyond the spec (TDD-driven):**

1. **`clock.ts`** (T-6) — extracts `formatTimeOfDay` / `formatUtcDate` formatters from `IdStrip` for unit-test isolation. Spec §3.5 implies inline logic; the plan extracts because pure formatters are test-trivial without React rendering.
2. **`dataColumnContent.ts`** (T-7) — extracts the deterministic PRNG content generator from `DataColumn`. Spec §3.4 specifies the seed string and behavior but doesn't mandate a separate module; the plan extracts to unit-test the determinism contract directly.
3. **`DataColumn.test.tsx`** (T-9) — Vitest unit test for the component's `.motion-disabled` class application. Spec §8.4 lists Vitest specs for `HeroSignalNoise`, `IdStrip`, `AboutSection`; the plan adds `DataColumn` because the motion-policy class application is non-obvious and warrants explicit coverage.

These are not spec violations — the spec describes WHAT must ship, not the file decomposition for HOW. The extractions remain valid as long as the spec's behavior contracts are preserved.

**Locked decisions honored (from spec §1, §2, §11):**
1. Full hero replacement, no feature flag (Q1=A).
2. `clamp(0px, 6vw, 48px)` proportional reflow (Q2=B).
3. `AboutSection` rewritten fully (Q3=A).
4. CERTIFIED seal dropped.
5. ScanSweep dropped.
6. Live tweaks panel design-time only.
7. `hero-cascade-played` sessionStorage key kept (no migration).
8. Data column desktop-only `≥768px`.
9. Ambient chrome homepage-only in v1.
10. All new motion through existing `useMotionPolicy()`.
11. State machine STAYS in `Index.tsx` — only headline JSX + IdStrip + CTA wrap delegate to `HeroSignalNoise`.
12. Reuse existing CSS tokens — no new tokens. New keyframes (`dc-scroll`, `cursor-blink`) ARE allowed.
13. No `Co-Authored-By` in commit messages.
14. AboutSection: extend existing `data.ts` (`ToolCategory.tools: string[] → {name, version}[]`); do NOT create `tools-data.ts`.
15. `viewProjectsRef` is a regular prop, NOT React's `ref` prop — no `forwardRef`.

---

## File map

**Files created:**
- `src/features/hero-signal-noise/HeroSignalNoise.tsx` — hero content delegate (props in: `phase`, motion-policy flags, `viewProjectsRef`).
- `src/features/hero-signal-noise/HeroSignalNoise.test.tsx` — Vitest, phase advancement + inert toggle + tri-state badge passthrough.
- `src/features/hero-signal-noise/HeroChrome.tsx` — ambient-chrome bundle (3 layers).
- `src/features/hero-signal-noise/HudBrackets.tsx` — 4 fixed L-shaped corner brackets.
- `src/features/hero-signal-noise/DataColumn.tsx` — vertical data feed, deterministic content, CSS-gated `≥768px`.
- `src/features/hero-signal-noise/dataColumnContent.ts` — deterministic PRNG content generator (extracted for testability).
- `src/features/hero-signal-noise/dataColumnContent.test.ts` — Vitest, seed determinism + StrictMode-safe contract.
- `src/features/hero-signal-noise/IdStrip.tsx` — telemetry bar with motion-gated 1Hz live clock.
- `src/features/hero-signal-noise/IdStrip.test.tsx` — Vitest, format + cleanup + reduced-motion suppression.
- `src/features/hero-signal-noise/clock.ts` — pure formatters (HH:MM:SS, YYYY/MM/DD) extracted from `IdStrip`.
- `src/features/hero-signal-noise/clock.test.ts` — Vitest, formatter unit tests.
- `src/features/about/AboutSection.test.tsx` — Vitest, cat-block + 5-category badge grid render.
- `e2e/functional/hero-signal-noise-cascade.spec.ts` — Playwright, phase progression + SKIP refocus.
- `e2e/functional/hero-signal-noise-mobile.spec.ts` — Playwright, no horizontal overflow at 375/414/768.
- `e2e/functional/about-section-rewrite.spec.ts` — Playwright, cat-block render + versioned badges.

**Files modified:**
- `src/index.css` — append new classes + 2 keyframes (`@keyframes dc-scroll`, `@keyframes cursor-blink`) + media-query rules.
- `src/pages/Index.tsx` — add `<HeroChrome />` sibling; replace hero `<section>` inner content with `<HeroSignalNoise … />`; preserve scanline/badge/SKIP/state machine.
- `src/features/about/AboutSection.tsx` — replace prose-paragraphs section with cat-block frame + ASCII separator.
- `src/features/about/data.ts` — change `ToolCategory.tools` from `string[]` to `Array<{ name: string; version: string | null }>`. Update existing entries with version strings.
- `src/features/about/ToolBadges.tsx` — render `<span class="badge">Name <span class="ver">version</span></span>` shape.
- `e2e/fixtures/visual-determinism.ts` — add `freezeClockViaInitScript`; extend `prepareContext` with `freezeClock?: boolean`.
- `playwright.config.ts` — set `TZ: 'UTC'` in the `use` block (or via `env.TZ`).

**Files intentionally NOT touched:**
- `src/lib/motion.ts` — `useMotionPolicy()` API surface unchanged. Consumers add reads, no edits to the hook.
- `src/hooks/use-device-tier.tsx` — unchanged.
- `src/components/LetterReveal.tsx` — used as-is from `IdStrip` is NOT applicable; LetterReveal is for the existing terminal line in `Index.tsx`. No change.
- Existing keyframes / tokens / utility classes in `src/index.css` — additive only, no edits to existing rules.
- `e2e/functional/hero-cascade.spec.ts`, `e2e/functional/hero-skip-and-badge.spec.ts`, `e2e/functional/hero-focus-management.spec.ts` — must stay green (regression coverage).
- `DESIGN.md`, `ARCHITECTURE.md` — companion-doc updates are a follow-up PR after the implementation lands.

**Branch:** `feat/signal-noise-hero-port` from `main` of the `the-digital-matrix` repo (the blog's git root, not the parent MetaOrchestrator submodule).

---

## Task 1: Create the feature folder and branch (§9 step 1, §3 component decomposition)

**Files:**
- Create: `src/features/hero-signal-noise/.gitkeep`

- [ ] **Step 1: Create branch and folder**

```bash
cd /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix
git checkout main
git pull --ff-only
git checkout -b feat/signal-noise-hero-port
mkdir -p src/features/hero-signal-noise
touch src/features/hero-signal-noise/.gitkeep
```

- [ ] **Step 2: Verify branch + folder**

```bash
git branch --show-current
ls src/features/hero-signal-noise/
```

Expected: branch is `feat/signal-noise-hero-port`, folder contains `.gitkeep`.

- [ ] **Step 3: Commit**

```bash
git add src/features/hero-signal-noise/.gitkeep
git commit -m "chore(hero): scaffold src/features/hero-signal-noise/ feature folder"
```

---

## Task 2: Append new keyframes to `src/index.css` (§4.2)

Adds `@keyframes dc-scroll` (DataColumn linear scroll, 26s infinite) and `@keyframes cursor-blink` (1Hz cat-block cursor) to production CSS. These are NEW additions per Rev 2 §13 resolution 1 — `cursor-blink` was wrongly listed as production-existing in Rev 1 of the spec.

**Files:**
- Modify: `src/index.css` (append at end before any existing trailing block; place new keyframes alongside existing `@keyframes hero-stamp` etc.)

- [ ] **Step 1: Add the keyframes**

Append the following at the end of `src/index.css`:

```css
/* SIGNAL_NOISE port — keyframes added 2026-04-27 (spec §4.2) */
@keyframes dc-scroll {
  from { transform: translateY(0); }
  to   { transform: translateY(-50%); }
}

@keyframes cursor-blink {
  0%, 50%   { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

- [ ] **Step 2: Verify keyframes parse**

```bash
npm run build 2>&1 | tail -20
```

Expected: no CSS parse errors, build completes (you'll see Vite's bundle stats). If a parse error fires, the syntax is wrong — fix and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(css): add @keyframes dc-scroll and @keyframes cursor-blink

dc-scroll powers the vertical data column's autoscroll (26s linear
infinite). cursor-blink powers the cat-block trailing terminal-cursor
in the rewritten AboutSection. Both new — not previously in production."
```

---

## Task 3: Append HUD bracket + grid-texture CSS to `src/index.css` (§4.2)

Adds `.grid-tex`, `.hud-bracket` + corner-modifier classes. Z-index `11` for `grid-tex` (above scanline at `z=10`, below hero `<section>` at `z=20`) per spec Fix H5.

**Files:**
- Modify: `src/index.css` (append after Task 2 keyframes)

- [ ] **Step 1: Add the chrome classes**

Append:

```css
/* SIGNAL_NOISE port — HUD chrome (spec §4.2) */
.grid-tex {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 11;
  background-image:
    linear-gradient(hsl(var(--primary) / 0.025) 1px, transparent 1px),
    linear-gradient(90deg, hsl(var(--primary) / 0.025) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 30%, transparent 90%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 30%, transparent 90%);
}

@media (max-width: 767px) {
  .grid-tex { background-size: 40px 40px; }
}

.hud-bracket {
  position: fixed;
  width: 28px;
  height: 28px;
  border-color: hsl(var(--primary) / 0.5);
  z-index: 12;
  pointer-events: none;
}
.hud-bracket.tl { top: 76px;    left: 16px;   border-top: 1px solid;    border-left: 1px solid; }
.hud-bracket.tr { top: 76px;    right: 16px;  border-top: 1px solid;    border-right: 1px solid; }
.hud-bracket.bl { bottom: 16px; left: 16px;   border-bottom: 1px solid; border-left: 1px solid; }
.hud-bracket.br { bottom: 16px; right: 16px;  border-bottom: 1px solid; border-right: 1px solid; }

@media (max-width: 640px) {
  .hud-bracket { width: 18px; height: 18px; }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(css): add .grid-tex and .hud-bracket corner classes

z-index: 11 for grid-tex (above scanline at z=10, below hero section
at z=20). HUD brackets are 28x28 desktop, 18x18 below 640px viewport."
```

---

## Task 4: Append data-column + id-strip CSS to `src/index.css` (§4.2)

Adds `.data-column`, `.dc-track`, `.id-strip`, `.id-strip .seg`, `.id-strip .div`, `.id-strip .pulse`. Data column gates via `@media (min-width: 768px)` per spec §3.4.

**Files:**
- Modify: `src/index.css` (append after Task 3 chrome classes)

- [ ] **Step 1: Add the data-column + id-strip classes**

Append:

```css
/* SIGNAL_NOISE port — data column + id-strip (spec §3.4, §3.5, §4.2) */
.data-column {
  position: fixed;
  top: 64px;
  bottom: 0;
  right: 12px;
  width: 18px;
  z-index: 13;
  pointer-events: none;
  overflow: hidden;
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: hsl(var(--accent) / 0.35);
  text-shadow: 0 0 6px hsl(var(--accent) / 0.4);
  mask-image: linear-gradient(180deg, transparent 0%, #000 15%, #000 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 15%, #000 85%, transparent 100%);
  display: none;
}

@media (min-width: 768px) {
  .data-column { display: block; }
}

.data-column .dc-track {
  display: block;
  animation: dc-scroll 26s linear infinite;
  white-space: pre;
  text-align: center;
}

.data-column.motion-disabled .dc-track { animation: none; }

.id-strip {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  color: hsl(var(--muted-foreground));
  margin: 0 0 28px 0;
  padding: 6px 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 2px;
  background: hsl(var(--card) / 0.4);
  flex-wrap: wrap;
}

.id-strip .seg { color: hsl(var(--foreground) / 0.75); margin: 0 4px; }
.id-strip .seg b { color: hsl(var(--primary)); font-weight: normal; text-shadow: 0 0 6px hsl(var(--primary) / 0.4); }
.id-strip .div { color: hsl(var(--border)); }

.id-strip .pulse {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: hsl(var(--primary));
  box-shadow: 0 0 6px hsl(var(--primary) / 0.6);
  margin-right: 4px;
  animation: cursor-blink 1s steps(2, end) infinite;
}
.id-strip.motion-disabled .pulse { animation: none; opacity: 1; }
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(css): add .data-column, .dc-track, .id-strip telemetry classes

Data column gates via @media (min-width: 768px) — CSS-only, no JS
viewport detection. .motion-disabled class disables both autoscroll
and SEC: OK pulse blink for reduced-motion / animationsDisabled."
```

---

## Task 5: Append cat-block + tools-grid + ascii-div + hero-headline classes (§4.2, §4.3, §7.2, §7.3)

Adds `.cat-block`, `.cat-head`, child spans (`.pmt`, `.file`, `.meta`), `.cursor-blink::after`, `.tools-grid`, `.tools-grid h4`, `.badge`, `.badge .ver`, `.ascii-div`, `.ascii-div .tag`, and the hero headline row layout `.hero-h`, `.h-row.left/.center/.right`.

**Files:**
- Modify: `src/index.css` (append after Task 4 classes)

- [ ] **Step 1: Add the about + headline classes**

Append:

```css
/* SIGNAL_NOISE port — cat-block bio + tools grid + ascii-div (spec §4.2, §7) */
.cat-block {
  border: 1px solid hsl(var(--border));
  border-left: 2px solid hsl(var(--primary) / 0.5);
  background: hsl(var(--card) / 0.4);
  padding: 16px 18px 8px;
  border-radius: 2px;
  position: relative;
}

.cat-block .cat-head {
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.22em;
  color: hsl(var(--muted-foreground));
  margin: 0 0 14px 0;
  display: flex;
  gap: 10px;
  align-items: center;
}
.cat-block .cat-head .pmt  { color: hsl(var(--primary)); }
.cat-block .cat-head .file { color: hsl(var(--accent)); }
.cat-block .cat-head .meta { margin-left: auto; color: hsl(var(--foreground) / 0.4); font-size: 10px; }

.cat-block .row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.cursor-blink::after {
  content: '▊';
  font-family: 'Share Tech Mono', monospace;
  color: hsl(var(--primary));
  margin-left: 4px;
  animation: cursor-blink 1s steps(2, end) infinite;
  text-shadow: 0 0 6px hsl(var(--primary) / 0.6);
}
.cat-block.motion-disabled .cursor-blink::after { animation: none; opacity: 1; }

.tools-grid h4 {
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px;
  letter-spacing: 0.2em;
  color: hsl(var(--accent));
  margin: 12px 0 4px;
  text-transform: uppercase;
}

.badge {
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card) / 0.4);
  padding: 2px 7px;
  border-radius: 2px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  color: hsl(var(--foreground) / 0.85);
  display: inline-flex;
  gap: 4px;
}
.badge .ver { color: hsl(var(--primary) / 0.6); }
.badge:hover { border-color: hsl(var(--primary)); color: hsl(var(--primary)); }
.badge:hover .ver { color: hsl(var(--primary) / 0.9); }

.ascii-div {
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  color: hsl(var(--border));
  letter-spacing: 0;
  line-height: 1;
  margin-top: 32px;
  text-align: center;
  white-space: pre-wrap;
}
.ascii-div .tag { color: hsl(var(--accent) / 0.4); margin: 0 8px; }

/* SIGNAL_NOISE port — hero headline rows (spec §4.3) */
.hero-h {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 18px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  color: hsl(var(--foreground));
  text-shadow: var(--matrix-text-glow);
  font-size: clamp(80px, 15vw, 184px);
  line-height: 1;
  letter-spacing: 0.02em;
  padding-top: 8px;
}

.hero-h .h-row { display: flex; }
.hero-h .h-row.center { justify-content: center; }
.hero-h .h-row.left,
.hero-h .h-row.right { justify-content: center; }

@media (min-width: 768px) {
  .hero-h .h-row.left  { justify-content: flex-start; padding-left: clamp(0px, 6vw, 48px); }
  .hero-h .h-row.right { justify-content: flex-end;   padding-right: clamp(0px, 6vw, 48px); }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(css): cat-block + tools grid + ascii-div + hero headline rows

Asymmetric .h-row.left/.right activate at min-width: 768px (Tailwind md);
below 768 all rows centered. clamp(0, 6vw, 48px) caps offset at 48px to
prevent overflow at narrow viewports (spec §4.3 + Rev 2 Fix H4 + H6)."
```

---

## Task 6: Implement `clock.ts` formatters (§3.5)

Pure formatter functions extracted from `IdStrip` so they can be unit-tested without React rendering.

**Files:**
- Create: `src/features/hero-signal-noise/clock.ts`
- Create: `src/features/hero-signal-noise/clock.test.ts`

- [ ] **Step 1: Write the failing test**

`src/features/hero-signal-noise/clock.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatTimeOfDay, formatUtcDate, PLACEHOLDER_TIME, PLACEHOLDER_DATE } from "./clock";

describe("clock formatters", () => {
  it("formats local 24-hour HH:MM:SS with leading zeros", () => {
    const d = new Date("2026-04-27T03:05:09.000Z");
    // Avoid TZ flake: use a UTC-fixed Date and call the formatter directly.
    expect(formatTimeOfDay(d, "UTC")).toBe("03:05:09");
  });

  it("formats UTC date as YYYY/MM/DD", () => {
    const d = new Date("2026-04-27T12:00:00.000Z");
    expect(formatUtcDate(d)).toBe("2026/04/27");
  });

  it("handles year boundaries", () => {
    const d = new Date("2025-12-31T23:59:59.000Z");
    expect(formatUtcDate(d)).toBe("2025/12/31");
    expect(formatTimeOfDay(d, "UTC")).toBe("23:59:59");
  });

  it("exposes placeholder constants for pre-mount paint", () => {
    expect(PLACEHOLDER_TIME).toBe("--:--:--");
    expect(PLACEHOLDER_DATE).toBe("----/--/--");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- src/features/hero-signal-noise/clock.test.ts --run
```

Expected: FAIL — module `./clock` not found.

- [ ] **Step 3: Implement the formatters**

`src/features/hero-signal-noise/clock.ts`:

```ts
export const PLACEHOLDER_TIME = "--:--:--";
export const PLACEHOLDER_DATE = "----/--/--";

const pad2 = (n: number): string => String(n).padStart(2, "0");

export function formatTimeOfDay(d: Date, timeZone?: string): string {
  // When timeZone is provided, format in that zone via Intl; otherwise use the
  // local environment (production behavior). Tests pass timeZone="UTC" for
  // deterministic assertions; Playwright sets process.env.TZ=UTC at runtime.
  if (timeZone) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone,
    });
    return fmt.format(d);
  }
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}/${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}`;
}
```

- [ ] **Step 4: Run test — verify pass**

```bash
npm run test -- src/features/hero-signal-noise/clock.test.ts --run
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/hero-signal-noise/clock.ts src/features/hero-signal-noise/clock.test.ts
git commit -m "feat(hero): add clock.ts formatters (HH:MM:SS, YYYY/MM/DD)

Extracted from IdStrip for unit testability. formatTimeOfDay accepts an
optional IANA timeZone for deterministic test assertions; production
calls without it (uses local zone). formatUtcDate always uses UTC fields."
```

---

## Task 7: Implement `dataColumnContent.ts` deterministic generator (§3.4)

Module-scope deterministic PRNG so React StrictMode double-mount produces identical content. Seed is the literal string `dc-seed-v1` per spec Fix M8.

**Files:**
- Create: `src/features/hero-signal-noise/dataColumnContent.ts`
- Create: `src/features/hero-signal-noise/dataColumnContent.test.ts`

- [ ] **Step 1: Write the failing test**

`src/features/hero-signal-noise/dataColumnContent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateDataColumnContent, DC_SEED, DC_LINE_COUNT } from "./dataColumnContent";

describe("dataColumnContent", () => {
  it("exports the versioned seed string", () => {
    expect(DC_SEED).toBe("dc-seed-v1");
  });

  it("generates the expected line count", () => {
    const content = generateDataColumnContent();
    const lines = content.split("\n");
    // Doubled output for seamless infinite scroll loop.
    expect(lines.length).toBe(DC_LINE_COUNT * 2);
  });

  it("uses only allowed alphabet characters", () => {
    const content = generateDataColumnContent();
    expect(content).toMatch(/^[0-9A-F.\-/#*\n]+$/);
  });

  it("is deterministic across calls (StrictMode-safe contract)", () => {
    const a = generateDataColumnContent();
    const b = generateDataColumnContent();
    expect(a).toBe(b);
  });

  it("first half equals second half (loop seam)", () => {
    const content = generateDataColumnContent();
    const lines = content.split("\n");
    const first = lines.slice(0, DC_LINE_COUNT).join("\n");
    const second = lines.slice(DC_LINE_COUNT).join("\n");
    expect(first).toBe(second);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- src/features/hero-signal-noise/dataColumnContent.test.ts --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the generator**

`src/features/hero-signal-noise/dataColumnContent.ts`:

```ts
export const DC_SEED = "dc-seed-v1";
export const DC_LINE_COUNT = 120;
const ALPHABET = "0123456789ABCDEF.-/#*";

// xfnv1a string hash → 32-bit uint, used as Mulberry32 seed.
function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Mulberry32 — small, fast, deterministic 32-bit PRNG.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let memo: string | null = null;

export function generateDataColumnContent(): string {
  if (memo !== null) return memo;
  const rng = mulberry32(xfnv1a(DC_SEED));
  const lines: string[] = [];
  for (let i = 0; i < DC_LINE_COUNT; i++) {
    lines.push(ALPHABET[Math.floor(rng() * ALPHABET.length)]);
  }
  // Doubled for seamless infinite-scroll seam (CSS animates -50% translateY).
  memo = [...lines, ...lines].join("\n");
  return memo;
}
```

- [ ] **Step 4: Run test — verify pass**

```bash
npm run test -- src/features/hero-signal-noise/dataColumnContent.test.ts --run
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/hero-signal-noise/dataColumnContent.ts src/features/hero-signal-noise/dataColumnContent.test.ts
git commit -m "feat(hero): add dataColumnContent deterministic generator

xfnv1a + Mulberry32 PRNG seeded with literal 'dc-seed-v1'. Module-scope
memo + idempotent — StrictMode dev double-mount produces identical
content; CI baselines stable across machines (spec §3.4 + Fix M8)."
```

---

## Task 8: Implement `HudBrackets` component (§3.3)

Pure presentational component — four fixed `<span>`s with bracket modifier classes. No animation, no motion-policy gate.

**Files:**
- Create: `src/features/hero-signal-noise/HudBrackets.tsx`

- [ ] **Step 1: Implement (no test — purely declarative DOM)**

`src/features/hero-signal-noise/HudBrackets.tsx`:

```tsx
const HudBrackets = () => (
  <>
    <span className="hud-bracket tl" aria-hidden="true" />
    <span className="hud-bracket tr" aria-hidden="true" />
    <span className="hud-bracket bl" aria-hidden="true" />
    <span className="hud-bracket br" aria-hidden="true" />
  </>
);

export default HudBrackets;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/hero-signal-noise/HudBrackets.tsx
git commit -m "feat(hero): add HudBrackets — 4 fixed corner-L brackets

Pure declarative DOM — 4 spans with .hud-bracket.tl/.tr/.bl/.br classes.
No motion gate (purely static, sized via @media in index.css)."
```

---

## Task 9: Implement `DataColumn` component with motion gate (§3.4)

Renders the autoscrolling vertical data feed. Reads `useMotionPolicy()` to add `.motion-disabled` class when animations are off; CSS handles the `display: none` below 768px. Uses memoized content from `dataColumnContent.ts`.

**Files:**
- Create: `src/features/hero-signal-noise/DataColumn.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/features/hero-signal-noise/DataColumn.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/lib/motion", () => ({
  useMotionPolicy: vi.fn().mockReturnValue({ tier: "desktop", prefersReducedMotion: false, animationsDisabled: false }),
}));

import DataColumn from "./DataColumn";
import { useMotionPolicy } from "@/lib/motion";

describe("DataColumn", () => {
  it("renders a fixed-position .data-column with .dc-track child", () => {
    const { container } = render(<DataColumn />);
    const col = container.querySelector(".data-column");
    expect(col).not.toBeNull();
    expect(col?.querySelector(".dc-track")).not.toBeNull();
    expect(col?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies .motion-disabled when animationsDisabled", () => {
    // Note: mockReturnValueOnce assumes single-render. If StrictMode is enabled
    // for tests in the future, switch to mockReturnValue + beforeEach reset.
    (useMotionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      tier: "mobile",
      prefersReducedMotion: true,
      animationsDisabled: true,
    });
    const { container } = render(<DataColumn />);
    expect(container.querySelector(".data-column")?.classList.contains("motion-disabled")).toBe(true);
  });

  it("renders pre-generated content (non-empty)", () => {
    const { container } = render(<DataColumn />);
    const track = container.querySelector(".dc-track");
    expect(track?.textContent?.length ?? 0).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- src/features/hero-signal-noise/DataColumn.test.tsx --run
```

Expected: FAIL — module `./DataColumn` not found.

- [ ] **Step 3: Implement the component**

`src/features/hero-signal-noise/DataColumn.tsx`:

```tsx
import { useMotionPolicy } from "@/lib/motion";
import { generateDataColumnContent } from "./dataColumnContent";

const DATA_COLUMN_TEXT = generateDataColumnContent();

const DataColumn = () => {
  const { animationsDisabled } = useMotionPolicy();
  return (
    <div
      className={`data-column${animationsDisabled ? " motion-disabled" : ""}`}
      aria-hidden="true"
    >
      <span className="dc-track">{DATA_COLUMN_TEXT}</span>
    </div>
  );
};

export default DataColumn;
```

- [ ] **Step 4: Run test — verify pass**

```bash
npm run test -- src/features/hero-signal-noise/DataColumn.test.tsx --run
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/hero-signal-noise/DataColumn.tsx src/features/hero-signal-noise/DataColumn.test.tsx
git commit -m "feat(hero): add DataColumn with motion-policy gate

Reads useMotionPolicy().animationsDisabled and adds .motion-disabled
class when motion is off (CSS disables animation but keeps content).
Visibility is CSS-only via @media (min-width: 768px) — no JS viewport
detection (spec §3.4 + Fix M11)."
```

---

## Task 10: Implement `IdStrip` component with motion-gated 1Hz clock (§3.5, §5.3)

Live clock with `setInterval(1000)` gated through `useMotionPolicy()`. When `animationsDisabled`, no interval — TS shows static page-load timestamp. `document.hidden` pauses the tick when the tab is backgrounded.

**Files:**
- Create: `src/features/hero-signal-noise/IdStrip.tsx`
- Create: `src/features/hero-signal-noise/IdStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/features/hero-signal-noise/IdStrip.test.tsx`:

```tsx
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
    // Note: mockReturnValueOnce assumes single-render. If StrictMode is enabled
    // for tests in the future, switch to mockReturnValue + beforeEach reset.
    (useMotionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      tier: "mobile",
      prefersReducedMotion: true,
      animationsDisabled: true,
    });
    const before = vi.getTimerCount();
    act(() => {
      render(<IdStrip />);
    });
    expect(vi.getTimerCount()).toBe(before); // no new interval
  });

  it("adds .motion-disabled class when animationsDisabled", () => {
    // Note: mockReturnValueOnce assumes single-render. If StrictMode is enabled
    // for tests in the future, switch to mockReturnValue + beforeEach reset.
    (useMotionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      tier: "mobile",
      prefersReducedMotion: true,
      animationsDisabled: true,
    });
    const { container } = render(<IdStrip />);
    expect(container.querySelector(".id-strip")?.classList.contains("motion-disabled")).toBe(true);
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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- src/features/hero-signal-noise/IdStrip.test.tsx --run
```

Expected: FAIL — module `./IdStrip` not found.

- [ ] **Step 3: Implement the component**

`src/features/hero-signal-noise/IdStrip.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useMotionPolicy } from "@/lib/motion";
import { formatTimeOfDay, formatUtcDate, PLACEHOLDER_TIME, PLACEHOLDER_DATE } from "./clock";

const IdStrip = () => {
  const { animationsDisabled } = useMotionPolicy();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date()); // first paint replaces placeholders with mount-time clock
    if (animationsDisabled) return; // no interval — static page-load timestamp
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNow(new Date());
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [animationsDisabled]);

  const ts = now ? formatTimeOfDay(now) : PLACEHOLDER_TIME;
  const utc = now ? formatUtcDate(now) : PLACEHOLDER_DATE;

  return (
    <p
      className={`id-strip${animationsDisabled ? " motion-disabled" : ""}`}
      aria-hidden="true"
    >
      <span className="seg">NODE_<b>07</b></span><span className="div">//</span>
      <span className="seg">OP: <b>PT</b></span><span className="div">//</span>
      <span className="seg">TS: <b>{ts}</b></span><span className="div">//</span>
      <span className="seg">UTC: <b>{utc}</b></span><span className="div">//</span>
      <span className="seg"><span className="pulse" />SEC: <b>OK</b></span>
    </p>
  );
};

export default IdStrip;
```

- [ ] **Step 4: Run test — verify pass**

```bash
npm run test -- src/features/hero-signal-noise/IdStrip.test.tsx --run
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/hero-signal-noise/IdStrip.tsx src/features/hero-signal-noise/IdStrip.test.tsx
git commit -m "feat(hero): add IdStrip telemetry bar with motion-gated 1Hz clock

setInterval(1000) gated via useMotionPolicy().animationsDisabled per
spec §2.10. document.hidden pauses tick on backgrounded tabs. When
animationsDisabled, no interval — TS shows static mount-time stamp.
.pulse blink suppressed via .motion-disabled class (Fix M6)."
```

---

## Task 11: Implement `HeroChrome` composition (§3.2)

Self-closing component that mounts `grid-tex` div + HudBrackets + DataColumn. NOT a children-pass-through — layers owned internally per spec Fix L4.

**Files:**
- Create: `src/features/hero-signal-noise/HeroChrome.tsx`

- [ ] **Step 1: Implement (no test — composition-only)**

`src/features/hero-signal-noise/HeroChrome.tsx`:

```tsx
import HudBrackets from "./HudBrackets";
import DataColumn from "./DataColumn";

const HeroChrome = () => (
  <>
    <div className="grid-tex" aria-hidden="true" />
    <HudBrackets />
    <DataColumn />
  </>
);

export default HeroChrome;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/hero-signal-noise/HeroChrome.tsx
git commit -m "feat(hero): add HeroChrome ambient-chrome bundle

Renders grid-tex div + HudBrackets + DataColumn as siblings. Self-
closing — no children prop. ScanSweep deliberately not mounted (Q-drop).
Hero orbs stay in Index.tsx (section-scoped, not viewport-scoped)."
```

---

## Task 12: Implement `HeroSignalNoise` headline + sub + CTAs (§3.1, §3.6)

Stateless w.r.t. cascade. Receives `phase`, `animationsDisabled`, `prefersReducedMotion`, `viewProjectsRef` as props. Renders `<IdStrip />` + the existing terminal-line `> INITIALIZING SYSTEM…` (LetterReveal at phase ≥ 1, placeholder otherwise) + asymmetric BREAK/BUILD/PROVE rows + sub + CTAs. T-12 produces a complete, self-contained component — T-13 only edits `Index.tsx`.

**Files:**
- Create: `src/features/hero-signal-noise/HeroSignalNoise.tsx`
- Create: `src/features/hero-signal-noise/HeroSignalNoise.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/features/hero-signal-noise/HeroSignalNoise.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useRef } from "react";

vi.mock("@/lib/motion", () => ({
  useMotionPolicy: vi.fn().mockReturnValue({ tier: "desktop", prefersReducedMotion: false, animationsDisabled: false }),
  // useHeroStaggerVariant returns a Variants object — match production shape.
  // This is an isolation seam — the production hook chain is exercised by
  // src/lib/motion.test.ts.
  useHeroStaggerVariant: vi.fn().mockReturnValue({
    hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7 } },
  }),
}));

import HeroSignalNoise from "./HeroSignalNoise";

function Wrapper(props: { phase: number; animationsDisabled?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <MemoryRouter>
      <HeroSignalNoise
        phase={props.phase}
        animationsDisabled={!!props.animationsDisabled}
        prefersReducedMotion={false}
        viewProjectsRef={ref}
      />
    </MemoryRouter>
  );
}

describe("HeroSignalNoise", () => {
  it("renders IdStrip + 3 headline rows + sub + CTAs at phase 3", () => {
    const { container, getByText } = render(<Wrapper phase={3} />);
    expect(container.querySelector(".id-strip")).not.toBeNull();
    expect(container.querySelector(".hero-h")).not.toBeNull();
    expect(container.querySelectorAll(".h-row").length).toBe(3);
    expect(getByText("VIEW PROJECTS")).toBeTruthy();
    expect(getByText("READ BLOG")).toBeTruthy();
  });

  it("renders the terminal line at phase >= 1 (placeholder at phase 0)", () => {
    const { container, rerender } = render(<Wrapper phase={0} />);
    expect(container.textContent).toContain("INITIALIZING SYSTEM");
    expect(container.querySelector("[aria-hidden='true']")?.classList.contains("opacity-0")).toBe(true);

    rerender(<Wrapper phase={1} />);
    expect(container.textContent).toContain("INITIALIZING SYSTEM");
  });

  it("renders BUILD IT via LetterReveal at phase 2 (per-letter animation preserved)", () => {
    const { container } = render(<Wrapper phase={2} animationsDisabled={false} />);
    const buildRow = container.querySelector("[data-row='build']");
    // LetterReveal with `tag="span"` renders a `<span class="block">` wrapper.
    // The text is split into per-letter spans inside that wrapper.
    expect(buildRow?.querySelector(".block")).not.toBeNull();
    expect(buildRow?.textContent).toContain("BUILD IT");
  });

  it("CTA wrap is inert before phase 3 and active at phase 3", () => {
    const { container, rerender } = render(<Wrapper phase={1} />);
    const wrap = container.querySelector("[data-cta-wrap]") as HTMLElement | null;
    expect(wrap).not.toBeNull();
    // React 19 boolean inert: present (or "") when true, omitted when false.
    // We test both presence and the truthy/falsy semantics.
    expect(wrap?.hasAttribute("inert") && wrap?.getAttribute("inert") !== "false").toBe(true);

    rerender(<Wrapper phase={3} />);
    expect(wrap?.hasAttribute("inert") && wrap?.getAttribute("inert") !== "false").toBe(false);
  });

  it("PROVE row gets hero-stamp-entrance only when phase>=2 AND motion is on", () => {
    const { container, rerender } = render(<Wrapper phase={1} animationsDisabled={false} />);
    const proveBefore = container.querySelector("[data-row='prove']");
    expect(proveBefore?.className).not.toContain("hero-stamp-entrance");

    rerender(<Wrapper phase={2} animationsDisabled={false} />);
    expect(container.querySelector("[data-row='prove']")?.className).toContain("hero-stamp-entrance");

    rerender(<Wrapper phase={2} animationsDisabled={true} />);
    expect(container.querySelector("[data-row='prove']")?.className).not.toContain("hero-stamp-entrance");
  });

  it("BREAK row gets hero-glitch-entrance only when phase>=2 AND motion is on", () => {
    const { container } = render(<Wrapper phase={2} animationsDisabled={false} />);
    expect(container.querySelector("[data-row='break']")?.className).toContain("hero-glitch-entrance");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- src/features/hero-signal-noise/HeroSignalNoise.test.tsx --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

`src/features/hero-signal-noise/HeroSignalNoise.tsx`:

```tsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { type RefObject } from "react";
import IdStrip from "./IdStrip";
import LetterReveal from "@/components/LetterReveal";
import { useHeroStaggerVariant } from "@/lib/motion";

interface HeroSignalNoiseProps {
  phase: number;
  animationsDisabled: boolean;
  prefersReducedMotion: boolean;
  viewProjectsRef: RefObject<HTMLAnchorElement | null>;
}

const animClass = (gateMet: boolean, cls: string, animationsDisabled: boolean): string => {
  if (!gateMet) return "opacity-0";
  return animationsDisabled ? "" : cls;
};

const HeroSignalNoise = ({
  phase,
  animationsDisabled,
  viewProjectsRef,
}: HeroSignalNoiseProps) => {
  const heroItem = useHeroStaggerVariant();
  return (
    <div className="text-center px-4 max-w-3xl">
      <IdStrip />

      {phase >= 1 ? (
        <LetterReveal
          text="> INITIALIZING SYSTEM..."
          tag="p"
          className="text-muted-foreground text-sm tracking-[0.3em] mb-4 letter-reveal-linear"
          delayPerLetter={40}
          startDelay={0}
          skipAnimation={animationsDisabled}
        />
      ) : (
        <p aria-hidden="true" className="text-muted-foreground text-sm tracking-[0.3em] mb-4 opacity-0">
          {">"} INITIALIZING SYSTEM...
        </p>
      )}

      <h1 className="hero-h">
        <span
          className={`h-row left ${animClass(phase >= 2, "hero-glitch-entrance", animationsDisabled)}`}
          data-row="break"
          data-text="BREAK IT"
        >
          BREAK IT
        </span>
        <span className="h-row center" data-row="build" aria-label="BUILD IT">
          {phase >= 2 ? (
            <LetterReveal
              text="BUILD IT"
              tag="span"
              className="block"
              delayPerLetter={70}
              startDelay={1000}
              skipAnimation={animationsDisabled}
            />
          ) : (
            <span className="block opacity-0" aria-hidden="true">BUILD IT</span>
          )}
        </span>
        <span
          className={`h-row right ${animClass(phase >= 2, "hero-stamp-entrance", animationsDisabled)}`}
          data-row="prove"
          style={phase >= 2 && !animationsDisabled ? { animationDelay: "2.2s" } : undefined}
        >
          PROVE IT
        </span>
      </h1>

      {/* React 19 boolean inert prop — Wave 3 B5 / F-UX-05 a11y */}
      <motion.div
        data-cta-wrap=""
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.5, delayChildren: 0.05 } } }}
        initial={animationsDisabled ? "visible" : "hidden"}
        animate={phase >= 3 ? "visible" : "hidden"}
        inert={phase < 3 ? "" : undefined}
      >
        <motion.div variants={heroItem}>
          <p className="text-foreground/80 text-lg mb-8 leading-relaxed">
            Every bug is a hypothesis waiting to be tested.<br />
            Research. Execute. Certify.
          </p>
        </motion.div>

        <motion.div variants={heroItem} className="flex gap-4 justify-center">
          <Link
            ref={viewProjectsRef}
            to="/projects"
            className="border border-primary/50 bg-primary/10 px-8 py-3 text-sm tracking-widest text-primary hover:bg-primary/20 hover:border-primary transition-all box-glow btn-interactive glitch-hover"
            data-text="VIEW PROJECTS"
          >
            VIEW PROJECTS
          </Link>
          <Link
            to="/blog"
            className="border border-border px-8 py-3 text-sm tracking-widest text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all btn-interactive glitch-hover"
            data-text="READ BLOG"
          >
            READ BLOG
          </Link>
        </motion.div>

        <motion.div variants={heroItem} className="mt-8">
          <p className="text-muted-foreground text-xs tracking-[0.2em] animate-glow-pulse">
            ▼ SCROLL TO EXPLORE ▼
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HeroSignalNoise;
```

- [ ] **Step 4: Run test — verify pass**

```bash
npm run test -- src/features/hero-signal-noise/HeroSignalNoise.test.tsx --run
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/hero-signal-noise/HeroSignalNoise.tsx src/features/hero-signal-noise/HeroSignalNoise.test.tsx
git commit -m "feat(hero): add HeroSignalNoise stateless headline + sub + CTAs

Receives phase + motion-policy + viewProjectsRef as props. Self-contained:
includes IdStrip, terminal-line LetterReveal (phase >= 1), asymmetric
BREAK/BUILD/PROVE rows, and CTA wrap with React 19 boolean inert. The
BUILD IT row keeps its existing per-letter LetterReveal animation per
spec §5.2 row 2b (Fix C1). PROVE keeps the production animationDelay
2.2s + !animationsDisabled condition verbatim (Fix M10). viewProjectsRef
is typed RefObject<HTMLAnchorElement | null> to match useRef(null) (Fix
C4). Inert pattern: empty-string when true, undefined when false — robust
across framer-motion forwarding (Fix M7)."
```

---

## Task 13: Wire `HeroSignalNoise` + `HeroChrome` into `Index.tsx` (§9 step 5)

Edit `src/pages/Index.tsx` to:
- Add `<HeroChrome />` as a sibling between scanline and the hero `<section>`.
- Replace the inner `<div className="text-center px-4 max-w-3xl">…</div>` content with `<HeroSignalNoise … />`, passing `phase`, `animationsDisabled`, `prefersReducedMotion`, `viewProjectsRef` as props.
- Keep state machine, scanline, badge, SKIP button, hero `<section>` wrapper, hero orbs, and existing data-testid handling unchanged.

T-12 produced a complete, self-contained `HeroSignalNoise.tsx` (IdStrip + terminal-line LetterReveal + asymmetric BREAK/BUILD/PROVE rows + CTA wrap). T-13 mutates ONLY `Index.tsx`.

**Files:**
- Modify: `src/pages/Index.tsx` (replace inner content + add HeroChrome sibling + remove dead imports/locals)

- [ ] **Step 1: Edit `src/pages/Index.tsx`**

Open `src/pages/Index.tsx`. Find the imports block at the top and add:

```tsx
import HeroSignalNoise from "@/features/hero-signal-noise/HeroSignalNoise";
import HeroChrome from "@/features/hero-signal-noise/HeroChrome";
```

REMOVE imports that are no longer used:

```tsx
// REMOVE — LetterReveal lives in HeroSignalNoise now:
import LetterReveal from "@/components/LetterReveal";
```

Update the motion import — drop `useHeroStaggerVariant` (now consumed inside `HeroSignalNoise`), keep `useMotionPolicy`:

```tsx
// BEFORE:
import { useHeroStaggerVariant, useMotionPolicy } from "@/lib/motion";
// AFTER:
import { useMotionPolicy } from "@/lib/motion";
```

REMOVE the now-dead local from inside the `Index` component body:

```tsx
// REMOVE — heroItem is consumed inside HeroSignalNoise now:
const heroItem = useHeroStaggerVariant();
```

Find the `return (<>` block. After the `<div className="scanline fixed inset-0 z-10" />` line, add:

```tsx
<HeroChrome />
```

Find the `<section ...>` opening tag (currently `<section className="relative z-20 min-h-screen flex items-center justify-center overflow-hidden" data-testid={phase >= 3 ? "hero-phase3" : "hero-cascading"}>`). Inside it, KEEP the two orb `<div>` blocks, then REPLACE the entire `<div className="text-center px-4 max-w-3xl">…</div>` block (all of its current content from `{phase >= 1 ? (…)}` through the closing `</motion.div>` of the CTA wrap) with:

```tsx
<HeroSignalNoise
  phase={phase}
  animationsDisabled={animationsDisabled}
  prefersReducedMotion={prefersReducedMotion}
  viewProjectsRef={viewProjectsRef}
/>
```

The `phase`, `animationsDisabled`, `prefersReducedMotion`, `viewProjectsRef` constants already exist in `Index.tsx` (the cascade state machine). Verify each is in scope at the call site.

- [ ] **Step 2: Run lint to catch unused-vars regressions**

```bash
npm run lint 2>&1 | tail -20
```

Expected: clean (no `no-unused-vars` errors). If any imports are flagged, remove them.

- [ ] **Step 3: Run all unit tests**

```bash
npm run test -- src/ --run
```

Expected: all pass. If a test fails referencing the old hero JSX selectors, update the test, NOT the production code.

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 5: Add badge tri-state smoke assertion**

Open `src/pages/Index.tsx` and verify the existing `showReducedMotionBadge` / `showSessionBadge` / `showTierBadge` logic compiles unchanged. Run the existing `src/lib/motion.test.ts` and `src/hooks/use-device-tier.test.tsx` to confirm:

```bash
npm run test -- src/lib/motion.test.ts src/hooks/use-device-tier.test.tsx --run
```

Expected: green. The tri-state logic is exercised indirectly through these tests; a dedicated `Index.test.tsx` is out of scope for v1 (the badge JSX is in Index.tsx; rendering Index.tsx in Vitest would require routing-context shims that the project doesn't have for other page-level tests). Documented in spec §11 as monitoring-only for v1.

- [ ] **Step 6: Visual smoke (manual)**

Start the dev server per `~/.claude/rules/hard-reload-dev-servers.md`:

```bash
pkill -f "vite.*--port 8080" 2>/dev/null; sleep 1
node node_modules/vite/bin/vite.js --port 8080 --host
```

(Run that command via the Bash tool with `run_in_background: true`.) Open `http://localhost:8080`. Verify: ID-strip visible above headline, asymmetric BREAK/BUILD/PROVE at desktop width, HUD brackets at corners, vertical data column on the right, no console errors. Cascade plays once (or skips if `hero-cascade-played` is in sessionStorage). SKIP button works.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat(hero): wire HeroSignalNoise + HeroChrome into Index.tsx

Replaces the inner content of the hero <section> with the new
HeroSignalNoise component (props-driven). Adds HeroChrome as a sibling
of the scanline. Removes now-dead LetterReveal import and
useHeroStaggerVariant local — both moved inside HeroSignalNoise (Fix
H6). State machine, badge, SKIP button, hero orbs, and section wrapper
all stay in place — only the inner JSX moves (spec §9 step 5)."
```

---

## Task 14: Update existing functional specs to new HeroSignalNoise selectors (F-PLAN-01 + spec §8.5)

The Rev 2 plan introduces a new hero JSX shape (`h1.hero-h`, `[data-row='break|build|prove']`) that replaces the production selectors `h1.font-display`, `aria-label="BUILD IT"`, `span.block`, `span.hero-stamp-entrance`. The existing functional specs in `e2e/functional/` use the OLD selectors and would fail at T-25 (full test suite run). This task migrates them.

**Files:**
- Modify: `e2e/functional/hero-cascade.spec.ts`
- Modify: `e2e/functional/hero-skip-and-badge.spec.ts`
- Modify: `e2e/functional/hero-focus-management.spec.ts`

- [ ] **Step 1: Audit existing selectors**

```bash
grep -nE "font-display|aria-label=\"BUILD IT\"|hero-stamp-entrance|span\.block|span\.hero-glitch" e2e/functional/hero-*.spec.ts
```

Expected: list of selector references that need migration. Examples:
- `h1.font-display` → `h1.hero-h`
- `[data-text="BREAK IT"]` → `[data-row='break']`
- `h1 span[aria-label="BUILD IT"]` → `[data-row='build']`
- `span.hero-stamp-entrance` → `[data-row='prove']`

- [ ] **Step 2: Patch each file in turn**

For every selector match, update to the new shape. Preserve the test logic — only the selector strings change. Examples (illustrative — patch as needed based on Step 1 audit):

```ts
// OLD:
await expect(page.locator("h1.font-display")).toBeVisible();
// NEW:
await expect(page.locator("h1.hero-h")).toBeVisible();

// OLD:
const buildIt = page.locator('h1 span[aria-label="BUILD IT"]');
// NEW:
const buildIt = page.locator("[data-row='build']");
```

- [ ] **Step 3: Run the migrated specs**

```bash
npx playwright test e2e/functional/hero-cascade.spec.ts e2e/functional/hero-skip-and-badge.spec.ts e2e/functional/hero-focus-management.spec.ts --project=functional --reporter=list 2>&1 | tail -10
```

Expected: all specs pass against the new HeroSignalNoise structure. If any selector still fails, do another audit pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/functional/hero-cascade.spec.ts e2e/functional/hero-skip-and-badge.spec.ts e2e/functional/hero-focus-management.spec.ts
git commit -m "test(e2e): migrate hero specs to new HeroSignalNoise selectors

Updates h1.font-display → h1.hero-h and aria-label/span-class
selectors to the new [data-row='break|build|prove'] shape introduced
by the SIGNAL_NOISE port (F-PLAN-01 / spec §8.5)."
```

---

## Task 15: Extend `data.ts` to versioned tools (§7.2)

Change `ToolCategory.tools` from `string[]` to `Array<{ name: string; version: string | null }>`. Update each existing tool entry. `introText` and `socialLinks` exports unchanged.

**Files:**
- Modify: `src/features/about/data.ts`

- [ ] **Step 1: Edit `data.ts`**

Open `src/features/about/data.ts`. Replace the `ToolCategory` interface and the `toolCategories` constant. Keep `introText` and `socialLinks` exactly as they are.

```ts
export interface ToolEntry {
  name: string;
  version: string | null;
}

export interface ToolCategory {
  name: string;
  tools: ToolEntry[];
}

export interface SocialLink {
  label: string;
  url: string;
  icon: "github" | "linkedin";
}

export const introText = {
  headline: "ABOUT ME",
  terminal: "> whoami",
  bio: [
    "QA engineer who started in molecular biology — I don't remember 95% of the science and the lab training didn't stick, but the mental model and methodology did: research, execute, certify.",
    "Now it runs on Pytest, Playwright, and CI/CD, with a pinch of DevOps and Agent-Driven development.",
    "Speaking of the Wolf — testing systems that think for themselves and writing about what I find on this blog.",
  ],
};

// TODO(piotr): refresh tool versions quarterly — see spec §11.2 for rationale.
// Tools without an explicit minor version (e.g. Pytest "v8.x") are intentional;
// bump quarterly during feature retrospectives.
export const toolCategories: ToolCategory[] = [
  {
    name: "Test Automation",
    tools: [
      { name: "Pytest", version: "v8.x" },
      { name: "Pester", version: "v5.x" },
      { name: "Playwright", version: "v1.58" },
      { name: "Selenium", version: "v4.x" },
    ],
  },
  {
    name: "Languages",
    tools: [
      { name: "Python", version: "3.13" },
      { name: "PowerShell", version: "7.x" },
      { name: "TypeScript", version: "5.x" },
      { name: "C#", version: "12" },
    ],
  },
  {
    name: "CI/CD & DevOps",
    tools: [
      { name: "GitLab CI", version: null },
      { name: "Jenkins", version: "LTS" },
      { name: "GitHub Actions", version: null },
      { name: "Docker", version: "27.x" },
    ],
  },
  {
    name: "Test Management",
    tools: [
      { name: "JIRA", version: null },
      { name: "TestRail", version: null },
      { name: "Confluence", version: null },
      { name: "ClickUp", version: null },
    ],
  },
  {
    name: "AI & Tooling",
    tools: [
      { name: "Claude", version: "sonnet-4.6" },
      { name: "GitHub Copilot", version: null },
      { name: "n8n", version: null },
      { name: "Qdrant", version: null },
    ],
  },
];

export const socialLinks: SocialLink[] = [
  {
    label: "GitHub",
    url: "https://github.com/MalfiRG",
    icon: "github",
  },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/piotrtarach/",
    icon: "linkedin",
  },
];
```

- [ ] **Step 2: Verify typecheck (will fail in ToolBadges — that's the next task)**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "ToolBadges|tools-data|toolCategories" | head -5
```

Expected: errors complaining about `ToolBadges.tsx` reading `tool` as `string`. That's the seam we fix in Task 16.

- [ ] **Step 3: Commit**

```bash
git add src/features/about/data.ts
git commit -m "feat(about): extend ToolCategory.tools to versioned objects

string[] → Array<{name, version: string | null}>. introText and
socialLinks unchanged. Existing categories get version annotations
where applicable; null for SaaS tools without a version (JIRA,
GitHub Actions, Confluence, etc.). Spec §7.2 + Fix H11."
```

---

## Task 16: Update `ToolBadges` to render `{name, version}` shape (§7.2)

**Files:**
- Modify: `src/features/about/ToolBadges.tsx`

- [ ] **Step 1: Replace the file contents**

`src/features/about/ToolBadges.tsx`:

```tsx
import { toolCategories } from "./data";

const ToolBadges = () => {
  return (
    <div className="tools-grid space-y-6">
      {toolCategories.map((category) => (
        <div key={category.name}>
          <h4>{category.name}</h4>
          <div className="row">
            {category.tools.map((tool) => (
              <span key={tool.name} className="badge">
                {tool.name}
                {tool.version !== null && <span className="ver">{tool.version}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToolBadges;
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 3: Run unit tests**

```bash
npm run test -- src/features/about --run
```

Expected: any existing AboutSection-related tests pass. (We add a new test in Task 18.)

- [ ] **Step 4: Commit**

```bash
git add src/features/about/ToolBadges.tsx
git commit -m "feat(about): render versioned badges via .badge .ver shape

Switches ToolBadges to consume the new {name, version} ToolEntry shape
from data.ts. Renders <span class='badge'>Name <span class='ver'>v</span></span>
matching the prototype's design language. Tools with version=null
render only the name (no .ver span)."
```

---

## Task 17: Rewrite `AboutSection` with cat-block frame + ascii-div (§7.2, §7.3)

Replace the prose-paragraphs section with the cat-block frame. Keep the existing two-column grid, social links, headline. Add the ASCII separator below the grid. Restore production's `animate-fade-in opacity-0` entrance animations on cat-block, social-icons row, and ToolBadges container — but gate them through `useMotionPolicy()` (Fix H8).

**Files:**
- Modify: `src/features/about/AboutSection.tsx`

- [ ] **Step 1: Replace the file contents**

`src/features/about/AboutSection.tsx`:

```tsx
import { Github, Linkedin } from "lucide-react";
import ToolBadges from "./ToolBadges";
import { introText, socialLinks } from "./data";
import { useMotionPolicy } from "@/lib/motion";

const AboutSection = () => {
  const { animationsDisabled } = useMotionPolicy();
  const lastBioIndex = introText.bio.length - 1;
  return (
    <section className="flex items-center pt-8 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">
            {introText.terminal}
          </p>
          <h2 className="font-display text-4xl font-bold text-foreground text-glow">
            {introText.headline}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div
            className={`cat-block space-y-3${animationsDisabled ? "" : " animate-fade-in opacity-0"}`}
            style={animationsDisabled ? undefined : { animationDelay: "0.2s" }}
          >
            <p className="cat-head">
              <span className="pmt">$</span>
              <span>cat</span>
              <span className="file">~/profile.txt</span>
              <span className="meta">— 1.2k // utf-8</span>
            </p>

            {introText.bio.map((paragraph, i) => (
              <p
                key={i}
                className={`text-foreground/80 text-sm leading-relaxed${i === lastBioIndex ? " cursor-blink" : ""}`}
              >
                {paragraph}
              </p>
            ))}

            <div
              className={`flex gap-4 pt-4${animationsDisabled ? "" : " animate-fade-in opacity-0"}`}
              style={animationsDisabled ? undefined : { animationDelay: "0.8s" }}
            >
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={link.label}
                >
                  {link.icon === "github" ? (
                    <Github className="h-5 w-5" />
                  ) : (
                    <Linkedin className="h-5 w-5" />
                  )}
                </a>
              ))}
            </div>
          </div>

          <div
            className={animationsDisabled ? undefined : "animate-fade-in opacity-0"}
            style={animationsDisabled ? undefined : { animationDelay: "0.4s" }}
          >
            <ToolBadges />
          </div>
        </div>

        <div className="ascii-div" aria-hidden="true">
          <span>──────────────────────────────────</span>
          <span className="tag">// END_OF_FILE</span>
          <span>──────────────────────────────────</span>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
```

- [ ] **Step 2: Run typecheck + smoke test**

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run test -- src/features/about --run
```

Expected: typecheck clean. Existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/about/AboutSection.tsx
git commit -m "feat(about): rewrite with cat-block frame + ASCII separator

Bio is now framed in .cat-block with a $ cat ~/profile.txt header.
Trailing bio paragraph carries .cursor-blink class for terminal cursor.
ASCII separator (U+2500 LIGHT HORIZONTAL — wider font coverage than
U+2501) renders below the grid as decorative aria-hidden divider.
Fade-in entrance animations on cat-block, social-icons row, and
ToolBadges wrapper preserved from production but gated through
useMotionPolicy() — when animationsDisabled, no entrance animation
and no opacity-0 starting state (spec §7.2 + §7.3 + Fix L6 + Fix H8)."
```

---

## Task 18: Add `AboutSection.test.tsx` (§8.4)

Smoke-level Vitest assertions for the rewritten AboutSection.

**Files:**
- Create: `src/features/about/AboutSection.test.tsx`

- [ ] **Step 1: Write the test**

`src/features/about/AboutSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AboutSection from "./AboutSection";

describe("AboutSection", () => {
  it("renders the cat-block frame with terminal header", () => {
    const { container, getByText } = render(<AboutSection />);
    expect(container.querySelector(".cat-block")).not.toBeNull();
    expect(container.querySelector(".cat-head")).not.toBeNull();
    expect(getByText("cat")).toBeTruthy();
    expect(getByText("~/profile.txt")).toBeTruthy();
  });

  it("renders all 5 tool categories", () => {
    const { getByText } = render(<AboutSection />);
    expect(getByText("Test Automation")).toBeTruthy();
    expect(getByText("Languages")).toBeTruthy();
    expect(getByText("CI/CD & DevOps")).toBeTruthy();
    expect(getByText("Test Management")).toBeTruthy();
    expect(getByText("AI & Tooling")).toBeTruthy();
  });

  it("renders versioned badges (Pytest v8.x example)", () => {
    const { container } = render(<AboutSection />);
    const badges = Array.from(container.querySelectorAll(".badge"));
    const pytest = badges.find((b) => b.textContent?.includes("Pytest"));
    expect(pytest).toBeTruthy();
    expect(pytest?.querySelector(".ver")?.textContent).toBe("v8.x");
  });

  it("renders unversioned badges without a .ver span (JIRA example)", () => {
    const { container } = render(<AboutSection />);
    const badges = Array.from(container.querySelectorAll(".badge"));
    const jira = badges.find((b) => b.textContent?.trim() === "JIRA");
    expect(jira).toBeTruthy();
    expect(jira?.querySelector(".ver")).toBeNull();
  });

  it("renders the ASCII separator with aria-hidden", () => {
    const { container } = render(<AboutSection />);
    const sep = container.querySelector(".ascii-div");
    expect(sep).not.toBeNull();
    expect(sep?.getAttribute("aria-hidden")).toBe("true");
    expect(sep?.textContent).toContain("END_OF_FILE");
  });

  it("trailing bio paragraph carries .cursor-blink class", () => {
    const { container } = render(<AboutSection />);
    const paragraphs = container.querySelectorAll(".cat-block p:not(.cat-head)");
    const last = paragraphs[paragraphs.length - 1];
    expect(last.classList.contains("cursor-blink")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npm run test -- src/features/about/AboutSection.test.tsx --run
```

Expected: PASS — 6 tests.

- [ ] **Step 3: Commit**

```bash
git add src/features/about/AboutSection.test.tsx
git commit -m "test(about): cover cat-block + 5-category badges + ascii-div"
```

---

## Task 19: Extend visual-determinism fixture with `freezeClockViaInitScript` (§8.1)

Add the new helper to `e2e/fixtures/visual-determinism.ts` and extend `prepareContext` with a `freezeClock?: boolean` option. Init-script registration order matters per spec Fix L8: register clock-freeze BEFORE animation-freeze.

**Files:**
- Modify: `e2e/fixtures/visual-determinism.ts`

- [ ] **Step 1: Patch the fixture**

Open `e2e/fixtures/visual-determinism.ts`. After the `skipHeroCascadeViaInitScript` function (and before the `// Post-goto primitives` section), insert:

```ts
/**
 * Freeze Date.now / new Date(...) AND performance.now() to a fixed instant
 * so the IdStrip's live clock and any monotonic-clock-driven CSS animation
 * (e.g. cursor-blink) produce stable visual baselines.
 *
 * Fixed instant: 2026-04-27T12:00:00.000Z. Run BEFORE freezeAnimationsViaInitScript
 * to avoid setTimeout(0) re-entrancy issues during page boot.
 *
 * Note: process.env.TZ=UTC must also be set in playwright.config.ts so
 * formatTimeOfDay() (which uses local zone in production) renders the same
 * local hours as the UTC instant — otherwise CI (UTC) and local-dev (Prague)
 * baselines diverge.
 */
export async function freezeClockViaInitScript(page: Page) {
  await page.addInitScript(() => {
    const FIXED_INSTANT_MS = Date.UTC(2026, 3, 27, 12, 0, 0); // April = month 3 (0-indexed)
    const RealDate = Date;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function FrozenDate(this: unknown, ...args: any[]): unknown {
      if (!(this instanceof FrozenDate)) {
        // Date() called without `new` — return a string of the FIXED instant.
        return new RealDate(FIXED_INSTANT_MS).toString();
      }
      if (args.length === 0) {
        return new RealDate(FIXED_INSTANT_MS);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (RealDate as any)(...args);
    }
    FrozenDate.prototype = RealDate.prototype;
    (FrozenDate as unknown as { now: () => number }).now = () => FIXED_INSTANT_MS;
    (FrozenDate as unknown as { parse: typeof Date.parse }).parse = RealDate.parse;
    (FrozenDate as unknown as { UTC: typeof Date.UTC }).UTC = RealDate.UTC;
    (window as unknown as { Date: unknown }).Date = FrozenDate;

    // performance.now → fixed value relative to navigation start.
    const realPerfNow = performance.now.bind(performance);
    const frozenPerfStart = realPerfNow();
    try {
      Object.defineProperty(performance, "now", {
        configurable: true,
        writable: true,
        value: () => frozenPerfStart,
      });
    } catch {
      // Some browsers make performance.now non-configurable; fallback no-op.
    }
  });
}
```

Then update `prepareContext` to accept the new opt:

```ts
export async function prepareContext(
  page: Page,
  opts?: { skipHeroCascade?: boolean; freezeKeyframes?: boolean; freezeClock?: boolean }
) {
  if (opts?.freezeClock) {
    await freezeClockViaInitScript(page);
  }
  if (opts?.freezeKeyframes !== false) {
    await freezeAnimationsViaInitScript(page);
  }
  if (opts?.skipHeroCascade !== false) {
    await skipHeroCascadeViaInitScript(page);
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Expected: no errors. Also explicitly probe for fixture-typed regressions:

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "freezeClock|FrozenDate" || echo "OK"
```

Expected: `OK` (no errors).

- [ ] **Step 3: Run existing visual specs to confirm no regressions**

```bash
npx playwright test --project=visual --grep="@visual" 2>&1 | tail -10
```

Expected: existing visual specs still pass (the new opt defaults to `false` so prior callers unchanged).

- [ ] **Step 4: Verify the freeze worked end-to-end**

Add a smoke assertion to confirm `Date.now()` returns the frozen instant on first paint. Create a tiny one-test file (or add to an existing visual spec):

`e2e/functional/freeze-clock-smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

test("freezeClockViaInitScript fixes Date.now() to 2026-04-27T12:00:00Z", async ({ page }) => {
  await prepareContext(page, { freezeClock: true });
  await page.goto("/");
  const frozen = await page.evaluate(() => Date.now());
  expect(frozen).toBe(Date.UTC(2026, 3, 27, 12, 0, 0));
  const perfFrozen = await page.evaluate(() => performance.now());
  // perf.now is frozen to a single value — calling twice returns the same.
  const perfFrozen2 = await page.evaluate(() => performance.now());
  expect(perfFrozen2).toBe(perfFrozen);
});
```

Run:

```bash
npx playwright test e2e/functional/freeze-clock-smoke.spec.ts --project=functional --reporter=list 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add e2e/fixtures/visual-determinism.ts e2e/functional/freeze-clock-smoke.spec.ts
git commit -m "test(fixtures): add freezeClockViaInitScript and prepareContext opt

Overrides Date / Date.now / new Date() to 2026-04-27T12:00:00Z and
freezes performance.now() so the IdStrip live clock and cursor-blink
keyframe produce stable visual baselines. Init-script ordering: clock
freeze runs BEFORE animation freeze to avoid setTimeout(0) re-entrancy
during page boot. Constructor uses widened any-typing to side-step
ConstructorParameters<typeof Date> overload-tuple union (Fix H2).
Includes a smoke spec asserting Date.now() == frozen instant after
prepareContext (spec §8.1 + Fix L8 + Fix M4)."
```

---

## Task 20: Set browser `timezoneId='UTC'` in `playwright.config.ts` (§8.1)

So local clock formatting in `IdStrip` renders the same on local-dev (Prague) and CI (UTC) machines. The browser reads OS timezone — `process.env.TZ` (Node-side) is irrelevant for browser-rendered Date methods.

**Files:**
- Modify: `playwright.config.ts`

- [ ] **Step 1: Add `timezoneId: "UTC"` to playwright.config.ts**

Open `playwright.config.ts`. Find the `use:` block (or add one if missing). Add `timezoneId: "UTC"`:

```ts
// Inside defineConfig({...}):
use: {
  // ... existing entries
  timezoneId: "UTC",
},
```

This sets the BROWSER's timezone for every Playwright context. `process.env.TZ` (Node-side) is irrelevant for browser-rendered Date methods — do NOT add it.

- [ ] **Step 2: Verify the config still parses**

```bash
npx playwright test --list --project=functional 2>&1 | head -3
```

Expected: command exits cleanly. (We're not running tests yet — just confirming the config still parses.)

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "test(config): set browser timezoneId='UTC' in playwright.config.ts

Sets every Playwright context's browser timezone to UTC so the IdStrip
live clock renders identical local hours on Prague-dev and UTC-CI
machines. process.env.TZ is irrelevant — that's Node-side, the browser
reads OS timezone. (Spec §8.1 + Fix M9 corrected via F-PLAN-11.)"
```

---

## Task 21: Add `e2e/functional/hero-signal-noise-cascade.spec.ts` (§8.2)

Phase 0 → 3 progression, SKIP-then-refocus, replay-skip on second visit, reduced-motion short-circuit.

**Files:**
- Create: `e2e/functional/hero-signal-noise-cascade.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test";

test.describe("HeroSignalNoise cascade", () => {
  test.beforeEach(async ({ page }) => {
    // Force OS preference to no-preference for tests 1-3 (test 4 overrides).
    // If CI/local OS reports prefers-reduced-motion: reduce, the cascade
    // short-circuits to phase 3 and SKIP never renders.
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });

  test("phase 0→3 progresses on first visit (no replay-skip)", async ({ page }) => {
    // Do NOT seed sessionStorage — let the cascade play.
    // Do NOT freeze animations — we want phase progression to occur.
    await page.goto("/");
    const section = page.locator("[data-testid='hero-cascading'], [data-testid='hero-phase3']");
    // Eventually the data-testid flips to hero-phase3.
    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 10_000 });
    expect(await section.count()).toBeGreaterThan(0);
  });

  test("SKIP click refocuses VIEW PROJECTS link (F-UX-05 a11y contract)", async ({ page }) => {
    await page.goto("/");
    const skip = page.getByRole("button", { name: /skip intro/i });
    await skip.click();
    // After SKIP unmounts, focus is moved to the VIEW PROJECTS link.
    const viewProjects = page.getByRole("link", { name: /view projects/i });
    await expect(viewProjects).toBeFocused();
  });

  test("replay-skip on second visit (sessionStorage)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => sessionStorage.setItem("hero-cascade-played", "1"));
    await page.reload();
    // Cascade short-circuits to phase 3 immediately.
    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 2_000 });
  });

  test("reduced-motion short-circuits to phase 3 without intermediate phases", async ({ page }) => {
    // Override the beforeEach for this test only:
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // Should land on phase 3 immediately — no SKIP button visible.
    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 2_000 });
    await expect(page.getByRole("button", { name: /skip intro/i })).toBeHidden();
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
npx playwright test e2e/functional/hero-signal-noise-cascade.spec.ts --project=functional --reporter=list 2>&1 | tail -20
```

Expected: 4 PASS. If FAIL, the cascade-state JSX in `Index.tsx` has drifted — fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add e2e/functional/hero-signal-noise-cascade.spec.ts
git commit -m "test(e2e): hero-signal-noise cascade — phases, SKIP-refocus, replay

Covers phase 0→3 progression, SKIP-then-refocus (F-UX-05 a11y contract),
sessionStorage replay-skip on second visit, reduced-motion short-circuit
to phase 3. beforeEach forces page.emulateMedia({ reducedMotion:
'no-preference' }) for tests 1-3 so OS preference does not collapse the
cascade; test 4 overrides to 'reduce' for its specific assertion (Fix
H7). Spec §8.2 + Fix H8."
```

---

## Task 22: Add `e2e/functional/hero-signal-noise-mobile.spec.ts` (§8.2)

Verify no horizontal overflow at 375 / 414 / 768 px and that asymmetric padding activates only at ≥768.

**Files:**
- Create: `e2e/functional/hero-signal-noise-mobile.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test";
import { skipHeroCascadeViaInitScript } from "../fixtures/visual-determinism";

const VIEWPORTS = [
  { name: "iPhone SE 375", width: 375, height: 667, asymmetric: false },
  { name: "iPhone 14 Pro 414", width: 414, height: 896, asymmetric: false },
  { name: "iPad portrait 768", width: 768, height: 1024, asymmetric: true },
  { name: "Desktop 1280", width: 1280, height: 800, asymmetric: true },
] as const;

test.describe("HeroSignalNoise mobile reflow", () => {
  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await skipHeroCascadeViaInitScript(page);
      await page.goto("/");
      await page.waitForSelector("[data-testid='hero-phase3']");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow, `viewport ${vp.width}px must not horizontally overflow`).toBeLessThanOrEqual(0);
    });

    test(`hero rows ${vp.asymmetric ? "have asymmetric padding" : "have no asymmetric padding"} at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await skipHeroCascadeViaInitScript(page);
      await page.goto("/");
      await page.waitForSelector("[data-testid='hero-phase3']");

      const leftPadding = await page.locator("[data-row='break']").evaluate(
        (el) => parseFloat(getComputedStyle(el as HTMLElement).paddingLeft)
      );
      const rightPadding = await page.locator("[data-row='prove']").evaluate(
        (el) => parseFloat(getComputedStyle(el as HTMLElement).paddingRight)
      );

      if (vp.asymmetric) {
        // At ≥768px, .h-row.left/.right pick up clamp(0, 6vw, 48px) padding.
        // At 768 viewport, 6vw = 46.08px. At 1280, capped at 48px.
        expect(leftPadding).toBeGreaterThan(0);
        expect(rightPadding).toBeGreaterThan(0);
      } else {
        // Below 768px, no asymmetric padding — rows are flex-centered.
        expect(leftPadding).toBe(0);
        expect(rightPadding).toBe(0);
      }
    });
  }
});
```

- [ ] **Step 2: Run the spec**

```bash
npx playwright test e2e/functional/hero-signal-noise-mobile.spec.ts --project=functional --reporter=list 2>&1 | tail -25
```

Expected: 8 PASS (2 tests × 4 viewports). If a viewport overflows, the CSS `clamp` or `padding` rule is wrong — fix in `index.css`.

- [ ] **Step 3: Commit**

```bash
git add e2e/functional/hero-signal-noise-mobile.spec.ts
git commit -m "test(e2e): hero-signal-noise mobile reflow at 375/414/768/1280

Asserts (a) no horizontal overflow at any viewport, (b) BREAK/PROVE
rows have asymmetric padding at ≥768px and zero padding below. Padding
checked via getComputedStyle, not boundingBox geometry — flex items
stretch to full parent width so bounding-box centers ≈ viewport center
regardless of justify-content (Fix H1)."
```

---

## Task 23: Add `e2e/functional/about-section-rewrite.spec.ts` (§8.2)

**Files:**
- Create: `e2e/functional/about-section-rewrite.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test";
import { skipHeroCascadeViaInitScript } from "../fixtures/visual-determinism";

test.describe("AboutSection rewrite", () => {
  test.beforeEach(async ({ page }) => {
    await skipHeroCascadeViaInitScript(page);
    await page.goto("/");
    await page.waitForSelector("[data-testid='hero-phase3']");
  });

  test("renders cat-block with $ cat ~/profile.txt header", async ({ page }) => {
    const head = page.locator(".cat-block .cat-head");
    await expect(head).toBeVisible();
    await expect(head).toContainText("cat");
    await expect(head).toContainText("~/profile.txt");
    await expect(head).toContainText("utf-8");
  });

  test("renders versioned badges (Pytest, Playwright)", async ({ page }) => {
    const pytest = page.locator(".badge", { hasText: "Pytest" }).first();
    await expect(pytest).toBeVisible();
    await expect(pytest.locator(".ver")).toContainText("v8.x");

    const playwrightBadge = page.locator(".badge", { hasText: "Playwright" }).first();
    await expect(playwrightBadge.locator(".ver")).toContainText("v1.58");
  });

  test("renders all 5 categories in expected order", async ({ page }) => {
    const headings = page.locator(".tools-grid h4");
    await expect(headings).toHaveCount(5);
    await expect(headings.nth(0)).toHaveText("Test Automation");
    await expect(headings.nth(1)).toHaveText("Languages");
    await expect(headings.nth(2)).toHaveText("CI/CD & DevOps");
    await expect(headings.nth(3)).toHaveText("Test Management");
    await expect(headings.nth(4)).toHaveText("AI & Tooling");
  });

  test("ascii-div separator is aria-hidden", async ({ page }) => {
    const sep = page.locator(".ascii-div");
    await expect(sep).toBeAttached();
    await expect(sep).toHaveAttribute("aria-hidden", "true");
    await expect(sep).toContainText("END_OF_FILE");
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
npx playwright test e2e/functional/about-section-rewrite.spec.ts --project=functional --reporter=list 2>&1 | tail -15
```

Expected: 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/functional/about-section-rewrite.spec.ts
git commit -m "test(e2e): about-section rewrite — cat-block + versioned badges + ascii-div"
```

---

## Task 24: Update visual-regression baselines at 375 / 768 / 1280 / 1920 (§8.3)

Generate new baselines for the homepage at the four viewports. Manual review required before commit.

**Files:**
- Generated: `e2e/visual/<various>.spec.ts-snapshots/` (or wherever the visual project saves baselines)

- [ ] **Step 1: Locate the visual specs config**

```bash
cat playwright.visual.config.ts | head -40
```

Note `testDir`, snapshot output paths, and the visual specs that exist today.

- [ ] **Step 2: Add or extend a homepage visual baseline spec**

Create or extend `e2e/visual/homepage.visual.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { prepareContext, stabilizeForLayout } from "../fixtures/visual-determinism";

const VIEWPORTS = [
  { name: "375", width: 375, height: 800 },
  { name: "768", width: 768, height: 1100 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1920", width: 1920, height: 1080 },
] as const;

for (const vp of VIEWPORTS) {
  test(`homepage @ ${vp.name}px @visual`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await prepareContext(page, { freezeClock: true });
    await page.goto("/");
    await stabilizeForLayout(page);
    await expect(page).toHaveScreenshot(`homepage-${vp.name}.png`, { maxDiffPixelRatio: 0.001 });
  });
}
```

- [ ] **Step 3: Generate baselines via the Docker-pinned script**

Visual baselines must be generated in the project's pinned Docker image (matches CI's font fallback chain) so they're reproducible. Use the existing script:

```bash
npm run test:e2e:update-baselines
```

This script invokes `playwright.visual.config.ts` and runs visual tests inside the pinned Docker image. The first run with a missing baseline writes it; subsequent runs diff against it.

If the script does not exist in `package.json`, add it:

```json
"test:e2e:update-baselines": "docker run --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.58.0-jammy npx playwright test --config playwright.visual.config.ts --update-snapshots=missing"
```

Note: the exact Docker image and version must match the project's existing visual-test convention. Inspect `playwright.visual.config.ts` for the canonical image tag and use that.

- [ ] **Step 4: Manual review (required)**

Open each generated `.png`. Verify each viewport renders the expected layout (asymmetric at 1280/1920, centered at 375; data column visible at 768+; HUD brackets at corners; ID-strip at top of hero).

- [ ] **Step 5: Commit**

```bash
git add e2e/visual/homepage.visual.spec.ts e2e/visual/homepage.visual.spec.ts-snapshots/
git commit -m "test(visual): add homepage baselines at 375/768/1280/1920

Generated via npm run test:e2e:update-baselines (Docker-pinned image
matching playwright.visual.config.ts). Uses prepareContext({freezeClock:
true}) for deterministic IdStrip clock + stable cursor-blink phase.
Reviewed manually before commit (Fix H4)."
```

---

## Task 25: Run full test suite, smoke the dev server, prepare PR (§9 step 8-10)

- [ ] **Step 1: Run all unit tests**

```bash
npm run test --run 2>&1 | tail -10
```

Expected: all green.

- [ ] **Step 2: Run all functional e2e**

```bash
npx playwright test --project=functional 2>&1 | tail -20
```

Expected: all green. Pay special attention to existing `hero-cascade.spec.ts`, `hero-skip-and-badge.spec.ts`, `hero-focus-management.spec.ts` — these MUST stay green per spec §8.5.

- [ ] **Step 3: Run all visual specs**

```bash
npx playwright test --project=visual 2>&1 | tail -10
```

Expected: all green (after Task 24 baselines committed).

- [ ] **Step 4: Smoke the dev server manually**

Per `~/.claude/rules/hard-reload-dev-servers.md`, kill any old vite, then start fresh:

```bash
pkill -f "vite.*--port 8080" 2>/dev/null; sleep 1
node node_modules/vite/bin/vite.js --port 8080 --host
```

(Run via Bash tool with `run_in_background: true`.)

Open `http://localhost:8080`. Manual checklist:
- [ ] ID-strip telemetry bar renders above headline with live ticking clock
- [ ] BREAK / BUILD / PROVE asymmetric layout at desktop width
- [ ] Hero cascade plays once on first load (or skips on reload via sessionStorage)
- [ ] HUD brackets at all 4 corners
- [ ] Vertical data column on the right at desktop, hidden on mobile (resize to 600px to verify)
- [ ] No console errors
- [ ] About section: cat-block frame with `$ cat ~/profile.txt`, terminal cursor blinking on last paragraph, 5-category versioned badge grid, ASCII separator below

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin feat/signal-noise-hero-port
gh pr create --base main --title "feat(hero): SIGNAL_NOISE port — full hero replacement" --body "$(cat <<'EOF'
## Summary

Ports the SIGNAL_NOISE design prototype into the live hero per spec
\`docs/superpowers/specs/2026-04-27-signal-noise-hero-port-design.md\` (Rev 2).

- Adds 5 components in \`src/features/hero-signal-noise/\` (HudBrackets,
  DataColumn, IdStrip, HeroChrome, HeroSignalNoise).
- Rewrites \`AboutSection\` with cat-block bio + versioned tools grid.
- New CSS classes + 2 keyframes (dc-scroll, cursor-blink) in
  \`src/index.css\`.
- Mobile reflow: clamp(0, 6vw, 48px) padding; asymmetric layout
  activates at ≥768px.
- Visual-determinism fixture extended with freezeClockViaInitScript.

State machine, badge, SKIP button, hero orbs, scanline all stay in
\`Index.tsx\`. \`HeroSignalNoise\` is stateless w.r.t. cascade.

## Test plan

- [ ] \`npm run test --run\` — all green
- [ ] \`npx playwright test --project=functional\` — all green
- [ ] \`npx playwright test --project=visual\` — baselines diff-clean
- [ ] Manual: cascade plays, SKIP refocuses VIEW PROJECTS, mobile no
      horizontal overflow at 375/414/768
- [ ] Manual: about section cat-block + cursor blink + versioned badges
EOF
)"
```

- [ ] **Step 6: Final commit**

If anything was tweaked during smoke, commit the fix:

```bash
git add -A
git commit -m "chore(hero): post-smoke fixups"
git push
```

---

## Self-Review

After completing all 25 tasks, run the following self-review against the spec:

**1. Spec coverage:**
- §1 in-scope items: feature folder ✓ (T-1), 5 components ✓ (T-8/9/10/11/12), AboutSection rewrite ✓ (T-15/16/17), Index.tsx wiring ✓ (T-13), spec-selector migration ✓ (T-14), CSS additions ✓ (T-2/3/4/5), mobile reflow ✓ (T-5+T-22), Playwright e2e ✓ (T-21/22/23), Vitest ✓ (T-9/10/12/18), visual baselines ✓ (T-24), fixture extension ✓ (T-19).
- §3 component list: HeroSignalNoise (T-12), HeroChrome (T-11), HudBrackets (T-8), DataColumn (T-9), IdStrip (T-10) — all 5 covered.
- §4.2 new classes/keyframes: every row in the table is created across T-2 (keyframes), T-3 (chrome), T-4 (data column + id-strip), T-5 (cat-block + tools-grid + hero-h).
- §5.4 preserved behaviors table: every row maps to a "stays in Index.tsx" or "moves with JSX" decision honored in T-13.
- §6 breakpoint table: T-5 sets the CSS, T-22 verifies via e2e.
- §7.2 / §7.3 about rewrite: covered by T-15/16/17 + T-18 + T-23.
- §8 testing plan: T-19 (fixture), T-20 (browser timezoneId), T-21/22/23 (e2e), T-24 (visual), unit tests embedded in T-6/7/9/10/12/18.
- §8.5 must-stay-green specs: T-14 migrates `hero-cascade.spec.ts`, `hero-skip-and-badge.spec.ts`, `hero-focus-management.spec.ts` to the new selectors before T-25's full-suite run.
- §11 open questions: 11.1 inert prop covered by T-12 test + T-21 e2e; 11.2 version rot is documented inline via TODO comment in T-15; 11.3 fixture compat handled in T-19; 11.4 perf is monitoring-only; 11.5 resize-during-cascade is documented as accepted edge case.

**2. Placeholder scan:**
- Searched the plan for "TBD", "TODO", "fill in", "similar to", "appropriate". Result: only legitimate ones (the `// TODO(piotr): refresh tool versions quarterly` line added per Fix L2, which is itself a resolution of a finding, not a placeholder).

**3. Type consistency:**
- `viewProjectsRef: RefObject<HTMLAnchorElement | null>` consistent across T-12 (component def) and T-13 (parent passes the same ref). `RefObject<T | null>` matches what `useRef<T>(null)` produces (Fix C4).
- `ToolEntry { name: string; version: string | null }` consistent across T-15 (data.ts) and T-16 (ToolBadges).
- `useMotionPolicy()` return shape `{ tier, prefersReducedMotion, animationsDisabled }` matches the production source.
- `phase: number`, `animationsDisabled: boolean`, `prefersReducedMotion: boolean` consistent across T-12 and T-13.

**4. Out of scope:**
- §9 step 10 (merge to main / Vercel auto-deploy) is intentionally outside plan scope — handled by PR review and Vercel CI after the plan completes.

No issues found.

---

## Resolutions Applied in Rev 2

Five changes are load-bearing enough to call out:

1. **BUILD IT row LetterReveal restored.** Rev 1's T-12 silently dropped `<LetterReveal text="BUILD IT">` and replaced it with a static `<span>`, violating spec §5.2. Rev 2 restores the per-letter reveal and adds a Vitest assertion that catches future regressions (Fix C1).

2. **T-12 made self-contained; T-13 no longer mutates HeroSignalNoise.tsx.** Rev 1's T-13 included a "Sub-task: extend HeroSignalNoise to render terminal line" that mutated T-12's output file with no test coverage. Rev 2 folds the terminal-line LetterReveal into T-12 with its own test; T-13 is now Index.tsx-only (Fix C2).

3. **New task added: migrate existing functional specs to new selectors.** Rev 1 didn't account for `e2e/functional/hero-cascade.spec.ts`, `hero-skip-and-badge.spec.ts`, `hero-focus-management.spec.ts` using selectors (`h1.font-display`, `aria-label="BUILD IT"`) that the new HeroSignalNoise breaks. Rev 2 adds a new task (renumbered T-14, prior T-14..T-24 shifted by +1) to migrate them before the full-suite run (Fix C3).

4. **`viewProjectsRef` typed correctly.** `RefObject<HTMLAnchorElement>` is incompatible with React 18's `useRef<HTMLAnchorElement>(null)` which returns `RefObject<HTMLAnchorElement | null>`. Rev 2 corrects the prop type (Fix C4).

5. **Browser timezone + visual-config fixes.** Rev 1's T-19 set `process.env.TZ='UTC'` (Node-only — doesn't reach Chromium); T-23 invoked the wrong Playwright config. Rev 2 uses Playwright's `contextOptions.timezoneId` for the BROWSER timezone and routes visual baselines through the existing Docker-pinned `test:e2e:update-baselines` script (Fixes H3, H4).

Two pattern-graduation candidates surfaced during adversarial review (env-leak fixes and forward-reference rot in TDD task pairs). Both are graduation-eligible at n=3 and tracked for absorption into workspace rules after the implementation lands.

---

*End of plan. To execute: invoke the `superpowers:subagent-driven-development` skill (recommended — fresh subagent per task) or `superpowers:executing-plans` skill (inline batch). Per user instruction, this plan stops short of execution handoff. The orchestrator will pause here and run the plan adversarial review next.*
