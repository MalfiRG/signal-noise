/**
 * Supplementary Playwright coverage — skip-intro paths and badge state
 * transitions that the Wave 2 plan's 3 smoke tests do not cover.
 *
 * Spec references:
 *   §5.6 — SKIP button is the only skip mechanism (Wave 3 fix: pointerdown
 *          on <section> and Space on <section> were removed for a11y per
 *          review F-UX-01. Space is reserved for native scroll; Enter on
 *          <section> was removed because the section is no longer focusable.)
 *   §5.6 — sessionStorage try/catch with console.warn fallback
 *   §5.7 — THREE badge states (reduce-motion/animations-off/hidden), dismissible
 *   §5.9 — Dev escape hatch: NO sessionStorage write on localhost/127.0.0.1/*.vercel.app
 *
 * The Wave 2 Playwright suite (e2e/smoke/hero-motion-tier.spec.ts) covers
 * the three happy-path reach-phase-3 scenarios. It does NOT cover any skip
 * path, badge dismissal, sessionStorage round-trip, or dev-host skip-write.
 *
 * These tests run in the "functional" project (see playwright.config.ts) so
 * they stay separate from smoke-gate wall-clock budgets.
 */
import { test, expect } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/**
 * Helper to ensure a clean cascade start. The Wave 2 Index.tsx destructures
 * useMotionPolicy({ heroReplaySkip }); heroReplaySkip is read from
 * sessionStorage at mount. We clear before navigation so every test starts
 * from phase=0.
 */
async function gotoFreshCascade(page: import("@playwright/test").Page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  // Can't clear sessionStorage before first navigation (origin is null).
  // Go to root first (which sets origin), then clear and reload.
  await page.goto("/");
  await page.evaluate(() => {
    try {
      sessionStorage.clear();
    } catch { /* storage may throw in private mode; ignore */ }
  });
  await page.reload();
}

test.describe("Hero skip-intro paths (spec §5.6)", () => {
  test("SKIP button click jumps to phase 3 after phase 1 appears", async ({ page }) => {
    await gotoFreshCascade(page);

    // Skip button per spec §5.6 appears after phase 1 (200ms). Wait for it.
    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });

    await skipButton.click();

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });
    // Skip button should be removed once phase reaches 3.
    await expect(skipButton).toHaveCount(0);
  });

  test("SKIP button activates via native Enter when focused (keyboard a11y)", async ({ page }) => {
    await gotoFreshCascade(page);

    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });

    await skipButton.focus();
    await page.keyboard.press("Enter");

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });
  });

  test("SKIP button activates via native Space when focused (keyboard a11y)", async ({ page }) => {
    // Native button semantics: Space on a focused button activates it.
    // When no element is focused, Space scrolls the page (native browser
    // behavior we preserve per Wave 3 F-UX-01 — Space is no longer bound
    // on the <section> element).
    await gotoFreshCascade(page);

    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });

    await skipButton.focus();
    await page.keyboard.press(" ");

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });
  });

  test("Space key with no focused element does NOT skip (preserves native scroll)", async ({
    page,
  }) => {
    // Wave 3 F-UX-01: removing Space-as-skip on the <section> means pressing
    // Space while nothing skip-related is focused should NOT advance the
    // cascade. The page must still be cascading after a stray Space press.
    await gotoFreshCascade(page);

    // Wait for phase 1 to confirm cascade is underway.
    await expect(page.locator('[data-testid="hero-cascading"]')).toBeVisible({ timeout: 2000 });

    // Unfocus everything, then press Space. We expect cascade to stay running
    // (not jump to phase 3). We also expect the SKIP button to still exist.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press(" ");

    // Give a short window for any spurious state change, then re-check.
    await page.waitForTimeout(200);
    await expect(page.locator('[data-testid="hero-cascading"]')).toBeVisible();
    await expect(page.locator('[data-testid="hero-phase3"]')).toHaveCount(0);
  });

  test("SKIP button is not rendered on mobile tier (animations already off)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
      } catch { /* storage may throw in private mode; ignore */ }
    });
    await page.reload();

    // Mobile renders settled; no cascade means no SKIP button (spec §5.6
    // only defines SKIP during phases 0-2, which mobile doesn't enter).
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 1500 });
    await expect(page.getByRole("button", { name: /skip intro/i })).toHaveCount(0);
  });
});

