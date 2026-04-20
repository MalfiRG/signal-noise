# E2E Flakiness Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Rev 2 — post-adversarial-review
**Reviewers:** 6-agent adversarial team (adversarial-tl, backend-architect, autotest-reviewer-quality, reviewer-consistency, socratic-challenger, traceability-auditor)
**Findings:** ~116 across 6 reviewers (15 critical, 26 high, 27 medium, 18 low, plus 30 questions/coverage gaps)
**Applied:** All 7 critical fixes (C1-C7), all 11 high fixes (H1-H11), 22 medium fixes (M1-M22), 5 low fixes (L1-L5)
**Deferred:** 7 items routed to follow-up (D1-D7)

**Goal:** Eliminate ~40+ `waitForTimeout` anti-patterns and the font-loading race causing CI failures by reorganizing the Playwright suite into three tiers (smoke / functional / visual) anchored on a deterministic two-phase helper, with Docker-pinned visual baselines.

**Architecture:** Five sequential PRs. Two-phase determinism contract — `prepareContext(page)` runs `addInitScript` calls BEFORE `page.goto` (animation kill stylesheet, hero-cascade sessionStorage seed); `stabilizeForLayout(page)` runs AFTER `page.goto` (font wait, optional Mermaid wait, double-rAF settle). Two Playwright config files: `playwright.config.ts` (smoke + functional, dev server) and `playwright.visual.config.ts` (visual, preview server, `--strictPort`). Visual baselines regenerated only inside `mcr.microsoft.com/playwright:v1.58.2-jammy` Docker image to eliminate WSL2-vs-CI sub-pixel drift. Tier placement enforced via per-directory ESLint configs.

**Tech Stack:** Playwright 1.58.2, Vitest 3.x with React Testing Library 16, TypeScript 5.8 strict mode pending, GitHub Actions, Docker (`mcr.microsoft.com/playwright:v1.58.2-jammy`), ESLint with `no-restricted-syntax` rules, React 18.3 + Vite 7 + Tailwind 3.

**Spec reference:** `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` (Rev 2, 715 lines, 35 fixes applied / 7 deferred). Sections referenced as `§N.N` throughout.

**Submodule warning:** All paths below are relative to the blog repo at `/mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/`. The blog is a git submodule — use `git -C <abs-path>` for git commands; do NOT `cd` into the submodule. All `git -C .` invocations below assume the executor's CWD is the blog submodule root; if running from elsewhere, replace `git -C .` with `git -C /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix` (Fix M13).

## Branching Strategy (Fix H1)

Each wave is one PR cut from `main`. Strict serial cadence: Wave N+1's branch cannot be cut until Wave N has merged to `main`. To enforce this mechanically, the precondition check below runs as Step 0 of each wave's first task (Task 1.1, Task 2.1, Task 3.1, Task 5.1, Task 4.1):

```bash
# Wave N preflight (run before any commits in Wave N):
if ! git -C . log main --oneline | grep -q "test(e2e) Wave N-1"; then
  echo "ERROR: Wave N-1 must be merged to main before starting Wave N"
  exit 1
fi
git -C . checkout main && git -C . pull --ff-only
git -C . checkout -b feat/e2e-wave-<N>-<purpose>
```

Replace `N`, `N-1`, and `<purpose>` per wave (1-triage, 2-helper, 3-reorg, 5-pushdown, 4-visual). For Wave 1, the precondition check is a no-op (it has no predecessor) but the `git checkout main && pull && checkout -b` sequence still runs.

## CRLF discipline (Fix M15)

Files live on a WSL2 NTFS cross-mount. Configure a one-time `.gitattributes` enforcing LF for source files. Recommended `.gitattributes` line:

```
* text=auto eol=lf
*.png binary
```

Once configured, the inline `head -1 ... | cat -A` checks remain as belt-and-suspenders but are not load-bearing. As a fallback, before every commit verify `head -1 <file> | cat -A` ends with `$` (LF), not `^M$` (CRLF); fix with `sed -i 's/\r$//' <file>` if needed.

## Per-wave ARCHITECTURE.md note (Fix M21)

Per spec §6 "Throughout": each wave SHOULD add a 1-line entry to `ARCHITECTURE.md §9` so the doc stays current. This plan defers all updates to Wave 4 Task 4.5 for review-surface efficiency. Acceptable risk — the spec at `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` remains the canonical source of truth during the migration.

## Prerequisite verification — `/blog/style-test` route (Fix M22)

Before starting Wave 1, confirm `src/pages/content/blog/style-test.md` exists and is registered in `src/features/blog/data.ts`. If absent, file an issue and either create the kitchen-sink fixture (Mermaid + tables + code blocks + headings + Polish chars) before Wave 1 proceeds, OR adjust the stopgap target route in Task 1.3 Step 1 to an existing blog post.

---

## Wave 1 — Triage red CI

**Goal:** Get `main` and PR builds green by quarantining the failing visual-mobile suite, deleting stale baselines, and committing a single CI-generated stopgap snapshot so visual coverage doesn't drop to zero during Waves 2-3.

**Branch:** `feat/e2e-wave-1-triage` (cut from current main once previous PRs are merged).

**Estimated wallclock:** 4h work + 2h hardening buffer.

**Dependencies:** None.

---

### Task 1.1: Add testIgnore to existing playwright config

**Files:**
- Modify: `playwright.config.ts:15-20` (the existing single chromium project)

- [ ] **Step 0: Branching preflight (Fix H1)**

```bash
# Wave 1 has no predecessor; the precondition check is a no-op, but the
# checkout sequence still runs to ensure a clean baseline.
git -C . checkout main && git -C . pull --ff-only
git -C . checkout -b feat/e2e-wave-1-triage
```

- [ ] **Step 1: Read the current config to confirm structure**

Run: `cat playwright.config.ts`

Expected: A `defineConfig` call with a `projects` array containing one entry `{ name: "chromium", use: { ...devices["Desktop Chrome"] } }`. If the structure differs (e.g., projects already split), STOP and reconcile with the spec — the rest of this task assumes the Rev 1 baseline.

- [ ] **Step 2: Add testIgnore to the chromium project**

Edit `playwright.config.ts`. Find:

```ts
projects: [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
],
```

Replace with:

```ts
projects: [
  {
    name: "chromium",
    testIgnore: ["**/visual-mobile.spec.ts"],
    use: { ...devices["Desktop Chrome"] },
  },
],
```

- [ ] **Step 3: Verify locally that visual-mobile is excluded**

Run: `npx playwright test --list 2>&1 | grep -c visual-mobile`

Expected: `0` (no test from `visual-mobile.spec.ts` is listed).

- [ ] **Step 4: Verify the rest of the suite is still discovered**

Run: `npx playwright test --list 2>&1 | grep -E "(blog-rendering|reading-mode|responsive|hero-cascade)" | head -5`

Expected: At least 5 lines naming tests from these specs. If zero, `testIgnore` over-matched — revisit the glob pattern.

- [ ] **Step 5: Commit**

Verify CRLF first:
```bash
head -1 playwright.config.ts | cat -A
```
Expected: line ends with `$`, not `^M$`. If `^M$`, run `sed -i 's/\r$//' playwright.config.ts`.

Then commit:
```bash
git -C . add playwright.config.ts
git -C . commit -m "test(e2e): quarantine visual-mobile.spec.ts via testIgnore

Wave 1 step 1 of e2e-flakiness-remediation. visual-mobile.spec.ts
is failing every CI run with page-height drift caused by a
font-loading race; quarantining via testIgnore lets the rest of the
suite turn green while Waves 2-3 land the determinism helper and the
new tier structure. Replaced in Wave 4 by the kitchen-sink visual
tier."
```

---

### Task 1.2: Delete the 21 stale chromium-linux baselines

**Files:**
- Delete: `e2e/visual-mobile.spec.ts-snapshots/*-chromium-linux.png` (21 files)

- [ ] **Step 1: Confirm exactly 21 chromium-linux PNGs exist**

Run: `ls e2e/visual-mobile.spec.ts-snapshots/*-chromium-linux.png | wc -l`

Expected: `21`. If different, stop and reconcile — Wave 1 of the spec assumes this count.

- [ ] **Step 2: Confirm no chromium-win32 PNGs remain (sanity check from earlier cleanup)**

Run: `ls e2e/visual-mobile.spec.ts-snapshots/*-chromium-win32.png 2>/dev/null | wc -l`

Expected: `0`. If non-zero, the prior cleanup (commit `5d9acb2` per session history) didn't propagate — investigate before deleting linux baselines.

- [ ] **Step 3: Delete the 21 baselines via git rm**

Run:
```bash
git -C . rm e2e/visual-mobile.spec.ts-snapshots/*-chromium-linux.png
```

Expected: 21 `rm 'e2e/visual-mobile.spec.ts-snapshots/...'` lines in stdout.

- [ ] **Step 4: Confirm directory is now empty (or near-empty)**

Run: `ls e2e/visual-mobile.spec.ts-snapshots/ 2>&1 | wc -l`

Expected: `0` or close to it. If unexpected files remain (e.g., `.gitkeep`), leave them — only the 21 PNGs were targeted.

- [ ] **Step 5: Commit**

```bash
git -C . commit -m "test(e2e): delete 21 stale chromium-linux baselines

Wave 1 step 2 of e2e-flakiness-remediation. With visual-mobile
quarantined (Task 1.1), the baselines are dead weight. Wave 4
introduces e2e/visual/__snapshots__/ via the kitchen-sink test;
clearing the old path now eliminates 'no baseline, generating'
log noise during Waves 2-3 once the snapshotPathTemplate changes."
```

---

### Task 1.3: Generate the stopgap CI baseline for /blog/style-test

The stopgap baseline preserves visual regression coverage on `main` between Wave 1 and Wave 4. It's intentionally generated against the Ubuntu CI runner (not Docker) — Wave 4 replaces it with a Docker-generated equivalent. Accept the WSL2/CI sub-pixel delta during the migration window.

**Files:**
- Create: `e2e/_stopgap/stopgap-visual.spec.ts` (temporary spec, removed in Wave 3)
- Create (after CI generates it): `e2e/_stopgap/stopgap-visual.spec.ts-snapshots/style-test-390w-chromium-linux.png`

- [ ] **Step 0: Verify the existing workflow uploads BOTH report and test-results (Fix H2.1)**

Read `.github/workflows/e2e.yml`. Confirm it uploads BOTH `playwright-report/` AND `test-results/`. If only `playwright-report/` is uploaded, add a second `actions/upload-artifact@v4` step in the same commit (Task 1.1) named `playwright-test-results` uploading `test-results/`. The actual.png that Step 5 downloads lives in `test-results/`, not `playwright-report/`.

- [ ] **Step 1: Create the temporary spec (Fix H2.3 — explicit retries:0)**

Create file `e2e/_stopgap/stopgap-visual.spec.ts` with this exact content:

```ts
// TEMPORARY — Wave 1 stopgap visual baseline. Removed in Wave 3 when the
// kitchen-sink test lands at e2e/visual/kitchen-sink.spec.ts.
// Spec: docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md §6 Wave 1.

import { test, expect } from "@playwright/test";

test.describe("Wave 1 stopgap", () => {
  test.describe.configure({ retries: 0 });   // Force first-run failure to surface for baseline gen
  test.use({ viewport: { width: 390, height: 844 } });

  test("/blog/style-test renders deterministically", async ({ page }) => {
    await page.goto("/blog/style-test");
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 15000 });
    // Hold for fonts. Will become document.fonts.ready in Wave 2.
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("style-test-390w.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
      timeout: 15000,
    });
  });
});
```

- [ ] **Step 2: Confirm playwright.config.ts does NOT exclude this spec**

Run: `npx playwright test --list 2>&1 | grep stopgap-visual`

Expected: One line listing the test. If excluded, the `testIgnore` from Task 1.1 was over-broad — revisit.

- [ ] **Step 3: Commit the spec WITHOUT a baseline (CI will fail once, generating the actual)**

```bash
git -C . add e2e/_stopgap/stopgap-visual.spec.ts
git -C . commit -m "test(e2e): add Wave 1 stopgap visual baseline spec

Wave 1 step 3a of e2e-flakiness-remediation. Generates a single
visual baseline of /blog/style-test at 390px against the Ubuntu CI
runner. Preserves visual regression coverage during Waves 2-3.
Removed in Wave 3 when the canonical kitchen-sink test lands at
e2e/visual/kitchen-sink.spec.ts."
```

- [ ] **Step 4: Push branch and let CI generate the actual baseline (Fix H2.2)**

```bash
git -C . push -u origin feat/e2e-wave-1-triage
```

Open a draft PR. Verify the existing workflow does NOT include `--update-snapshots` (any value); if it does, this stopgap pipeline cannot work — pass `--update-snapshots=none` to override. CI will run, the stopgap test will FAIL with `Error: A snapshot doesn't exist at .../style-test-390w-chromium-linux.png, writing actual.` That's expected — the actual PNG is now uploaded as a workflow artifact under `test-results/` (see Step 0 — confirm that artifact upload is wired).

- [ ] **Step 5: Download the generated PNG from the CI artifact (Fix H2.4 + H2.5)**

```bash
gh run list --branch feat/e2e-wave-1-triage --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run download {} --name playwright-test-results --dir /tmp/wave1-baseline-artifact
```

Expected: A directory at `/tmp/wave1-baseline-artifact/` containing the actual.png. Locate it and loud-fail if find returns nothing:

```bash
ACTUAL_PNG=$(find /tmp/wave1-baseline-artifact -name "*style-test*actual*.png" | head -1)
if [ -z "$ACTUAL_PNG" ]; then
  echo "ERROR: actual.png not found in artifact. Stopgap pipeline broken — see Recovery below."
  exit 1
fi
echo "Found: $ACTUAL_PNG"
```

- [ ] **Step 6: Copy the PNG into the snapshot directory and commit**

```bash
mkdir -p e2e/_stopgap/stopgap-visual.spec.ts-snapshots
# Replace the path below with the actual one found in Step 5:
cp /tmp/wave1-baseline-artifact/<actual-path-to-png> e2e/_stopgap/stopgap-visual.spec.ts-snapshots/style-test-390w-chromium-linux.png
git -C . add e2e/_stopgap/stopgap-visual.spec.ts-snapshots/
git -C . commit -m "test(e2e): commit Wave 1 stopgap baseline (CI-generated)

Wave 1 step 3b. The PNG was generated by GitHub Actions on
ubuntu-latest, not in Docker — accept the WSL2 sub-pixel delta
during the migration window. Wave 4 replaces this with a
Docker-generated equivalent at e2e/visual/__snapshots__/."
```

- [ ] **Step 7: Push and verify CI now passes the stopgap test**

```bash
git -C . push
```

Wait for CI. Expected: stopgap-visual passes; full Playwright suite green.

If the stopgap test still fails on the second run with a small pixel diff, raise `maxDiffPixelRatio` to `0.10` in the spec — accept the WSL2/CI delta is wider than 5% and document the choice in the PR description.

#### Recovery (Fix H2)

If the stopgap baseline cannot be generated after 2 retry attempts, ABANDON the stopgap. Revert the Step 3 commit (`git -C . revert <sha>`). Update PR description to: "Visual coverage is dropped to zero during Waves 2-3 due to baseline-generation failure. Wave 4 Docker baseline restores coverage." Accept the risk.

---

### Task 1.4: Open Wave 1 PR with documented quarantine

- [ ] **Step 1: Open the PR**

```bash
gh pr create --base main --head feat/e2e-wave-1-triage \
  --title "test(e2e) Wave 1: triage red CI + stopgap baseline" \
  --body "$(cat <<'EOF'
## Summary

Wave 1 of the E2E flakiness remediation (spec: `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md`).

- Quarantines `visual-mobile.spec.ts` via `testIgnore` in `playwright.config.ts`
- Deletes 21 stale `*-chromium-linux.png` baselines under `e2e/visual-mobile.spec.ts-snapshots/`
- Adds a single CI-generated stopgap baseline at `e2e/_stopgap/stopgap-visual.spec.ts-snapshots/style-test-390w-chromium-linux.png` to preserve visual regression coverage during Waves 2-3

## Why

The visual-mobile suite is failing every CI run with page-height drift (font-loading race + WSL2/CI sub-pixel divergence). Quarantining it lets the rest of the suite turn green while Waves 2-4 land the determinism helper, the three-tier reorg, and the new visual tier with Docker baselines. The stopgap baseline keeps `main` from running zero visual coverage during the multi-week migration window.

## Test plan (check each box AFTER verification on this PR's CI run)

- [ ] CI is green on this PR (smoke + functional + stopgap visual)
- [ ] CI is green on `main` after merge
- [ ] `visual-mobile.spec.ts` is documented as quarantined; tracking issue links to Wave 4

## Spec reference

See `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` §6 Wave 1.
EOF
)"
```

- [ ] **Step 2: Verify PR body and merge once approved**

After approval, merge with squash if the team convention is squash; otherwise merge commit. Do not rebase — the multi-commit history is intentional (each task is a discrete commit).

