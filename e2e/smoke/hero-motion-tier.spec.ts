import { test, expect } from "@playwright/test";
import { stabilizeForLayout } from "../fixtures/visual-determinism";

test.describe("Hero device-tier motion policy", () => {
  test("desktop animates - phase 3 reached within 12s with data-testid sentinel", async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await stabilizeForLayout(page);

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 12_000 });
  });

  test("mobile settles quickly - CTAs visible without cascade", async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await expect(page.getByRole("link", { name: "VIEW PROJECTS" })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("link", { name: "READ BLOG" })).toBeVisible();
  });

  test("reduced-motion - phase 3 within 2s and badge visible", async ({ page, context }) => {
    await context.clearCookies();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2_000 });
    await expect(page.locator('[data-testid="badge-reduced-motion"]')).toBeVisible();
  });
});