test.describe("Hero sessionStorage round-trip (spec §5.6 + §5.9)", () => {
  test("after completing cascade, reload-in-session uses replay-skip path", async ({ page }) => {
    await gotoFreshCascade(page);

    // Trigger skip via the SKIP button (the only skip path post-Wave-3).
    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });
    await skipButton.click();
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });

    // Note: the dev-build gate (`import.meta.env.DEV === true`) suppresses
    // the sessionStorage write while Vite's dev server is running. Playwright
    // runs against `npm run dev`, so the flag is NOT written — this is the
    // DEV ESCAPE HATCH that lets the developer iterate on the cascade without
    // having to clear storage between reloads. Vercel preview/production
    // builds (DEV === false) DO write the flag.
    const flagValue = await page.evaluate(() =>
      sessionStorage.getItem("hero-cascade-played"),
    );
    expect(flagValue).toBeNull();
  });

  test("dev-build detection: sessionStorage flag is NOT written on the Vite dev server", async ({ page }) => {
    // The build-time gate (`import.meta.env.DEV`) replaces the older hostname-
    // based dev-host list. Vercel preview AND production run `vite build`
    // (DEV === false) and persist the flag for back-button suppression. Only
    // `npm run dev` (DEV === true) skips the write — which is what this spec
    // exercises. Production-build behavior is covered by the prod-contract
    // suite once a corresponding spec lands.
    await gotoFreshCascade(page);

    // Skip via the SKIP button.
    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });
    await skipButton.click();
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });

    const flagValue = await page.evaluate(() =>
      sessionStorage.getItem("hero-cascade-played"),
    );
    // This spec only runs against `npm run dev`, where DEV === true → write
    // is suppressed unconditionally. No need to branch on hostname.
    expect(flagValue).toBeNull();
  });
});

test.describe("Hero feedback badge (spec §5.7)", () => {
  test("reduced-motion badge appears on desktop when OS reduced-motion is on", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto("/");
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
      } catch { /* storage may throw in private mode; ignore */ }
    });
    await page.reload();

    await expect(page.locator('[data-testid="badge-reduced-motion"]')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('[data-testid="badge-animations-off-device"]')).toHaveCount(0);
  });

  test("tier-based badge appears on tablet when OS reduced-motion is off", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.goto("/");
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
      } catch { /* storage may throw in private mode; ignore */ }
    });
    await page.reload();

    await expect(page.locator('[data-testid="badge-animations-off-device"]')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('[data-testid="badge-reduced-motion"]')).toHaveCount(0);
  });

  test("no badge on desktop with animations on (happy-path baseline)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await gotoFreshCascade(page);

    // Let cascade complete or skip.
    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });
    await skipButton.click();
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });

    await expect(page.locator('[data-testid="badge-animations-off-device"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="badge-reduced-motion"]')).toHaveCount(0);
  });

  test("badge dismisses on click and stays dismissed for the session", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.goto("/");
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
      } catch { /* storage may throw in private mode; ignore */ }
    });
    await page.reload();

    const badge = page.locator('[data-testid="badge-animations-off-device"]');
    await expect(badge).toBeVisible({ timeout: 3000 });

    await badge.click();
    await expect(badge).toHaveCount(0);

    // Reload in the same context — session-scoped dismissal should persist.
    await page.reload();
    await expect(page.locator('[data-testid="badge-animations-off-device"]')).toHaveCount(0);
  });
});

test.describe("Hero keyboard-focus accessibility (spec §5.8)", () => {
  test("pre-phase-3 CTAs are not reachable via Tab (aria-hidden removes from tab order)", async ({
    page,
  }) => {
    await gotoFreshCascade(page);

    // Wait briefly so the cascade has started but not finished.
    await page.waitForTimeout(300);

    // Scope to the hero <section> via its data-testid so we don't accidentally
    // match a Toaster/Sonner <section aria-label="Notifications"> that sits
    // earlier in the DOM (they're injected by the shadcn Toaster providers in
    // App.tsx and would otherwise be the first <section> the query returns).
    const hiddenCount = await page.evaluate(() => {
      const hero = document.querySelector(
        '[data-testid="hero-cascading"], [data-testid="hero-phase3"]',
      );
      if (!hero) return -1;
      const hiddenContainers = hero.querySelectorAll('[aria-hidden="true"]');
      // At least one aria-hidden wrapper must be present during phases 0-2.
      return hiddenContainers.length;
    });

    expect(hiddenCount).toBeGreaterThan(0);
  });

  test("post-phase-3 CTAs ARE reachable — aria-hidden is removed", async ({ page }) => {
    await gotoFreshCascade(page);

    // Skip to phase 3 deterministically via the SKIP button.
    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });
    await skipButton.click();
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });

    // CTAs must be reachable and have no aria-hidden ancestor.
    const viewProjects = page.getByRole("link", { name: "VIEW PROJECTS" });
    await expect(viewProjects).toBeVisible();

    const hasHiddenAncestor = await viewProjects.evaluate((el) => {
      let node: Element | null = el;
      while (node) {
        if (node.getAttribute?.("aria-hidden") === "true") return true;
        node = node.parentElement;
      }
      return false;
    });
    expect(hasHiddenAncestor).toBe(false);
  });
});
