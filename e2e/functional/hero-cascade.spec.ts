import { test, expect, Page } from "@playwright/test";

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

async function waitForOpacityVisible(page: Page, selector: string, timeoutMs = 10000) {
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

async function isPreReveal(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return true;
    const style = window.getComputedStyle(el);
    return el.classList.contains('hero-pre-reveal') &&
           style.filter !== 'none';
  }, selector);
}

async function waitForRevealed(page: Page, selector: string, timeoutMs = 10000) {
  await page.waitForFunction(
    ({ sel }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      return !el.classList.contains('hero-pre-reveal');
    },
    { sel: selector },
    { timeout: timeoutMs }
  );
}

const SEL = {
  initText: "p.tracking-\\[0\\.3em\\]",
  h1: "h1.hero-h",
  breakIt: '[data-text="BREAK IT"]',
  buildIt: "[data-row='build']",
  proveIt: "[data-row='prove']",
  subtitle: "p.text-foreground\\/80",
  buttons: ".flex.gap-4.justify-center",
  scrollHint: "p.animate-glow-pulse",
  reducedBanner: "text=reduce-motion: on",
};

test.describe("Desktop — full animations", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("hero cascade plays in correct phase order", async ({ page }) => {
    await page.goto("/");

    const breakHidden = await isPreReveal(page, SEL.breakIt);
    expect(breakHidden).toBe(true);

    // Phase 1: INITIALIZING text - waitForRevealed works here via element replacement
    // (the placeholder <p class="hero-pre-reveal"> unmounts, LetterReveal <p> mounts)
    await waitForRevealed(page, SEL.initText, 3000);

    // Phase 2: BREAK IT revealed with glitch entrance
    await waitForRevealed(page, SEL.breakIt, 5000);

    const hasGlitch = await page.locator(SEL.breakIt).evaluate((el) =>
      el.classList.contains("hero-glitch-entrance")
    );
    expect(hasGlitch).toBe(true);

    // Phase 2+1s: BUILD IT - wait for LetterReveal to mount
    // NOTE: hero-pre-reveal is on the INNER span, not the outer [data-row='build']
    await page.waitForSelector("[data-row='build'] .letter-reveal, [data-row='build'] .block:not(.hero-pre-reveal)", { timeout: 5000 });

    // Phase 3: Subtitle, buttons, scroll hint (framer-motion opacity-based)
    await waitForOpacityVisible(page, SEL.subtitle, 8000);
    await waitForOpacityVisible(page, SEL.buttons, 8000);
    await waitForOpacityVisible(page, SEL.scrollHint, 8000);
  });

  test("CSS animations fire on BREAK IT", async ({ page }) => {
    await page.goto("/");

    await waitForRevealed(page, SEL.breakIt, 5000);

    const animations = await getRunningAnimations(page);
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

test.describe("Mobile — animations ON", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });

  test("hero cascade plays on mobile", async ({ page }) => {
    await page.goto("/");

    await waitForRevealed(page, SEL.initText, 3000);
    await waitForRevealed(page, SEL.breakIt, 5000);

    const pseudoVisible = await page.evaluate(() => {
      const el = document.querySelector('[data-text="BREAK IT"]');
      if (!el) return false;
      const before = window.getComputedStyle(el, "::before");
      return before.display !== "none";
    });
    expect(pseudoVisible).toBe(true);

    await waitForOpacityVisible(page, SEL.subtitle, 8000);
    await waitForOpacityVisible(page, SEL.buttons, 8000);
  });

  test("no reduced-motion banner on mobile with animations", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(SEL.reducedBanner)).not.toBeVisible();
  });
});

test.describe("Mobile — reduced motion", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });

  test("hero cascade appears instantly with short delays", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator(SEL.initText)).toBeVisible({ timeout: 1000 });
    await expect(page.locator(SEL.breakIt)).toBeVisible({ timeout: 2000 });

    await waitForOpacityVisible(page, SEL.subtitle, 3000);
    await waitForOpacityVisible(page, SEL.buttons, 3000);
  });

  test("reduced-motion banner visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const banner = page.locator("text=reduce-motion: on");
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test("no hero entrance animations running in reduced mode", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await waitForOpacityVisible(page, SEL.subtitle, 3000);

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
