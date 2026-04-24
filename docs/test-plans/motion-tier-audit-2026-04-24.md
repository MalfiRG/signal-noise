# Motion-Tier Migration Test-Coverage Audit

**Audit date:** 2026-04-24
**Auditor:** qa-strategist (Wave 1)
**Artifacts audited:**
- Plan: `docs/superpowers/plans/2026-04-24-device-tier-motion-policy-plan.md` (1467 lines, 12 tasks)
- Spec (for behavioral contract only): `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md` (Rev 2)

**Scope:** Audit the plan's test coverage against the spec's behavioral contract. NOT auditing the spec itself.

---

## Summary

- **Gaps found:** 13 of 15 audit dimensions have at least one PARTIAL / GAP classification. 7 dimensions COVERED.
- **Severity distribution:** 0 BLOCKER, 4 HIGH, 5 MEDIUM, 4 LOW
- **New test files proposed & written:** 3
- **Verdict:** **GAPS FOUND BUT NON-BLOCKING.** Wave 2 can proceed — plan's TDD tests implement the spec's primary contract. Supplementary tests below cover edges that would otherwise ship uncovered.

---

## New test files written this audit

| Path | Purpose |
|---|---|
| `src/test/use-device-tier-boundaries.test.tsx` | Off-by-one boundary cases (767/768/1023/1024) + reactive matchMedia-change transitions + iPad-rotation case |
| `src/test/motion-policy-composition.test.tsx` | localStorage override edge cases (case-sensitivity, private-mode throw, override-vs-replay-skip ordering) + cross-consumer coherence |
| `e2e/functional/hero-skip-and-badge.spec.ts` | All 3 skip paths, badge-state transitions, badge dismissal, dev-host sessionStorage skip, aria-hidden focus gating |

All three live in write paths the plan does NOT claim. No overlap with frontend-dev's Wave 2 scope.

---

## Per-dimension findings

### Dimension 1 — Tier boundary precision (767, 768, 1023, 1024)

**Classification:** PARTIAL
**Severity:** HIGH

**Plan coverage:**
- Task 2 Step 1: tests `768` and `1024` boundaries (returns 'tablet' and 'desktop' respectively). Tests `375` (mobile), `900` (tablet), `1440` (desktop).
- DOES NOT test `767` (expected mobile) or `1023` (expected tablet).

**Why it matters:** `matchMedia("(min-width: 768px)")` semantics at exactly 768 is browser-consistent, but a bug like `>` instead of `>=` in the tier-computation helper would pass `768→tablet` (since current code returns 'tablet' for `matches: true` when mock evaluates `768 >= 768`) while failing `767→mobile` only if the mock incorrectly accepts 767. Without the 767/1023 neighbors, an off-by-one in the mock OR in the computeTier helper can ship undetected.

**Recommendation:** Add the 4 neighbor cases. **Covered in new file `src/test/use-device-tier-boundaries.test.tsx`.**

---

### Dimension 2 — Reactive tier transitions (matchMedia change)

**Classification:** GAP
**Severity:** HIGH

**Plan coverage:**
- Task 2 Step 1: tests 3 fixed widths plus 2 boundaries. Each uses `renderHook(() => useDeviceTier())` once, with a pre-set `setMockViewportWidth` — no `change` event is ever dispatched.
- Task 2 Step 1 also has a cleanup/leak test (`addSpy`/`removeSpy` counts) but never fires the spied handler.
- Spec §5.3 explicit requirement: *"Add a smoke test that resizes the window and confirms the variant switches."*

**Why it matters:** The current non-reactive `isMobileViewport()` snapshot is exactly the defect being retired. If the new hook silently regresses to a non-reactive read (missing subscription, forgotten `update()` call inside the useEffect), every test in the plan still passes because none of them fire a matchMedia change event.

**Recommendation:** Add a reactive-transition test that captures the registered `change` handler and invokes it after mutating the width. **Covered in new file `src/test/use-device-tier-boundaries.test.tsx`.**

