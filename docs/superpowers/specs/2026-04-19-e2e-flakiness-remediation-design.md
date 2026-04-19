# E2E Flakiness Remediation — Design Spec

**Date:** 2026-04-19
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
| 2 | `animations: "disabled"` only freezes Web Animations API; CSS keyframes still run | `visual-mobile.spec.ts:48`. CSS-only animations like `.hero-stamp-entrance` (`index.css:762-804`), `.hero-glitch-entrance` (`index.css:708-740`), and `.affordance-pulse` (`index.css:935-951`) are unaffected. |
| 3 | Snapshot path template defaults to `*-chromium-linux.png` per platform     | Baselines under `e2e/visual-mobile.spec.ts-snapshots/` carry the `-linux` suffix. WSL2 Linux ≠ Ubuntu CI Linux for sub-pixel rasterization (different libfreetype/fontconfig versions). |

Cross-cutting amplifier: `webServer.command: "npm run dev"` (`playwright.config.ts:22`) — visual tests are running against the **dev bundle**, not a production preview build. Vite dev mode has different module resolution and does not pre-warm fonts.

---

## 1. Test Pyramid Assessment

Before any reorganization, classify what each "visual" route is actually catching. Visual regression is the most expensive and most brittle layer; reserve it for cases where the lower layers cannot.

| Route                        | What `visual-mobile.spec.ts` catches today                                | Lowest-cost replacement                                                                                                                | Verdict                       |
|------------------------------|---------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|-------------------------------|
| `/` (home)                   | Hero cascade settled state + orb positions + scanline + CTAs              | Functional: `hero-cascade.spec.ts` already verifies cascade order. **Add** structural assertions for orb count + scroll-hint position. Drop the screenshot. | Replace with DOM/structural   |
| `/projects`                  | Card grid layout, badge wrapping, GitHub/live link icons                  | Functional: `index-layout.spec.ts:69-98` already counts cards and link presence. **Add** assertion that no card overflows viewport (`boundingBox().right <= viewport.width`). | Replace with DOM/structural   |
| `/skills`                    | Skill bar widths, learning-tab amber color, progress meter alignment      | Functional: assert each `[data-skill-bar]` has `width` matching `data-progress` percentage; assert tab active class swaps `text-primary` ↔ `text-learning`. | Replace with DOM/structural   |
| `/blog` (index)              | Tag wrapping at 375px (the actual reason `verify-fixes.spec.ts` exists)   | Functional: re-use `verify-fixes.spec.ts:6-15` no-overflow check. Drop screenshot. | Replace with DOM/structural   |
| `/blog/style-test`           | Mermaid render + code-block scroll + table overflow + reading-mode swap   | Mostly already covered by `blog-rendering.spec.ts`, `reading-mode.spec.ts`. **Keep one visual snapshot** of `style-test` first viewport for the kitchen-sink rendering contract — typography hierarchy, code-block decoration, mermaid theming all converge here and structural assertions can't catch a font swap regression. | **Keep visual** (one snapshot, not three) |
| `/how-i-do-it` (index)       | 5-card grid, identical visual to `/projects` shape                         | Functional: `session-2026-04-12.spec.ts:12-19` already asserts 5 cards. Drop screenshot. | Replace with DOM/structural   |
| `/how-i-do-it/test-plan`     | Methodology page render — same content pipeline as blog post              | Same as `/blog/style-test` — covered by content-rendering tests. No second visual baseline needed (`style-test` is the canonical kitchen sink). | Drop visual                   |

**Rationale for "visual is the exception":** every visual snapshot adds ~2-5s wall-clock per viewport, requires a Linux baseline regen on every font/CSS change, and hides the actual defect behind a pixel diff. Structural assertions fail with `expected width ≥ 320 but got 425` — directly actionable. The single visual we keep on `/blog/style-test` is justified because the content pipeline (Markdown → MarkdownRenderer → Prism → Mermaid → reading-mode CSS) has too many integration points to assert structurally without assertion sprawl.