---

## Wave 2 — Determinism helper

**Goal:** Land the canonical `e2e/fixtures/visual-determinism.ts` module (decomposed primitives + two-phase facades), wire it into the existing `blog-page` fixture, replace every `waitForTimeout(>= 1000)` and every `networkidle` in functional specs, and verify the Playwright `animations: "disabled"` keyframe-leak claim empirically.

**Branch:** `feat/e2e-wave-2-helper` (cut from main after Wave 1 merges).

**Estimated wallclock:** 6h work + 2h hardening buffer.

**Dependencies:** Wave 1 merged (otherwise CI is red and helper PRs cannot land).

---

### Task 2.1: Create the visual-determinism helper module

**Files:**
- Create: `e2e/fixtures/visual-determinism.ts`
- Test: deferred to Task 2.4 — the helper is exercised by every spec that uses it; no standalone unit test.

- [ ] **Step 0: Branching preflight (Fix H1)**

```bash
if ! git -C . log main --oneline | grep -q "test(e2e) Wave 1"; then
  echo "ERROR: Wave 1 must be merged to main before starting Wave 2"
  exit 1
fi
git -C . checkout main && git -C . pull --ff-only
git -C . checkout -b feat/e2e-wave-2-helper
```

- [ ] **Step 1: Create the module with the exact content from spec §3**

Create `e2e/fixtures/visual-determinism.ts`:

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
    document.head.prepend(style);
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
 *
 * Fix L1: watchdog so a stalled FontFaceSet cannot hang the run indefinitely.
 */
export async function waitForFonts(page: Page, timeoutMs = 10_000) {
  await page.evaluate(async (timeout) => {
    await Promise.race([
      document.fonts.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`document.fonts.ready stalled after ${timeout}ms`)), timeout)
      ),
    ]);
  }, timeoutMs);
}

/**
 * Mermaid diagrams render via an async observer. Wait for every
 * placeholder to have a corresponding non-zero-bbox <svg>. The previous
 * `length > 0` check returned true after the FIRST diagram rendered;
 * style-test has multiple, so screenshots captured a partial render.
 *
 * Fix M6: getBBox() throws on hidden/detached SVGs — wrap in try/catch
 * and treat as not-yet-measurable so the polling loop continues instead
 * of failing.
 */
