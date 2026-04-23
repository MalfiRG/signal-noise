# E2E Flakiness Remediation — Design Spec

**Date:** 2026-04-19
**Status:** Rev 2 — post-adversarial-review
**Reviewers:** 5-agent adversarial team (adversarial-tl, backend-architect, autotest-reviewer-quality, reviewer-consistency, socratic-challenger)
**Findings:** ~94 across 5 reviewers (7 critical, 21 high, 23 medium, 13 low, plus 33 questions/coverage gaps)
**Applied:** All 6 critical fixes (C1-C6), all 9 high fixes (H1-H9), 16 medium fixes (M1-M16), 4 low fixes (L1-L4)
**Deferred:** 7 items moved to §7 Out of Scope or §8 Open Questions (D1-D7)
**Scope:** Playwright suite under `e2e/*.spec.ts` — structural cleanup, not patches.
**Companion docs:** `ARCHITECTURE.md` §9 Testing Architecture, `DESIGN.md` §7 Motion Design, `docs/superpowers/specs/2026-03-15-playwright-e2e-tests-design.md` (original v1 spec, now superseded for the visual-regression and CI-tier sections).
**Trigger:** `e2e/visual-mobile.spec.ts` (21 tests = 7 routes × 3 mobile viewports) failing every CI run with page-height mismatches caused by a font-loading race; ~13 layout-positional tests in the rest of the suite drift in adjacent ways. AI-authored test code has accumulated brittleness.

---

## 0. Diagnosis Summary

The current suite conflates four distinct concerns into one undifferentiated tier:

1. **Smoke** — does the route load and render the right shell?
2. **Functional E2E** — do interactions, navigation, and structural invariants hold?
3. **Visual regression** — does the rendered output look the same as the baseline?
4. **Diagnostic / one-shot** — captures used during a debugging session, kept around with `expect(true).toBe(true)`.

CI (`.github/workflows/e2e.yml:31`) runs `npx playwright test` against the entire `e2e/` directory on every push to `main`/`dev-*` and every PR. There is no opt-out for the slow visual tier. `playwright.config.ts:7` runs everything in CI with `workers: 1`, so the visual block stretches wall-clock time to the timeout (line 16 in CI: `timeout-minutes: 15`).

Three concrete root causes for the visual-mobile failures (file:line cited):

| # | Root cause                                                                 | Evidence                                                                                                  |
|---|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| 1 | Font-loading race — no wait on `document.fonts.ready`                       | `visual-mobile.spec.ts:40` is `waitForTimeout(1500)`; `index.css:5-93,207-259` declares 9 self-hosted woff2 faces with `font-display: swap`. WOFF2 swap-in shifts vertical metrics. |
| 2 | `animations: "disabled"` keyframe-leak claim is **unverified on Playwright `^1.58.2`** (per `package.json:83`). The classic understanding is that `toHaveScreenshot({ animations: "disabled" })` freezes the Web Animations API but does not stop CSS `@keyframes`. Playwright 1.30+ may set `animation-play-state: paused !important` on top of WAAPI freeze; if true on 1.58.2, the addStyleTag step solves a non-problem. The Wave 2 verification step below resolves this empirically. **Verified 2026-04-21 (Wave 2): Playwright 1.58.2 DOES effectively freeze CSS keyframes under `screenshot({ animations: "disabled" })`.** Verified via byte-comparison: two `.animate-hero-glow-slow` screenshots 500ms apart (Index.tsx:66, 20s infinite `hero-glow` keyframe, desktop viewport) returned byte-identical buffers (`e2e/_verification/keyframe-leak-repro.spec.ts`). Pivoted from the plan's `.affordance-pulse` target after finding it only renders on the mobile BlogSidebar branch (BlogSidebar.tsx:38) inside a Radix Sheet trigger that reports "hidden" to Playwright visibility polling. `freezeAnimationsViaInitScript` is therefore NOT load-bearing for keyframe coverage; it remains in `prepareContext` (default `freezeKeyframes: true`) for `scroll-behavior: auto` + CSS `transition` coverage. | `visual-mobile.spec.ts:48`. Candidate keyframe-driven offenders: `.hero-stamp-entrance` (`index.css:762-804`), `.hero-glitch-entrance` (`index.css:708-740`), `.affordance-pulse` (`index.css:935-951`). |
| 3 | Snapshot path template defaults to `*-chromium-linux.png` per platform     | Baselines under `e2e/visual-mobile.spec.ts-snapshots/` carry the `-linux` suffix. WSL2 Linux ≠ Ubuntu CI Linux for sub-pixel rasterization (different libfreetype/fontconfig versions). |

**Empirical verification gate (Fix C2):** Wave 2 includes a 5-line repro on Playwright 1.58.2 against `.affordance-pulse` to confirm or refute the keyframe-leak claim. If the claim is FALSE on 1.58.2, the addStyleTag step in §3 is dropped and re-justified as a simplification (the `addInitScript` style injection is still useful for `scroll-behavior` and for transition coverage even if WAAPI now subsumes keyframe pause).

Cross-cutting amplifier: `webServer.command: "npm run dev"` (`playwright.config.ts:22`) — visual tests are running against the **dev bundle**, not a production preview build. Vite dev mode has different module resolution and does not pre-warm fonts.

---

## 1. Test Pyramid Assessment

Before any reorganization, classify what each "visual" route is actually catching. Visual regression is the most expensive and most brittle layer; reserve it for cases where the lower layers cannot.

| Route                        | What `visual-mobile.spec.ts` catches today                                | Lowest-cost replacement                                                                                                                | Verdict                       |
|------------------------------|---------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|-------------------------------|
| `/` (home)                   | Hero cascade settled state + orb positions + scanline + CTAs              | Functional: `hero-cascade.spec.ts` already verifies cascade order. **Add** structural assertions for orb count + scroll-hint position. Drop the screenshot. | Replace with DOM/structural   |
| `/projects`                  | Card grid layout, badge wrapping, GitHub/live link icons                  | Functional: `index-layout.spec.ts:69-98` already counts cards and link presence. **Add** assertion that no card overflows viewport (`boundingBox().right <= viewport.width`). | Replace with DOM/structural   |
| `/skills`                    | Skill bar widths, learning-tab amber color, progress meter alignment      | Functional: assert each `[data-skill-bar]` has `width` matching `data-progress` percentage; assert tab active class swaps `text-primary` ↔ `text-learning`. | Replace with DOM/structural   |
| `/blog` (index)              | Tag wrapping at 375px (the actual reason `verify-fixes.spec.ts` exists)   | Functional: fold the no-overflow check from `verify-fixes.spec.ts:6-15` into `responsive.spec.ts` (see §5). | Replace with DOM/structural   |
| `/blog/style-test`           | Mermaid render + code-block scroll + table overflow + reading-mode swap   | Mostly already covered by `blog-rendering.spec.ts`, `reading-mode.spec.ts`. **Keep one visual snapshot** of `style-test` first viewport for the kitchen-sink rendering contract — typography hierarchy, code-block decoration, mermaid theming all converge here and structural assertions can't catch a font swap regression. | **Keep visual** (one snapshot, not three) |
| `/how-i-do-it` (index)       | 5-card grid, identical visual to `/projects` shape                         | Functional: `session-2026-04-12.spec.ts:12-19` already asserts 5 cards. Drop screenshot. | Replace with DOM/structural   |
| `/how-i-do-it/test-plan`     | Methodology page render — same content pipeline as blog post              | Same as `/blog/style-test` — covered by content-rendering tests. No second visual baseline needed (`style-test` is the canonical kitchen sink). | Drop visual                   |