### Component-level pushdown (Vitest)

Several DOM assertions currently performed in Playwright would run faster and more deterministically as Vitest unit tests with React Testing Library:

| Currently in Playwright                                                | Move to Vitest (`src/**/*.test.tsx`)                                  | File reference                                                       |
|-----------------------------------------------------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------|
| Inline-code `bg-secondary` class (`blog-rendering.spec.ts:115-118`)    | `MarkdownRenderer.test.tsx` — render fixture, assert class            | `src/components/markdown/MarkdownRenderer.tsx`                       |
| Frontmatter strip (`session-2026-04-12.spec.ts:48-67`)                 | `frontmatter.test.ts` (likely already exists)                         | `src/lib/frontmatter.ts` — per `ARCHITECTURE.md §12` frontmatter parser |
| Polish slugify behavior (referenced in CLAUDE.md §Polish chars)        | `MarkdownRenderer.test.tsx`                                           | `customSlugify` in `MarkdownRenderer.tsx`                            |
| Reading-mode `theme-reading` class application (`reading-mode.spec.ts:9-17`) | `App.test.tsx` — render at `/blog/x` route, assert wrapper class | `App.tsx:AppContent` regex from `ARCHITECTURE.md §3`                 |

These are pure render-output checks; they don't need a real browser, real font loading, or a real navigation.

---

## 2. Suite Organization

### Three-tier model (Playwright projects + grep tags)

Wire the tiers via Playwright **projects** (each with its own `testMatch` + `grep`) plus a `@tag` convention in test titles. Projects are the right primitive because they let `playwright.config.ts` configure per-tier `use` overrides (e.g., visual tier needs `webServer.command: "npm run preview"`, smoke tier doesn't).

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
  {
    name: "visual",
    testDir: "./e2e/visual",
    use: {
      ...devices["Desktop Chrome"],
      // Pin snapshot path template — strip the OS suffix so baselines are portable
      // across WSL2-local and Ubuntu CI when generated in the same Docker image.
      // (See §4 Baseline strategy.)
    },
    snapshotPathTemplate: "{testDir}/__snapshots__/{testFileName}/{arg}{ext}",
  },
],
webServer: {
  // Visual tier needs prod build (no dev HMR, no font-loading variance from Vite dev)
  command: process.env.VISUAL ? "npm run build && npm run preview -- --port 8080" : "npm run dev",
  url: "http://localhost:8080",
  reuseExistingServer: !process.env.CI,
},
```

The current single project at `playwright.config.ts:15-20` becomes three. `workers` stays `1` in CI for the visual project (deterministic font loading), but smoke + functional can stay parallel — they're DOM-level and tolerant.

### CI workflow split

Split `.github/workflows/e2e.yml` into three jobs, all in the same workflow file:

| Job          | Trigger                                                  | Command                                              | Required for merge |
|--------------|----------------------------------------------------------|------------------------------------------------------|--------------------|
| `e2e-smoke`  | Every push, every PR                                     | `npx playwright test --project=smoke`                | Yes                |
| `e2e-funct`  | Every push, every PR                                     | `npx playwright test --project=functional`           | Yes                |
| `e2e-visual` | Push to `main` only, plus `workflow_dispatch`            | `VISUAL=1 npx playwright test --project=visual` inside the Docker image from §4 | No (informational) |

Visual failures on `main` notify but don't block deploys — Vercel auto-deploy runs from `main` regardless (per `ARCHITECTURE.md §8`). The visual suite's job is to catch a regression, not to gate the path that already shipped.

---

## 3. Determinism Patterns

A canonical helper that every layout-sensitive test MUST use. Place at `e2e/fixtures/visual-determinism.ts`:

```ts
import type { Page } from "@playwright/test";

/**
 * Stabilize the page for layout/visual assertion.
 * Call AFTER goto + AFTER any waitForLoadState, BEFORE any boundingBox /
 * toHaveScreenshot / position-based assertion.
 */