export async function waitForMermaid(page: Page) {
  await page.waitForFunction(
    () => {
      const placeholders = document.querySelectorAll(
        "pre.mermaid, [id^='mermaid-']"
      );
      const svgs = document.querySelectorAll("[id^='mermaid-'] svg");
      if (svgs.length === 0 || svgs.length < placeholders.length) return false;
      return Array.from(svgs).every((s) => {
        try {
          return (s as SVGGraphicsElement).getBBox().width > 0;
        } catch {
          return false; // not yet measurable — keep polling
        }
      });
    },
    { timeout: 15000 }
  );
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
    () =>
      new Promise<void>((resolve) =>
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
  opts?: { skipHeroCascade?: boolean; freezeKeyframes?: boolean }
) {
  // Fix H3: freezeKeyframes is opt-out so Wave 2 verification can decide
  // whether the freezeAnimationsViaInitScript step is load-bearing for
  // CSS keyframe coverage on Playwright 1.58.2. Default stays true for safety.
  if (opts?.freezeKeyframes !== false) {
    await freezeAnimationsViaInitScript(page);
  }
  if (opts?.skipHeroCascade !== false) {
    await skipHeroCascadeViaInitScript(page);
  }
}

export async function stabilizeForLayout(
  page: Page,
  opts?: {
    mermaid?: boolean;
    reducedMotion?: boolean;
    readyLocator?: Locator;
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: No errors. If `Property 'fonts' does not exist on type 'Document'` or similar, the project's tsconfig may exclude DOM lib — verify `"lib": ["DOM", "DOM.Iterable", "ESNext"]` is present in `tsconfig.json` or `tsconfig.app.json`.

- [ ] **Step 3: CRLF check**

```bash
head -1 e2e/fixtures/visual-determinism.ts | cat -A
```

Expected: ends with `$`. If `^M$`, fix with `sed -i 's/\r$//' e2e/fixtures/visual-determinism.ts`.

- [ ] **Step 4: Commit**

```bash
git -C . add e2e/fixtures/visual-determinism.ts
git -C . commit -m "test(e2e): add canonical determinism helper module

Wave 2 step 1 of e2e-flakiness-remediation. Decomposed primitives
(freezeAnimationsViaInitScript, skipHeroCascadeViaInitScript,
waitForFonts, waitForMermaid, settleStyles) + thin facades
(prepareContext, stabilizeForLayout) per spec §3. Two-phase
contract: pre-goto via addInitScript, post-goto via page.evaluate.

The pre-goto split is load-bearing: Index.tsx:14-19's useState
initializer reads sessionStorage at mount, BEFORE any post-goto
script can run. Seeding via addInitScript fires BEFORE every page
script, so the cascade-skip flag is read correctly on every nav."
```

---

### Task 2.2: Empirically verify the Playwright animations:"disabled" claim (Fix C2 gate)

The spec asserts `toHaveScreenshot({ animations: "disabled" })` only freezes WAAPI, not CSS keyframes. This is unverified on Playwright 1.58.2. If false, the `freezeAnimationsViaInitScript` step in `prepareContext` is solving a non-problem — the function stays for `scroll-behavior` and CSS transition coverage but the call from `prepareContext` becomes optional.

**Files:**
- Create: `e2e/_verification/keyframe-leak-repro.spec.ts` (temporary spec, removed in Wave 3)
- Modify: `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` §0 root-cause #2 (record the result)
- Wave 1 amendment: extend Wave 1 Task 1.1 Step 2's `testIgnore` glob to also exclude `e2e/_verification/**` (so the verification spec doesn't run under Wave 1's smoke-style config). This is committed as a separate commit at the START of Wave 2 BEFORE the verification spec lands. (Fix C6 + Fix H5)

- [ ] **Step 1: Write the verification spec — byte-comparison strategy (Fix C6)**

Create `e2e/_verification/keyframe-leak-repro.spec.ts`. The Rev 1 design (two `toHaveScreenshot` calls with the same name) was structurally broken — both calls compare against the same on-disk baseline, so the second call cannot detect a difference from the first. Replace with a byte-comparison that doesn't rely on `toHaveScreenshot`'s baseline-comparison machinery:

```ts
// TEMPORARY — Wave 2 verification of Playwright animations:"disabled" claim.
// Spec §0 root-cause #2: does toHaveScreenshot({ animations: "disabled" })
// pause CSS @keyframes on Playwright 1.58.2, or only WAAPI?
// Removed in Wave 3 (verification result recorded inline in the spec).
import { test, expect } from "@playwright/test";

test.describe("Keyframe pause verification", () => {
  // Disable retry — a retry could mask the verification signal by re-running
  // the test against the same buffers and falsely producing PASS on the retry.
  test.describe.configure({ retries: 0 });

  test("affordance-pulse keyframe state with animations:disabled", async ({ page }) => {
    await page.goto("/skills");
    const pulsing = page.locator(".affordance-pulse").first();
    await expect(pulsing).toBeVisible({ timeout: 10_000 });

    // Capture two screenshots 500ms apart, both with animations:"disabled".
    // If keyframes are paused, the buffers will be byte-identical.
    // If keyframes leak, they will differ.
    const buf1 = await pulsing.screenshot({ animations: "disabled" });
    await page.waitForTimeout(500);
    const buf2 = await pulsing.screenshot({ animations: "disabled" });

    // Byte-equal comparison — no baseline file involved, no WSL2-vs-CI drift,
    // no flake from sub-pixel rendering differences (both buffers come from
    // the same browser instance milliseconds apart).
    if (buf1.equals(buf2)) {
      console.log("VERIFICATION RESULT: animations:disabled DOES pause CSS keyframes on Playwright 1.58.2");
    } else {
      console.log("VERIFICATION RESULT: animations:disabled does NOT pause CSS keyframes on Playwright 1.58.2");
    }
    expect(buf1.equals(buf2)).toBe(true);  // PASS = paused; FAIL = leaks
  });
});
```

- [ ] **Step 2: Run the spec once — single-execution emits the verification line**

Run:
```bash
npx playwright test e2e/_verification/keyframe-leak-repro.spec.ts --reporter=list 2>&1 | tee /tmp/keyframe-verification.log
```

(No `--update-snapshots` — this approach has no baseline to update.)

Two possible outcomes:

- **PASS (buffers byte-equal):** Playwright 1.58.2 DOES pause CSS keyframes via `animations: "disabled"`. The Wave 2 step 1 helper's `freezeAnimationsViaInitScript` overlaps with Playwright behavior — keep the function for `scroll-behavior` and transition coverage, but the call from `prepareContext` becomes redundant for keyframe coverage (and is now opt-out via `freezeKeyframes` per the helper signature in Task 2.1).

- **FAIL (buffers differ):** Playwright 1.58.2 does NOT pause CSS keyframes. The helper's `freezeAnimationsViaInitScript` is load-bearing and must remain in `prepareContext` (default `freezeKeyframes: true` stays).

- [ ] **Step 3: Parse the verification result line**

```bash
grep "VERIFICATION RESULT:" /tmp/keyframe-verification.log
```

Expected: A single line reporting either DOES or does NOT.

- [ ] **Step 4: Record the result inline in the spec**

Edit `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md`. Find §0 root-cause #2 (line 31). At the end of that table cell, append:

If PASS:
```
**Verified 2026-04-19 (Wave 2):** Playwright 1.58.2 DOES pause CSS keyframes
via `toHaveScreenshot({ animations: "disabled" })` (verified empirically against
`.affordance-pulse`). The `freezeAnimationsViaInitScript` step is therefore not
load-bearing for keyframe coverage; it remains for `scroll-behavior` and CSS
transition coverage.
```

If FAIL:
```
**Verified 2026-04-19 (Wave 2):** Playwright 1.58.2 does NOT pause CSS keyframes
via `toHaveScreenshot({ animations: "disabled" })` (verified empirically against
`.affordance-pulse`). The `freezeAnimationsViaInitScript` step is load-bearing
and must remain in `prepareContext`.
```

- [ ] **Step 5: Branch helper on verification result (Fix H3)**

If verification PASS (keyframes ARE paused by `animations: "disabled"`):
  The helper signature already supports the opt-out via `freezeKeyframes` (per Task 2.1). No further code change needed; document in the spec §0 result that the call is redundant for keyframe coverage but remains useful for `scroll-behavior` and CSS transition coverage. Default stays `true` for safety.

If verification FAIL (keyframes NOT paused):
  Leave the helper as-is. The `freezeAnimationsViaInitScript` call inside `prepareContext` is load-bearing.

Re-run TypeScript + a smoke test against `/skills` (which has `affordance-pulse`):
```bash
npx tsc --noEmit -p tsconfig.json
npx playwright test e2e/functional/responsive.spec.ts -g skills 2>&1 | tail -10
```

Expected: PASS in both cases. Commit (separate from Step 7) with message:
  `test(e2e): branch helper on Wave 2 verification (PASS|FAIL outcome)`

- [ ] **Step 6: CRLF check on the spec**

```bash
head -1 docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md | cat -A
```

Expected: ends with `$`. Fix if needed.

- [ ] **Step 7: Commit the verification result + the temp spec**

```bash
git -C . add e2e/_verification/keyframe-leak-repro.spec.ts e2e/_verification/keyframe-leak-repro.spec.ts-snapshots/ docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md
git -C . commit -m "test(e2e): verify Playwright animations:disabled keyframe behavior

Wave 2 step 2 (Fix C2 gate) of e2e-flakiness-remediation. Empirical
verification on Playwright 1.58.2 against .affordance-pulse confirms
[PASS|FAIL based on actual outcome] — see updated spec §0 root-cause #2.

Verification spec is temporary; removed in Wave 3."
```

(Replace `[PASS|FAIL based on actual outcome]` with the actual result from Step 3.)

---

### Task 2.3: Wire helper into the blog-page fixture

**Files:**
- Modify: `e2e/fixtures/blog-page.ts`

- [ ] **Step 1: Read the current fixture**

Run: `cat e2e/fixtures/blog-page.ts`

Expected: A test fixture exporting an extended `test` with a `blogPage` property that does `page.goto("/blog/style-test")` + waits for `.markdown-body`.

- [ ] **Step 2: Add the helper imports + wire both phases**

Edit `e2e/fixtures/blog-page.ts`. Replace the existing fixture body so it calls `prepareContext` BEFORE `goto` and `stabilizeForLayout` AFTER:

```ts
import { test as base, expect } from "@playwright/test";
import { prepareContext, stabilizeForLayout } from "./visual-determinism";

type BlogPageFixtures = {
  blogPage: import("@playwright/test").Page;
};

export const test = base.extend<BlogPageFixtures>({
  blogPage: async ({ page }, use) => {
    await prepareContext(page);
    await page.goto("/blog/style-test");
    await stabilizeForLayout(page, {
      readyLocator: page.locator(".markdown-body"),
    });
    await use(page);
  },
});

export { expect };
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: No errors.

- [ ] **Step 4: Run one spec that uses blogPage to confirm wiring**

Run: `npx playwright test e2e/blog-rendering.spec.ts --reporter=list 2>&1 | tail -20`

Expected: Tests run and pass. If they fail with timeout, the fixture's `readyLocator` may need adjustment — check that `/blog/style-test` actually has `.markdown-body` rendered.

- [ ] **Step 5: Commit**

```bash
git -C . add e2e/fixtures/blog-page.ts
git -C . commit -m "test(e2e): wire two-phase determinism helper into blog-page fixture

Wave 2 step 3 of e2e-flakiness-remediation. blog-page fixture
now calls prepareContext (pre-goto: animation kill + cascade skip
via addInitScript) and stabilizeForLayout (post-goto: fonts +
readyLocator wait). All consumers (~40+ tests across blog-rendering,
reading-mode, responsive) inherit the determinism for free."
```

---

### Task 2.4: Replace `waitForTimeout(>= 1000)` and `networkidle` in functional specs

> **HERO-CASCADE SPECIAL CASE — TOP-OF-SECTION CALLOUT (Fix H11.5):** When applying `prepareContext` to `e2e/hero-cascade.spec.ts` (Subtask 2.4.e), pass `{ skipHeroCascade: false }` so the cascade is preserved for testing. Example: `await prepareContext(page, { skipHeroCascade: false })`. Forgetting this kills the hero cascade and silently invalidates every test in that spec.

This is the bulk of Wave 2. Each replacement is mechanical: find a `waitForTimeout(N >= 1000)` or `waitUntil: "networkidle"`, replace with the appropriate web-first assertion or helper call. Do this spec-by-spec, commit per spec.

**Files (in this order):**
- Modify: `e2e/visual-mobile.spec.ts` (still quarantined but cleaned for Wave 4 reuse) — DEFER to Wave 4
- Modify: `e2e/responsive.spec.ts`
- Modify: `e2e/blog-rendering.spec.ts`
- Modify: `e2e/reading-mode.spec.ts`
- Modify: `e2e/hero-cascade.spec.ts`
- Modify: `e2e/index-layout.spec.ts`
- Modify: `e2e/motion-wcag-session.spec.ts`
- Modify: `e2e/session-2026-04-12.spec.ts`

For each spec, follow the pattern below. The example uses `responsive.spec.ts`; repeat for each file in the list. Per Fix H11, each subtask 2.4.b through 2.4.g is a discrete commit (one per spec) so each unit honors the 2-5 minute / 10-30 minute granularity. The audit-and-final-grep gates are mandatory.

- [ ] **Step 0: Audit phase — establish the truth-set (Fix H11.1)**

```bash
grep -rnE '(waitForTimeout\(\s*[0-9]{4,}|networkidle)' e2e/*.spec.ts | tee /tmp/wave2-audit.txt
echo "Total violations: $(wc -l < /tmp/wave2-audit.txt)"
```

Confirm the count matches expectations from spec §0 (~40+ sites). Save the audit file as the truth-set for the final grep gate below.

#### Subtask 2.4.a: responsive.spec.ts

- [ ] **Step 1: Identify violations**

Run:
```bash
grep -nE "(waitForTimeout\(\s*[0-9]{4,}|networkidle)" e2e/responsive.spec.ts
```

Expected: Lines listing `waitForTimeout(1000)` or larger AND any `networkidle` usage. Count them.

- [ ] **Step 2: Replace each `waitUntil: "networkidle"` with default `'load'`**

For each `page.goto(<route>, { waitUntil: "networkidle" })`, change to `page.goto(<route>)` (drop the option entirely; default is `'load'`).

- [ ] **Step 3: Replace each `waitForTimeout(N >= 1000)` with the right web-first wait**

For each `await page.waitForTimeout(N)` where N ≥ 1000:

- If it's after a navigation: insert `await stabilizeForLayout(page, { readyLocator: page.locator(<the thing being waited for>) })` and DELETE the timeout.
- If it's after a click that triggers a state change: replace with `await expect(<locator>).toBeVisible()` or `toHaveText(...)` or `toHaveCSS(...)`.
- If it's "wait for animation": delete entirely — `prepareContext` (pre-goto in fixture) already killed animations, OR add `await settleStyles(page)` if you need a paint commit.
- **Hard rule (Fix H11.3):** If you cannot determine WHAT was being waited for, leave the original `waitForTimeout` in place with a `// TODO(wave-3-eslint-block): determine assertion intent — see #ISSUE` comment AND file a tracking issue. The Wave 3 ESLint rule will block these unless explicitly tagged with `// eslint-disable-next-line no-restricted-syntax` AND a TODO referencing the issue. Do NOT silently mechanically rewrite. Better: add a `test.fixme()` annotation if the test cannot be made deterministic.

- [ ] **Step 4: Add helper imports if needed**

If `responsive.spec.ts` does not import from the helper module, add at the top:
```ts
import { stabilizeForLayout, settleStyles } from "./fixtures/visual-determinism";
```
(Adjust the relative path if the spec is in a subdirectory.)

- [ ] **Step 5: Run the spec to confirm it still passes**

Run:
```bash
npx playwright test e2e/responsive.spec.ts --reporter=list
```

Expected: All tests pass. If a test now fails, the previous `waitForTimeout` was masking a race — the new assertion is more honest. Investigate and fix the race rather than re-adding the timeout.

- [ ] **Step 6: Verify no `waitForTimeout(>= 1000)` and no `networkidle` remain in this file**

Run:
```bash
grep -nE "(waitForTimeout\(\s*[0-9]{4,}|networkidle)" e2e/responsive.spec.ts
```

Expected: Empty output. If any remain, address before committing.

- [ ] **Step 7: CRLF check + commit**

```bash
head -1 e2e/responsive.spec.ts | cat -A
git -C . add e2e/responsive.spec.ts
git -C . commit -m "test(e2e): replace waitForTimeout/networkidle in responsive.spec.ts

Wave 2 step 4 of e2e-flakiness-remediation. Removed N
waitForTimeout calls and M networkidle waits (replace N/M with
actual counts). Replaced with stabilizeForLayout + web-first
assertions per spec §3."
```

#### Subtask 2.4.b: blog-rendering.spec.ts

Apply the exact same 7-step procedure from Subtask 2.4.a to `e2e/blog-rendering.spec.ts`. One commit at the end.

#### Subtask 2.4.c: reading-mode.spec.ts

Apply the same 7-step procedure to `e2e/reading-mode.spec.ts`. One commit at the end.

#### Subtask 2.4.d: hero-cascade.spec.ts (SPECIAL CASE — see top-of-section callout)

Apply the same 7-step procedure to `e2e/hero-cascade.spec.ts`. **CRITICAL:** wherever `prepareContext` is called in this spec, pass `{ skipHeroCascade: false }` so the cascade is preserved for testing. Example: `await prepareContext(page, { skipHeroCascade: false })`. One commit at the end.

#### Subtask 2.4.e: index-layout.spec.ts

Apply the same 7-step procedure to `e2e/index-layout.spec.ts`. One commit at the end.

#### Subtask 2.4.f: motion-wcag-session.spec.ts

Apply the same 7-step procedure to `e2e/motion-wcag-session.spec.ts`. One commit at the end. (Note: the REWRITE / split into `wcag-touch-targets.spec.ts` + merge motion blocks into `hero-cascade.spec.ts` is deferred to Wave 3 Task 3.2 per Fix M5; here the spec is only de-flaked in place.)

#### Subtask 2.4.g: session-2026-04-12.spec.ts (heaviest offender)

Apply the same 7-step procedure to `e2e/session-2026-04-12.spec.ts` (~14 `waitForTimeout` sites per spec audit — the largest single commit in this task). One commit at the end.

#### Final gate — confirm zero remaining violations (Fix H11.2)

After all 6 subtask commits land:

```bash
grep -rnE '(waitForTimeout\(\s*[0-9]{4,}|networkidle)' e2e/*.spec.ts
```

Expected: empty output. If non-empty, the wave is incomplete — DO NOT proceed to Task 2.5. Add the remaining sites as a Subtask 2.4.h and re-run.

---

### Task 2.5: Verify 5 consecutive CI runs pass without retries

**Exit criterion for Wave 2:** functional suite passes 5 consecutive CI runs with zero retries triggered.

- [ ] **Step 1: Push the branch and wait for CI**

```bash
git -C . push -u origin feat/e2e-wave-2-helper
```

Wait for the run.

- [ ] **Step 2: Manually trigger 4 more runs (Fix L3 — dispatch by file name, not display name)**

```bash
for i in 1 2 3 4; do gh workflow run e2e.yml --ref feat/e2e-wave-2-helper; sleep 30; done
```

Wait for all 5 to finish.

- [ ] **Step 3: Confirm zero retries triggered**

```bash
gh run list --branch feat/e2e-wave-2-helper --limit 5 --json conclusion,attempt --jq '.[] | "\(.conclusion) attempt=\(.attempt)"'
```

Expected: 5 lines all reading `success attempt=1`. If any line shows `attempt=2`, a retry was triggered — the helper hasn't fully eliminated the flake. Investigate the failing test, harden the assertion, push again, restart the 5-run count.

- [ ] **Step 4: Open the Wave 2 PR**

```bash
gh pr create --base main --head feat/e2e-wave-2-helper \
  --title "test(e2e) Wave 2: determinism helper + waitForTimeout removal" \
  --body "$(cat <<'EOF'
## Summary

Wave 2 of the E2E flakiness remediation (spec §6 Wave 2).

- Lands `e2e/fixtures/visual-determinism.ts` with the decomposed primitives + two-phase facades
- Empirical verification of Playwright `animations: "disabled"` keyframe behavior on 1.58.2 — result recorded in spec §0 root-cause #2
- Wires `prepareContext` (pre-goto) + `stabilizeForLayout` (post-goto) into `blog-page` fixture
- Replaces every `waitForTimeout(>= 1000)` (~40+ sites) and every `waitUntil: "networkidle"` with web-first assertions

## Validation

5 consecutive CI runs passed without retries (see commit history for run IDs).

## Test plan (check each box AFTER verification on this PR's CI run)

- [ ] CI green on this PR
- [ ] CI green on `main` after merge
- [ ] Functional spec wall-clock unchanged or improved (no regression)

## Spec reference

`docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` §6 Wave 2.
EOF
)"
```

---

## Wave 3 — Suite reorganization

**Goal:** Split the existing flat `e2e/` directory into `smoke/`, `functional/`, and `visual/` tiers; refactor `playwright.config.ts` to projects + create `playwright.visual.config.ts`; split CI into three jobs with shared setup; land per-tier ESLint configs that enforce tier rules at lint time.

**Branch:** `feat/e2e-wave-3-reorg` (cut from main after Wave 2 merges).

**Estimated wallclock:** 4h work + 2h hardening buffer.

**Dependencies:** Wave 2 merged.

---

### Task 3.1: Create directory structure

**Files:**
- Create: `e2e/smoke/` (directory)
- Create: `e2e/functional/` (directory)
- Create: `e2e/visual/` (directory)
- Create: `test-fixtures/` (directory — Fix M4 / Traceability MISSING-2)

- [ ] **Step 0: Branching preflight (Fix H1)**

```bash
if ! git -C . log main --oneline | grep -q "test(e2e) Wave 2"; then
  echo "ERROR: Wave 2 must be merged to main before starting Wave 3"
  exit 1
fi
git -C . checkout main && git -C . pull --ff-only
git -C . checkout -b feat/e2e-wave-3-reorg
```

- [ ] **Step 1: Create the directories (Fix M4 — also create test-fixtures/)**

```bash
mkdir -p e2e/smoke e2e/functional e2e/visual e2e/visual/__snapshots__ test-fixtures
```

- [ ] **Step 2: Add a `.gitkeep` to each so they survive the move-spec step**

```bash
touch e2e/smoke/.gitkeep e2e/functional/.gitkeep e2e/visual/.gitkeep e2e/visual/__snapshots__/.gitkeep test-fixtures/.gitkeep
git -C . add e2e/smoke/.gitkeep e2e/functional/.gitkeep e2e/visual/.gitkeep e2e/visual/__snapshots__/.gitkeep test-fixtures/.gitkeep
```

`test-fixtures/` is the cross-layer (Vitest ↔ Playwright) data fixture directory mandated by spec §2.4. Empty scaffold is sufficient for Wave 3; actual fixtures are deferred to follow-up work.

- [ ] **Step 3: Commit (no further changes yet)**

```bash
git -C . commit -m "test(e2e): scaffold smoke/functional/visual tier directories

Wave 3 step 1 of e2e-flakiness-remediation. Empty directories
populated by subsequent moves in Task 3.2. Also scaffolds
test-fixtures/ for cross-layer (Vitest <-> Playwright) data
fixtures per spec §2.4."
```

---

### Task 3.2: Move, delete, rename specs per spec §5

**Files:**
- Move: `e2e/blog-rendering.spec.ts` → `e2e/functional/blog-rendering.spec.ts`
- Move: `e2e/reading-mode.spec.ts` → `e2e/functional/reading-mode.spec.ts`
- Move: `e2e/responsive.spec.ts` → `e2e/functional/responsive.spec.ts`
- Move: `e2e/hero-cascade.spec.ts` → `e2e/functional/hero-cascade.spec.ts`
- Move: `e2e/motion-wcag-session.spec.ts` → `e2e/functional/motion-wcag-session.spec.ts` (MOVE-only in Wave 3; the REWRITE / split into `wcag-touch-targets.spec.ts` + merge motion blocks into `hero-cascade.spec.ts` per spec §5 is deferred to a Wave 6 follow-up — Fix M5 / Traceability MISSING-4 — tracking issue: #X)
- Move: `e2e/index-layout.spec.ts` → `e2e/functional/index-layout.spec.ts` (Fix H8 / F-CONS-PLN-04 — without this move the spec stays at flat `e2e/` root and escapes per-tier ESLint enforcement)
- Rename: `e2e/session-2026-04-12.spec.ts` → `e2e/functional/content-pages.spec.ts`
- Modify: `e2e/functional/responsive.spec.ts` — add no-overflow test absorbed from `verify-fixes.spec.ts:6-15`
- Delete: `e2e/mobile-diagnostic.spec.ts`
- Delete: `e2e/verify-fixes.spec.ts`
- Delete (in this Task, Step 4.5): `e2e/_verification/` (entire directory — Wave 2 verification result is now recorded in spec §0; the temp spec is no longer needed)
- KEEP for Wave 3: `e2e/_stopgap/` — explicitly leave in place. Removed in Wave 4 Task 4.3 Step 4 once the canonical Docker-generated baseline lands. To keep it discoverable across the new project structure, Task 3.3 adds it as a 4th `stopgap` project in `playwright.config.ts` for Wave 3 only (see Fix C7 in Task 3.3 Step 1 below).
- Create: `e2e/smoke/routes-load.spec.ts`
- Create: `e2e/smoke/reading-mode-swap.spec.ts`

- [ ] **Step 1: Move the KEEP specs to functional/ (Fix H8 includes index-layout.spec.ts)**

```bash
git -C . mv e2e/blog-rendering.spec.ts e2e/functional/blog-rendering.spec.ts
git -C . mv e2e/reading-mode.spec.ts e2e/functional/reading-mode.spec.ts
git -C . mv e2e/responsive.spec.ts e2e/functional/responsive.spec.ts
git -C . mv e2e/hero-cascade.spec.ts e2e/functional/hero-cascade.spec.ts
git -C . mv e2e/motion-wcag-session.spec.ts e2e/functional/motion-wcag-session.spec.ts
git -C . mv e2e/index-layout.spec.ts e2e/functional/index-layout.spec.ts
```

- [ ] **Step 2: Rename session-2026-04-12.spec.ts to functional/content-pages.spec.ts**

```bash
git -C . mv e2e/session-2026-04-12.spec.ts e2e/functional/content-pages.spec.ts
```

- [ ] **Step 3: Update import paths in moved specs**

Each moved spec imports from `./fixtures/visual-determinism` or `./fixtures/blog-page`. The new location is `e2e/functional/`, so the relative path becomes `../fixtures/visual-determinism`.

Run a single sed across all moved specs:
```bash
for f in e2e/functional/*.spec.ts; do
  sed -i 's|from "./fixtures/|from "../fixtures/|g' "$f"
done
```

Verify by running:
```bash
grep -rn "from \"./fixtures" e2e/functional/
```
Expected: empty output (all imports updated to `../fixtures/`).

- [ ] **Step 4: Delete mobile-diagnostic.spec.ts and verify-fixes.spec.ts**

```bash
git -C . rm e2e/mobile-diagnostic.spec.ts e2e/verify-fixes.spec.ts
```

- [ ] **Step 4.5: Delete `e2e/_verification/` (Fix C7)**

The Wave 2 verification result is now recorded in spec §0; the temp spec is no longer needed.

```bash
git -C . rm -r e2e/_verification/
```

- [ ] **Step 4.6: Leave `e2e/_stopgap/` in place (Fix C7)**

`e2e/_stopgap/` is removed in Wave 4 Task 4.3 Step 4 once the canonical Docker-generated baseline lands. To keep it discoverable across the new project structure, Task 3.3 Step 1 below adds it as a 4th `stopgap` project in `playwright.config.ts`. Do NOT delete `e2e/_stopgap/` here — visual coverage during the Wave 3-4 window depends on it.

(No command needed — this is an explicit non-action with an explanatory note for the executor and reviewers.)

- [ ] **Step 5: Grep-confirm tautology assertions are gone**

Run:
```bash
grep -rnE "expect\(\s*(true|1)\s*\)\.toBe\(\s*(true|1)\s*\)" e2e/
```
Expected: empty output. If any remain, investigate and remove them in this commit.

- [ ] **Step 6: Add the no-overflow test from verify-fixes.spec.ts:6-15 into responsive.spec.ts**

Edit `e2e/functional/responsive.spec.ts`. At the end of the file, add a parametrized test that asserts no element on `/blog` overflows the viewport at 375/390/428px:

```ts
import { test, expect } from "@playwright/test";
import { prepareContext, stabilizeForLayout } from "../fixtures/visual-determinism";

const MOBILE_VIEWPORTS = [375, 390, 428];

test.describe("Mobile no-overflow contract", () => {
  for (const width of MOBILE_VIEWPORTS) {
    test(`/blog has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await prepareContext(page);
      await page.goto("/blog");
      await stabilizeForLayout(page);

      const overflowingElements = await page.evaluate((vw) => {
        return Array.from(document.body.querySelectorAll("*"))
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.right > vw + 1; // +1 for sub-pixel rounding tolerance
          })
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            classes: (el as HTMLElement).className,
            right: el.getBoundingClientRect().right,
          }));
      }, width);

      expect(
        overflowingElements,
        `Elements overflowing viewport at ${width}px:\n${JSON.stringify(overflowingElements, null, 2)}`
      ).toHaveLength(0);
    });

    test(`/blog tag list height is bounded at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await prepareContext(page);
      await page.goto("/blog");
      await stabilizeForLayout(page);

      // Per spec §1.1 mitigation: tag list should not wrap into >2 lines.
      // Approximate via clientHeight ≤ 2 * line-height.
      const tagList = page.locator("[data-testid='blog-tag-list']").first();
      // Tag list may not exist on every blog index variant — skip if not present.
      // Fix M10: explicit return after test.skip — test.skip registers skip but
      // does NOT halt JS execution; subsequent code runs and would throw.
      const exists = await tagList.count();
      if (exists === 0) {
        test.skip(true, "blog-tag-list testid not present yet");
        return;
      }
      const dims = await tagList.evaluate((el) => ({
        height: el.clientHeight,
        lineHeight: parseFloat(getComputedStyle(el).lineHeight),
      }));
      expect(dims.height).toBeLessThanOrEqual(dims.lineHeight * 2.5);
    });
  }
});
```

Note the `test.skip` for the tag-list test if `data-testid="blog-tag-list"` isn't present yet — Step 6.5 below adds it so the test becomes live; the broader §3.5 locator-strategy rollout (`markdown-body`, `project-card`, `theme-toggle` → `getByRole`) is deferred (Defer D3).

- [ ] **Step 6.5: Add `data-testid="blog-tag-list"` to the React component (Fix M2)**

Locate the component that renders the blog index tag list (likely `src/features/blog/BlogIndex.tsx` or a dedicated tag-list subcomponent). Add `data-testid="blog-tag-list"` to the wrapping element. ~10-line source change. After this, the tag-list height test from Step 6 becomes active instead of permanently skipped, satisfying the §1.1 mitigation gap.

```bash
# Verify the testid lands:
grep -rn 'data-testid="blog-tag-list"' src/features/blog/
```

Expected: at least one match.

- [ ] **Step 7: Run responsive.spec.ts to confirm**

Run:
```bash
npx playwright test e2e/functional/responsive.spec.ts --reporter=list
```

Expected: All tests pass (or the tag-list test is skipped if testid isn't present).

- [ ] **Step 8: Create the smoke routes-load spec (Fix M7 — route-specific selectors + URL guard; Fix L5 — prepareContext comment)**

Create `e2e/smoke/routes-load.spec.ts`. Generic `h1` selectors match the NotFound page too, defeating the §2.0 rubric's "primary content" requirement; use route-specific selectors and an explicit `toHaveURL` guard to catch client-side redirects to NotFound:

```ts
import { test, expect, Page } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

// Note: prepareContext strips animations and seeds hero-cascade sessionStorage.
// For non-/ routes, the sessionStorage seed is harmless overhead. Animation kill
// is universally beneficial for smoke tier (no motion to test in 5s). (Fix L5)

const ROUTES: Array<{
  path: string;
  check: (page: Page) => ReturnType<Page["locator"]> | ReturnType<Page["getByRole"]>;
}> = [
  { path: "/", check: (p) => p.getByRole("heading", { level: 1 }).first() },
  { path: "/projects", check: (p) => p.getByRole("heading", { level: 1, name: /projects/i }).first() },
  { path: "/skills", check: (p) => p.getByRole("heading", { level: 1, name: /skills/i }).first() },
  { path: "/blog", check: (p) => p.getByRole("heading", { level: 1, name: /blog/i }).first() },
  { path: "/blog/style-test", check: (p) => p.locator(".markdown-body") },
  { path: "/how-i-do-it", check: (p) => p.getByRole("heading", { level: 1, name: /how/i }).first() },
  { path: "/how-i-do-it/test-plan", check: (p) => p.locator(".markdown-body") },
];

test.describe("Routes load (smoke)", () => {
  for (const { path, check } of ROUTES) {
    test(`${path} returns 200 and renders primary content`, async ({ page }) => {
      await prepareContext(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      // Catch client-side redirects to NotFound — without this, a soft 200 to a
      // SPA NotFound page passes the status check but is not the route under test.
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "$"));
      await expect(check(page)).toBeVisible({ timeout: 5000 });
    });
  }
});
```

This spec satisfies the smoke-tier rubric per spec §2.0: one assertion per route, primary content visible within 5s, no interactions, no screenshots.

- [ ] **Step 9: Create the smoke reading-mode-swap spec (Fix M8 — assert primary content too)**

Create `e2e/smoke/reading-mode-swap.spec.ts`. The §2.0 rubric requires both a 200 status AND the primary content selector becoming visible — `.theme-reading` alone is the wrapper, not the primary content (`.markdown-body`):

```ts
import { test, expect } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

test.describe("Reading mode wrapper (smoke)", () => {
  test("/blog/style-test mounts .theme-reading wrapper around rendered markdown", async ({ page }) => {
    await prepareContext(page);
    const response = await page.goto("/blog/style-test");
    expect(response?.status()).toBe(200);
    const wrapper = page.locator(".theme-reading").first();
    // Smoke check: the reading-mode wrapper class is present in the DOM AND
    // wraps the rendered .markdown-body. Color and font-family assertions live
    // in functional/reading-mode.spec.ts.
    await expect(wrapper).toBeVisible({ timeout: 5000 });
    await expect(wrapper.locator(".markdown-body")).toBeVisible({ timeout: 5000 });
  });
});
```

- [ ] **Step 10: CRLF check on all new and modified files**

```bash
for f in e2e/smoke/*.ts e2e/functional/*.ts; do
  if head -1 "$f" | cat -A | grep -q '\^M\$'; then
    echo "CRLF in $f"; sed -i 's/\r$//' "$f"
  fi
done
```

Expected: No CRLF detected, OR detected and fixed silently.

- [ ] **Step 11: Run smoke and functional separately to confirm**

```bash
npx playwright test e2e/smoke/ --reporter=list 2>&1 | tail -20
npx playwright test e2e/functional/ --reporter=list 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 12: Commit**

```bash
git -C . add e2e/smoke/ e2e/functional/ e2e/visual/
git -C . commit -m "test(e2e): reorganize specs into smoke/functional/visual tiers

Wave 3 step 2 of e2e-flakiness-remediation. Per spec §5 verdicts:
- KEEP+MOVE: blog-rendering, reading-mode, responsive, hero-cascade,
  motion-wcag-session → e2e/functional/
- RENAME: session-2026-04-12.spec.ts → functional/content-pages.spec.ts
- DELETE: mobile-diagnostic.spec.ts, verify-fixes.spec.ts
  (tautology assertions; debug artifacts)
- ADD: no-overflow test absorbed from verify-fixes.spec.ts:6-15 into
  functional/responsive.spec.ts as a parametrized test at 375/390/428px
- ADD: smoke/routes-load.spec.ts (7 routes × visibility check, <5s each)
- ADD: smoke/reading-mode-swap.spec.ts (.theme-reading wrapper present)

Tautology grep confirms zero expect(true).toBe(true) remain in e2e/."
```

---

### Task 3.3: Refactor playwright.config.ts + create playwright.visual.config.ts

**Files:**
- Modify: `playwright.config.ts`
- Create: `playwright.visual.config.ts`

- [ ] **Step 1: Replace playwright.config.ts content (Fix C4 dual reporter, Fix C7 stopgap project, Fix M19 127.0.0.1)**

Replace `playwright.config.ts` with:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Fix C4: dual reporter on CI so the wall-clock guard can read results.json.
  // The HTML reporter alone does NOT emit results.json; the wall-clock guard
  // would then read 0 and silently pass regardless of actual smoke duration.
  reporter: process.env.CI
    ? [["html"], ["json", { outputFile: "playwright-report/results.json" }]]
    : "html",
  timeout: 30000,
  use: {
    // Fix M19: standardize on 127.0.0.1 across smoke/functional and the visual
    // config to avoid IPv4/IPv6 mismatch when the webServer binds 127.0.0.1
    // but specs hit "localhost".
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
  },
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
    // Fix C7: keep the Wave 1 stopgap discoverable as its own project for
    // Wave 3 only. Removed in Wave 4 Task 4.3 Step 4 along with the directory.
    {
      name: "stopgap",
      testDir: "./e2e/_stopgap",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Create playwright.visual.config.ts**

Create `playwright.visual.config.ts` with:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "visual",
      testDir: "./e2e/visual",
      use: { ...devices["Desktop Chrome"] },
      // Fix H10: include the platform token so baseline filenames carry the
      // -chromium-linux suffix that every Wave 4 path reference assumes.
      snapshotPathTemplate:
        "{testDir}/__snapshots__/{testFileName}/{arg}-{platform}{ext}",
    },
  ],
  webServer: {
    command: "npm run preview -- --port 8080 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: false,
    env: { SKIP_GITHUB_FETCH: "1" },
  },
});
```

- [ ] **Step 3: Verify both configs compile**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Expected: No errors. If `playwright.visual.config.ts` is excluded by tsconfig, add `"playwright.visual.config.ts"` to the `include` array.

- [ ] **Step 4: Verify the smoke and functional projects are now visible**

```bash
npx playwright test --list 2>&1 | grep -cE "\[(smoke|functional)\]"
```

Expected: A non-zero count matching the test count of smoke + functional combined.

- [ ] **Step 5: Verify the visual config is discovered**

```bash
npx playwright test --config playwright.visual.config.ts --list 2>&1 | head -10
```

Expected: An empty list (no specs in `e2e/visual/` yet — Wave 4 lands them) but no error. If you see an error, the config has a typo.

- [ ] **Step 6: Update package.json scripts**

Edit `package.json` `scripts` block. Add:
```json
"test:e2e": "playwright test",
"test:e2e:smoke": "playwright test --project=smoke",
"test:e2e:functional": "playwright test --project=functional",
"test:e2e:visual": "playwright test --config playwright.visual.config.ts",
"test:e2e:update-baselines": "docker run --rm -v \"$PWD:/work\" -w /work mcr.microsoft.com/playwright:v1.58.2-jammy sh -c 'npm ci --legacy-peer-deps && npx playwright install --with-deps chromium && npm run build && npx playwright test --config playwright.visual.config.ts --update-snapshots=changed'"
```

If the `scripts` block already has `test:e2e`, replace it with the new value.

- [ ] **Step 7: Update src/scripts/update-github-stats.ts to honor SKIP_GITHUB_FETCH (Fix M12)**

Find the script (likely at `scripts/update-github-stats.ts` per package.json). Read the first 30 lines:

```bash
head -30 scripts/update-github-stats.ts
```

Add this guard at the top of the script body (after imports, before the API call):

```ts
// Honors spec §2.2: visual webServer's `npm run build` step must not hit
// the GitHub API. The visual config sets env { SKIP_GITHUB_FETCH: "1" };
// this guard short-circuits the script when that env var is set.
if (process.env.SKIP_GITHUB_FETCH === "1") {
  console.log("[update-github-stats] SKIP_GITHUB_FETCH=1 set, exiting without fetching");
  process.exit(0);
}
```

This is what the visual config's `env: { SKIP_GITHUB_FETCH: "1" }` exists to honor — it prevents the build step inside the visual webServer from hitting GitHub on every CI run. Use this commit message for the Step 8 commit:

```
test(e2e): SKIP_GITHUB_FETCH guard in update-github-stats.ts

Implements spec §2.2's requirement that the visual webServer's
'npm run build' step does not hit GitHub API. The spec mandates
the env var via webServer.env; this commit adds the script-side
guard that honors it.
```

- [ ] **Step 8: CRLF check + commit**

```bash
for f in playwright.config.ts playwright.visual.config.ts package.json scripts/update-github-stats.ts; do
  head -1 "$f" | cat -A | grep -q '\^M\$' && sed -i 's/\r$//' "$f"
done
git -C . add playwright.config.ts playwright.visual.config.ts package.json scripts/update-github-stats.ts
git -C . commit -m "test(e2e): split playwright config into projects + visual config

Wave 3 step 3 of e2e-flakiness-remediation. Per spec §2:
- playwright.config.ts has smoke + functional projects (dev server)
- playwright.visual.config.ts has visual project (preview server,
  --strictPort, SKIP_GITHUB_FETCH=1, workers:1, snapshotPathTemplate)
- package.json scripts: test:e2e:{smoke,functional,visual,update-baselines}
- scripts/update-github-stats.ts honors SKIP_GITHUB_FETCH=1 so visual
  webServer doesn't reach GitHub on every CI run"
```

---

### Task 3.4: Split CI workflow into 3 jobs with shared setup

**Files:**
- Modify: `.github/workflows/e2e.yml`

- [ ] **Step 1: Read the current workflow**

```bash
cat .github/workflows/e2e.yml
```

- [ ] **Step 2: Replace with the new shape (single complete YAML — Fix H7, Fix C3 cache-id, Fix C4 POSIX wall-clock guard)**

Replace `.github/workflows/e2e.yml` with the following single complete file. The `on:` block includes `workflow_dispatch` from the start (Fix H7 — no separate snippet to merge); downstream jobs use `needs.setup.outputs.cache-hit` instead of the broken `steps.cache-restore.outputs.cache-hit` (Fix C3 Option B); and the smoke wall-clock guard is pure POSIX shell that hard-fails when results.json is missing (Fix C4):

```yaml
name: Playwright E2E Tests

on:
  push:
    branches: [main, dev-*]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      update_snapshots:
        type: boolean
        default: false
        description: "Regenerate visual baselines in this run"

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  setup:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    outputs:
      cache-hit: ${{ steps.cache-deps.outputs.cache-hit }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Cache node_modules + Playwright browsers
        id: cache-deps
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.cache/ms-playwright
          key: deps-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-playwright-1.58.2

      - name: Install dependencies
        if: steps.cache-deps.outputs.cache-hit != 'true'
        run: npm ci --legacy-peer-deps

      - name: Install Playwright browsers
        if: steps.cache-deps.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

  e2e-smoke:
    needs: setup
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.cache/ms-playwright
          key: deps-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-playwright-1.58.2
      - name: Install dependencies (cache miss fallback)
        if: needs.setup.outputs.cache-hit != 'true'
        run: npm ci --legacy-peer-deps && npx playwright install --with-deps chromium
      - name: Lint e2e (tier rules)
        run: npm run lint:e2e
      - name: Run smoke tests
        run: npx playwright test --project=smoke
      - name: Assert smoke wall-clock < 60s
        if: always()
        run: |
          if [ ! -f playwright-report/results.json ]; then
            echo "::error::results.json missing — JSON reporter not configured"
            exit 1
          fi
          duration=$(jq '.stats.duration' playwright-report/results.json)
          duration_int=${duration%.*}
          echo "smoke duration: ${duration_int}ms"
          if [ "$duration_int" -gt 60000 ]; then
            echo "::error::Smoke wall-clock ${duration_int}ms exceeds 60s budget"
            exit 1
          fi
      - name: Upload report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: smoke-playwright-report
          path: playwright-report/
          retention-days: 14

  e2e-functional:
    needs: setup
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.cache/ms-playwright
          key: deps-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-playwright-1.58.2
      - name: Install dependencies (cache miss fallback)
        if: needs.setup.outputs.cache-hit != 'true'
        run: npm ci --legacy-peer-deps && npx playwright install --with-deps chromium
      - name: Run functional tests
        run: npx playwright test --project=functional
      - name: Upload report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: functional-playwright-report
          path: playwright-report/
          retention-days: 14

  e2e-visual:
    needs: setup
    if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.cache/ms-playwright
          key: deps-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-playwright-1.58.2
      - name: Install dependencies (cache miss fallback)
        if: needs.setup.outputs.cache-hit != 'true'
        run: npm ci --legacy-peer-deps && npx playwright install --with-deps chromium
      - name: Build for preview
        run: SKIP_GITHUB_FETCH=1 npm run build
      - name: Run visual tests
        run: |
          UPDATE_FLAG=""
          if [ "${{ github.event.inputs.update_snapshots }}" = "true" ]; then
            UPDATE_FLAG="--update-snapshots=changed"
          fi
          npx playwright test --config playwright.visual.config.ts $UPDATE_FLAG
      - name: Upload report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: visual-playwright-report
          path: playwright-report/
          retention-days: 14
```

This single YAML block is the full replacement — there is NO separate "add workflow_dispatch near the top" snippet (Fix H7).

- [ ] **Step 3: Validate the YAML**

Run:
```bash
yamllint .github/workflows/e2e.yml 2>&1 | head -20
```

If `yamllint` isn't installed, fall back to:
```bash
npx js-yaml .github/workflows/e2e.yml > /dev/null && echo "YAML valid"
```

Expected: no errors.

- [ ] **Step 4: CRLF check + commit**

```bash
head -1 .github/workflows/e2e.yml | cat -A | grep -q '\^M\$' && sed -i 's/\r$//' .github/workflows/e2e.yml
git -C . add .github/workflows/e2e.yml
git -C . commit -m "ci: split e2e workflow into smoke/functional/visual jobs

Wave 3 step 4 of e2e-flakiness-remediation. Per spec §2.2:
- shared 'setup' job uploads node_modules + Playwright browsers as cache
- e2e-smoke (PR-gating, <60s wall-clock budget asserted)
- e2e-functional (PR-gating)
- e2e-visual (main-only via if: condition, continue-on-error: true,
  workflow_dispatch with update_snapshots input)
- All jobs upload playwright-report/ as artifact for diff investigation
- workflow-level concurrency cancels superseded runs"
```

---

### Task 3.5: Land ESLint flat-config tier rules + lint:e2e script (Fix C1 + Fix C2 + Fix M3 + Fix H5 + Fix H6)

**Files:**
- Modify: `eslint.config.js` (the repo SHIPS ESLint 9 flat config + typescript-eslint — `.eslintrc.json` files are silently ignored by flat config)
- Modify: `package.json` (add `lint:e2e` script)

- [ ] **Step 1: Read `eslint.config.js` first to understand the existing flat-config structure (Fix C1)**

```bash
cat eslint.config.js
```

The repo uses ESLint 9 flat config. Per-directory `.eslintrc.json` files are SILENTLY IGNORED by flat config — putting them under `e2e/smoke/` and `e2e/functional/` would ship a dead enforcement layer. Tier rules must live as file-scoped overrides inside `eslint.config.js`.

- [ ] **Step 2: Append file-scoped overrides to `eslint.config.js` (Fix C1 + Fix C2 + Fix M3 + Fix H5)**

At the end of the existing `eslint.config.js` config array, add the following blocks. The AST selectors for the tautology rule use the corrected path (Fix C2): `CallExpression[callee.type='MemberExpression'][callee.property.name='toBe'][callee.object.type='CallExpression'][callee.object.callee.name='expect']...` — the original selector `callee.object.name='expect'` does NOT match because for `expect(true).toBe(true)`, `callee.object` is a `CallExpression` (the inner `expect(true)`), not an `Identifier`. Fix H5 adds `ignores` for transitional Wave 1/2 directories. Fix M3 adds `no-restricted-imports` for cross-tier helper isolation:

```js
// At end of existing eslint.config.js array:
{
  files: ["e2e/smoke/**/*.ts"],
  ignores: ["e2e/_stopgap/**", "e2e/_verification/**"],  // Fix H5: Wave 1/2 transitional artifacts
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='toHaveScreenshot']",
        message: "Smoke tier forbids visual snapshots. Move to functional/ or visual/.",
      },
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='addStyleTag']",
        message: "Smoke tier forbids addStyleTag — keep smoke tests trivial.",
      },
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='waitForTimeout'][arguments.0.type='Literal'][arguments.0.value>=1000]",
        message: "waitForTimeout(>=1000) is forbidden. Use a web-first assertion.",
      },
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='toBe'][callee.object.type='CallExpression'][callee.object.callee.name='expect'][arguments.0.type='Literal'][arguments.0.value=true]",
        message: "Tautology assertion expect(true).toBe(true) is forbidden.",
      },
    ],
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["../functional/_helpers/*", "../visual/_helpers/*"], message: "Tier-internal helpers cannot be imported across tiers." },
      ],
    }],
  },
},
{
  files: ["e2e/functional/**/*.ts"],
  ignores: ["e2e/_stopgap/**", "e2e/_verification/**"],  // Fix H5: defensive — these dirs shouldn't match e2e/functional/ but cheap insurance
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='toHaveScreenshot']",
        message: "Functional tier forbids visual snapshots. Move to e2e/visual/ + playwright.visual.config.ts.",
      },
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='waitForTimeout'][arguments.0.type='Literal'][arguments.0.value>=1000]",
        message: "waitForTimeout(>=1000) is forbidden. Use stabilizeForLayout or a web-first assertion.",
      },
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='toBe'][callee.object.type='CallExpression'][callee.object.callee.name='expect'][arguments.0.type='Literal'][arguments.0.value=true]",
        message: "Tautology assertion expect(true).toBe(true) is forbidden.",
      },
    ],
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["../smoke/_helpers/*", "../visual/_helpers/*"], message: "Tier-internal helpers cannot be imported across tiers." },
      ],
    }],
  },
},
```

The workspace-level `expect(1).toBe(1)` rule (Rev 1's "Step 4") becomes part of the existing `eslint.config.js` general block (no separate file). Add to the existing general-rules block:

```js
{
  rules: {
    "no-restricted-syntax": [
      "warn",
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='toBe'][callee.object.type='CallExpression'][callee.object.callee.name='expect'][arguments.0.type='Literal'][arguments.0.value=1]",
        message: "Tautology assertion expect(1).toBe(1) is forbidden.",
      },
    ],
  },
},
```

- [ ] **Step 3: Add lint:e2e script to package.json**

Edit `package.json` `scripts` block. Add:
```json
"lint:e2e": "eslint 'e2e/**/*.{ts,tsx}' --max-warnings 0"
```

- [ ] **Step 4: Verify the lint passes on the current code**

Run: `npm run lint:e2e`

Expected: zero errors. If errors appear, the existing code already violates a rule — investigate and fix in this commit (it's the whole point of the rule).

- [ ] **Step 5: Negative test — verify lint catches violations via stdin (no file pollution — Fix H6)**

Test the `waitForTimeout` rule:
```bash
echo 'import { test } from "@playwright/test"; test("x", async ({page}) => { await page.waitForTimeout(2000); });' \
  | npx eslint --stdin --stdin-filename e2e/smoke/__neg-test.spec.ts 2>&1 | tail -5
