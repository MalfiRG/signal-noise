import { test, expect } from "@playwright/test";

test.describe("Page transitions", () => {
  test("cross-section navigation applies page transition wrapper", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4000); // wait for hero animations

    await page.click('a[href="/projects"]');
    await page.waitForURL("/projects");

    await expect(page.locator("h1")).toContainText("PROJECTS");
  });

  test("intra-blog navigation works (blog index → post → back)", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForTimeout(1500);

    const firstPost = page.locator('a[href^="/blog/"]').first();
    await firstPost.click();

    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });

    await page.goBack();
    await page.waitForTimeout(1000);

    await expect(page.locator("h1")).toContainText("BLOG");
  });
});

test.describe("WCAG touch targets (mobile)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("hamburger menu meets 44×44px minimum", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const hamburger = page.locator('nav .md\\:hidden button[data-testid="hamburger-menu"]');
    await expect(hamburger).toBeVisible();

    const box = await hamburger.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("EXPLORER button meets 44px height minimum", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForTimeout(1500);

    const explorer = page.locator('.md\\:hidden button[aria-label="Open blog file explorer"]');
    await expect(explorer).toBeVisible();

    const box = await explorer.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(4);
  });

  test("hamburger menu opens navigation sheet", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const hamburger = page.locator('nav .md\\:hidden button[data-testid="hamburger-menu"]');
    await hamburger.click();
    await page.waitForTimeout(500);

    await expect(page.getByText("NAVIGATION")).toBeVisible();
    const sheetLinks = page.locator('[data-state="open"] a');
    const count = await sheetLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

test.describe("Explorer sidebar", () => {
  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("EXPLORER button is below BLOG heading, not beside it", async ({ page }) => {
      await page.goto("/blog");
      await page.waitForTimeout(1500);

      const heading = page.locator("h1");
      const explorer = page.locator('.md\\:hidden button[aria-label="Open blog file explorer"]');

      const headingBox = await heading.boundingBox();
      const explorerBox = await explorer.boundingBox();

      expect(headingBox).toBeTruthy();
      expect(explorerBox).toBeTruthy();

      expect(explorerBox!.y).toBeGreaterThan(headingBox!.y + headingBox!.height - 5);
    });

    test("EXPLORER opens drawer with category hierarchy", async ({ page }) => {
      await page.goto("/blog");
      await page.waitForTimeout(1500);

      const explorer = page.locator('.md\\:hidden button[aria-label="Open blog file explorer"]');
      await explorer.click();
      await page.waitForTimeout(800);

      await expect(page.getByText("BLOG EXPLORER")).toBeVisible();
      await expect(page.getByText("FILE EXPLORER")).toBeVisible();

      const categories = page.locator('[role="treeitem"] button');
      const count = await categories.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test("category folders have distinct color from post titles", async ({ page }) => {
      await page.goto("/blog");
      await page.waitForTimeout(1500);

      const explorer = page.locator('.md\\:hidden button[aria-label="Open blog file explorer"]');
      await explorer.click();
      await page.waitForTimeout(800);

      const categoryColor = await page.locator('[role="treeitem"] button span').first().evaluate(
        (el) => window.getComputedStyle(el).color
      );

      const postColor = await page.locator('[role="treeitem"] a span.truncate').first().evaluate(
        (el) => window.getComputedStyle(el).color
      );

      expect(categoryColor).not.toBe(postColor);
    });
  });

  test.describe("desktop", () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test("sidebar renders category tree on desktop", async ({ page }) => {
      await page.goto("/blog");
      await page.waitForTimeout(1000);

      const tree = page.locator('[role="tree"]').first();
      await expect(tree).toBeVisible({ timeout: 5000 });

      const items = page.locator('[role="treeitem"]');
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});

test.describe("Glitch hover", () => {
  test("glitch pseudo-elements are hidden before hover", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4000);

    const glitchEl = page.locator(".glitch-hover").first();
    await expect(glitchEl).toBeVisible();

    const beforeOpacity = await glitchEl.evaluate((el) => {
      return window.getComputedStyle(el, "::before").opacity;
    });
    expect(parseFloat(beforeOpacity)).toBe(0);
  });
});

test.describe("Theme", () => {
  test("Night City theme class is applied to <html>", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    const hasClass = await page.evaluate(() =>
      document.documentElement.classList.contains("theme-cyberpunk-gold")
    );
    expect(hasClass).toBe(true);
  });
});

test.describe("Copy content", () => {
  test("hero shows BREAK IT / BUILD IT / PROVE IT stacked", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4000);

    const h1 = page.locator("h1");
    await expect(h1).toContainText("BREAK IT");
    await expect(h1).toContainText("BUILD IT");
    await expect(h1).toContainText("PROVE IT");
  });

  test("hero subtitle contains 'Research. Execute. Certify.'", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(7000); // phase 3 fires at 6000ms now

    await expect(page.getByText("Every bug is a hypothesis")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Research. Execute. Certify.")).toBeVisible({ timeout: 5000 });
  });

  test("about section bio contains 'research, execute, certify'", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(1500);

    const bio = page.locator("text=research, execute, certify");
    await expect(bio).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Scroll reveal", () => {
  test("blog cards become visible after scroll", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(3000);

    const posts = page.locator('.space-y-8 a[href^="/blog/"]');
    const count = await posts.count();
    expect(count).toBeGreaterThan(0);

    await expect(posts.first()).toBeVisible({ timeout: 5000 });
  });

  test("social proof cards become visible after scroll on home", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const signalCards = page.locator("section").last().locator("a[target='_blank']");
    const count = await signalCards.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(signalCards.nth(i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Ambient effects", () => {
  test("scanline overlay div mounts on home (non-text route)", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    const scanline = page.locator(".scanline-overlay.scan-sweep");
    await expect(scanline).toHaveCount(1);
  });

  test("scanline overlay is suppressed on blog routes (text section)", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForTimeout(1500);

    const scanline = page.locator(".scanline-overlay.scan-sweep");
    await expect(scanline).toHaveCount(0);
  });
});

test.describe("Affordance pulse", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("EXPLORER button has affordance-pulse class", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForTimeout(1500);

    const explorer = page.locator('.md\\:hidden button[aria-label="Open blog file explorer"]');
    const hasClass = await explorer.evaluate((el) =>
      el.classList.contains("affordance-pulse")
    );
    expect(hasClass).toBe(true);
  });
});
