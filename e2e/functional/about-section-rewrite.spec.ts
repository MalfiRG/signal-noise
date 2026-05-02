import { test, expect } from "@playwright/test";
import { skipHeroCascadeViaInitScript } from "../fixtures/visual-determinism";

test.describe("AboutSection rewrite", () => {
  test.beforeEach(async ({ page }) => {
    await skipHeroCascadeViaInitScript(page);
    await page.goto("/");
    await page.waitForSelector("[data-testid='hero-phase3']");
  });

  test("renders cat-block with $ cat ~/profile.txt header", async ({ page }) => {
    const head = page.locator(".cat-block .cat-head").first();
    await expect(head).toBeVisible();
    await expect(head).toContainText("cat");
    await expect(head).toContainText("~/profile.txt");
    await expect(head).toContainText("utf-8");
  });

  test("renders tool badges (Pytest, Playwright)", async ({ page }) => {
    const pytest = page.locator(".badge", { hasText: "Pytest" }).first();
    await expect(pytest).toBeVisible();

    const playwrightBadge = page.locator(".badge", { hasText: "Playwright" }).first();
    await expect(playwrightBadge).toBeVisible();
  });

  test("renders all 6 categories in expected order", async ({ page }) => {
    const headings = page.locator(".tools-grid h4");
    await expect(headings).toHaveCount(6);
    await expect(headings.nth(0)).toHaveText("Test Automation");
    await expect(headings.nth(1)).toHaveText("Languages");
    await expect(headings.nth(2)).toHaveText("CI/CD & DevOps");
    await expect(headings.nth(3)).toHaveText("Cloud & Virtualization");
    await expect(headings.nth(4)).toHaveText("Test Management");
    await expect(headings.nth(5)).toHaveText("AI & Tooling");
  });

  test("ascii-div separator is aria-hidden", async ({ page }) => {
    const sep = page.locator(".ascii-div");
    await expect(sep).toBeAttached();
    await expect(sep).toHaveAttribute("aria-hidden", "true");
    await expect(sep).toContainText("END_OF_FILE");
  });
});