```
Expected: ESLint exits non-zero with "waitForTimeout(>=1000) is forbidden..."

Test the tautology rule (Fix C2 — symmetric negative test that the Rev 1 plan omitted):
```bash
echo 'import { test, expect } from "@playwright/test"; test("x", async () => { expect(true).toBe(true); });' \
  | npx eslint --stdin --stdin-filename e2e/smoke/__neg-test.spec.ts 2>&1 | tail -5
```
Expected: ESLint exits non-zero with "Tautology assertion expect(true).toBe(true) is forbidden."

Test the `toHaveScreenshot` rule:
```bash
echo 'import { test, expect } from "@playwright/test"; test("x", async ({page}) => { await expect(page).toHaveScreenshot("x.png"); });' \
  | npx eslint --stdin --stdin-filename e2e/smoke/__neg-test.spec.ts 2>&1 | tail -5
```
Expected: ESLint exits non-zero with "Smoke tier forbids visual snapshots..."

Belt-and-suspenders before commit (no negative test should have leaked to disk):
```bash
git -C . status --porcelain | grep -q __neg-test && { echo "negative test leaked to disk"; exit 1; } || true
```

- [ ] **Step 6: REMOVED** — Step 5 above is stdin-only; no cleanup needed.

- [ ] **Step 7: CRLF check + commit**

```bash
for f in eslint.config.js package.json; do
  [ -f "$f" ] && head -1 "$f" | cat -A | grep -q '\^M\$' && sed -i 's/\r$//' "$f"