**Rationale for "visual is the exception":** every visual snapshot adds ~2-5s wall-clock per viewport, requires a Linux baseline regen on every font/CSS change, and hides the actual defect behind a pixel diff. Structural assertions fail with `expected width ≥ 320 but got 425` — directly actionable. The single visual we keep on `/blog/style-test` is justified because the content pipeline (Markdown → MarkdownRenderer → Prism → Mermaid → reading-mode CSS) has too many integration points to assert structurally without assertion sprawl.

### 1.1 Coverage Trade-Offs (Explicit)

The 21→1 visual collapse trades coverage for determinism. We are accepting the
following coverage losses, with rationale:

| Lost coverage | What we accept | Mitigation |
|---|---|---|
| iPhone Pro Max (428px) viewport across all routes | Visual regressions affecting only the widest mobile viewport will not be caught | `responsive.spec.ts` is parametrized over 375/390/428 for breakpoint contracts |
| `/blog` tag-wrapping visual at 375px | Tags wrapping into 4 awkward lines (visually broken but no overflow) | Add a structural assertion in `responsive.spec.ts`: tag list height ≤ N×line-height |
| Hero settled-state visual regression | Scanline z-index, orb position, font-baseline shift on `/` | `hero-cascade.spec.ts` covers structural cascade; visual regression of the SETTLED state has no replacement |
| Reading-mode visual regression | Cream/dark theme swap producing visual incoherence | `reading-mode.spec.ts` covers CSS variable resolution; visual coherence has no replacement |
| Mermaid diagram render across themes | Mermaid styling regressions in the dark default theme are not visually verified | Kitchen-sink at `/blog/style-test` includes Mermaid (covers default theme only) |

**Decision:** Accept these losses for the personal blog's velocity profile.
Re-evaluate (and consider Percy/Chromatic per §7) if visual regressions ship to
production within 6 months of Wave 4 landing.

### Component-level pushdown (Vitest)

Several DOM assertions currently performed in Playwright would run faster and more deterministically as Vitest unit tests with React Testing Library. **Important constraint:** jsdom does NOT resolve CSS-variable cascades — `getComputedStyle(el).backgroundColor` returns an empty string when the value is inherited from a stylesheet. Computed-style assertions stay in Playwright; class/attribute presence and pure-function tests go to Vitest.

| Currently in Playwright                                                | Move to Vitest (`src/**/*.test.tsx`)                                  | File reference                                                       |
|-----------------------------------------------------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------|
| Inline-code `bg-secondary` class (`blog-rendering.spec.ts:115-118`)    | `MarkdownRenderer.test.tsx` — render fixture, assert class            | `src/components/markdown/MarkdownRenderer.tsx`                       |
| Frontmatter strip (`session-2026-04-12.spec.ts:48-67`)                 | `frontmatter.test.ts` (likely already exists)                         | `src/lib/frontmatter.ts` — per `ARCHITECTURE.md §12` frontmatter parser |
| Polish slugify behavior (referenced in CLAUDE.md §Polish chars)        | `MarkdownRenderer.test.tsx`                                           | `customSlugify` in `MarkdownRenderer.tsx`                            |
| Reading-mode `theme-reading` class application (`reading-mode.spec.ts:9-17`) | ONLY the class-application check moves to `App.test.tsx` (jsdom-safe). The CSS-variable color assertions and font-family computed-style checks at `reading-mode.spec.ts:21-107` STAY in Playwright — they require real browser CSSOM. | `App.tsx:AppContent` regex from `ARCHITECTURE.md §3` |

**Pushdown rule of thumb:** when in doubt, computed-style assertions stay in Playwright; class/attribute presence and pure-function tests go to Vitest.

These are pure render-output checks; they don't need a real browser, real font loading, or a real navigation.

---

## 2. Suite Organization

### 2.0 Tier placement rubric

A tier is a contract about signal granularity, not a directory. Every new test must satisfy the rubric below before it lands. Drift is enforced via ESLint configs (§2.3) — not vibes.

| Tier | Signal | Allowed assertions | Forbidden | Wall-clock budget |
|---|---|---|---|---|
| smoke | route load only | one `expect(locator).toBeVisible()` per route — asserts a route returns 200 AND its primary content selector becomes visible within 5s | interactions, screenshots, multi-step flows, computed-style assertions | < 60s total |
| functional | DOM/structural | bounding-box, class swaps, navigation, count, viewport-relative, computed-style, accessibility | `toHaveScreenshot`, `waitForTimeout(>=1000)` | < 5min total |
| visual | pixel-diff contract | `toHaveScreenshot` only | new screenshots without §4 Docker baseline workflow | n/a (main-only) |

### Three-tier model (Playwright projects)

Wire the tiers via Playwright **projects** (each with its own `testMatch`). Projects let `playwright.config.ts` configure per-tier `use` overrides (e.g., the visual tier loads from a separate `playwright.visual.config.ts` so its `webServer.command: "npm run preview ..."` cannot collide with the dev-server config used by smoke + functional).

```
e2e/
├── smoke/                         # Tier 1 — PR gating, < 60s wall-clock
│   ├── routes-load.spec.ts         # Each route returns 200, key element renders
│   └── reading-mode-swap.spec.ts   # /blog/x has .theme-reading wrapper
├── functional/                    # Tier 2 — PR gating, < 5min wall-clock
│   ├── blog-rendering.spec.ts
│   ├── reading-mode.spec.ts
│   ├── responsive.spec.ts
│   ├── hero-cascade.spec.ts
│   ├── motion-wcag-session.spec.ts
│   └── content-pages.spec.ts       # consolidated from session-2026-04-12.spec.ts
├── visual/                        # Tier 3 — main-only or workflow_dispatch
│   └── kitchen-sink.spec.ts        # /blog/style-test only, one viewport
└── fixtures/
    ├── blog-page.ts
    └── visual-determinism.ts       # the canonical wait-helper from §3
```

### `playwright.config.ts` shape (proposed)

Two config files, not one — driven by Fix C6's correction of the original `process.env.VISUAL` ternary footgun.

**`playwright.config.ts`** — smoke + functional, dev server:

```ts
projects: [
  {
    name: "smoke",
    testDir: "./e2e/smoke",
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "functional",
    testDir: "./e2e/functional",
    use: { ...devices["Desktop Chrome"] },
  },
],
webServer: {
  command: "npm run dev",
  url: "http://localhost:8080",
  reuseExistingServer: !process.env.CI,
},
```

**`playwright.visual.config.ts`** — visual only, preview server:

```ts
export default defineConfig({
  workers: 1,                 // top-level — see §2 note on the API
  projects: [
    {
      name: "visual",
      testDir: "./e2e/visual",
      use: { ...devices["Desktop Chrome"] },
      snapshotPathTemplate: "{testDir}/__snapshots__/{testFileName}/{arg}{ext}",
    },
  ],
  webServer: {
    // Visual tier needs prod build (no dev HMR, no font-loading variance from Vite dev).
    // The `npm run build` step is hoisted to a CI step (see §2.2) so the webServer
    // command does not block on a build inside Playwright's startup window.
    command: "npm run preview -- --port 8080 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: false,
    env: { SKIP_GITHUB_FETCH: "1" },   // stub `update-github-stats.ts` so the
                                       // visual run does not depend on GitHub API
  },
});
```

The `e2e-visual` CI job loads this config via `--config playwright.visual.config.ts`. `--strictPort` makes a port collision fail loud rather than silently flipping to 4174 and producing wrong baselines.

The current single project at `playwright.config.ts:15-20` becomes three (two in the main config, one in the visual config). The `workers: 1` enforcement for the visual tier is a top-level field on `playwright.visual.config.ts` — Playwright does not currently support per-project `workers`, so isolating the visual tier in its own config is the only way to constrain it without slowing smoke + functional.