export async function stabilizeForLayout(page: Page, opts?: { mermaid?: boolean }) {
  // 1. Wait for fonts. document.fonts.ready resolves after all currently
  //    pending @font-face downloads complete + their faces become "loaded".
  //    Replaces every waitForTimeout(1500) in the suite.
  await page.evaluate(() => document.fonts.ready);

  // 2. Disable framer-motion and CSS keyframe animations at the source.
  //    animations: "disabled" on toHaveScreenshot only freezes WAAPI; this
  //    catches CSS keyframes (hero-stamp, hero-glitch, affordance-pulse).
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });

  // 3. Force hero cascade to its settled state without playing the 6s timeline.
  //    Index.tsx writes "1" to sessionStorage["hero-cascade-played"] at phase 3
  //    (ARCHITECTURE.md §7). Pre-set it to skip animations entirely.
  await page.evaluate(() => sessionStorage.setItem("hero-cascade-played", "1"));

  // 4. Mermaid diagrams render via an async observer. Wait for them
  //    explicitly when present (the pattern in visual-mobile.spec.ts:33-37).
  if (opts?.mermaid) {
    await page.waitForFunction(
      () => document.querySelectorAll("[id^='mermaid-'] svg, [id^='dmermaid-']").length > 0,
      { timeout: 15000 }
    );
  }

  // 5. One rAF tick to let style recalculation settle.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));
}
```

### Why each step

| Step                                          | Why it matters                                                                                                                                          |
|-----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `document.fonts.ready`                         | Self-hosted WOFF2 declared `font-display: swap` (`index.css:9`). Swap means the system fallback paints first, then the real font replaces it — vertical metrics differ between Chakra Petch and the fallback sans, shifting every `boundingBox().y` and full-page screenshot. |
| Inject zero-duration animation/transition CSS | `animations: "disabled"` only handles Web Animations API. CSS `@keyframes` (e.g. `hero-stamp` at `index.css:768-804`, 1s overshoot easing) still play.   |
| Pre-set `hero-cascade-played`                  | The cascade has 4 setTimeouts ending at 6000ms (`ARCHITECTURE.md §7` table). Without this, every test on `/` either sleeps 6s or screenshots a partial state. |
| Mermaid wait                                   | `MarkdownRenderer.tsx:useMermaidTheme` re-initializes Mermaid asynchronously on theme observer fire. Diagrams paint after first render tick.            |
| `requestAnimationFrame` tick                   | After style injection, give the browser one frame to apply.                                                                                              |

### `waitForLoadState('load')` vs `'networkidle'`

Use `'load'`. Justification:

- `'networkidle'` (currently used at `responsive.spec.ts:25`, `verify-fixes.spec.ts:7`, `mobile-diagnostic.spec.ts:25`) waits for 500ms of zero in-flight requests. Vercel Analytics + Speed Insights (per `ARCHITECTURE.md §8`) and React Query background refetches keep nudging the network, producing variance.
- Playwright docs explicitly deprecate `'networkidle'` for assertion gating — it's a hint, not a contract.
- `'load'` fires when `document.readyState === 'complete'`. After `'load'` we own the wait condition via `document.fonts.ready` + Mermaid-element-present.

### Hero cascade specifically

`hero-cascade.spec.ts` is the **one place** the cascade should be exercised. Every other test on `/` should call `stabilizeForLayout(page)` first, which pre-skips the cascade. This kills the `waitForTimeout(4000)` / `waitForTimeout(7000)` patterns scattered across `motion-wcag-session.spec.ts` (lines 6, 21, 27, 31, 60, 147, 174, 184, 195, 219).

### Framer Motion handling

The CSS injection in `stabilizeForLayout` step 2 zeros all `animation-duration` and `transition-duration`. Framer Motion compiles to either WAAPI or inline transitions on the element — both routes are covered (WAAPI by `animations: "disabled"` on `toHaveScreenshot`, transitions by the CSS injection). Do **not** mock `framer-motion` at the import level; that would diverge test behavior from real behavior.

---

## 4. Baseline Strategy

### Docker image — pin to CI

Use the official Playwright image matching the version in `package.json` (`@playwright/test: ^1.58.2`):

```
mcr.microsoft.com/playwright:v1.58.2-jammy
```

Jammy = Ubuntu 22.04, which is `runs-on: ubuntu-latest` today. When CI bumps Ubuntu version or we bump Playwright, regenerate baselines once in the new image and commit the diff. This eliminates the WSL2-vs-CI sub-pixel difference (current root cause #3 in §0).

### `package.json` script

Add to `scripts`:

```json
"test:e2e:visual": "VISUAL=1 npx playwright test --project=visual",
"test:e2e:update-baselines": "docker run --rm --ipc=host -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.58.2-jammy bash -c 'npm ci --legacy-peer-deps && VISUAL=1 npx playwright test --project=visual --update-snapshots'"
```

The Docker invocation is the **only** sanctioned way to regenerate baselines. Running `--update-snapshots` on WSL2 directly produces the wrong baselines and hides bugs.

### Who runs it, when

| Trigger                                                  | Who                       | Action                                                                                  |
|----------------------------------------------------------|---------------------------|------------------------------------------------------------------------------------------|
| Font, CSS-vars, layout, or motion-system change          | Author of the change      | `npm run test:e2e:update-baselines`, review pixel diff in PR, commit `__snapshots__/*.png` |
| New visual snapshot added                                | Author                    | Same flow, but the diff will show new files only                                         |
| Playwright version bump in `package.json`                | Bumper                    | Same flow + bump the Docker tag in the script in the same PR                             |
| Random pixel-diff failure on `e2e-visual` job on `main`  | Whoever's on rotation     | Investigate first (don't reflexively re-baseline). If genuinely a non-deterministic regression, file an issue and disable the failing snapshot via `.skip` until fixed. |

### Commit baselines to git? Yes.

The kitchen-sink visual snapshot is small (~300KB at 375×~5000px PNG) and the `visual/` directory will hold 1-3 PNGs total after the §1 cleanup. Git LFS would be over-engineering. Commit the PNGs directly under `e2e/visual/__snapshots__/`. The current 21 baselines under `e2e/visual-mobile.spec.ts-snapshots/` get **deleted** as part of §5.

`.gitignore` keeps `test-results/` and `playwright-report/` ignored — `__snapshots__/` is **tracked**.

---

## 5. Scope Decisions — Spec-by-Spec

| Spec file                              | LOC | Verdict   | Notes                                                                                                                                                                                                                       |
|----------------------------------------|-----|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `blog-rendering.spec.ts`               | 296 | **KEEP** (move to `functional/`) | Pure DOM/structural — strong tests for the content pipeline. Push `inline code bg-secondary` (line 115-118) down to Vitest. Adopt `stabilizeForLayout` in the fixture.                                                          |
| `hero-cascade.spec.ts`                 | 178 | **KEEP** (move to `functional/`) | This is the canonical home for cascade timing assertions. The reduced-motion block (line 130-177) is excellent — keep verbatim.                                                                                                    |
| `index-layout.spec.ts`                 | 99  | **REWRITE** (consolidate into `functional/content-pages.spec.ts`) | "below fold" assertions at line 16-52 use `boundingBox().y > 720` against a hardcoded viewport — this drifts when fonts load. Use viewport-relative `await element.isInViewport()` instead, after `stabilizeForLayout`.   |
| `mobile-diagnostic.spec.ts`            | 155 | **DELETE** | Three-quarters of this file is `console.log` + `expect(true).toBe(true)` (lines 79-99). The screenshot-loop (lines 105-153) writes to `test-results/` with no assertion. Pure debugging artifact from a past session — git history preserves it. The overflow-check loop (lines 19-103) is duplicated by `verify-fixes.spec.ts:6-15` and the no-overflow assertion belongs in `responsive.spec.ts`. |
| `motion-wcag-session.spec.ts`          | 267 | **REWRITE** (split into `functional/wcag-touch-targets.spec.ts` + merge motion checks into `hero-cascade.spec.ts`) | The WCAG touch-target tests (line 30-70) and ambient-effects tests (line 235-251) are excellent and unique. The "Page transitions" + "Copy content" + "Scroll reveal" describes (lines 3-28, 172-233) drift from `waitForTimeout(4000)` patterns; rewrite using `stabilizeForLayout`. The "Glitch hover" check (line 145-158) uses computed-style `::before` opacity — keep, but stabilize first. |
| `reading-mode.spec.ts`                 | 108 | **KEEP** (move to `functional/`) | Tight, structural, well-targeted at the cream-paper palette + Atkinson font swap. The CSS-variable color assertions are the right granularity for a theme regression.                                                                |
| `responsive.spec.ts`                   | 103 | **KEEP** (move to `functional/`) | Breakpoint contract testing — exactly what Playwright is for. Already deterministic (no animations on this surface).                                                                                                                  |
| `session-2026-04-12.spec.ts`           | 223 | **REWRITE** (rename to `functional/content-pages.spec.ts`, drop date in name) | Date-named spec is a code smell — sessions are not a long-lived organizational unit. Keep the methodology-page render checks (line 3-45), the CodeBlock expand-overlay tests (line 70-106), and the Projects-page button test (line 108-129). Drop the "Mobile scroll-reveal" describes (line 186-222) — duplicates `motion-wcag-session.spec.ts` "Scroll reveal" coverage. |
| `verify-fixes.spec.ts`                 | 53  | **DELETE** | Three tests, two of which screenshot to `test-results/` with no assertion (lines 9, 24). The one real assertion (no horizontal overflow at 375/390px) belongs in `responsive.spec.ts` as a parametrized test. Git history preserves the original verification context. |
| `visual-mobile.spec.ts`                | 54  | **REWRITE** (becomes `visual/kitchen-sink.spec.ts`) | Reduce 21 snapshots → 1: only `/blog/style-test` at 390px (median mobile). Use `stabilizeForLayout(page, { mermaid: true })` + the new Docker baseline workflow. Drop `fullPage: true` — capture the first viewport only (catches font/typography regression with deterministic height). |
| `fixtures/blog-page.ts`                | 13  | **KEEP**  | Add `await stabilizeForLayout(page)` after the existing `expect(.markdown-body).toBeVisible()`.                                                                                                                                  |

### Files DELETED (justification consolidated)

- `mobile-diagnostic.spec.ts` — debug-session artifact, no useful assertion not duplicated elsewhere. The console-log overflow harness was useful once; we capture the lesson by committing it to history, not by leaving it green-but-meaningless in CI.
- `verify-fixes.spec.ts` — same pattern, narrower scope. Its one assertion folds into `responsive.spec.ts`.
- `e2e/visual-mobile.spec.ts-snapshots/` (21 PNGs) — superseded by `e2e/visual/__snapshots__/` produced via the Docker workflow.

### Files RENAMED

- `session-2026-04-12.spec.ts` → `functional/content-pages.spec.ts` (drop date prefix from filename — dates belong in commit metadata).

---

## 6. Migration Sequencing

CI must stay green throughout. Order matters because the visual tier is currently red and we want it intentionally bypassed during the migration without bypassing the rest.

### Wave 1 — Triage red CI (1 PR, ~2h)

1. Add `e2e-visual` as a separate workflow job (or temporarily exclude `visual-mobile.spec.ts` via `testIgnore` in `playwright.config.ts`).
2. CI now green on `e2e-smoke` + `e2e-funct` (which is the existing suite minus visual-mobile).
3. No test logic changes yet.

**Exit criteria:** PR builds green; `main` builds green; visual-mobile is documented as quarantined in the PR description.

### Wave 2 — Determinism helper (1 PR, ~3h)

1. Land `e2e/fixtures/visual-determinism.ts` with `stabilizeForLayout`.
2. Wire it into `e2e/fixtures/blog-page.ts`.
3. Replace every `waitForTimeout(>= 1000)` in the existing functional specs with `stabilizeForLayout` + an explicit `expect(...).toBeVisible()` for the thing actually being awaited.
4. Replace every `waitUntil: "networkidle"` with `waitUntil: "load"` + `stabilizeForLayout`.

**Exit criteria:** Functional suite passes 5 consecutive CI runs without retries.

### Wave 3 — Suite reorganization (1 PR, ~2h)

1. Create `e2e/{smoke,functional,visual}/` directories.
2. Move specs per §5 verdicts. Delete `mobile-diagnostic.spec.ts` and `verify-fixes.spec.ts`. Rename `session-2026-04-12.spec.ts`.
3. Refactor `playwright.config.ts` to the projects shape from §2.
4. Split `e2e.yml` into `e2e-smoke` / `e2e-funct` / `e2e-visual` jobs per §2.

**Exit criteria:** `e2e-smoke` runs in <60s on CI. `e2e-funct` runs in <5min. `e2e-visual` job exists but skipped on PRs.

### Wave 4 — New visual tier (1 PR, ~3h)

1. Write `e2e/visual/kitchen-sink.spec.ts` (one screenshot, `/blog/style-test` at 390px).
2. Add Docker-based baseline regen script per §4.
3. Run baseline regen locally in Docker, commit the single PNG.
4. Enable `e2e-visual` job on `main` push only. Configure `webServer.command` to use `npm run preview` when `VISUAL=1`.
5. Delete the 21 stale baselines under `e2e/visual-mobile.spec.ts-snapshots/`.

**Exit criteria:** `e2e-visual` passes on `main`. Documentation updated in `ARCHITECTURE.md §9` ("Visual snapshot baselines" subsection) to reference the new Docker workflow.

### Wave 5 — Component-level pushdown (1 PR, ~2h)

1. Add the Vitest tests enumerated in §1 "Component-level pushdown" table.
2. Remove the corresponding Playwright assertions to keep the suite DRY.

**Exit criteria:** Vitest coverage on `MarkdownRenderer.tsx` + `frontmatter.ts` ≥ what the removed Playwright assertions covered. Functional suite wall-clock drops by 10-15%.

### Throughout

- After each wave, add a 1-line entry to `ARCHITECTURE.md §9` so the testing architecture doc stays current with the implementation.
- Do **not** combine waves into one PR — review surface gets unmanageable and the rollback story dies.

---

## 7. Out of Scope

- Cross-browser visual testing (Firefox, WebKit). Single Chromium project remains. The current single-browser scope (`playwright.config.ts:16-19`) is correct for a personal blog hosted on Vercel where ~85% of traffic is Chromium-derivative.
- Percy/Chromatic/Argos integration. Local PNG baselines under git are the right cost/value trade-off until we have either (a) >10 visual snapshots or (b) need cross-browser visual diffing.
- Accessibility scans (axe-core). Worth a follow-up spec; do not bundle here.
- Performance regression (Lighthouse CI). Vercel Speed Insights already covers field metrics; lab metrics are a separate concern.

---

## 8. Open Questions

1. Should the `e2e-visual` job notify on Slack/email when it fails on `main`, or is GitHub UI sufficient? Default: GitHub UI for now (no notification infra exists).
2. Should we add a `workflow_dispatch` input to the visual job for "regenerate baselines and open a PR"? Nice-to-have, not blocking.
3. Mermaid renders sometimes flake on first parallel run (per `ARCHITECTURE.md §9` "Test parallelism + dynamic markdown"). The new `stabilizeForLayout(page, { mermaid: true })` should fix this — confirm during Wave 2 and remove the caveat from `ARCHITECTURE.md §9` if so.

---

*Spec author: qa-strategist. To be reviewed before Wave 1 lands.*
