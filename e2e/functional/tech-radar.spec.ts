import { test, expect } from "@playwright/test";
import { prepareContext, settleStyles } from "../fixtures/visual-determinism";

test.beforeEach(async ({ page }) => {
  await prepareContext(page);
});

test.describe("Tech Radar - layout and content", () => {
  test("renders TECH RADAR heading", async ({ page }) => {
    await page.goto("/skills");
    await expect(
      page.getByRole("heading", { name: /tech radar/i, level: 1 }),
    ).toBeVisible();
  });

  test("renders all 6 category sections", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    const categories = page.locator("h2");
    await expect(categories).toHaveCount(6);

    const expected = [
      "Test Automation & QA",
      "AI & Agentic Systems",
      "DevOps & Infrastructure",
      "Languages",
      "Web & API",
      "Methodology",
    ];
    for (let i = 0; i < expected.length; i++) {
      await expect(categories.nth(i)).toHaveText(expected[i]);
    }
  });

  test("renders tier legend with 4 tiers", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    for (const tier of ["EXPERT", "STRONG", "GROWING", "EXPLORING"]) {
      await expect(page.getByText(tier, { exact: true })).toBeVisible();
    }
  });

  test("each badge has a tier-colored dot indicator", async ({ page }) => {
    await page.goto("/skills");
    await page.locator("span.rounded-full.border").first().waitFor({ timeout: 10000 });
    await settleStyles(page);

    const badges = page.locator("span.rounded-full.border");
    const count = await badges.count();
    expect(count).toBeGreaterThan(20);

    for (let i = 0; i < Math.min(5, count); i++) {
      const dot = badges.nth(i).locator("span.rounded-full");
      await expect(dot).toBeVisible();
    }
  });
});

test.describe("Tech Radar - tier assignments", () => {
  test("expert-tier badges use primary color", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    const claudeCode = page.locator("span.rounded-full.border", {
      hasText: "Claude Code",
    });
    await expect(claudeCode).toBeVisible();
    await expect(claudeCode).toHaveClass(/border-primary/);
    await expect(claudeCode).toHaveClass(/text-primary/);
  });

  test("growing-tier badges use learning color", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    const playwright = page.locator("span.rounded-full.border", {
      hasText: "Playwright",
    });
    await expect(playwright).toBeVisible();
    await expect(playwright).toHaveClass(/border-learning/);
  });
});

test.describe("Tech Radar - hover glow", () => {
  test("expert badge gains box-shadow on hover", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    const badge = page.locator("span.rounded-full.border", {
      hasText: "Claude Code",
    });
    const shadowBefore = await badge.evaluate(
      (el) => getComputedStyle(el).boxShadow,
    );

    await badge.hover();
    await settleStyles(page);

    const shadowAfter = await badge.evaluate(
      (el) => getComputedStyle(el).boxShadow,
    );
    expect(shadowAfter).not.toBe(shadowBefore);
    expect(shadowAfter).not.toBe("none");
  });
});
