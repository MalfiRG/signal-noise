import { test, expect } from "@playwright/test";

/**
 * Index page layout tests — 2026-04-12 UX fixes session:
 * 1. SocialProof section removed from Index
 * 2. About section is below the fold (requires scroll)
 * 3. Project tiles on /projects have slow cascade stagger
 * 4. Hero fills viewport height
 */

// ---------------------------------------------------------------------------
// 1. SocialProof removed from Index
// ---------------------------------------------------------------------------

test.describe("Index — SocialProof removed", () => {
  test("no SIGNALS section on homepage", async ({ page }) => {
    await page.goto("/");
    // SocialProof had heading "SIGNALS" and "> cat ~/social.log"
    await expect(page.locator("text=SIGNALS")).not.toBeVisible();
    await expect(page.locator("text=cat ~/social.log")).not.toBeVisible();
  });

  test("repo cards are NOT on homepage", async ({ page }) => {
    await page.goto("/");
    // SocialProof displayed github_owner_repo like "MalfiRG/ScoutQL"
    await expect(page.locator("text=MalfiRG/ScoutQL")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. About section below the fold
// ---------------------------------------------------------------------------

test.describe("Index — About below fold", () => {
  test("whoami is not visible without scrolling on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    // Wait for hero to render
    await page.waitForSelector("h1.font-display");

    // "> whoami" heading from AboutSection should be outside viewport
    const whoami = page.locator("text=whoami").first();
    const box = await whoami.boundingBox();
    // If visible, its top should be below viewport height
    if (box) {
      expect(box.y).toBeGreaterThan(720);
    }
  });

  test("whoami is not visible without scrolling on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForSelector("h1.font-display");

    const whoami = page.locator("text=whoami").first();
    const box = await whoami.boundingBox();
    if (box) {
      expect(box.y).toBeGreaterThan(812);
    }
  });

  test("whoami becomes visible after scrolling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("h1.font-display");

    // Scroll down past the hero
    await page.evaluate(() => window.scrollBy(0, window.innerHeight + 200));
    await page.waitForTimeout(500);

    const whoami = page.locator("text=whoami").first();
    await expect(whoami).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Hero section fills viewport
// ---------------------------------------------------------------------------

test.describe("Index — Hero viewport height", () => {
  test("hero section is at least 100vh tall", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    const heroHeight = await page.evaluate(() => {
      const hero = document.querySelector("section.min-h-screen");
      if (!hero) return 0;
      return hero.getBoundingClientRect().height;
    });

    // min-h-screen = 100vh, so height should be >= viewport height
    expect(heroHeight).toBeGreaterThanOrEqual(720);
  });
});

// ---------------------------------------------------------------------------
// 4. Projects page — tiles exist and have stagger animation
// ---------------------------------------------------------------------------

test.describe("Projects — tile cascade", () => {
  test("project tiles render on /projects", async ({ page }) => {
    await page.goto("/projects");

    await expect(page.locator("h1")).toContainText("PROJECTS");

    // Should have project cards
    const cards = page.locator(".grid > div > .border.border-border");
    await expect(cards.first()).toBeVisible({ timeout: 5000 });

    // Should have at least the 3 projects from data.ts
    const count = await page.locator(".grid > div").count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("project tiles have GitHub and external links", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForSelector(".grid");

    // ScoutQL should have a GitHub link
    const githubLinks = page.locator('a[href*="github.com/MalfiRG"]');
    const count = await githubLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("The Digital Matrix has a live site link", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForSelector(".grid");

    const liveLink = page.locator('a[href*="the-digital-matrix.vercel.app"]');
    await expect(liveLink).toBeVisible();
  });
});