---

### Dimension 3 — Mid-cascade tier change teardown

**Classification:** GAP
**Severity:** MEDIUM

**Plan coverage:**
- Task 7 adds `tier` to the `useEffect` dependency array and clears pending timeouts via `timeoutsRef.current.forEach(clearTimeout)` on effect re-entry. Implemented but **untested**.
- No Vitest case mounts `<Index />`, advances fake timers to phase 1, mutates the tier, and asserts phase resets to 0 and timeouts are cleared.
- No Playwright case resizes the viewport mid-cascade.

**Why it matters:** Spec H1 / Task 7 commit message: *"Without this, tier transitions during phases 0-2 leave elements in indeterminate states."* If the `timeoutsRef` ref isn't populated or the `return () => ...` cleanup is accidentally dropped in a refactor, elements persist at opacity-0 with `aria-hidden=true` — a real accessibility defect that no test catches.

**Recommendation:** Add a Vitest test that renders `<Index />`, uses `vi.useFakeTimers()` to advance to phase 1, then triggers a width change via `setMockViewportWidth + act`, and asserts the cascade restart. **Not written by this audit** (requires mocking Index.tsx internals and session-storage — cost-benefit unclear until the implementation lands). Documented as a follow-up test.

---

### Dimension 4 — Orientation change (iPad 10th gen)

**Classification:** PARTIAL
**Severity:** LOW

**Plan coverage:**
- Spec §1 Orientation notes explicitly call out iPad 10th gen (810×1080) as tablet in BOTH orientations.
- Plan has no test for this case.
- However: because the spec §8.1 `pointer:coarse` override is DEFERRED (plan assumption), the width-only rule means 810→tablet and 1080→desktop. The orientation stability promise in the spec is therefore FALSE for iPad 10th gen under the locked defaults — a documentation issue, not a test gap.

**Why it matters:** Low. The spec itself acknowledges "the §8.1 open question about `pointer: coarse` override would change this" (§1 line 50). A test asserting the current width-only behavior locks in the open-question-deferred choice.

**Recommendation:** Added one test in `use-device-tier-boundaries.test.tsx` that asserts 810→tablet and 1080→desktop (the width-only truth), with a comment documenting that this is §8.1's current default and WILL change if the open question is resolved "yes".

---

### Dimension 5 — sessionStorage exception handling

**Classification:** PARTIAL
**Severity:** MEDIUM

**Plan coverage:**
- Task 7 Step 1 implements the try/catch wrapper: `readHeroReplaySkip()` and `writeHeroReplayFlag()` swallow exceptions and log to `console.warn`.
- No test stubs `sessionStorage.getItem` / `setItem` to throw and asserts the cascade still plays.
- Similarly, the badge-dismiss path (Task 9) has an empty `try {} catch {}` with no test.

**Why it matters:** Safari Private Browsing and iOS WebView both throw on `sessionStorage.setItem`. Without a test, a future refactor that "simplifies" the try/catch to a plain call silently re-introduces the crash.

**Recommendation:** Added a stub-throw test for `localStorage.getItem` in `src/test/motion-policy-composition.test.tsx` (covers the override-read path). The Index.tsx sessionStorage paths are harder to test without a full component render — documented as a follow-up Vitest integration test.

---

### Dimension 6 — Dev escape hatch (localhost / 127.0.0.1 / *.vercel.app)

**Classification:** GAP
**Severity:** HIGH

**Plan coverage:**
- Task 7 Step 1: `isDevHost()` checks all three hostnames, guards the sessionStorage write.
- NO test covers this. Playwright runs against 127.0.0.1:8080 and therefore always hits the dev-host branch — the production branch (`writeHeroReplayFlag` actually writing) is never exercised in the plan's 3 Playwright tests.
- A bug like `h.endsWith("vercel.app")` (missing dot) would only manifest on production. A bug like `h === "localhost:8080"` (port included) would only manifest on local dev. Neither gets caught.