done
git -C . add eslint.config.js package.json
git -C . commit -m "ci: ESLint flat-config tier rules + lint:e2e script

Wave 3 step 5 of e2e-flakiness-remediation. Per spec §2.3:
- eslint.config.js (flat config) gains file-scoped overrides for
  e2e/smoke/** and e2e/functional/** (NOT .eslintrc.json files —
  flat config silently ignores them)
- Smoke tier forbids toHaveScreenshot, addStyleTag,
  waitForTimeout(>=1000), expect(true).toBe(true)
- Functional tier forbids toHaveScreenshot, waitForTimeout(>=1000),
  expect(true).toBe(true)
- Both tiers ignore e2e/_stopgap/** and e2e/_verification/**
  (Wave 1/2 transitional artifacts — removed in Wave 4)
- no-restricted-imports per tier blocks cross-tier helper imports
- AST selectors corrected for expect(X).toBe(Y) — old selector
  callee.object.name='expect' did NOT match because callee.object
  is a CallExpression, not an Identifier
- Workspace-level forbids expect(1).toBe(1)
- npm run lint:e2e wired into the smoke CI job
- Verified end-to-end via stdin (no file pollution): all three rules
  fire on injected violations."
```

---

### Task 3.6: Push and verify all exit criteria

- [ ] **Step 1: Push the branch**

```bash
git -C . push -u origin feat/e2e-wave-3-reorg
```

- [ ] **Step 2: Verify exit criteria from spec §6 Wave 3**

After CI completes, check:

- [ ] `e2e-smoke` job runs in <60s — verify in GitHub Actions UI or via `gh run view <id>`
- [ ] `e2e-functional` job runs in <5min
- [ ] `e2e-visual` job is created but skipped on the PR (per `if:` condition)
- [ ] ESLint catches deliberately-injected `toHaveScreenshot` in a smoke spec — re-run the negative test from Task 3.5 Step 7 if you want belt-and-suspenders verification on the CI runner

- [ ] **Step 3: Open PR**

```bash
gh pr create --base main --head feat/e2e-wave-3-reorg \
  --title "test(e2e) Wave 3: three-tier reorg + ESLint enforcement" \
  --body "$(cat <<'EOF'
## Summary

Wave 3 of the E2E flakiness remediation (spec §6 Wave 3).

- Reorganized specs into `e2e/{smoke,functional,visual}/` per spec §5 (including `index-layout.spec.ts` → `e2e/functional/`)
- Deleted `mobile-diagnostic.spec.ts` and `verify-fixes.spec.ts`
- Deleted `e2e/_verification/` (Wave 2 verification result recorded in spec §0)
- Renamed `session-2026-04-12.spec.ts` → `functional/content-pages.spec.ts`
- Refactored `playwright.config.ts` into smoke + functional + stopgap projects (dev server) — stopgap project is removed in Wave 4 along with the `_stopgap` directory
- Created `playwright.visual.config.ts` (visual project, preview server, `--strictPort`, `SKIP_GITHUB_FETCH=1`, snapshotPathTemplate with `-{platform}` suffix)
- Split `e2e.yml` into `setup` + `e2e-smoke` + `e2e-functional` + `e2e-visual` jobs with shared cache (via `needs.setup.outputs.cache-hit`), concurrency, artifact upload, and dual JSON+HTML reporter on CI for the wall-clock guard
- Added flat-config (`eslint.config.js`) tier rules — NOT `.eslintrc.json` files (the repo uses ESLint 9 flat config which silently ignores them)
- Added `npm run lint:e2e` wired into smoke CI job
- Added `scripts/update-github-stats.ts` SKIP_GITHUB_FETCH guard
- Added `data-testid="blog-tag-list"` to BlogIndex so the §1.1 mitigation tag-list test runs (no longer permanently skipped)

## Exit criteria (check each box AFTER verification on this PR's CI run)

- [ ] e2e-smoke runs in <60s on CI
- [ ] e2e-functional runs in <5min on CI
- [ ] e2e-visual job exists, gated, skipped on PRs
- [ ] ESLint catches injected toHaveScreenshot, waitForTimeout(>=1000), and expect(true).toBe(true) in smoke (verified via stdin)

## Spec reference

`docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` §6 Wave 3.
EOF
)"
```

---

## Wave 5 — Component-level pushdown (executed BEFORE Wave 4 per spec §6 reorder)

**Goal:** Move 4 jsdom-safe assertions from Playwright to Vitest. Computed-style assertions (CSS variables, font-family) STAY in Playwright per spec §1 — jsdom doesn't resolve CSSOM cascade.

**Branch:** `feat/e2e-wave-5-pushdown` (cut from main after Wave 3 merges).

**Estimated wallclock:** 4h work + 2h hardening buffer.

**Dependencies:** Wave 3 merged.

---

### Task 5.1: Push down inline-code bg-secondary class assertion

**Files:**
- Create or modify: `src/components/markdown/MarkdownRenderer.test.tsx`
- Modify: `e2e/functional/blog-rendering.spec.ts` (remove the corresponding assertion)

- [ ] **Step 0: Branching preflight (Fix H1) + read source (Fix C5)**

```bash
if ! git -C . log main --oneline | grep -q "test(e2e) Wave 3"; then
  echo "ERROR: Wave 3 must be merged to main before starting Wave 5"
  exit 1
fi
git -C . checkout main && git -C . pull --ff-only
git -C . checkout -b feat/e2e-wave-5-pushdown
```

Then read the source file before writing the test (Fix C5):
```bash
cat src/components/markdown/MarkdownRenderer.tsx | head -80
```

Confirm the export shape, the prop name (likely `content`), and any required Provider/context the test must wrap. Adapt the test below to match the actual export.

- [ ] **Step 1: Write the failing Vitest test (Fix L2 — strict-mode-friendly assertions)**

If `src/components/markdown/MarkdownRenderer.test.tsx` does not exist, create it. Add (or create with) this test:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer inline code", () => {
  it("applies bg-secondary class to inline code (not code blocks)", () => {
    const { container } = render(
      <MarkdownRenderer content={"This is `inline code` here"} />
    );
    const inlineCode = container.querySelector("code:not(pre code)");
    // Fix L2: type-narrow before chaining .className so the test is strict-mode safe.
    expect(inlineCode, "inline code element not found").not.toBeNull();
    if (!inlineCode) throw new Error("unreachable");
    expect(inlineCode.className).toContain("bg-secondary");
  });
});
```

- [ ] **Step 2: Run the test to verify it FAILS**

Run: `npx vitest run src/components/markdown/MarkdownRenderer.test.tsx`

Expected: FAIL with "expected ... to contain 'bg-secondary'" OR "Cannot find module" if the file is brand-new and the test setup needs adjustment. If "Cannot find module", verify `vitest.config.ts` includes `src/**/*.test.tsx`.

- [ ] **Step 3: Verify it PASSES against the existing implementation**

If MarkdownRenderer already implements this (per the existing `blog-rendering.spec.ts:115-118` Playwright test), the Vitest test should pass without code changes. Re-run:

```bash
npx vitest run src/components/markdown/MarkdownRenderer.test.tsx
```

Expected: PASS. If it FAILS, the MarkdownRenderer doesn't actually apply `bg-secondary` to inline code — investigate; the Playwright test may have been asserting something subtly different.

- [ ] **Step 4: Remove the corresponding Playwright assertion**

Edit `e2e/functional/blog-rendering.spec.ts`. Find lines around 115-118 (the inline-code `bg-secondary` assertion). Delete that test entirely (it's now covered by Vitest).

- [ ] **Step 5: Run the Playwright spec to confirm nothing else broke**

```bash
npx playwright test e2e/functional/blog-rendering.spec.ts --reporter=list
```

Expected: All remaining tests pass.

- [ ] **Step 6: Commit**

```bash
git -C . add src/components/markdown/MarkdownRenderer.test.tsx e2e/functional/blog-rendering.spec.ts
git -C . commit -m "test: pushdown inline code bg-secondary assertion to Vitest

Wave 5 step 1 of e2e-flakiness-remediation. Per spec §1
component-level pushdown table: inline code bg-secondary class
check moved from blog-rendering.spec.ts:115-118 to
MarkdownRenderer.test.tsx. jsdom-safe (class-presence assertion)."
```

---

### Task 5.2: Push down frontmatter strip assertion

**Files:**
- Create or modify: `src/lib/frontmatter.test.ts`
- Modify: `e2e/functional/content-pages.spec.ts` (remove lines 48-67 corresponding to the frontmatter assertion)

- [ ] **Step 0: Read `src/lib/frontmatter.ts` (Fix C5 — verify the actual API)**

```bash
cat src/lib/frontmatter.ts
```

The actual API at `src/lib/frontmatter.ts` returns `{frontmatter, content}` — NOT `{body, frontmatter}`. The Rev 1 plan destructured `{body, frontmatter}`, which makes `body` undefined and the test throws TypeError on `.startsWith`. Use the corrected destructure below.

- [ ] **Step 1: Locate the frontmatter parser**

Run: `find src -name "frontmatter*" -type f`

Expected: A path like `src/lib/frontmatter.ts`. If absent, the parser may be inline in `MarkdownRenderer.tsx` — adapt the test target accordingly (the spec references `src/lib/frontmatter.ts`).

- [ ] **Step 2: Write the failing Vitest test (Fix C5 — corrected destructure)**

Create or modify `src/lib/frontmatter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./frontmatter"; // Verified import name via Step 0

