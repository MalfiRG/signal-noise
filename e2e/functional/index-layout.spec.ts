import { test, expect } from "@playwright/test";

test.describe("Index — SocialProof removed", () => {
  test("no SIGNALS section on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=SIGNALS")).not.toBeVisible();
    await expect(page.locator("text=cat ~/social.log")).not.toBeVisible();
  });

  test("repo cards are NOT on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=MalfiRG/ScoutQL")).not.toBeVisible();
  });
});

test.describe("Index — About below fold", () => {
  test("whoami is not visible without scrolling on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    await page.waitForSelector("h1.hero-h");

    const whoami = page.locator('[aria-label="> whoami"]').first();
    const box = await whoami.boundingBox();
    if (box) {
      expect(box.y).toBeGreaterThan(720);
    }
  });

  test("whoami is not visible without scrolling on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForSelector("h1.hero-h");

    const whoami = page.locator('[aria-label="> whoami"]').first();
    const box = await whoami.boundingBox();
    if (box) {
      expect(box.y).toBeGreaterThan(812);
    }
  });

  test("whoami becomes visible after scrolling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("h1.hero-h");

    await page.evaluate(() => window.scrollBy(0, window.innerHeight + 200));
    await page.waitForTimeout(500);

    const whoami = page.locator('[aria-label="> whoami"]').first();
    await expect(whoami).toBeVisible();
  });
});

test.describe("Index — Hero viewport height", () => {
  test("hero section is at least 100vh tall", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    const heroHeight = await page.evaluate(() => {
      const hero = document.querySelector("section.min-h-screen");
      if (!hero) return 0;
      return hero.getBoundingClientRect().height;
    });

    expect(heroHeight).toBeGreaterThanOrEqual(720);
  });
});

test.describe("Projects — tile cascade", () => {
  test("project tiles render on /projects", async ({ page }) => {
    await page.goto("/projects");

    await expect(page.locator("h1")).toContainText("PROJECTS");

    const cards = page.locator(".grid > div > .border.border-border");
    await expect(cards.first()).toBeVisible({ timeout: 5000 });

    const count = await page.locator(".grid > div").count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("project tiles have GitHub and external links", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForSelector(".grid");

    const githubLinks = page.locator('a[href*="github.com/MalfiRG"]');
    const count = await githubLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("SIGNAL_NOISE has a live site link", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForSelector(".grid");

    const liveLink = page.locator('a[href*="piotrtarach.dev"]');
    await expect(liveLink).toBeVisible();
  });
});