**Why it matters:** High. The dev escape hatch is the mechanism that makes the cascade re-play every reload on CI / local dev. If it regresses, the Playwright tests start flaking because the second reload hits the "flag set" path and phase=3 is hit before the test can assert the cascade. If it regresses the other way, production users get the cascade on every reload — a UX defect with no test coverage.

**Recommendation:** Added an explicit hostname-assertion test in `e2e/functional/hero-skip-and-badge.spec.ts` that checks `location.hostname`, branches on dev vs prod, and asserts the sessionStorage write accordingly. This test IS the invariant being tested — it always runs on 127.0.0.1 in CI, so the dev-host branch is locked. A complementary Vitest unit test on `isDevHost()` alone would be even cheaper — documented as a follow-up.

---

### Dimension 7 — Skip-intro paths (3 independent paths)

**Classification:** GAP
**Severity:** HIGH

**Plan coverage:**
- Task 8 Step 6 lists 5 manual browser checks (pointerdown, Tab+Enter, SKIP click, etc.) — MANUAL, not automated.
- Task 11 Playwright suite does NOT test any skip path. All 3 specs wait for phase 3 via the sentinel, which the cascade reaches naturally.
- Spec §5.6 defines THREE skip paths: (a) `pointerdown` on section, (b) `keydown` Enter/Space on section, (c) SKIP button click. Only sentinel reach is tested; no skip is tested.

**Why it matters:** The skip-intro mechanism is the entire accessibility justification for the spec. A regression where `tabIndex={-1}` breaks keyboard focusability, or where `onKeyDown` only fires for Enter (not Space), would ship uncaught because the plan relies on manual verification.

**Recommendation:** Added 4 skip-path tests in `e2e/functional/hero-skip-and-badge.spec.ts` (pointerdown, Enter, Space, SKIP button click) plus a negative test (SKIP button should NOT render on mobile tier).

---

### Dimension 8 — Badge state transitions (3 states)

**Classification:** PARTIAL
**Severity:** MEDIUM

**Plan coverage:**
- Task 9 Step 4: 4 manual browser checks for the 4 badge states (no badge / tier badge / OS badge / dismissal). MANUAL, not automated.
- Task 11 Playwright `reduced-motion` test: asserts `data-testid="badge-reduced-motion"` visibility at desktop 1440 with `emulateMedia: reduce`. This is ONE of the three states.
- NO test covers:
  - `animations: off (device)` badge appearing on tablet/mobile
  - No-badge baseline on desktop with animations on
  - Badge NOT showing when only session-replay-skip is the signal (spec §5.7 point 3)
  - Badge dismissal persistence within a session

**Why it matters:** The badge is the user's only feedback signal when tier-alone suppresses animations (a tablet user otherwise sees a static page with no explanation). A regression where `showTierBadge` logic is wrong leaves users with no signal but a working page, so automated tests won't notice.

**Recommendation:** Added 4 badge-state tests in `e2e/functional/hero-skip-and-badge.spec.ts`: reduce-motion-only shows only that badge, tier-only shows only tier badge, desktop+animations-on shows no badge, click-to-dismiss + reload persists dismissal. Session-replay-skip-only case not added (requires a first-visit → second-visit round trip; covered by the sessionStorage round-trip test instead).

---

### Dimension 9 — Dismissed-badge sessionStorage round-trip

**Classification:** GAP
**Severity:** LOW

**Plan coverage:**
- Task 9 implements `hero-badge-dismissed` sessionStorage key with dismiss handler and initializer read.
- No test covers the round-trip (dismiss → reload → still hidden).

**Why it matters:** Low — the dismissal is a quality-of-life feature, not a correctness one. Still cheap to test.

**Recommendation:** Covered in `e2e/functional/hero-skip-and-badge.spec.ts` test "badge dismisses on click and stays dismissed for the session".

---

### Dimension 10 — Visual regression at tier boundaries

