// Wave 3 F-CONS-06 — locks focus-after-skip a11y invariant
import { test, expect } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

async function gotoFreshCascade(page: import("@playwright/test").Page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto("/");
  // No origin before first navigation — storage clear must follow goto
  await page.evaluate(() => {
    try { sessionStorage.clear(); } catch { /* storage may throw in private mode; ignore */ }
    try { localStorage.removeItem("hero-badge-dismissed"); } catch { /* storage may throw in private mode; ignore */ }
  });
  await page.reload();
  await page.waitForSelector('[data-testid="hero-cascading"]', { timeout: 5_000 });
}

test.describe("Hero focus management after skip", () => {
  test("SKIP button click moves focus to the first CTA (VIEW PROJECTS)", async ({ page }) => {
    await gotoFreshCascade(page);

    const skipBtn = page.getByRole("button", { name: "Skip intro" });
    await expect(skipBtn).toBeVisible({ timeout: 3_000 });

    await skipBtn.click();

    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2_000 });

    const focusedAccessibleName = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      return el.getAttribute("aria-label") || el.textContent?.trim() || null;
    });

    expect(focusedAccessibleName).toBe("VIEW PROJECTS");
  });

  test("programmatic skipToPhase3 via section-pointer-noop does NOT move focus (no section handler)", async ({ page }) => {
    await gotoFreshCascade(page);

    // spec §5.6 — <section> has no click handler; only SKIP button skips
    const section = page.locator("section").first();
    await section.click({ position: { x: 100, y: 100 } });

    await expect(page.locator('[data-testid="hero-phase3"]')).not.toBeVisible({ timeout: 1_000 });
  });
});