### 2.1 Tag taxonomy

The Rev 1 phrase "projects + grep tags" is **struck**. No tag vocabulary is defined and projects already give us the tier split. If a future need emerges (auto-retry flaky tests, exclude slow tests from PR runs), revisit and add a closed enum (`@flaky`, `@slow`, `@regression-#NNN`) at that point.

### 2.2 Workflow file shape

Three jobs share one workflow file. Each job pays its own setup cost today; this section addresses that.

- A `setup` job runs first: `npm ci --legacy-peer-deps` → caches `node_modules/` and the Playwright browser cache (`~/.cache/ms-playwright`) as `actions/cache` keys keyed off `package-lock.json` + Playwright version.
- Downstream jobs (`e2e-smoke`, `e2e-functional`, `e2e-visual`) `actions/cache@v4` restore the same keys before running tests.
- Workflow-level `concurrency: { group: "${{ github.workflow }}-${{ github.ref }}", cancel-in-progress: true }` cancels superseded runs on the same ref.
- The `e2e-visual` job pre-builds the app via `npm run build` BEFORE invoking Playwright, so the `webServer.command` does not race a long build inside Playwright's startup window. `SKIP_GITHUB_FETCH=1` is set in the build step too — `update-github-stats.ts` runs at build time and would otherwise reach GitHub on every visual CI run.

### CI workflow split

| Job              | Trigger                                                  | Command                                                                          | Required for merge |
|------------------|----------------------------------------------------------|----------------------------------------------------------------------------------|--------------------|
| `e2e-smoke`      | Every push, every PR                                     | `npx playwright test --project=smoke`                                            | Yes                |
| `e2e-functional` | Every push, every PR                                     | `npx playwright test --project=functional`                                       | Yes                |
| `e2e-visual`     | Push to `main` only, plus `workflow_dispatch`            | `npx playwright test --config playwright.visual.config.ts` inside the Docker image from §4 | No (informational) |

The `e2e-visual` job uses the per-job `if:` condition + `continue-on-error: true` so visual failures on `main` notify but don't block the gate (Vercel auto-deploy runs from `main` regardless per `ARCHITECTURE.md §8`):

```yaml
e2e-visual:
  if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
  continue-on-error: true   # informational, not gating
```

EVERY job uploads `playwright-report/` and `test-results/` via `actions/upload-artifact@v4` with `if: ${{ !cancelled() }}` so developers can investigate failures (especially visual diffs) from the GitHub UI.

The `e2e-visual` workflow also accepts a `workflow_dispatch` input:

```yaml
inputs:
  update_snapshots:
    type: boolean
    default: false
    description: "Regenerate baselines in this run"
```

When `update_snapshots == true`, the job appends `--update-snapshots=changed` to the Playwright command. (See §4 for the Dependabot/maintainer workflow that uses this input.)

### 2.3 Enforcement

The placement rubric in §2.0 is enforced at lint time, not by review discipline.