describe("frontmatter parser", () => {
  it("strips frontmatter and returns clean content", () => {
    const input = `---
title: Test Post
date: 2026-04-19
---

# Heading

Body content here.`;
    // Actual API: { frontmatter, content } — NOT { body, frontmatter }
    const { content, frontmatter } = parseFrontmatter(input);
    expect(content.startsWith("# Heading")).toBe(true);
    expect(content.includes("---")).toBe(false);
    expect(frontmatter.title).toBe("Test Post");
  });

  it("returns input as content when no frontmatter present", () => {
    const input = "# Just a heading\n\nBody.";
    const { content, frontmatter } = parseFrontmatter(input);
    expect(content).toBe(input);
    expect(frontmatter).toEqual({});
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/lib/frontmatter.test.ts`

Expected: PASS if `parseFrontmatter` is exported with this signature; FAIL with informative error if the export name or shape differs. Adapt the import and assertions to match the actual API.

- [ ] **Step 4: Remove the corresponding Playwright assertion**

Edit `e2e/functional/content-pages.spec.ts`. Find lines around 48-67 (the frontmatter-strip assertion). Delete that test.

- [ ] **Step 5: Run content-pages.spec.ts**

```bash
npx playwright test e2e/functional/content-pages.spec.ts --reporter=list
```

Expected: All remaining tests pass.

- [ ] **Step 6: Commit**

```bash
git -C . add src/lib/frontmatter.test.ts e2e/functional/content-pages.spec.ts
git -C . commit -m "test: pushdown frontmatter strip assertion to Vitest

Wave 5 step 2. Per spec §1 component-level pushdown table.
Pure function under test, no DOM needed."
```

---

### Task 5.3: Push down Polish slugify behavior

**Files:**
- Modify: `src/components/markdown/MarkdownRenderer.test.tsx`
- (No corresponding Playwright spec to remove — the Polish slugify behavior is referenced in CLAUDE.md but may not have an explicit Playwright test today.)

- [ ] **Step 0: Read `src/components/markdown/MarkdownRenderer.tsx:16-27` (Fix C5 — confirm actual slugify behavior)**

```bash
sed -n '16,27p' src/components/markdown/MarkdownRenderer.tsx
```

`customSlugify` uses `.replace(/[^\w-]/g, "")`. `\w` is `[A-Za-z0-9_]`, so Polish diacritics are DELETED, not transliterated. `książka → ksika`, NOT `ksiazka`. The CLAUDE.md transliteration claim is aspirational — the test below asserts what the code ACTUALLY does (`ą` removed, not transliterated to `a`). If the executor wants true transliteration, that is a separate spec — track outside this migration.

- [ ] **Step 1: Locate the slugify function**

Run: `grep -rn "customSlugify\|slugify" src/components/markdown/MarkdownRenderer.tsx | head -5`

Expected: A reference to `customSlugify`. If the function is internal (not exported), either export it for testing OR test via the rendered DOM (e.g., assert that a heading with Polish chars produces an `id` attribute with deleted-diacritic chars).

- [ ] **Step 2: Add the Vitest test (Fix C5 — assert deletion behavior, not transliteration)**

Append to `src/components/markdown/MarkdownRenderer.test.tsx`:

```tsx
describe("MarkdownRenderer Polish slugify", () => {
  it("strips Polish diacritics from heading IDs (current behavior — see follow-up)", () => {
    const { container } = render(
      <MarkdownRenderer content={"# Książka i ćwiczenia\n\nbody"} />
    );
    const heading = container.querySelector("h1");
    expect(heading, "h1 not found").not.toBeNull();
    if (!heading) throw new Error("unreachable");
    const id = heading.getAttribute("id");
    // customSlugify uses .replace(/[^\w-]/g, "") — \w is [A-Za-z0-9_] so
    // Polish diacritics (ą, ć, ż, ś, ź, ł, ó, ę, ń) are DELETED, not
    // transliterated. książka → ksika; ćwiczenia → wiczenia.
    // True transliteration table is a separate spec — track outside this migration.
    expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(id).toBe("ksika-i-wiczenia");
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npx vitest run src/components/markdown/MarkdownRenderer.test.tsx
```

Expected: PASS against the current implementation. If FAIL, the slugify implementation has changed since 2026-04-19 — re-read the source and update the asserted ID.

```bash
git -C . add src/components/markdown/MarkdownRenderer.test.tsx
git -C . commit -m "test: pin Polish diacritic-stripping behavior in Vitest

Wave 5 step 3. Asserts what customSlugify actually does today
(diacritics deleted via \w pattern, not transliterated). True
transliteration is a separate, deferred follow-up."
```

---

### Task 5.4: Push down reading-mode wrapper class application (NOT the CSS variable assertions)

**Critical: only the class-presence check moves. CSS-variable computed-style assertions at `reading-mode.spec.ts:21-107` STAY in Playwright (jsdom can't resolve CSSOM cascade per spec §1).**

**Files:**
- Create or modify: `src/App.test.tsx`
- Modify: `src/App.tsx` (export `AppContent` — the inner component without Router — if not already exported)
- Modify: `e2e/functional/reading-mode.spec.ts` (remove ONLY lines 9-17, leave 21-107 in place)

- [ ] **Step 0: Read `src/App.tsx` (Fix C5 — confirm BrowserRouter location)**

```bash
cat src/App.tsx | head -60
```

`src/App.tsx` already wraps the app in `<BrowserRouter>`. Wrapping `<App />` in `<MemoryRouter>` would produce nested routers and React Router 6 throws `You cannot render a <Router> inside another <Router>` at runtime. The test must import the inner component (without Router) and wrap THAT in `<MemoryRouter>`.

- [ ] **Step 1: Export `AppContent` from `src/App.tsx` if not already exported (Fix C5)**

Refactor `src/App.tsx` so the inner component (everything inside `<BrowserRouter>` — providers + `<Routes>`) is named `AppContent` and exported as a named export. The default `App` export still wraps `AppContent` in `<BrowserRouter>` for production. This is a single atomic commit before the test lands:

```ts
// In src/App.tsx, factor out:
export function AppContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>{/* ...all existing route definitions... */}</Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
```

```bash
git -C . add src/App.tsx
git -C . commit -m "refactor(app): export AppContent for test wrapping

Wave 5 step 4 prerequisite. Tests need to wrap the route tree in
MemoryRouter without nesting it inside BrowserRouter. AppContent
is the inner component (providers + Routes); App default still
wraps in BrowserRouter for production."
```

- [ ] **Step 2: Write the Vitest test against `AppContent` (Fix C5)**

Create or modify `src/App.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppContent } from "./App";

describe("App reading-mode wrapper", () => {
  it("mounts .theme-reading wrapper for blog post routes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/blog/style-test"]}>
        <AppContent />
      </MemoryRouter>
    );
    // The reading-mode wrapper is a div with class theme-reading wrapping
    // the blog post body. Class presence is jsdom-safe.
    const wrapper = container.querySelector(".theme-reading");
    expect(wrapper).toBeTruthy();
  });

  it("does NOT mount .theme-reading wrapper on non-blog routes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/projects"]}>
        <AppContent />
      </MemoryRouter>
    );
    expect(container.querySelector(".theme-reading")).toBeNull();
  });
});
```

- [ ] **Step 3: Run**

```bash
npx vitest run src/App.test.tsx
```

Expected: PASS for both tests. If FAIL, App's route-based wrapper logic differs from spec assumptions — investigate.

- [ ] **Step 4: Remove ONLY lines 9-17 from reading-mode.spec.ts**

Edit `e2e/functional/reading-mode.spec.ts`. Delete the test that asserts `.theme-reading` is present (the one corresponding to lines 9-17 in the original file). Leave lines 21-107 intact — those are the CSS-variable color and font-family assertions that STAY in Playwright.

- [ ] **Step 5: Run**

```bash
npx playwright test e2e/functional/reading-mode.spec.ts --reporter=list
```

Expected: Remaining tests pass.

- [ ] **Step 6: Commit**

```bash
git -C . add src/App.test.tsx e2e/functional/reading-mode.spec.ts
git -C . commit -m "test: pushdown reading-mode wrapper class check to Vitest

Wave 5 step 4 of e2e-flakiness-remediation. Per spec §1: ONLY the
class-application check moves (jsdom-safe). The CSS-variable color
assertions and font-family computed-style checks at
reading-mode.spec.ts:21-107 STAY in Playwright — jsdom does NOT
resolve CSSOM cascade."
```

---

### Task 5.5: Verify wall-clock improvement + open PR

- [ ] **Step 1: Compare functional tier wall-clock before/after (Fix M17 — worktree, not stash)**

Stash misses untracked files and is fragile. Use a worktree to isolate the baseline run, and discover the Wave 3 merge SHA explicitly instead of using a placeholder:

```bash
WAVE3_SHA=$(git -C . log --oneline main | grep "test(e2e) Wave 3" | head -1 | awk '{print $1}')
echo "Wave 3 merge SHA: $WAVE3_SHA"
```

Use a worktree to isolate the baseline run (avoids stash dance + untracked-file pollution):
```bash
git -C . worktree add ../wave-3-baseline "$WAVE3_SHA"
cd ../wave-3-baseline
time npx playwright test --project=functional --reporter=line 2>&1 | tail -3
cd -
git -C . worktree remove ../wave-3-baseline
```

Then run on the current branch:
```bash
time npx playwright test --project=functional --reporter=line 2>&1 | tail -3
```

Expected: 10-15% wall-clock reduction (per spec exit criterion). Even a small reduction (≥5%) is acceptable; the primary win is removing flake surface, not raw speed.

- [ ] **Step 2: Push + open PR**

```bash
git -C . push -u origin feat/e2e-wave-5-pushdown
gh pr create --base main --head feat/e2e-wave-5-pushdown \
  --title "test(e2e) Wave 5: component-level pushdown to Vitest" \
  --body "$(cat <<'EOF'
## Summary

Wave 5 of the E2E flakiness remediation (spec §6 Wave 5, executed before Wave 4 per Rev 2 reorder).

- Pushdown to Vitest (jsdom-safe assertions only):
  - Inline code `bg-secondary` class → `MarkdownRenderer.test.tsx`
  - Frontmatter strip → `frontmatter.test.ts` (corrected destructure: `{ content, frontmatter }`)
  - Polish slugify behavior pinned in `MarkdownRenderer.test.tsx` (asserts current diacritic-deletion behavior; true transliteration deferred)
  - Reading-mode `.theme-reading` wrapper class application → `App.test.tsx` (against exported `AppContent`, not `App`, to avoid nested router)
- Removed corresponding Playwright assertions (kept CSS-variable and font-family computed-style assertions in Playwright per spec §1).
- Refactored `src/App.tsx` to export `AppContent` (the inner component without `<BrowserRouter>`) so tests can wrap it in `<MemoryRouter>` cleanly.

## Exit criteria (check each box AFTER verification on this PR's CI run)

- [ ] Vitest tests pass
- [ ] Functional spec wall-clock reduced (measured: <fill in actual % from Step 1>)
- [ ] No CSSOM-dependent assertion was incorrectly pushed down

## Spec reference

`docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` §6 Wave 5 + §1 pushdown table.
EOF
)"
```

---

## Wave 4 — New visual tier

**Goal:** Land the canonical kitchen-sink visual test at `e2e/visual/kitchen-sink.spec.ts`, generate the Docker-baselined PNG, replace the Wave 1 stopgap baseline, enable the `e2e-visual` job on `main` push only, and add the regen-baselines `workflow_dispatch` workflow + CODEOWNERS protection.

**Branch:** `feat/e2e-wave-4-visual` (cut from main after Wave 5 merges).

**Estimated wallclock:** 6h work + 2h hardening buffer.

**Dependencies:** Wave 3 merged AND Wave 5 merged.

---

### Task 4.1: Write kitchen-sink.spec.ts with Docker runtime guard

**Files:**
- Create: `e2e/visual/kitchen-sink.spec.ts`
- Delete (later, in Task 4.3): `e2e/_stopgap/` (the Wave 1 stopgap directory) AND the `stopgap` project entry in `playwright.config.ts`
- Delete (later, in Task 4.3): the `ignores: ["e2e/_stopgap/**", "e2e/_verification/**"]` lines from `eslint.config.js` once the directories are gone (Fix H5)

- [ ] **Step 0: Branching preflight (Fix H1)**

```bash
if ! git -C . log main --oneline | grep -q "test(e2e) Wave 5"; then
  echo "ERROR: Wave 5 must be merged to main before starting Wave 4"
  exit 1
fi
git -C . checkout main && git -C . pull --ff-only
git -C . checkout -b feat/e2e-wave-4-visual
```

- [ ] **Step 1: Create kitchen-sink.spec.ts (Fix M9 — single-arg beforeAll)**

Create `e2e/visual/kitchen-sink.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { prepareContext, stabilizeForLayout } from "../fixtures/visual-determinism";

// Per spec §4: hard-fail if --update-snapshots runs outside the pinned
// Docker image. The ALLOW_HOST_SNAPSHOT_UPDATE env var is an explicit
// emergency escape hatch.
// Fix M9: use single-arg form `(testInfo) => ...` to avoid the
// no-empty-pattern lint trip from `({}, testInfo)`. Verify against
// Playwright 1.58.2 actual signature; if two-arg form is needed,
// use `(_args, testInfo)` with a targeted no-unused-vars disable.
test.beforeAll((testInfo) => {
  if (testInfo.config.updateSnapshots !== "none") {
    const isDocker = existsSync("/.dockerenv");
    if (!isDocker && !process.env.ALLOW_HOST_SNAPSHOT_UPDATE) {
      throw new Error(
        "Visual baselines must be regenerated in the pinned Docker image. " +
          "Use `npm run test:e2e:update-baselines`. Override with " +
          "ALLOW_HOST_SNAPSHOT_UPDATE=1 only for emergencies."
      );
    }
  }
});

test.describe("Kitchen-sink visual regression", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/blog/style-test renders deterministically at 390px", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/blog/style-test");
    await stabilizeForLayout(page, {
      mermaid: true,
      readyLocator: page.locator(".markdown-body"),
    });

    await expect(page).toHaveScreenshot("style-test-390w.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      timeout: 15000,
    });
  });
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit -p tsconfig.json
```

- [ ] **Step 3: Verify the spec is discoverable via the visual config**

```bash
npx playwright test --config playwright.visual.config.ts --list
```

Expected: One test listed.

- [ ] **Step 4: Verify the runtime guard works (negative test)**

Run from your host (not Docker):

```bash
npx playwright test --config playwright.visual.config.ts --update-snapshots=changed 2>&1 | head -10
```

Expected: ERROR thrown with the message "Visual baselines must be regenerated in the pinned Docker image..."

- [ ] **Step 5: Verify the escape hatch works**

```bash
ALLOW_HOST_SNAPSHOT_UPDATE=1 npx playwright test --config playwright.visual.config.ts --update-snapshots=changed 2>&1 | tail -10
```

Expected: The test runs (and likely creates the host-generated baseline as `style-test-390w-chromium-linux.png`). Delete the host-generated baseline immediately:

```bash
rm -f e2e/visual/__snapshots__/kitchen-sink.spec.ts/style-test-390w-chromium-linux.png
```

- [ ] **Step 6: CRLF check + commit**

```bash
head -1 e2e/visual/kitchen-sink.spec.ts | cat -A | grep -q '\^M\$' && sed -i 's/\r$//' e2e/visual/kitchen-sink.spec.ts
git -C . add e2e/visual/kitchen-sink.spec.ts
git -C . commit -m "test(e2e): add kitchen-sink visual spec with Docker guard

Wave 4 step 1 of e2e-flakiness-remediation. Single screenshot at
/blog/style-test 390px with maxDiffPixelRatio: 0.02. Pre-goto:
prepareContext (animation kill + cascade skip via addInitScript).
Post-goto: stabilizeForLayout with { mermaid: true, readyLocator:
.markdown-body } so the screenshot waits for fonts + Mermaid render
+ markdown chunk fetch + double-rAF paint commit.

Runtime guard hard-fails on host-machine --update-snapshots; only
the pinned Docker image (mcr.microsoft.com/playwright:v1.58.2-jammy)
may regenerate baselines. ALLOW_HOST_SNAPSHOT_UPDATE=1 is the
emergency escape hatch."
```

- [ ] **Step 7: Delete the superseded visual-mobile spec and its testIgnore entry (Fix H9)**

Wave 1 quarantined `e2e/visual-mobile.spec.ts` via `testIgnore`. After Wave 4 the kitchen-sink supersedes it; the dead spec file plus the `testIgnore` entry both need removal:

```bash
git -C . rm e2e/visual-mobile.spec.ts
# Also remove the empty snapshots directory if it survived:
[ -d e2e/visual-mobile.spec.ts-snapshots ] && git -C . rm -r e2e/visual-mobile.spec.ts-snapshots/ || true
```

Edit `playwright.config.ts`. Remove the `testIgnore: ["**/visual-mobile.spec.ts"]` line from the smoke project (or wherever it lives after Wave 3 reorg).

```bash
git -C . add playwright.config.ts
git -C . commit -m "test(e2e): remove superseded visual-mobile spec + testIgnore"
```

---

### Task 4.2: Add regen-visual-baselines.yml workflow

**Files:**
- Create: `.github/workflows/regen-visual-baselines.yml`

- [ ] **Step 1: Create the workflow (Fix H4 — PAT required for downstream CI to fire)**

Create `.github/workflows/regen-visual-baselines.yml`. The default `GITHUB_TOKEN` does NOT propagate workflow-trigger permissions — auto-PRs opened by `github-actions[bot]` will NOT trigger the regular `pull_request` event on `e2e.yml`, defeating the verification path. Use a `PERSONAL_ACCESS_TOKEN` repo secret with `repo` + `workflow` scopes:

```yaml
# REQUIRED: PERSONAL_ACCESS_TOKEN repo secret with `repo` + `workflow` scopes.
# Without this, auto-PRs created by GITHUB_TOKEN will not trigger e2e.yml
# pull_request workflows, defeating the verification step. See:
# https://docs.github.com/en/actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow
# Fallback: if a PAT cannot be created (org policy blocks it), document that
# the maintainer must close-and-reopen the auto-PR manually to force CI to fire.
name: Regenerate visual baselines

on:
  workflow_dispatch:
    inputs:
      target_branch:
        description: "Branch to regenerate baselines on (e.g., dependabot/npm/playwright-1.59.0)"
        required: true
        type: string

permissions:
  contents: write
  pull-requests: write

jobs:
  regen:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout target branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.target_branch }}
          fetch-depth: 0
          token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}

      - name: Regenerate visual baselines in Docker
        run: |
          docker run --rm \
            -v "$PWD:/work" \
            -w /work \
            -e SKIP_GITHUB_FETCH=1 \
            mcr.microsoft.com/playwright:v1.58.2-jammy \
            sh -c 'npm ci --legacy-peer-deps && \
                   npx playwright install --with-deps chromium && \
                   npm run build && \
                   npx playwright test --config playwright.visual.config.ts --update-snapshots=changed'

      - name: Detect baseline changes
        id: detect
        run: |
          if git diff --quiet e2e/visual/__snapshots__/; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Open auto-PR with regenerated baselines
        if: steps.detect.outputs.changed == 'true'
        env:
          GH_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
        run: |
          BRANCH="regen-baselines/${{ github.event.inputs.target_branch }}-$(date +%s)"
          git config user.name "regen-baselines-bot"
          git config user.email "regen-baselines-bot@users.noreply.github.com"
          git checkout -b "$BRANCH"
          git add e2e/visual/__snapshots__/
          git commit -m "chore(visual): regenerate baselines via Docker