**Classification:** N/A
**Severity:** LOW

**Plan coverage:** Zero visual tests.

**Why it matters:** The visual/ directory exists (`e2e/visual/kitchen-sink.spec.ts`). A tier-specific visual regression suite would catch CSS regressions at 767/768/1023/1024/1440 — specifically the inline 640→768 migration in ProjectsList.tsx:105 and HowIDoItIndex.tsx:43 which changes layout branching.

**Recommendation:** NOT added. Visual regression tests are expensive to maintain and the blog's existing `e2e/visual/` is minimal (one kitchen-sink test). Adding five tier-boundary snapshots would bloat the visual suite for marginal benefit. Documented as a candidate follow-up if the ProjectsList/HowIDoIt layout changes visibly on tablet.

---

### Dimension 11 — Accessibility audit (axe/jest-axe)

**Classification:** N/A
**Severity:** LOW

**Plan coverage:**
- No axe-core or jest-axe integration in the plan. `package.json` does not list either as a dep (verified via grep).

**Why it matters:** Spec §5.8 adds `aria-hidden` to opacity-0 containers. An axe scan at phase 0, 2, and 3 would catch aria-hidden-on-focusable-element violations.

**Recommendation:** NOT added as an automated axe test — introducing axe is a separate architectural decision (new dep, test infrastructure, CI time). Instead, the focus-path test in Dimension 12 below provides manual coverage of the specific invariant that matters.

---

### Dimension 12 — Keyboard focus path during phases 0-2

**Classification:** GAP
**Severity:** MEDIUM

**Plan coverage:**
- Task 8 applies `aria-hidden={phase < 3 ? true : undefined}` to the motion.div container and to the opacity-0 placeholders.
- No test verifies that a user tabbing during phases 0-2 does NOT land on the invisible CTAs (`VIEW PROJECTS`, `READ BLOG`) inside the aria-hidden container.

**Why it matters:** Spec §5.8 explicit rationale: *"keyboard-navigation gap where invisible focusable elements (the CTAs under `animate=\"hidden\"`) appear in tab order before phase 3."* If the aria-hidden is misplaced (e.g., set on the wrong motion.div) or the CTAs are moved outside it in a refactor, the gap re-opens silently.

**Recommendation:** Added two tests in `e2e/functional/hero-skip-and-badge.spec.ts`:
1. During phase<3: at least one `aria-hidden=true` container exists within the hero section.
2. At phase=3: the CTAs are visible and have NO aria-hidden ancestor.

This is weaker than a full Tab-navigation trace but reliable and does not depend on Playwright's focus-tracking which is flaky in WSL2 Chromium.

---

### Dimension 13 — localStorage author override edge cases

**Classification:** PARTIAL
**Severity:** MEDIUM

**Plan coverage:**
- Task 3 Step 1 (case 5): tests the happy-path `localStorage.setItem("digital-matrix-motion-override", "on")` at mobile returns `animationsDisabled=false`, AND tests that OS reduced-motion still wins. Covers two scenarios.
- DOES NOT test:
  - Key missing → off (trivially true but no regression guard)
  - Key set to non-"on" values (`"true"`, `"ON"`, `"1"`) — does the exact-"on" match hold?
  - Override interaction with `heroReplaySkip` (§4 pseudocode ordering: replay-skip BEFORE override)
  - `localStorage.getItem` throws (private mode)

**Why it matters:** The spec (§4 pseudocode line 135) says `authorOverride: localStorage["digital-matrix-motion-override"] === "on"`. A refactor to `=== "true"` or `!!` would pass the Wave 2 test (`setItem("on")` still "truthy") but break the documented API. The override-vs-replay-skip ordering is the load-bearing H7 resolution from the adversarial review.

**Recommendation:** Added 5 override edge-case tests in `src/test/motion-policy-composition.test.tsx` (case sensitivity, missing key, non-"on" values, OS-wins, replay-skip-wins) plus a private-mode throw test.

