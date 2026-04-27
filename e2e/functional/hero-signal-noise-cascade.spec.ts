import { test, expect } from "@playwright/test";

test.describe("HeroSignalNoise cascade", () => {
  test.beforeEach(async ({ page }) => {
    // Force OS preference to no-preference for tests 1-3 (test 4 overrides).
    // If CI/local OS reports prefers-reduced-motion: reduce, the cascade
    // short-circuits to phase 3 and SKIP never renders.
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });

  test("phase 0→3 progresses on first visit (no replay-skip)", async ({ page }) => {
    // Do NOT seed sessionStorage — let the cascade play.
    // Do NOT freeze animations — we want phase progression to occur.
    await page.goto("/");
    const section = page.locator("[data-testid='hero-cascading'], [data-testid='hero-phase3']");
    // Eventually the data-testid flips to hero-phase3.
    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 10_000 });
    expect(await section.count()).toBeGreaterThan(0);
  });

  test("SKIP click refocuses VIEW PROJECTS link (F-UX-05 a11y contract)", async ({ page }) => {
    await page.goto("/");
    const skip = page.getByRole("button", { name: /skip intro/i });
    await skip.click();
    // After SKIP unmounts, focus is moved to the VIEW PROJECTS link.
    const viewProjects = page.getByRole("link", { name: /view projects/i });
    await expect(viewProjects).toBeFocused();
  });

  test("replay-skip on second visit (sessionStorage)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => sessionStorage.setItem("hero-cascade-played", "1"));
    await page.reload();
    // Cascade short-circuits to phase 3 immediately.
    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 2_000 });
  });

  test("reduced-motion short-circuits to phase 3 without intermediate phases", async ({ page }) => {
    // Override the beforeEach for this test only:
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // Should land on phase 3 immediately — no SKIP button visible.
    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 2_000 });
    await expect(page.getByRole("button", { name: /skip intro/i })).toBeHidden();
  });
});