Triggered by workflow_dispatch against ${{ github.event.inputs.target_branch }}.
Auto-generated by .github/workflows/regen-visual-baselines.yml."
          git push origin "$BRANCH"
          gh pr create \
            --base "${{ github.event.inputs.target_branch }}" \
            --head "$BRANCH" \
            --title "chore(visual): regenerate baselines for ${{ github.event.inputs.target_branch }}" \
            --body "Auto-generated by regen-visual-baselines workflow. Maintainer must review the PNG diff before merging."

      - name: Report no-op
        if: steps.detect.outputs.changed == 'false'
        run: echo "::notice::No baseline diff detected; no PR opened."
```

- [ ] **Step 2: Validate YAML**

```bash
npx js-yaml .github/workflows/regen-visual-baselines.yml > /dev/null && echo "YAML valid"
```

- [ ] **Step 3: CRLF check + commit**

```bash
head -1 .github/workflows/regen-visual-baselines.yml | cat -A | grep -q '\^M\$' && sed -i 's/\r$//' .github/workflows/regen-visual-baselines.yml
git -C . add .github/workflows/regen-visual-baselines.yml
git -C . commit -m "ci: add regen-visual-baselines workflow_dispatch workflow

Wave 4 step 2 of e2e-flakiness-remediation. Per spec §4
Dependabot path: maintainer triggers this workflow against a
Dependabot branch (or any branch) to regenerate visual baselines
inside the pinned Docker image. The workflow opens an auto-PR
with the regenerated PNGs targeted at the input branch. Maintainer
reviews the diff, then merges."
```

---

### Task 4.3: Generate the canonical baseline in Docker, replace the stopgap

- [ ] **Step 1: Pre-pull the Docker image (saves time on first run)**

```bash
docker pull mcr.microsoft.com/playwright:v1.58.2-jammy
```

Expected: Image pull completes (~2GB). If you don't have Docker installed on WSL2, install Docker Desktop for Windows and enable WSL2 integration; or run the regen via the `regen-visual-baselines.yml` workflow in CI by triggering it against this branch.

- [ ] **Step 2: Run baseline regen via npm script**

```bash
npm run test:e2e:update-baselines
```

Expected: Docker container starts, npm ci runs, playwright install runs, build runs, visual test runs, baseline PNG is created at `e2e/visual/__snapshots__/kitchen-sink.spec.ts/style-test-390w-chromium-linux.png`.

If the test fails on the first run with "snapshot doesn't exist, writing actual" — that's the expected first-run behavior. Re-run to verify the test passes against the just-generated baseline:

```bash
npm run test:e2e:visual
```

Expected: PASS on the second run.

- [ ] **Step 3: Verify the PNG is sane (open in an image viewer)**

```bash
ls -la e2e/visual/__snapshots__/kitchen-sink.spec.ts/style-test-390w-chromium-linux.png
```

Open the file in an image viewer. Confirm:
- It shows `/blog/style-test` rendered (not a blank page, not an error page)
- Fonts are loaded (no fallback fallback fonts visible)
- Mermaid diagrams are rendered (not raw text)
- Reading mode (cream/dark text) is applied
- No devtools panel visible

If any of those check fail, the helper is missing a wait — investigate before committing.

- [ ] **Step 4: Delete the Wave 1 stopgap + remove its project entry + remove ESLint ignores (Fix C7 + Fix H5)**

```bash
git -C . rm -r e2e/_stopgap/
```

Edit `playwright.config.ts` and remove the `stopgap` project entry added in Wave 3 Task 3.3 Step 1:

```ts
// REMOVE this block from playwright.config.ts:
// {
//   name: "stopgap",
//   testDir: "./e2e/_stopgap",
//   use: { ...devices["Desktop Chrome"] },
// },
```

Edit `eslint.config.js` and remove the `ignores: ["e2e/_stopgap/**", "e2e/_verification/**"]` lines from BOTH the smoke and functional file-scoped overrides (those directories no longer exist; the ignores are now dead code):

```bash
# Verify removal:
grep -n "_stopgap\|_verification" eslint.config.js && { echo "ignores not fully removed"; exit 1; } || echo "OK"
git -C . add playwright.config.ts eslint.config.js
```

- [ ] **Step 5: Delete the Wave 2 verification spec (defensive — should already be gone after Wave 3 Task 3.2 Step 4.5)**

```bash
[ -d e2e/_verification/ ] && git -C . rm -r e2e/_verification/ || echo "already removed in Wave 3"
```

- [ ] **Step 6: Commit the canonical baseline + cleanup**

```bash
git -C . add e2e/visual/__snapshots__/
git -C . commit -m "test(e2e): commit canonical kitchen-sink baseline (Docker-generated)

Wave 4 step 3 of e2e-flakiness-remediation. Generated inside
mcr.microsoft.com/playwright:v1.58.2-jammy via npm run
test:e2e:update-baselines. Replaces the Wave 1 stopgap baseline
at e2e/_stopgap/ (now removed).

Visual checklist (per Wave 4 prerequisite):
- [x] /blog/style-test rendered fully
- [x] Fonts loaded (no fallback)
- [x] Mermaid diagrams rendered
- [x] Reading mode applied
- [x] No devtools artifacts"
```

---

### Task 4.4: Enable e2e-visual job on main push (verify the if condition)

The Wave 3 workflow already includes the `if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'` condition. This task verifies the job triggers correctly post-merge.

- [ ] **Step 1: Push the branch**

```bash
git -C . push -u origin feat/e2e-wave-4-visual
```

- [ ] **Step 2: Confirm the e2e-visual job is SKIPPED on PR (Fix M18 — strengthen the assertion)**

After CI runs, check (and hard-fail if conclusion is anything other than `skipped`):

```bash
RUN_ID=$(gh run list --branch feat/e2e-wave-4-visual --limit 1 --json databaseId --jq '.[0].databaseId')
result=$(gh run view "$RUN_ID" --json jobs --jq '.jobs[] | select(.name=="e2e-visual") | .conclusion')
[ "$result" = "skipped" ] || { echo "::error::e2e-visual ran on PR (conclusion: $result); if condition broken"; exit 1; }
gh run view "$RUN_ID" --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
```

Expected: `e2e-visual: skipped` (along with `e2e-smoke: success`, `e2e-functional: success`).

- [ ] **Step 3: After PR merges, confirm e2e-visual RUNS on main**

After the PR merges to main, watch the main-branch CI run:

```bash
gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run view {} --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
```

Expected: `e2e-visual: success` (or `failure` with `continue-on-error`, in which case investigate before any further work).

---

### Task 4.5: Add CODEOWNERS entry for visual snapshots

**Files:**
- Modify or create: `CODEOWNERS` (root) or `.github/CODEOWNERS`

- [ ] **Step 1: Detect existing CODEOWNERS**

```bash
ls CODEOWNERS .github/CODEOWNERS 2>/dev/null
```

If neither exists, create `.github/CODEOWNERS`:
```bash
mkdir -p .github
touch .github/CODEOWNERS
```

- [ ] **Step 2: Add the visual snapshots entry**

Append to `.github/CODEOWNERS`:

```
# Visual baselines require explicit approval — they're consumed as test oracles
# and a wrong baseline silently encodes a regression as "expected".
# Per spec §4 path-based protection.
# Fix M20: recursive glob — snapshots live one level deeper at
# e2e/visual/__snapshots__/<spec-file>/<image>.png; the bare directory
# pattern only matches direct children.
e2e/visual/__snapshots__/**    @MalfiRG
```