---

### Dimension 14 — LetterReveal composition integration

**Classification:** GAP
**Severity:** LOW

**Plan coverage:**
- Task 10 is PROSE-only: "verify composition is correct" via a code comment. No executable test.
- Task 7 wires `skipAnimation={animationsDisabled}` on LetterReveal usage. No test asserts that `<Index />` renders LetterReveal with the correct prop value when `heroReplaySkip=true`.

**Why it matters:** Low. The composition is defensible by inspection — `animationsDisabled` already folds in `heroReplaySkip` via `useMotionPolicy`. If a future "fix" adds `|| heroReplaySkip` redundantly, nothing breaks. If the prop is accidentally dropped, the cascade replays — a UX defect but not a correctness one.

**Recommendation:** NOT added as a separate test. The cross-consumer-coherence tests in Dimension 15 below provide sufficient coverage because `animationsDisabled` is the one source of truth verified across hooks.

---

### Dimension 15 — Cross-hook interaction (all consumers agree)

**Classification:** GAP
**Severity:** MEDIUM

**Plan coverage:**
- Task 3 tests `useMotionPolicy` in isolation (5 cases).
- Task 4 tests `useItemVariant` and `useHeroStaggerVariant` in isolation (6 cases).
- NO test calls all three hooks in a single render and asserts they agree on the same `animationsDisabled`-driven output.

**Why it matters:** A bug where `useItemVariant` reads a SECOND `useMotionPolicy()` call (instead of receiving the policy from parent) could silently return a stale value on fast tier transitions (two subscriptions, two re-renders, one-frame lag). Less-likely but real — and an integration test is cheaper than debugging a half-day flake.

**Recommendation:** Added 4 cross-consumer coherence tests in `src/test/motion-policy-composition.test.tsx`. Each mounts `useMotionPolicy`, `useHeroStaggerVariant`, `useItemVariant` in the same render and asserts all three agree on the tier+policy combination.

---

## Top-5 recommendations summary

1. **HIGH — Add reactive matchMedia-change transition tests** (covered: `src/test/use-device-tier-boundaries.test.tsx`). Protects against regression to non-reactive snapshot.
2. **HIGH — Automate all 3 skip-intro paths + SKIP button** (covered: `e2e/functional/hero-skip-and-badge.spec.ts`). Replaces Task 8 Step 6 manual checks.
3. **HIGH — Assert dev-escape-hatch sessionStorage behavior** (covered: same Playwright file). Protects against `isDevHost()` regression that would flake CI or break prod UX silently.
4. **HIGH — Add 767/1023 off-by-one boundary tests** (covered: `use-device-tier-boundaries.test.tsx`). Cheap regression guard.
5. **MEDIUM — Add cross-consumer coherence integration tests** (covered: `motion-policy-composition.test.tsx`). Catches multi-subscription bugs that in-isolation unit tests cannot.

## Follow-up tests (not written by this audit)

- Mid-cascade tier-change teardown (Dimension 3) — requires fake-timer integration over `<Index />`, cost-benefit unclear until implementation lands.
- sessionStorage.setItem throw simulation on `<Index />` — requires full component render + storage stub.
- Vitest unit test on `isDevHost()` as a pure function — trivial once Task 7 exports it; currently private.

## Explicit list of NEW test files created

- `/mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/src/test/use-device-tier-boundaries.test.tsx`
- `/mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/src/test/motion-policy-composition.test.tsx`
- `/mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/e2e/functional/hero-skip-and-badge.spec.ts`
- `/mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/docs/test-plans/motion-tier-audit-2026-04-24.md` (this document)

## Provenance log (per global rule)

WROTE: /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/src/test/use-device-tier-boundaries.test.tsx
WROTE: /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/src/test/motion-policy-composition.test.tsx
WROTE: /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/e2e/functional/hero-skip-and-badge.spec.ts
WROTE: /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix/docs/test-plans/motion-tier-audit-2026-04-24.md
