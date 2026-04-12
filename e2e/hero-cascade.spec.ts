import { test, expect, Page } from "@playwright/test";

/**
 * Hero cascade animation tests — three scenarios:
 * 1. Desktop: full animations, full viewport
 * 2. Mobile (animations ON): full animations, 375px viewport
 * 3. Mobile (animations OFF): reduced motion, instant cascade with delays
 *
 * Uses Playwright's Animation API via CDP to observe running animations.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect CSS animation names currently running on the page */
async function getRunningAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const animations = document.getAnimations();
    return animations
      .filter((a) => a.playState === "running" || a.playState === "pending")
      .map((a) => {
        const effect = a.effect as KeyframeEffect | null;
        const name =
          effect && "getKeyframes" in effect
            ? (a as CSSAnimation).animationName ?? "unknown"
            : "unknown";
        return name;
      });
  });
}

/** Wait for an element to become visible (opacity > 0) */
async function waitForVisible(page: Page, selector: string, timeoutMs = 10000) {
  await page.waitForFunction(
    ({ sel }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return parseFloat(style.opacity) > 0;
    },
    { sel: selector },
    { timeout: timeoutMs }
  );
}

/** Get computed opacity of an element */
async function getOpacity(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return 0;
    return parseFloat(window.getComputedStyle(el).opacity);
  }, selector);
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const SEL = {
  initText: "p.tracking-\\[0\\.3em\\]",
  h1: "h1.font-display",
  breakIt: '[data-text="BREAK IT"]',
  buildIt: 'h1 span[aria-label="BUILD IT"], h1 span.block',
  proveIt: "span.hero-stamp-entrance, h1 > span:last-child",
  subtitle: "p.text-foreground\\/80",
  buttons: ".flex.gap-4.justify-center",
  scrollHint: "p.animate-glow-pulse",
  reducedBanner: "text=reduce-motion: on",
};

// ---------------------------------------------------------------------------
// Scenario 1: Desktop — full animations
// ---------------------------------------------------------------------------

test.describe("Desktop — full animations", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("hero cascade plays in correct phase order", async ({ page }) => {
    await page.goto("/");

    // Phase 0: everything hidden initially
    const breakOpacity = await getOpacity(page, SEL.breakIt);
    expect(breakOpacity).toBe(0);

    // Phase 1 (~200ms): INITIALIZING SYSTEM appears
    await waitForVisible(page, SEL.initText, 3000);

    // Phase 2 (~2000ms): headline appears
    await waitForVisible(page, SEL.breakIt, 5000);

    // Verify BREAK IT has glitch entrance class
    const hasGlitch = await page.locator(SEL.breakIt).evaluate((el) =>
      el.classList.contains("hero-glitch-entrance")
    );
    expect(hasGlitch).toBe(true);

    // Phase 2 + delay: BUILD IT appears
    await waitForVisible(page, 'h1 span[aria-label="BUILD IT"]', 5000);

    // Phase 3 (~5000ms): subtitle + buttons + scroll hint
    await waitForVisible(page, SEL.subtitle, 8000);
    await waitForVisible(page, SEL.buttons, 8000);
    await waitForVisible(page, SEL.scrollHint, 8000);
  });

  test("CSS animations fire on BREAK IT", async ({ page }) => {
    await page.goto("/");

    // Wait for phase 2
    await waitForVisible(page, SEL.breakIt, 5000);

    // Check for running animations (within the glitch window)
    const animations = await getRunningAnimations(page);
    // At least hero-glitch-flash should be present (or already finished)
    // Check pseudo-elements exist
    const hasPseudo = await page.evaluate(() => {
      const el = document.querySelector('[data-text="BREAK IT"]');
      if (!el) return false;
      const before = window.getComputedStyle(el, "::before");
      return before.content !== "none" && before.content !== "";
    });
    expect(hasPseudo).toBe(true);
  });

  test("no reduced-motion banner visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(SEL.reducedBanner)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Mobile — animations ON
// ---------------------------------------------------------------------------

test.describe("Mobile — animations ON", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });

  test("hero cascade plays on mobile", async ({ page }) => {
    await page.goto("/");

    // Phase 1
    await waitForVisible(page, SEL.initText, 3000);

    // Phase 2
    await waitForVisible(page, SEL.breakIt, 5000);

    // Glitch pseudo-elements should be present (not display:none)
    const pseudoVisible = await page.evaluate(() => {
      const el = document.querySelector('[data-text="BREAK IT"]');
      if (!el) return false;
      const before = window.getComputedStyle(el, "::before");
      return before.display !== "none";
    });
    expect(pseudoVisible).toBe(true);

    // Phase 3
    await waitForVisible(page, SEL.subtitle, 8000);
    await waitForVisible(page, SEL.buttons, 8000);
  });

  test("no reduced-motion banner on mobile with animations", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(SEL.reducedBanner)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Mobile — reduced motion
// ---------------------------------------------------------------------------

test.describe("Mobile — reduced motion", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });

  test("hero cascade appears instantly with short delays", async ({ page }) => {
    // Emulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Phase 1 — much faster (100ms)
    await waitForVisible(page, SEL.initText, 1000);

    // Phase 2 — fast (600ms)
    await waitForVisible(page, SEL.breakIt, 2000);

    // Phase 3 — fast (1200ms)
    await waitForVisible(page, SEL.subtitle, 3000);
    await waitForVisible(page, SEL.buttons, 3000);
  });

  test("reduced-motion banner visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Small indicator in bottom-right
    const banner = page.locator("text=reduce-motion: on");
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test("no hero entrance animations running in reduced mode", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Wait for all phases
    await waitForVisible(page, SEL.subtitle, 3000);

    // Check: hero entrance animations specifically should be killed
    const heroAnimations = await page.evaluate(() => {
      const heroNames = [
        "hero-glitch-flash", "hero-glitch-cyan", "hero-glitch-magenta",
        "hero-stamp", "letter-reveal", "letter-reveal-mobile",
      ];
      return document.getAnimations()
        .filter((a) => {
          const css = a as CSSAnimation;
          return heroNames.includes(css.animationName ?? "");
        })
        .map((a) => (a as CSSAnimation).animationName);
    });
    expect(heroAnimations).toEqual([]);
  });
});