(Replace `@MalfiRG` with the maintainer's actual GitHub handle if different.)

- [ ] **Step 3: Verify GitHub recognizes the file**

```bash
git -C . add .github/CODEOWNERS
git -C . commit -m "chore: add CODEOWNERS protection for visual baselines

Wave 4 step 5 of e2e-flakiness-remediation. Per spec §4: PNG
baselines under e2e/visual/__snapshots__/ require explicit
maintainer approval. Wrong baseline = silently-encoded regression."
```

After the PR merges, GitHub will start enforcing the CODEOWNERS rule (the maintainer must approve any PR that touches files under `e2e/visual/__snapshots__/`).

- [ ] **Step 4: Update ARCHITECTURE.md §9 with the final end-state (Fix M11 — verify location + budget)**

First locate §9 to decide whether to replace its body or append after the highest-numbered §:

```bash
grep -n '^## 9' ARCHITECTURE.md || grep -nE '^## [0-9]+' ARCHITECTURE.md | tail -1
```

If `## 9` exists, replace its body. If absent, add the new §9 immediately after the highest-numbered existing section.

Edit `ARCHITECTURE.md`. Write the §9 content as a 200-300 word summary covering:

- Three Playwright tiers (smoke / functional / visual) — one sentence per tier per spec §2.0
- Placement rubric (point to spec §2.0 for the full table)
- Docker baseline workflow (image pin, Dependabot path, runtime guard, CODEOWNERS)
- Pointer to the spec at `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md`

Concrete content to insert (~280 words — table replaced with three sentences to fit the 200-300 budget):

```markdown
## 9. Testing Architecture

The Playwright suite is organized into three tiers under `e2e/`, each with its own signal contract and wall-clock budget. Placement is enforced via file-scoped overrides in `eslint.config.js` so the structure cannot drift.

The smoke tier (`e2e/smoke/`) covers route load + key element renders and runs in <60s wall-clock as a PR gate on every push and PR. The functional tier (`e2e/functional/`) covers DOM/structural, interactions, and computed-style assertions, runs in <5min, and also gates every PR. The visual tier (`e2e/visual/`) covers pixel-diff via `toHaveScreenshot`, runs only on `main` push + `workflow_dispatch`, and is informational rather than gating (see spec §2.0 for the full placement rubric).

The visual tier uses a separate `playwright.visual.config.ts` that runs against `npm run preview` (not the dev server) inside a webServer with `--strictPort` and `SKIP_GITHUB_FETCH=1`. Baselines are regenerated only inside the pinned Docker image `mcr.microsoft.com/playwright:v1.58.2-jammy` via `npm run test:e2e:update-baselines`. The `kitchen-sink.spec.ts` `beforeAll` guard hard-fails on host-machine `--update-snapshots` (override with `ALLOW_HOST_SNAPSHOT_UPDATE=1`).

Dependabot Playwright bumps are handled via the manual `.github/workflows/regen-visual-baselines.yml` `workflow_dispatch` workflow: the maintainer triggers it against the Dependabot branch, the workflow runs regen in the same Docker image, and opens an auto-PR with the new baselines for review. `e2e/visual/__snapshots__/**` is covered by `.github/CODEOWNERS` so baseline changes always require explicit maintainer approval.

Determinism patterns live in `e2e/fixtures/visual-determinism.ts`: `prepareContext(page)` (pre-`goto`, addInitScript-based) + `stabilizeForLayout(page, opts)` (post-`goto`). Full rationale and the helper API: `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md`.
```

Verify the inserted block fits the 200-300 word budget; if `>300`, trim further:

```bash
# Approximate word count of the §9 body (assumes the body is bounded by the next ## heading or EOF):
awk '/^## 9/,/^## [0-9]/' ARCHITECTURE.md | wc -w
```

```bash
head -1 ARCHITECTURE.md | cat -A | grep -q '\^M\$' && sed -i 's/\r$//' ARCHITECTURE.md
git -C . add ARCHITECTURE.md
git -C . commit -m "docs(architecture): update §9 Testing Architecture for tier model

Wave 4 step 5 (continued) of e2e-flakiness-remediation. Per spec
§6.6: ARCHITECTURE.md §9 stays summary-level (200-300 words);
the spec at docs/superpowers/specs/2026-04-19... is the canonical
detail-level reference."
```

---

### Task 4.6: Open Wave 4 PR + baseline-review checklist

- [ ] **Step 1: Push and open PR**

```bash
git -C . push
gh pr create --base main --head feat/e2e-wave-4-visual \
  --title "test(e2e) Wave 4: visual tier with Docker baselines" \
  --body "$(cat <<'EOF'
## Summary

Wave 4 of the E2E flakiness remediation (spec §6 Wave 4) — the final wave.

- Adds `e2e/visual/kitchen-sink.spec.ts` with the runtime guard against host-machine baseline regen
- Adds `.github/workflows/regen-visual-baselines.yml` (workflow_dispatch, opens auto-PR via PERSONAL_ACCESS_TOKEN so downstream CI fires)
- Generates the canonical baseline in Docker, commits the single PNG at `e2e/visual/__snapshots__/kitchen-sink.spec.ts/style-test-390w-chromium-linux.png`
- Removes the Wave 1 stopgap baseline (`e2e/_stopgap/`), the `stopgap` project entry from `playwright.config.ts`, and the `_stopgap`/`_verification` ignores from `eslint.config.js`
- Removes the superseded `e2e/visual-mobile.spec.ts` and its `testIgnore` entry
- Adds CODEOWNERS protection for `e2e/visual/__snapshots__/**` (recursive glob)
- Updates `ARCHITECTURE.md §9` with the final tier-model summary (200-300 word budget)

## Baseline-review checklist (check each box AFTER visual inspection)

- [ ] /blog/style-test rendered fully
- [ ] Fonts loaded (no fallback)
- [ ] Mermaid diagrams rendered (placeholder count parity + non-zero bbox)
- [ ] Reading mode applied (cream paper + Atkinson Hyperlegible)
- [ ] No devtools artifacts
- [ ] No employer name visible (per global obfuscation rule)

## Exit criteria (check each box AFTER verification on this PR's CI run / post-merge)

- [ ] e2e-visual passes on `main` (verify post-merge)
- [ ] Baseline-review checklist signed
- [ ] ARCHITECTURE.md §9 updated per §6.6

## Spec reference

`docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` §6 Wave 4 + §4 baseline strategy.
EOF
)"
```

- [ ] **Step 2: After merge, verify e2e-visual passes on main**

Watch the post-merge CI run:

```bash
gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I{} gh run view {} --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
```

Expected: `e2e-visual: success`. If failure, the canonical baseline doesn't match the CI rendering — this should NOT happen if the baseline was generated in the same Docker image, but if it does, regenerate via `gh workflow run regen-visual-baselines.yml -f target_branch=main`.

---

## Self-Review

Run this checklist after completing all five waves.

### Spec coverage check

For each section/requirement in the Rev 2 spec, point to the task that implements it:

- §0 Diagnosis Summary — Wave 2 Task 2.2 (empirical verification gate for the keyframe-leak claim)
- §1 Test Pyramid Assessment — Wave 3 Task 3.2 (spec moves), Wave 5 (pushdown)
- §1.1 Coverage Trade-Offs — informational only, no implementation needed
- §2.0 Tier placement rubric — Wave 3 Task 3.5 (ESLint configs enforce it)
- §2 Three-tier model — Wave 3 Task 3.1 (directories), 3.3 (configs)
- §2.1 Tag taxonomy — N/A (struck per Fix M1)
- §2.2 Workflow file shape — Wave 3 Task 3.4
- §2.3 Enforcement — Wave 3 Task 3.5
- §2.4 Helper sharing rules — Wave 3 Task 3.5 ESLint, Wave 2 Task 2.1 (helper location)
- §3 Determinism Patterns — Wave 2 Task 2.1 (helper module)
- §3.5 Locator strategy — referenced as guidance in Wave 2 Task 2.4 commits; testid additions are follow-ups not in scope of this plan
- §4 Baseline Strategy — Wave 4 Tasks 4.1-4.3 (kitchen-sink, runtime guard, Docker regen, package.json scripts)
- §5 Scope Decisions — Wave 3 Task 3.2
- §6 Migration Sequencing — this plan implements waves 1-2-3-5-4 in spec-mandated order
- §6.6 Final ARCHITECTURE.md §9 end-state — Wave 4 Task 4.5 Step 4
- §7 Out of Scope / §8 Open Questions — informational only
- §9 Resolutions Applied — informational only

**Gaps identified:**
- §3.5 Locator strategy mentions specific testid refactors. Wave 3 Task 3.2 Step 6.5 adds the single `data-testid="blog-tag-list"` needed to make the §1.1 mitigation tag-list test active (per Fix M2). The broader §3.5 rollout (`markdown-body`, `project-card`, `theme-toggle` → `getByRole`) is deferred (Defer D3); the smoke and functional specs work with current selectors and the further testid additions are an optimization, not a blocker.

### Placeholder scan

Search this plan for the patterns from the skill's "No Placeholders" section. Run:

```bash
grep -nE "(TBD|TODO|implement later|fill in details|\bsimilar to\b)" docs/superpowers/plans/2026-04-19-e2e-flakiness-remediation.md
```

Expected: zero matches that are actual instructions to a developer (matches inside code comments meant for the spec or matches like "Replace `<actual-path-to-png>` ..." are explicit fill-in-the-blank instructions, which are acceptable; pure "TBD" with no context are not).

### Type/identifier consistency

Cross-check that helper function names are consistent across all uses:
- `prepareContext(page, opts?)` — Tasks 2.1, 2.3, 2.4 (via fixture), 3.2 (smoke specs), 4.1
- `stabilizeForLayout(page, opts?)` — same task list
- `freezeAnimationsViaInitScript`, `skipHeroCascadeViaInitScript`, `waitForFonts`, `waitForMermaid`, `settleStyles` — exported from Task 2.1, optionally imported elsewhere

CI job names: `e2e-smoke`, `e2e-functional`, `e2e-visual` — used consistently in Tasks 3.4, 3.6, 4.4 (and not `e2e-funct` per Fix M4).

Config file names: `playwright.config.ts` (smoke + functional), `playwright.visual.config.ts` (visual) — used consistently.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-19-e2e-flakiness-remediation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Required sub-skill: `superpowers:subagent-driven-development`. Best for: minimizing context drift across the 5-wave migration; each wave's subagent gets a clean context window.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review. Best for: keeping all five waves in one continuous narrative if you want to see every commit happen sequentially.

Which approach?

---

## Resolutions Applied in Rev 2

Each fix below maps to a finding from the 6-agent adversarial review. Cross-reviewer convergence is noted where ≥2 reviewers found the same defect (highest-confidence blockers).

### Critical (7 / 7 applied)

- **C1** — ESLint flat-config silent-ignore: replaced Wave 3 Task 3.5 to edit `eslint.config.js` (flat config) with file-scoped overrides for `e2e/smoke/**` and `e2e/functional/**`; dropped the `.eslintrc.json` files entirely (they would have been silently ignored by ESLint 9). Convergence: Socratic-Q6 + F-ARCH-PLN-14 + F-ADV-PLN-01.
- **C2** — ESLint AST selectors structurally broken: corrected the `expect(X).toBe(Y)` selector path to `CallExpression[callee.type='MemberExpression'][callee.property.name='toBe'][callee.object.type='CallExpression'][callee.object.callee.name='expect']...`; added a symmetric stdin negative test for the tautology rule alongside the existing `waitForTimeout` negative test. Convergence: F-TQ-PLN-01 + F-TQ-PLN-02.
- **C3** — Cache id mismatch (4-way convergence — strongest signal): chose Option B and replaced `steps.cache-restore.outputs.cache-hit` with `needs.setup.outputs.cache-hit` in all three downstream jobs (cleaner — the setup job already declares the output but the plan's downstream jobs ignored it). Convergence: Socratic-Q4 + F-CONS-PLN-02 + F-TQ-PLN-05 + F-ADV-PLN-06.
- **C4** — Wall-clock assertion silently no-ops (4-way convergence): added dual JSON+HTML reporter on CI in `playwright.config.ts`; rewrote the smoke wall-clock guard as pure POSIX shell that hard-fails when `results.json` is missing (no `bc` dependency, no silent `|| echo 0` fallback). Convergence: Socratic-Q5 + F-CONS-PLN-03 + F-TQ-PLN-04 + F-ADV-PLN-07.
- **C5** — Wave 5 component-level pushdown multiply broken (3-way independent confirmation): added Step 0 `Read source` to each Wave 5 task; rewrote the Polish slugify test to assert ACTUAL diacritic-deletion behavior (`ksika-i-wiczenia`); fixed the frontmatter destructure to `{ content, frontmatter }`; refactored `App` to export `AppContent` so the test wraps the inner component in `<MemoryRouter>` without nesting routers. Convergence: F-ADV-PLN-02 + F-ADV-PLN-03 + F-ADV-PLN-04 + F-TQ-PLN-10.
- **C6** — Wave 2 verification spec broken comparison logic (2-way convergence): replaced the two-call `toHaveScreenshot` design (both calls compare against the same baseline — second call cannot detect a difference from the first) with a byte-comparison approach using `Buffer.equals()`; added explicit `test.describe.configure({ retries: 0 })` so a retry cannot mask the verification signal; dropped `--update-snapshots` from Step 2; simplified Step 3 to parse the `VERIFICATION RESULT:` line from the run output; amended Wave 1 to extend `testIgnore` for `e2e/_verification/**` before the verification spec lands. Convergence: F-TQ-PLN-23 + F-ADV-PLN-05.
- **C7** — Wave 5 + Wave 3 + Wave 4 directory cleanup state machine contradictory (multi-finding): removed the misleading "Delete: `e2e/_verification/`" / "Delete: `e2e/_stopgap/`" lines from the Files-list; added explicit Step 4.5 in Wave 3 Task 3.2 to delete `_verification`; added Step 4.6 explaining `_stopgap` stays; added a 4th `stopgap` project in `playwright.config.ts` for Wave 3 only so visual coverage doesn't drop to zero during Wave 3-4; added Wave 4 Task 4.3 Step 4 instructions to remove the `stopgap` project entry and the ESLint `_stopgap`/`_verification` ignores along with the directory deletion. Convergence: F-CONS-PLN-08 + F-ARCH-PLN-05 + F-ARCH-PLN-18.

### High (11 / 11 applied)

- **H1** — Branching cadence undefined: added `## Branching Strategy` section to the preamble plus literal "Step 0" branching preflight in Tasks 1.1, 2.1, 3.1, 5.1, 4.1 (each with the `git log main | grep "test(e2e) Wave N-1"` precondition check). Convergence: Socratic-Q1 + F-ARCH-PLN-01 + F-ADV-PLN-19.
- **H2** — Wave 1 stopgap pipeline silent-failure modes: added Step 0 (verify `test-results/` artifact uploaded), Step 4 prose update (verify no `--update-snapshots` in workflow), Step 1 retries:0, Step 5 download from `playwright-test-results` artifact, Step 5 loud-fail on empty `find`, and a Recovery subsection (revert + drop visual coverage if 2 retries fail). Convergence: F-ARCH-PLN-04 + F-ADV-PLN-10 + F-ADV-PLN-11.
- **H3** — Helper module never branches on Wave 2 verification result: made `freezeKeyframes` an opt-out parameter on `prepareContext`; added Step 5 in Wave 2 Task 2.2 documenting the PASS/FAIL branch consequence on the helper composition. Convergence: F-ARCH-PLN-03 + spec §0 + spec §6 Wave 2 step 2.
- **H4** — `regen-visual-baselines.yml` cannot trigger downstream CI: added `fetch-depth: 0`, replaced `secrets.GITHUB_TOKEN` with `secrets.PERSONAL_ACCESS_TOKEN` in checkout `token` and `gh pr create` env, documented the PAT requirement and the close-and-reopen fallback in the workflow header. Convergence: F-TQ-PLN-03.
- **H5** — Wave 1 stopgap spec triggers Wave 3 ESLint failure: added `ignores: ["e2e/_stopgap/**", "e2e/_verification/**"]` to BOTH smoke and functional file-scoped overrides in `eslint.config.js`; added Wave 4 Task 4.3 Step 4 instruction to remove the ignores once the directories are deleted. Convergence: F-TQ-PLN-13.
- **H6** — Negative ESLint test pollutes file (Wave 3 PR blocker): replaced Wave 3 Task 3.5 Steps 7-8 (file-pollution flow) with stdin-piped lint checks (`echo … | npx eslint --stdin --stdin-filename …`) for all three rules + a `git status` belt-and-suspenders check before commit; Step 8 removed entirely. Convergence: F-ADV-PLN-14.
- **H7** — `workflow_dispatch` trigger split across two YAML snippets: replaced with a single complete `e2e.yml` block that includes `workflow_dispatch` from the start; dropped the separate "Add the workflow_dispatch trigger near the top" snippet. Convergence: F-ADV-PLN-23 + F-CONS-PLN-07.
- **H8** — `index-layout.spec.ts` orphaned in Wave 3 (escapes ESLint): added `git -C . mv e2e/index-layout.spec.ts e2e/functional/index-layout.spec.ts` to Wave 3 Task 3.2 Step 1; updated PR body file enumeration. Convergence: F-CONS-PLN-04 + F-ADV-PLN-15.
- **H9** — `visual-mobile.spec.ts` never deleted: added Wave 4 Task 4.1 Step 7 to delete `e2e/visual-mobile.spec.ts`, the empty snapshots directory, and the `testIgnore` entry in `playwright.config.ts`. Convergence: F-CONS-PLN-05.
- **H10** — `snapshotPathTemplate` platform suffix mismatch: added the `-{platform}` token to the visual config's `snapshotPathTemplate` so baseline filenames carry the `-chromium-linux` suffix that every Wave 4 path reference assumes. Convergence: F-CONS-PLN-01.
- **H11** — Wave 2 Task 2.4 audit gate + per-spec subtask decomposition: added Step 0 audit phase (with truth-set capture), final Step gate (re-grep before Task 2.5), replaced "comment out and run" guidance with a hard-rule TODO+`test.fixme` policy, decomposed Subtasks 2.4.b through 2.4.g (one per spec, 6 specs total — corrected off-by-one), promoted the hero-cascade special case to a top-of-section boxed callout. Convergence: F-ADV-PLN-09 + F-ADV-PLN-15 + F-ADV-PLN-16.

### Medium (22 / 22 applied)

- **M1** — `_verification` deletion in Wave 3: covered by Fix C7. Files-list and Steps now match.
- **M2** — `data-testid="blog-tag-list"` rollout: chose Option (a) — added Wave 3 Task 3.2 Step 6.5 to add the testid to the React component so the tag-list height test runs (no longer permanently skipped). The broader §3.5 rollout stays deferred (Defer D3).
- **M3** — `no-restricted-imports` rule missing: added per-tier `no-restricted-imports` patterns to the smoke and functional file-scoped overrides in `eslint.config.js` (per Fix C1's snippet structure).
- **M4** — `test-fixtures/` repo-root directory not created: added `mkdir -p test-fixtures` + `touch test-fixtures/.gitkeep` to Wave 3 Task 3.1 Step 1.
- **M5** — `motion-wcag-session.spec.ts` REWRITE downgraded to MOVE: chose the deferral path — added an explicit "MOVE-only in Wave 3 — split deferred to Wave 6 follow-up. Tracking issue: #X" note in Wave 3 Task 3.2's Files list.
- **M6** — `mermaid` getBBox throws on hidden SVGs: wrapped the `getBBox().width > 0` check in `try/catch`; falsy result keeps the polling loop continuing instead of throwing.
- **M7** — Smoke `routes-load.spec.ts` selector `"h1"` too generic: replaced the `ROUTES` table with route-specific `getByRole("heading", { level: 1, name: /…/i })` and `.markdown-body` selectors per route + added `await expect(page).toHaveURL(...)` to catch client-side redirects to NotFound.
- **M8** — Smoke `reading-mode-swap.spec.ts` doesn't satisfy §2.0 rubric: rewrote to assert `response.status === 200` AND `.theme-reading` visible AND nested `.markdown-body` visible (primary content, not just the wrapper).
- **M9** — `test.beforeAll(({}, testInfo) => …)` empty-pattern destructure: changed to single-arg `(testInfo) =>` form.
- **M10** — `test.skip` semantics in tag-list test: added explicit `return` after `test.skip(...)` so subsequent code does not run.
- **M11** — ARCHITECTURE.md §9 budget mismatch + location ambiguity: added a `grep -n '^## 9'` prerequisite to Step 4, trimmed the example body (replaced markdown table with three sentences) to fit 200-300 words, and added a final-state `wc -w` check.
- **M12** — `scripts/update-github-stats.ts` modification orphaned: added the spec-§2.2 reference to the Step 7 inline comment AND included the suggested commit message that makes the implicit-spec-requirement-now-explicit-plan-task linkage clear.
- **M13** — `git -C .` redundancy: chose the lighter touch (added a top-of-plan note clarifying that `git -C .` assumes the executor's CWD is the blog submodule root, with the absolute-path fallback) — avoids a 50-edit mass-rename with low value.
- **M14** — PR-body checked-state vs verification-before-completion rule: changed all PR-body checkboxes from `[x]` to `[ ]` and added "(check each box AFTER verification on this PR's CI run)" headers.
- **M15** — CRLF guard repetition (~30 inline checks): added `## CRLF discipline` preamble section recommending a one-time `.gitattributes` (`* text=auto eol=lf`, `*.png binary`); the per-step CRLF checks remain as belt-and-suspenders but are now noted as not load-bearing.
- **M16** — HEREDOC backslash-escaped backticks: dropped the backslashes from all 5 PR-creation `gh pr create` HEREDOCs (`'EOF'` single-quoted HEREDOC needs no escaping).
- **M17** — Wave 5 wall-clock comparison stash dance + missing SHA discovery: replaced `git stash` + `git checkout` dance with `git worktree add ../wave-3-baseline "$WAVE3_SHA"` + worktree removal; added `WAVE3_SHA=$(git log --oneline main | grep "test(e2e) Wave 3" | head -1)` discovery instead of the `<wave-3-merge-sha>` placeholder.
- **M18** — Wave 4 Task 4.4 SKIP verification too weak: replaced the string-match check with `[ "$result" = "skipped" ] || { echo "::error::...; exit 1; }` hard assertion.
- **M19** — webServer baseURL `127.0.0.1` vs `localhost` mismatch potential: standardized on `127.0.0.1` in `playwright.config.ts` (smoke + functional) to match `playwright.visual.config.ts`.
- **M20** — CODEOWNERS pattern not recursive: changed `e2e/visual/__snapshots__/` to `e2e/visual/__snapshots__/**` (recursive glob) since snapshots live one level deeper than the bare directory.
- **M21** — Per-wave ARCHITECTURE.md updates omitted: added a `## Per-wave ARCHITECTURE.md note` preamble section explaining the deferral to Wave 4 Task 4.5 with explicit accept-the-risk language.
- **M22** — Stylesheet route fixture verification missing: added `## Prerequisite verification — /blog/style-test route` preamble section requiring confirmation that `src/pages/content/blog/style-test.md` exists + is registered in `src/features/blog/data.ts` before Wave 1 starts.

### Low (5 / 5 applied)

- **L1** — `waitForFonts` no timeout: added a `timeoutMs = 10_000` watchdog that races `document.fonts.ready` against a `setTimeout` rejection so a stalled FontFaceSet cannot hang the run.
- **L2** — Strict-mode-friendly Vitest assertions: added `expect(...).not.toBeNull()` + `if (!x) throw new Error("unreachable")` type narrowing in Wave 5 Task 5.1's `MarkdownRenderer.test.tsx` and Task 5.3's slugify test before chaining `.className` / `.getAttribute`.
- **L3** — `gh workflow run` uses display name instead of file: changed Wave 2 Task 2.5 Step 2 to dispatch via `e2e.yml` instead of `"Playwright E2E Tests"`.
- **L4** — `[skip ci]` directive consideration: deferred per brief (operational hygiene; no current pain) — noted under Defer D4.
- **L5** — Wave 5 `prepareContext` overhead on smoke routes: added a comment near the imports in Wave 3 Task 3.2 Step 8's smoke `routes-load.spec.ts` documenting that the cascade-skip is harmless on non-`/` routes and that animation-kill is universally beneficial for smoke tier.

### Deferred (7 — NOT applied in Rev 2)

- **D1** — `git -C .` mass-rename: addressed by Fix M13 (lighter touch — top-of-plan note); ~50-edit mass-rename has low value.
- **D2** — `motion-wcag-session.spec.ts` REWRITE split: handled by Fix M5 (deferral path) — clean split requires careful judgment beyond mechanical refactoring.
- **D3** — Detailed `data-testid` rollout for §3.5 locator strategy: Self-Review acknowledges as follow-up. Rev 2 adds the testid for `blog-tag-list` (Fix M2 Option a); broader rollout (`markdown-body`, `project-card`, `theme-toggle` → `getByRole`) deferred.
- **D4** — `[skip ci]` directive on auto-PR: operational hygiene; no current pain.
- **D5** — `font-display: optional` test-mode toggle: spec-level decision (changes CSS behavior); deferred to follow-up.
- **D6** — Plan-wide commit-message metadata preservation on squash: cosmetic; documented once at top of plan rather than per-task (covered implicitly by the no-Co-Authored-By rule in the workspace conventions).
- **D7** — Estimate doubling beyond H7: plan estimate matches spec H7 — no further inflation needed; informational.

### Conservative-choice notes

- **C3** picked Option B (single source of truth via `needs.setup.outputs.cache-hit`) over Option A (adding `id: cache-restore` to each downstream cache step) — Option B is cleaner and the brief flagged it as preferred.
- **H10** picked option 1 (add `-{platform}` token to the visual config snapshotPathTemplate) over option 2 (drop `-chromium-linux` from every Wave 4 reference) — fewer changes, matches existing convention from Wave 1 stopgap.
- **M2** picked option (a) (add the testid) over option (b) (delete the test) — keeps the §1.1 mitigation coverage active rather than dropping it.
- **M5** picked the deferral path (track as Wave 6 follow-up) over an in-Wave-3 split — clean split requires judgment beyond the mechanical Wave 3 scope.
- **M13** picked the top-of-plan note over the mass-rename — less disruptive to the diff.
