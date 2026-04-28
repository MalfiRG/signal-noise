// Spec §5.6 SKIP-only, §5.7 badge states, §5.9 dev-host escape hatch
import { test, expect } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

async function gotoFreshCascade(page: import("@playwright/test").Page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  // No origin before first navigation — clear after goto then reload
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

    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });

    await skipButton.click();

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });
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
    // Wave 3 F-UX-01 — Space is reserved for native scroll; only focused button activates
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
    // Wave 3 F-UX-01 — Space without focus must not skip
    await gotoFreshCascade(page);

    await expect(page.locator('[data-testid="hero-cascading"]')).toBeVisible({ timeout: 2000 });

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press(" ");

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

    // spec §5.6 — SKIP is phases 0-2 only; mobile renders settled
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 1500 });
    await expect(page.getByRole("button", { name: /skip intro/i })).toHaveCount(0);
  });
});

test.describe("Hero sessionStorage round-trip (spec §5.6 + §5.9)", () => {
  test("after completing cascade, sessionStorage flag is persisted", async ({ page }) => {
    await gotoFreshCascade(page);

    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });
    await skipButton.click();
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });

    const flagValue = await page.evaluate(() =>
      sessionStorage.getItem("hero-cascade-played"),
    );
    expect(flagValue).toBe("1");
  });

  test("reload within same tab uses replay-skip path (cascade does not replay)", async ({ page }) => {
    await gotoFreshCascade(page);

    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });
    await skipButton.click();
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });

    await page.reload();
    // After reload with persisted flag, hero should land directly in phase3 — no SKIP visible
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });
    await expect(page.getByRole("button", { name: /skip intro/i })).toHaveCount(0);
  });

  // Regression: sessionStorage is per-tab. A fresh browser context (= new tab)
  // must NOT inherit the flag and must show the cascade again.
  test("fresh context (simulated new tab) replays the cascade", async ({ browser }) => {
    // First context: complete cascade, persist flag
    const ctx1 = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    const page1 = await ctx1.newPage();
    await page1.goto("/");
    await page1.evaluate(() => { try { sessionStorage.clear(); } catch { /* noop */ } });
    await page1.reload();
    const skip1 = page1.getByRole("button", { name: /skip intro/i });
    await expect(skip1).toBeVisible({ timeout: 4000 });
    await skip1.click();
    await expect(page1.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });
    await ctx1.close();

    // Second context = new tab: no shared sessionStorage; SKIP must reappear.
    const ctx2 = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    const page2 = await ctx2.newPage();
    await page2.goto("/");
    await expect(page2.getByRole("button", { name: /skip intro/i })).toBeVisible({ timeout: 4000 });
    await ctx2.close();
  });
});

test.describe("Hero scroll-to-explore arrow (regression: post-scroll fade)", () => {
  // Regression guard: the ▼ SCROLL TO EXPLORE ▼ prompt must fade out once the
  // user starts scrolling, otherwise it lingers on top of content. Bug origin:
  // framer-motion variants set inline opacity that overrode Tailwind opacity-0
  // until we split the scroll-fade onto an outer plain div wrapper.
  for (const viewport of [
    { width: 1280, height: 720, name: "desktop" },
    { width: 414, height: 900, name: "mobile-portrait" },
  ]) {
    test(`arrow visible at top, hidden after scroll @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      // Pre-set the replay-skip flag so the page lands directly in phase 3
      // regardless of viewport/UA-tier classification — the arrow's fade
      // behavior is what's under test, not the cascade itself.
      await page.evaluate(() => {
        try { sessionStorage.setItem("hero-cascade-played", "1"); } catch { /* noop */ }
      });
      await page.reload();
      await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 4000 });

      const arrow = page.getByText(/SCROLL TO EXPLORE/i).first();
      await expect(arrow).toBeVisible({ timeout: 2000 });

      // Read the wrapper that owns the scroll-fade transition (outer plain div).
      const arrowWrapperOpacityBefore = await arrow.evaluate((el) => {
        const wrapper = el.closest('[aria-hidden], .transition-opacity') as HTMLElement | null;
        return wrapper ? Number(getComputedStyle(wrapper).opacity) : Number(getComputedStyle(el).opacity);
      });
      expect(arrowWrapperOpacityBefore).toBeGreaterThan(0.5);

      await page.evaluate(() => window.scrollTo(0, 200));
      await page.waitForTimeout(450); // 300ms transition + headroom

      const arrowWrapperOpacityAfter = await arrow.evaluate((el) => {
        const wrapper = el.closest('[aria-hidden], .transition-opacity') as HTMLElement | null;
        return wrapper ? Number(getComputedStyle(wrapper).opacity) : Number(getComputedStyle(el).opacity);
      });
      expect(arrowWrapperOpacityAfter).toBeLessThan(0.05);
    });
  }
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

    await page.reload();
    await expect(page.locator('[data-testid="badge-animations-off-device"]')).toHaveCount(0);
  });
});

test.describe("Hero keyboard-focus accessibility (spec §5.8)", () => {
  test("pre-phase-3 CTAs are not reachable via Tab (aria-hidden removes from tab order)", async ({
    page,
  }) => {
    await gotoFreshCascade(page);

    await page.waitForTimeout(300);

    // scope to hero data-testid — earlier shadcn Toaster <section> would match first otherwise
    const hiddenCount = await page.evaluate(() => {
      const hero = document.querySelector(
        '[data-testid="hero-cascading"], [data-testid="hero-phase3"]',
      );
      if (!hero) return -1;
      const hiddenContainers = hero.querySelectorAll('[aria-hidden="true"]');
      return hiddenContainers.length;
    });

    expect(hiddenCount).toBeGreaterThan(0);
  });

  test("post-phase-3 CTAs ARE reachable — aria-hidden is removed", async ({ page }) => {
    await gotoFreshCascade(page);

    const skipButton = page.getByRole("button", { name: /skip intro/i });
    await expect(skipButton).toBeVisible({ timeout: 4000 });
    await skipButton.click();
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2000 });

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