- ESLint config at `e2e/smoke/.eslintrc.json` forbids `toHaveScreenshot`, `addStyleTag`, broader `evaluate` API usage, and multi-route iteration patterns.
- ESLint config at `e2e/functional/.eslintrc.json` forbids `toHaveScreenshot`.
- Workspace-level ESLint `no-restricted-syntax` rule: forbid `waitForTimeout` literals ≥ 1000 (locked decision #10) AND tautology assertions (`expect(true).toBe(true)`, `expect(1).toBe(1)`).
- CI smoke job runs `npm run lint:e2e` and fails the build on rule violations.
- CI smoke job also parses Playwright's `results.json` and fails the build if the smoke tier wall-clock exceeds 60s.

(The configs themselves are created during Wave 3 — this spec only describes them.)

### 2.4 Helper sharing rules

To prevent the helper layer from growing into a cross-tier coupling mess:

- `e2e/fixtures/` may be imported by any tier — this is the canonical shared layer (visual-determinism, blog-page).
- Tier-internal helpers go in `e2e/<tier>/_helpers/` and may NOT be imported across tiers. ESLint enforces this via `no-restricted-imports`.
- Cross-layer (Vitest ↔ Playwright) data fixtures live in `test-fixtures/` at the repo root.

---

## 3. Determinism Patterns

The Rev 1 5-in-1 helper bundled page-agnostic concerns (fonts, animations, rAF) with page-specific ones (sessionStorage hero-cascade skip, optional Mermaid). Decomposed below into **composable primitives + a thin façade**, with a **two-phase contract** that distinguishes pre-`goto` setup from post-`goto` settlement.

### Two-phase contract

The original "call this AFTER goto" design has a load-bearing bug: `useState` initializers in `Index.tsx:14-19` capture `sessionStorage.getItem(HERO_PLAYED_KEY) === "1"` BEFORE any post-`goto` script can run. Any sessionStorage seed or animation kill that depends on running before page scripts execute MUST go through `addInitScript`, not `evaluate`.

- **Pre-goto phase** — `await prepareContext(page, opts)` runs `addInitScript` calls that fire before any author script on every navigation. This is the only correct place for the hero-cascade skip and for the animation-kill stylesheet.
- **Post-goto phase** — `await stabilizeForLayout(page, opts)` runs after `goto` to settle fonts, optional Mermaid, and the paint pipeline.

Every layout-sensitive test calls **both** phases. `hero-cascade.spec.ts` is the one place that opts out of the cascade-skip primitive.

### Helper module — `e2e/fixtures/visual-determinism.ts`

```ts
import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Pre-goto primitives — call BEFORE page.goto (typically inside a fixture).
// ---------------------------------------------------------------------------

/**
 * Inject a stylesheet that zeros animations and transitions and forces
 * scroll-behavior: auto. Uses addInitScript so the style is in the DOM
 * BEFORE any author stylesheet loads — and prepended as the FIRST child
 * of <head> so author rules cannot win on source-order tie-break.
 *
 * Note: framer-motion's `layout` animations are rAF-driven via
 * useLayoutEffect and are NOT covered by this CSS injection. Tests that
 * exercise `layout` props must additionally wrap with
 * <MotionConfig reducedMotion="always"> in a test-only render.
 */
export async function freezeAnimationsViaInitScript(page: Page) {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.id = "__test-determinism";
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.prepend(style);  // FIRST child = earliest source order
  });
}

/**
 * Pre-seed sessionStorage so Index.tsx's useState initializer
 * (Index.tsx:14-19) captures `true` instead of `false`, skipping the
 * 6-second hero cascade entirely. Must run via addInitScript so it
 * fires BEFORE the React tree's useState executes on every navigation.
 */
export async function skipHeroCascadeViaInitScript(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("hero-cascade-played", "1");
  });
}

// ---------------------------------------------------------------------------
// Post-goto primitives — call AFTER page.goto.
// ---------------------------------------------------------------------------

/**
 * Resolve when all currently pending @font-face downloads complete and
 * their faces become "loaded". Replaces every waitForTimeout(1500) in the
 * suite. The async wrapper discards FontFaceSet — the helper is void.
 */
export async function waitForFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/**
 * Mermaid diagrams render via an async observer. Wait for every
 * placeholder to have a corresponding non-zero-bbox <svg>. The previous
 * `length > 0` check returned true after the FIRST diagram rendered;
 * style-test has multiple, so screenshots captured a partial render.
 */
export async function waitForMermaid(page: Page) {
  await page.waitForFunction(() => {
    const placeholders = document.querySelectorAll("pre.mermaid, [id^='mermaid-']");
    const svgs = document.querySelectorAll("[id^='mermaid-'] svg");
    if (svgs.length === 0 || svgs.length < placeholders.length) return false;
    return Array.from(svgs).every(s => (s as SVGGraphicsElement).getBBox().width > 0);
  }, { timeout: 15000 });
}

/**
 * Double-rAF: the FIRST rAF schedules a callback in the same frame; the
 * SECOND rAF guarantees the paint after the first has committed. A single
 * rAF resolves before paint — Chromium's pipeline is rAF callbacks → style
 * → layout → paint → composite, so a single-rAF screenshot can capture
 * mid-paint state.
 */
export async function settleStyles(page: Page) {
  await page.evaluate(
    () => new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve())
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Composed convenience entry points (the façade layer).
// ---------------------------------------------------------------------------

export async function prepareContext(
  page: Page,
  opts?: { skipHeroCascade?: boolean }
) {
  await freezeAnimationsViaInitScript(page);
  if (opts?.skipHeroCascade !== false) {
    await skipHeroCascadeViaInitScript(page);
  }
}

export async function stabilizeForLayout(
  page: Page,
  opts?: {
    mermaid?: boolean;
    reducedMotion?: boolean;       // emulateMedia BEFORE goto — caller passes
                                   // through to a fixture or to context.emulateMedia
    readyLocator?: Locator;        // web-first-assert before resolving
  }
) {
  await waitForFonts(page);
  if (opts?.mermaid) await waitForMermaid(page);
  await settleStyles(page);
  if (opts?.readyLocator) {
    await expect(opts.readyLocator).toBeVisible();
  }
}
```

### Helper as verified contract

The helper is a spell only if you trust it. Pass `readyLocator` to web-first-assert that the page is in the expected state (e.g., `expect(blogTitle).toBeVisible()`) — this turns the helper from "call and trust" into "call and verify". For tests that need to exercise the reduced-motion code path, pass `reducedMotion: true` and ensure the fixture calls `context.emulateMedia({ reducedMotion: "reduce" })` before `goto`.

### Why each step

| Step                              | Why it matters                                                                                                                                                                                                                  |
|-----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `freezeAnimationsViaInitScript`    | (Pre-goto.) Disables CSS keyframes and CSS transitions (covers framer-motion's inline transitions). Framer Motion's WAAPI path is additionally neutralized by `toHaveScreenshot({ animations: 'disabled' })` in the visual tier. Prepended via `addInitScript` so author stylesheets and HMR-injected styles cannot win on source-order tie-break. `animation: none` (shorthand) is preferred over `animation-duration: 0s` because it short-circuits the engine entirely. |
| `skipHeroCascadeViaInitScript`     | (Pre-goto.) The cascade has 4 setTimeouts ending at 6000ms (`ARCHITECTURE.md §7` table). Without seeding the flag BEFORE `Index.tsx:14-19`'s `useState` initializer fires, every test on `/` either sleeps 6s or screenshots a partial state. Using `evaluate` after `goto` is a no-op for first-visit page loads (which is every test). |
| `waitForFonts`                     | (Post-goto.) Self-hosted WOFF2 declared `font-display: swap` (`index.css:9`). Swap means the system fallback paints first, then the real font replaces it — vertical metrics differ between Chakra Petch and the fallback sans, shifting every `boundingBox().y` and full-page screenshot. |
| `waitForMermaid` (opt-in)          | `MarkdownRenderer.tsx:useMermaidTheme` re-initializes Mermaid asynchronously on theme observer fire. Diagrams paint after first render tick. Wait for placeholder-count parity AND non-zero bbox so multi-diagram pages don't capture a partial render. |
| `settleStyles` (double-rAF)        | After style injection and font load, give the browser TWO frames to apply: the first rAF schedules a callback in the current frame, the second guarantees the paint after the first has committed. Single rAF is a classic AI-test-code mistake — it resolves before paint commits. |

### `waitForLoadState('load')` vs `'networkidle'`

Drop `waitUntil: 'networkidle'` from `page.goto(...)` calls. `goto` defaults to `'load'`. No additional `waitForLoadState('load')` call is needed.

- `'networkidle'` (currently used at `responsive.spec.ts:25`, `verify-fixes.spec.ts:7`, `mobile-diagnostic.spec.ts:25`) waits for 500ms of zero in-flight requests. Vercel Analytics + Speed Insights (per `ARCHITECTURE.md §8`) and React Query background refetches keep nudging the network, producing variance.
- Playwright docs explicitly deprecate `'networkidle'` for assertion gating — it's a hint, not a contract.
- After `'load'` we own the wait condition via `waitForFonts` + `waitForMermaid` + `readyLocator`.

**Dynamic markdown chunks:** routes like `/blog/:slug` and `/how-i-do-it/:slug` fetch the markdown chunk lazily. `document.fonts.ready` does not cover the chunk fetch. Tests navigating to those routes MUST pass `readyLocator: page.locator('.markdown-body')` to `stabilizeForLayout` so the helper waits for the chunk-rendered DOM before resolving.

### Hero cascade specifically

`hero-cascade.spec.ts` is the **one place** the cascade is exercised. It calls `prepareContext(page, { skipHeroCascade: false })` to PRESERVE the cascade for testing. Every other test on `/` calls `prepareContext(page)` (default `skipHeroCascade: true`) so the cascade is pre-skipped. This kills the `waitForTimeout(4000)` / `waitForTimeout(7000)` patterns scattered across `motion-wcag-session.spec.ts` (lines 6, 21, 27, 31, 60, 147, 174, 184, 195, 219).

### Framer Motion handling

The CSS injection in `freezeAnimationsViaInitScript` zeros all CSS `animation` and `transition` shorthand. Framer Motion compiles to either WAAPI or inline transitions on the element — both routes are covered (WAAPI by `animations: "disabled"` on `toHaveScreenshot`, transitions by the CSS injection). Framer Motion's `layout` animations are rAF-driven via `useLayoutEffect` and are NOT covered by the CSS injection — tests exercising `layout` props must additionally wrap with `<MotionConfig reducedMotion="always">` in a test-only render. Do **not** mock `framer-motion` at the import level; that would diverge test behavior from real behavior.

### 3.5 Locator strategy

A reorg without selector discipline ages just as fast. Order of preference:

1. `page.getByRole(...)` — accessibility-aligned, survives most refactors.
2. `page.getByTestId(...)` — kebab-case `data-testid="feature-element-purpose"` (e.g., `data-testid="hero-cta-primary"`, `data-testid="blog-card-link"`, `data-testid="reading-mode-toggle"`).
3. Class/text selectors as last resort, with a comment explaining why no role or testid was available.

Three concrete refactors to apply during Waves 2-3:

- `page.locator(".markdown-body")` → `page.getByTestId("markdown-body")` after adding `data-testid` to `MarkdownRenderer.tsx`.
- `page.locator("button.theme-toggle")` → `page.getByRole("button", { name: /reading mode/i })`.
- `page.locator(".project-card")` → `page.getByTestId("project-card")` after adding the attribute to the card root.

---

## 4. Baseline Strategy

### Docker image — pin to CI

Use the official Playwright image matching the version in `package.json` (`@playwright/test: ^1.58.2`):

```
mcr.microsoft.com/playwright:v1.58.2-jammy
```

Jammy = Ubuntu 22.04, which is `runs-on: ubuntu-latest` today. When CI bumps Ubuntu version or we bump Playwright, regenerate baselines once in the new image and commit the diff. This eliminates the WSL2-vs-CI sub-pixel difference (current root cause #3 in §0).

### `package.json` scripts

A full per-tier script set so contributors don't run "everything" out of habit:

```json
"test:e2e": "npx playwright test",
"test:e2e:smoke": "npx playwright test --project=smoke",
"test:e2e:functional": "npx playwright test --project=functional",
"test:e2e:visual": "npx playwright test --config playwright.visual.config.ts",
"test:e2e:update-baselines": "docker run --rm -v \"$PWD:/work\" -w /work mcr.microsoft.com/playwright:v1.58.2-jammy npx playwright test --config playwright.visual.config.ts --update-snapshots=changed"
```

Contributors running `npm run test:e2e` get the full suite (smoke + functional). Visual is opt-in via `npm run test:e2e:visual` and requires Docker for baseline regen. The Docker invocation is the **only** sanctioned way to regenerate baselines. Running `--update-snapshots` on WSL2 directly produces wrong baselines and hides bugs.

### Runtime guard against host-machine baseline regen

`e2e/visual/kitchen-sink.spec.ts` includes a `beforeAll` guard that hard-fails if `--update-snapshots` runs outside the pinned Docker image:

```ts
test.beforeAll(({ }, testInfo) => {
  if (testInfo.config.updateSnapshots !== "none") {
    const isDocker = require("fs").existsSync("/.dockerenv");
    if (!isDocker && !process.env.ALLOW_HOST_SNAPSHOT_UPDATE) {
      throw new Error(
        "Visual baselines must be regenerated in the pinned Docker image. " +
        "Use `npm run test:e2e:update-baselines`."
      );
    }
  }
});
```

`ALLOW_HOST_SNAPSHOT_UPDATE=1` is an explicit override for emergencies — the noise of having to set it makes accidental host regen impossible.

### Dependabot + auto-regen workflow

A `workflow_dispatch` GitHub Action at `.github/workflows/regen-visual-baselines.yml` runs in the same Docker image, commits via a bot account, and opens an auto-PR. The workflow accepts a branch name input so a maintainer can target a Dependabot branch directly.

**Dependabot path:** when Dependabot bumps `@playwright/test`, the visual job will fail on the bumped PR (new Playwright = new rendering primitives = pixel diff). Maintainer triggers `regen-visual-baselines` against the Dependabot branch via `workflow_dispatch`, which refreshes baselines, opens an auto-PR onto the Dependabot branch, the maintainer reviews the diff, then merges.

**Path-based protection:** `e2e/visual/__snapshots__/*.png` is covered by a CODEOWNERS entry (even if the only owner is the maintainer) so baseline changes always require explicit human approval and never get rubber-stamped by an auto-merge bot.

(The workflow YAML itself is created during Wave 4 — this spec only describes it.)

### Who runs it, when

| Trigger                                                  | Who                       | Action                                                                                  |
|----------------------------------------------------------|---------------------------|------------------------------------------------------------------------------------------|
| Font, CSS-vars, layout, or motion-system change          | Author of the change      | `npm run test:e2e:update-baselines`, review pixel diff in PR, commit `__snapshots__/*.png` |
| New visual snapshot added                                | Author                    | Same flow, but the diff will show new files only                                         |
| Playwright version bump in `package.json`                | Bumper (often Dependabot) | Maintainer triggers `regen-visual-baselines.yml` against the bump branch                 |
| Random pixel-diff failure on `e2e-visual` job on `main`  | Whoever's on rotation     | Investigate first (don't reflexively re-baseline). If genuinely a non-deterministic regression, file an issue and disable the failing snapshot via `.skip` until fixed. |

### Commit baselines to git? Yes.

The kitchen-sink visual snapshot is small (~300KB at 375×~5000px PNG) and the `visual/` directory will hold 1 PNG after the §1 cleanup (a single kitchen-sink baseline). Designed to scale to ≤3 if visual tier expands. Git LFS would be over-engineering at this scale.

**Escalation thresholds for revisiting this decision:** move to Git LFS when (visual snapshots ≥ 10) OR (cumulative PNG bytes ≥ 10MB) OR (regen frequency ≥ monthly). Re-evaluate Percy/Chromatic per §7 in the same triggers.

Commit the PNGs directly under `e2e/visual/__snapshots__/`. The current 21 baselines under `e2e/visual-mobile.spec.ts-snapshots/` get **deleted** in Wave 1 to eliminate ambiguity during Waves 2-3 (the `snapshotPathTemplate` change orphans them anyway; deleting in the same PR avoids "no baseline, generating" misleading log lines).

`.gitignore` keeps `test-results/` and `playwright-report/` ignored — `__snapshots__/` is **tracked**.

---

## 5. Scope Decisions — Spec-by-Spec

| Spec file                              | LOC | Verdict   | Notes                                                                                                                                                                                                                       |
|----------------------------------------|-----|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `blog-rendering.spec.ts`               | 296 | **KEEP** (move to `functional/`) | Pure DOM/structural — focused tests for the content pipeline. Push `inline code bg-secondary` (line 115-118) down to Vitest. Adopt the two-phase helper (`prepareContext` in fixture, `stabilizeForLayout` post-goto). |
| `hero-cascade.spec.ts`                 | 178 | **KEEP** (move to `functional/`) | Canonical home for cascade timing assertions. Calls `prepareContext(page, { skipHeroCascade: false })` — the ONE place that preserves the cascade for testing. The reduced-motion block (line 130-177) stays verbatim. |
| `index-layout.spec.ts`                 | 99  | **REWRITE** (consolidate into `functional/content-pages.spec.ts`) | "below fold" assertions at line 16-52 use `boundingBox().y > 720` against a hardcoded viewport — drifts when fonts load. Use viewport-relative `await element.isInViewport()` instead, after `stabilizeForLayout`.   |
| `mobile-diagnostic.spec.ts`            | 155 | **DELETE** | Three-quarters of this file is `console.log` + `expect(true).toBe(true)` (lines 79-99). The screenshot-loop (lines 105-153) writes to `test-results/` with no assertion. Pure debugging artifact from a past session — git history preserves it. The overflow-check loop (lines 19-103) is duplicated by `verify-fixes.spec.ts:6-15` and the no-overflow assertion belongs in `responsive.spec.ts`. |
| `motion-wcag-session.spec.ts`          | 267 | **REWRITE** (split into `functional/wcag-touch-targets.spec.ts` + merge motion checks into `hero-cascade.spec.ts`) | The WCAG touch-target tests (line 30-70) and ambient-effects tests (line 235-251) are unique and stay. The "Page transitions" + "Copy content" + "Scroll reveal" describes (lines 3-28, 172-233) drift from `waitForTimeout(4000)` patterns; rewrite using the two-phase helper. The "Glitch hover" check (line 145-158) uses computed-style `::before` opacity — keep, but stabilize first. |
| `reading-mode.spec.ts`                 | 108 | **KEEP** (move to `functional/`) | Tight, structural, focused on the cream-paper palette + Atkinson font swap. The CSS-variable color assertions (lines 21-107) are the right granularity for a theme regression and STAY in Playwright (jsdom can't resolve CSS-variable cascade). |
| `responsive.spec.ts`                   | 103 | **KEEP** (move to `functional/`) | Breakpoint contract testing — Playwright's design center. Already deterministic (no animations on this surface). Absorbs the no-overflow check from `verify-fixes.spec.ts:6-15` as a parametrized 375/390/428 test. Adds an explicit `tag list height ≤ N×line-height` assertion for `/blog` to cover the awkward-wrapping case the visual-mobile snapshot used to catch (per §1.1). |
| `session-2026-04-12.spec.ts`           | 223 | **REWRITE** (rename to `functional/content-pages.spec.ts`, drop date in name) | Date-named spec is a code smell — sessions are not a long-lived organizational unit. Keep the methodology-page render checks (line 3-45), the CodeBlock expand-overlay tests (line 70-106), and the Projects-page button test (line 108-129). Drop the "Mobile scroll-reveal" describes (line 186-222) — duplicates `motion-wcag-session.spec.ts` "Scroll reveal" coverage. |
| `verify-fixes.spec.ts`                 | 53  | **DELETE** | Three tests, two of which screenshot to `test-results/` with no assertion (lines 9, 24). The one real assertion (no horizontal overflow at 375/390px) folds into `responsive.spec.ts` as a parametrized test. Git history preserves the original verification context. |
| `visual-mobile.spec.ts`                | 54  | **REWRITE** (becomes `visual/kitchen-sink.spec.ts`) | Reduce 21 snapshots → 1: only `/blog/style-test` at 390px (median mobile). Use `prepareContext(page)` pre-goto + `stabilizeForLayout(page, { mermaid: true, readyLocator: page.locator('.markdown-body') })` post-goto + the new Docker baseline workflow. Drop `fullPage: true` — capture the first viewport only (catches font/typography regression with deterministic height). |
| `fixtures/blog-page.ts`                | 13  | **KEEP**  | Add `await prepareContext(page)` BEFORE the existing goto, then `await stabilizeForLayout(page, { readyLocator: page.locator('.markdown-body') })` after the existing `expect(.markdown-body).toBeVisible()`. |

### Files DELETED (justification consolidated)

- `mobile-diagnostic.spec.ts` — debug-session artifact, no useful assertion not duplicated elsewhere. The console-log overflow harness was useful once; the lesson is captured by committing it to history, not by leaving it green-but-meaningless in CI.
- `verify-fixes.spec.ts` — same pattern, narrower scope. Its one assertion folds into `responsive.spec.ts`.
- `e2e/visual-mobile.spec.ts-snapshots/` (21 PNGs) — superseded by `e2e/visual/__snapshots__/` produced via the Docker workflow. Deleted in Wave 1 as a stopgap-coverage dependency (see §6 Wave 1).

### Tautology assertions deleted (file:line)

Wave 3 grep-confirms these are gone before merge. The workspace ESLint rule (per §2.3) prevents reintroduction.

- `mobile-diagnostic.spec.ts:79`, `:99` — `expect(true).toBe(true)` after console.log loops.
- `verify-fixes.spec.ts:9`, `:24` — `expect(true).toBe(true)` paired with screenshot-to-test-results writes.

### Files RENAMED

- `session-2026-04-12.spec.ts` → `functional/content-pages.spec.ts` (drop date prefix from filename — dates belong in commit metadata).

---

## 6. Migration Sequencing

CI must stay green throughout. Order matters because the visual tier is currently red and we want it intentionally bypassed during the migration without bypassing the rest. Estimates have been doubled relative to the Rev 1 draft (~2-3h estimates were fiction given historic estimate-to-actual ratio); each wave includes an explicit hardening buffer for CI flake retry triage.

**Reorder (Rev 2):** Wave 1 → Wave 2 → Wave 3 → Wave 5 → Wave 4. The component-level pushdown (formerly Wave 5) moves to slot 4 because shrinking the functional suite first is cheap and de-risks the novel visual rebuild that follows.

### Wave 1 — Triage red CI (1 PR, ~4h + 2h hardening buffer)

**Dependencies:** none.

1. Add `testIgnore: ['**/visual-mobile.spec.ts']` to the existing single `chromium` project in `playwright.config.ts`. (No OR branch with a separate workflow job — pick the conservative path.)
2. Delete the 21 stale baselines under `e2e/visual-mobile.spec.ts-snapshots/` in the same PR (`git rm e2e/visual-mobile.spec.ts-snapshots/*.png`). Eliminates ambiguity during Waves 2-3 and avoids "no baseline, generating" misleading log lines once the snapshot path template changes.
3. Commit a single CI-generated visual snapshot of `/blog/style-test` at 390px as a stopgap (rendered directly in the Ubuntu CI runner, not Docker). Accept the WSL2/CI sub-pixel delta during the migration window — this baseline is replaced in Wave 4 with the Docker-generated equivalent.
4. CI now green on the existing single project (visual-mobile excluded). The three-job split (`e2e-smoke` / `e2e-functional` / `e2e-visual`) is staged in Wave 3 — the Wave 1 quarantine job retains today's name `e2e`.
5. No test logic changes yet beyond the stopgap.

**Exit criteria:** PR builds green; `main` builds green; visual-mobile is documented as quarantined in the PR description; visual regression coverage exists on `main` (one stopgap snapshot) throughout Waves 2-3.

### Wave 2 — Determinism helper (1 PR, ~6h + 2h hardening buffer)

**Dependencies:** Wave 1 merged (otherwise CI is red and helper PRs cannot land).

1. Land `e2e/fixtures/visual-determinism.ts` with the decomposed primitives + `prepareContext` / `stabilizeForLayout` façade per §3.
2. **Verify the keyframe-leak claim empirically** (Fix C2 gate). Run a 5-line repro on Playwright 1.58.2 against `.affordance-pulse` to confirm or refute that `toHaveScreenshot({ animations: "disabled" })` leaves CSS keyframes running. Document the result inline in this spec (insert a verification note in §0 root-cause #2). If FALSE, drop the `freezeAnimationsViaInitScript` step from the helper composition (the function stays for `scroll-behavior` + transition coverage; the call from `prepareContext` becomes optional).
3. Wire `prepareContext` (pre-goto) + `stabilizeForLayout` (post-goto) into `e2e/fixtures/blog-page.ts`.
4. Replace every `waitForTimeout(>= 1000)` in the existing functional specs with `stabilizeForLayout` + an explicit `expect(...).toBeVisible()` for the thing actually being awaited.
5. Drop `waitUntil: "networkidle"` from `page.goto(...)` calls; `goto` defaults to `'load'`. No additional `waitForLoadState` call needed.

**Exit criteria:** Functional suite passes 5 consecutive CI runs without retries. Empirical verification result for keyframe-leak claim is recorded in §0.

### Wave 3 — Suite reorganization (1 PR, ~4h + 2h hardening buffer)

**Dependencies:** Wave 2 merged (the helper must exist before specs are reorganized to use it).

1. Create `e2e/{smoke,functional,visual}/` directories.
2. Move specs per §5 verdicts. Delete `mobile-diagnostic.spec.ts` and `verify-fixes.spec.ts`. Rename `session-2026-04-12.spec.ts` to `functional/content-pages.spec.ts`. Grep-confirm tautology assertions enumerated in §5 are gone.
3. Refactor `playwright.config.ts` into the two-config shape from §2 — main config (smoke + functional, dev server) and `playwright.visual.config.ts` (visual, preview server, `--strictPort`, `SKIP_GITHUB_FETCH=1`).
4. Split `e2e.yml` into `e2e-smoke` / `e2e-functional` / `e2e-visual` jobs per §2 (note: `e2e-functional`, not `e2e-funct`, for naming consistency with the Playwright project).
5. Land the ESLint configs described in §2.3 (`e2e/smoke/.eslintrc.json`, `e2e/functional/.eslintrc.json`, workspace-level `no-restricted-syntax`) and the `npm run lint:e2e` script. Wire it into the smoke job.
6. Add the `actions/upload-artifact@v4` step to every job and the `concurrency: { group, cancel-in-progress }` workflow-level config.

**Exit criteria:** `e2e-smoke` runs in <60s on CI. `e2e-functional` runs in <5min. `e2e-visual` job exists but is gated (per §2 `if:` condition) and skipped on PRs. ESLint catches a deliberately-injected `toHaveScreenshot` in a smoke spec during a dry-run.

### Wave 5 — Component-level pushdown (1 PR, ~4h + 2h hardening buffer)

**Dependencies:** Wave 3 merged (specs must already be in `functional/` before assertions are pushed down to Vitest).

1. Add the Vitest tests enumerated in §1 "Component-level pushdown" table (jsdom-safe assertions only).
2. Remove the corresponding Playwright assertions to keep the suite DRY. Computed-style assertions (per §1 pushdown table) STAY in Playwright.

**Exit criteria:** Vitest coverage on `MarkdownRenderer.tsx` + `frontmatter.ts` ≥ what the removed Playwright assertions covered. Functional suite wall-clock drops by 10-15%.

### Wave 4 — New visual tier (1 PR, ~6h + 2h hardening buffer)

**Dependencies:** Wave 3 merged (the visual config and CI job must exist) AND Wave 5 merged (functional suite is at its final shape so the visual tier launches into a stable surrounding context).

**Wave 4 prerequisite — baseline-review PR:** before turning on `e2e-visual`, open a baseline-review PR containing only the Docker-generated baseline + a checklist confirming each baseline matches intended visual state (no devtools, no half-loaded fonts, Mermaid rendered, content correct). Maintainer signs the checklist.

1. Write `e2e/visual/kitchen-sink.spec.ts` (one screenshot, `/blog/style-test` at 390px) including the Docker-runtime guard from §4.
2. Add the `regen-visual-baselines.yml` workflow described in §4.
3. Run baseline regen locally in Docker, commit the single PNG, replace the Wave 1 stopgap snapshot.
4. Enable `e2e-visual` job on `main` push only (the `if:` condition from §2). The webServer config was already landed in Wave 3 — no duplication here.
5. Add the CODEOWNERS entry for `e2e/visual/__snapshots__/*.png`.

**Exit criteria:** `e2e-visual` passes on `main`. The baseline-review PR is merged. Documentation updated in `ARCHITECTURE.md §9` ("Visual snapshot baselines" subsection) per §6.6 below.

### Throughout

- After each wave, add a 1-line entry to `ARCHITECTURE.md §9` so the testing architecture doc stays current with the implementation.
- Do **not** combine waves into one PR — review surface gets unmanageable and the rollback story dies.

### 6.6 Final ARCHITECTURE.md §9 end-state

After Wave 4 merges, `ARCHITECTURE.md §9 Testing Architecture` reads as a 200-300 word summary covering:

- The three Playwright tiers (smoke / functional / visual) with one-sentence descriptions of signal and budget per §2.0.
- The placement rubric (when does a test belong in which tier — point to §2.0 of this spec for the full table).
- The Docker baseline workflow (image pin, Dependabot path, runtime guard, CODEOWNERS).
- A pointer back to this spec (`docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md`) as the canonical reference. The `ARCHITECTURE.md` section stays summary-level; the spec stays detail-level.

---

## 7. Out of Scope

- Cross-browser visual testing (Firefox, WebKit). Single Chromium project remains. The current single-browser scope (`playwright.config.ts:16-19`) is correct for a personal blog hosted on Vercel where ~85% of traffic is Chromium-derivative.
- Percy/Chromatic/Argos integration. Local PNG baselines under git fit the cost/complexity profile until we have either (a) >10 visual snapshots or (b) need cross-browser visual diffing — see §4 escalation thresholds.
- Accessibility scans (axe-core). Worth a follow-up spec; do not bundle here.
- Performance regression (Lighthouse CI). Vercel Speed Insights already covers field metrics; lab metrics are a separate concern.
- Visual checks against Vercel preview URLs (deferred — would require a webhook + headless service against a deploy-preview URL, which is architecturally orthogonal to the Playwright tier model).
- Polish character / non-ASCII slug rendering visual coverage. The unit-level concern (slugify behavior) is covered by the Vitest pushdown in §1; end-to-end visual coverage of a Polish-titled blog post is deferred until the visual tier expands beyond the kitchen sink.

---

## 8. Open Questions

1. Should the `e2e-visual` job notify on Slack/email when it fails on `main`, or is GitHub UI sufficient? Default: GitHub UI for now (no notification infra exists).
2. Mermaid renders sometimes flake on first parallel run (per `ARCHITECTURE.md §9` "Test parallelism + dynamic markdown"). The new `waitForMermaid` (placeholder-count parity + non-zero bbox) should fix this — confirm during Wave 2 and remove the caveat from `ARCHITECTURE.md §9` if so.
3. Verify the `dmermaid-` selector against the actual rendered DOM. If the typo is real, fix it in `MarkdownRenderer.tsx` (out of scope for this spec — track separately). If `dmermaid-` is intentional (different render path), document why both selectors exist.
4. Pin the Docker image to an immutable digest (e.g., `mcr.microsoft.com/playwright:v1.58.2-jammy@sha256:<digest>`) for full reproducibility. Operational hygiene rather than spec correctness; track for a follow-up.
5. Establish a content-audit checklist for the kitchen-sink fixture before each baseline regen (employer name, internal product names, anything that would breach the §2 obfuscation rule must not be captured as image data in a baseline).
6. Cross-PR baseline contention: when two PRs touching CSS both regenerate baselines, the second PR's baseline overwrites the first on rebase. Solution likely involves a per-PR baseline lock or a serialized regen workflow — deferred to operational follow-up after Wave 4 lands.
7. Should we add a `workflow_dispatch` input to the visual job for "regenerate baselines and open a PR" beyond the existing `update_snapshots` flag? Nice-to-have, not blocking.

---

## 9. Resolutions Applied in Rev 2

Audit trail of every fix from the adversarial review applied to this revision. One line per fix.

### Critical (C1-C6)
- **C1** — sessionStorage hero-cascade seed moved to `addInitScript` (pre-goto phase) so it fires BEFORE `Index.tsx:14-19`'s `useState` initializer. Two-phase contract introduced (`prepareContext` pre-goto + `stabilizeForLayout` post-goto). All §3 prose, §5 verdicts, and §6 wave steps updated to call BOTH phases.
- **C2** — `animations: "disabled"` keyframe-leak claim qualified with Playwright version (`^1.58.2`); Wave 2 step 2 added as empirical verification gate against `.affordance-pulse`. §0 root-cause #2 rewritten to flag the claim as unverified-on-1.58.2 pending the Wave 2 result.
- **C3** — Single rAF replaced with double-rAF (`Promise<void>` typed) in `settleStyles`; explanatory note about Chromium's rAF → style → layout → paint → composite pipeline added.
- **C4** — Animation-kill stylesheet moved from `addStyleTag` (post-goto) to `addInitScript` with `head.prepend` for first-source-order placement; `animation: none` shorthand replaces `animation-duration: 0s`; `scroll-behavior: auto` added; framer-motion `layout` caveat documented.
- **C5** — §1.1 "Coverage Trade-Offs (Explicit)" added with the lost-coverage table (428px viewport, /blog tag-wrapping visual, hero settled state, reading-mode visual, Mermaid theme variants) and the explicit accept-with-mitigation decision plus a 6-month re-evaluation trigger.
- **C6** — Wave 1 rewritten: dropped the OR branch, picked `testIgnore`; fixed the `e2e-smoke`/`e2e-funct` references that didn't exist until Wave 3; added the stopgap CI-generated baseline so `main` keeps visual coverage during Waves 2-3; replaced the `process.env.VISUAL` ternary footgun with a separate `playwright.visual.config.ts`; hoisted `npm run build` to a CI step; added `--strictPort`; stubbed `update-github-stats.ts` via `SKIP_GITHUB_FETCH=1`.

### High (H1-H9)
- **H1** — `stabilizeForLayout` decomposed into composable primitives (`waitForFonts`, `settleStyles`, `waitForMermaid`, `freezeAnimationsViaInitScript`, `skipHeroCascadeViaInitScript`) plus thin façades (`prepareContext`, `stabilizeForLayout`). `hero-cascade.spec.ts` documented as the one caller of `prepareContext(page, { skipHeroCascade: false })`.
- **H2** — §2.0 tier placement rubric added (signal / allowed / forbidden / wall-clock budget per tier); §2.3 enforcement added (per-tier ESLint configs, workspace `no-restricted-syntax`, `npm run lint:e2e` in CI smoke job, wall-clock fail).
- **H3** — Pushdown table updated: only the `.theme-reading` class-application check moves to Vitest (jsdom-safe); CSS-variable color and font-family computed-style assertions at `reading-mode.spec.ts:21-107` STAY in Playwright. Pushdown rule of thumb added.
- **H4** — Runtime guard in `e2e/visual/kitchen-sink.spec.ts` added (hard-fail on host-machine baseline regen, with `ALLOW_HOST_SNAPSHOT_UPDATE` escape hatch); `regen-visual-baselines.yml` workflow described; Dependabot path documented; CODEOWNERS path-protection note added.
- **H5** — `e2e-visual` job `if:` condition specified (`refs/heads/main` || `workflow_dispatch`) with `continue-on-error: true`; `actions/upload-artifact@v4` required in EVERY job; `workflow_dispatch.inputs.update_snapshots` boolean wired to `--update-snapshots=changed`.
- **H6** — `package.json` script set expanded to `test:e2e`, `test:e2e:smoke`, `test:e2e:functional`, `test:e2e:visual`, `test:e2e:update-baselines`. Discoverability note added.
- **H7** — Wave estimates doubled; per-wave hardening buffers (~2h each) added; per-wave Dependencies subsections added; reorder applied (1 → 2 → 3 → 5 → 4); Wave 4 baseline-review prerequisite added.
- **H8** — Helper signature gains `mermaid?`, `reducedMotion?`, `readyLocator?` opts; "Helper as verified contract" subsection added.
- **H9** — `waitForMermaid` rewritten with placeholder-count parity + non-zero bbox check + 15s timeout. `dmermaid-` selector verification moved to §8 Open Question 3.

### Medium (M1-M16)
- **M1** — "+ grep tags" struck from §2; §2.1 "Tag taxonomy" notes the deferral with revisit triggers (chose strike over closed-enum for simplicity).
- **M2** — §2.2 "Workflow file shape" added: shared `setup` job with `actions/cache@v4` for `node_modules/` + Playwright browser cache, workflow-level `concurrency: { group, cancel-in-progress }`, hoisted `npm run build` for visual.
- **M3** — §4 reworded to "1 PNG after the §1 cleanup (a single kitchen-sink baseline). Designed to scale to ≤3 if visual tier expands."
- **M4** — CI job renamed `e2e-funct` → `e2e-functional` for naming consistency with the Playwright project name.
- **M5** — Duplicate `webServer.command` line dropped from Wave 4 step 4; Wave 3 owns the config landing, Wave 4 only enables the job.
- **M6** — §1 `/blog` row reworded: "fold the no-overflow check from `verify-fixes.spec.ts:6-15` into `responsive.spec.ts` (see §5)."
- **M7** — §3 step 2 prose reworded: framer-motion WAAPI path explicitly attributed to `toHaveScreenshot({ animations: 'disabled' })`, not to the CSS injection.
- **M8** — Wave 1 step 2 added: `git rm e2e/visual-mobile.spec.ts-snapshots/*.png` in the same PR as the quarantine. §4 prose updated.
- **M9** — §3 helper composition guidance and `/blog/:slug` paragraph added: tests on dynamic markdown routes MUST pass `readyLocator: page.locator('.markdown-body')`.
- **M10** — §4 "Escalate to Git LFS when (visual snapshots ≥ 10) OR (cumulative PNG bytes ≥ 10MB) OR (regen frequency ≥ monthly)" added; §7 cross-references the same triggers for Percy/Chromatic.
- **M11** — §2 acknowledges that `workers: 1` is enforced via the separate `playwright.visual.config.ts` (top-level), not per-project on the main config.
- **M12** — §2.4 "Helper sharing rules" added: `e2e/fixtures/` shared, `e2e/<tier>/_helpers/` tier-internal (ESLint-enforced), repo-root `test-fixtures/` for cross-layer.
- **M13** — §5 "Tautology assertions deleted (file:line)" subsection added with `mobile-diagnostic.spec.ts:79`, `:99`, `verify-fixes.spec.ts:9`, `:24`. ESLint rule per §2.3 prevents reintroduction.
- **M14** — §3.5 "Locator strategy" added: `getByRole` first, `getByTestId` (kebab-case `feature-element-purpose`) second, class/text last. Three concrete refactor examples named.
- **M15** — §6.6 "Final ARCHITECTURE.md §9 end-state" added: 200-300 word outline covering the three tiers, placement rubric, Docker baseline workflow, pointer back to this spec.
- **M16** — Smoke row of §2.0 placement rubric explicitly says "asserts a route returns 200 AND its primary content selector becomes visible within 5s" — the semantic boundary §2.0 needed.

### Low (L1-L4)
- **L1** — `waitForFonts` snippet: `await page.evaluate(async () => { await document.fonts.ready; });` (discards FontFaceSet).
- **L2** — §3 `'load'`-vs-`'networkidle'` prose tightened: "Drop `waitUntil: 'networkidle'` argument from `page.goto(...)` calls; `goto` defaults to `'load'`. No additional `waitForLoadState` call is needed."
- **L3** — AI-slop phrases removed from §2 and §7 prose ("the right primitive" → "Projects let `playwright.config.ts` configure per-tier `use` overrides"; "exactly what Playwright is for" → "Playwright's design center"; "the right cost/value trade-off" → "fit the cost/complexity profile until..."; "strong tests" → "focused tests"; "tight, structural, well-targeted" → "tight, structural, focused").
- **L4** — `playwright.visual.config.ts` explicitly sets `reuseExistingServer: false` per §2 (handled by Fix C6's split, verified here).

### Deferred (D1-D7)
- **D1** — Docker digest pin → §8 Open Question 4 (operational hygiene, follow-up).
- **D2** — Visual baseline content-audit (employer-name leak risk under the §2 obfuscation rule) → §8 Open Question 5.
- **D3** — Vercel preview-deploy visual checks → §7 Out of Scope (architecturally orthogonal).
- **D4** — `prefers-reduced-motion` baseline → accepted loss in §1.1 (re-add when visual tier expands).
- **D5** — Light-mode reading-theme baseline → accepted loss in §1.1.
- **D6** — Polish character / non-ASCII slug rendering visual coverage → §7 Out of Scope (Vitest covers the unit-level concern).
- **D7** — Cross-PR baseline contention workflow → §8 Open Question 6 (operational follow-up after Wave 4).

### Conservative-choice notes (per brief §6 of Procedural Requirements)

- M1 chose "strike `+ grep tags`" over "define a closed enum" — fewer moving parts, no taxonomy debt.
- H4 chose `ALLOW_HOST_SNAPSHOT_UPDATE` env var as the host-regen escape hatch (visible noise) over a config flag (silent override).
- H7 wave reorder (1→2→3→5→4) chosen over keeping 1→2→3→4→5 because shrinking functional first reduces the surface the visual rebuild lands into.

---

*Spec author: qa-strategist. Rev 1 reviewed by 5-agent adversarial team. Rev 2 applied by curator agent.*
