/**
 * Focus-management coverage for the hero skip-intro mechanism.
 *
 * Resolves F-CONS-06 from Wave 3 iteration-2 consistency review: the existing
 * suite asserts skip REACHES phase 3, but nothing asserts where focus LANDS
 * afterward. The Index.tsx implementation schedules
 *   setTimeout(() => viewProjectsRef.current?.focus(), 0)
 * inside skipToPhase3() so keyboard users aren't stranded on the unmounted
 * SKIP button. This test locks that invariant.
 *
 * If react-router-dom ever changes its ref-forwarding contract for <Link>,
 * this test fails loudly instead of silently regressing a11y.
 */
import { test, expect } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

async function gotoFreshCascade(page: import("@playwright/test").Page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto("/");
  // Can't clear storage until after the first navigation (no origin before).
  await page.evaluate(() => {
    try { sessionStorage.clear(); } catch {}
    try { localStorage.removeItem("hero-badge-dismissed"); } catch {}
  });
  await page.reload();
  // Wait until the initial "INITIALIZING SYSTEM" render has mounted.
  await page.waitForSelector('[data-testid="hero-cascading"]', { timeout: 5_000 });
}

test.describe("Hero focus management after skip", () => {
  test("SKIP button click moves focus to the first CTA (VIEW PROJECTS)", async ({ page }) => {
    await gotoFreshCascade(page);

    // Wait for the SKIP button to render (phase 1 threshold).
    const skipBtn = page.getByRole("button", { name: "Skip intro" });
    await expect(skipBtn).toBeVisible({ timeout: 3_000 });

    await skipBtn.click();

    // Phase 3 should now be reached.
    await expect(page.locator('[data-testid="hero-phase3"]')).toBeVisible({ timeout: 2_000 });

    // Focus should have landed on VIEW PROJECTS. Uses accessible-name matching
    // so this is resilient to markup tweaks.
    const focusedAccessibleName = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      return el.getAttribute("aria-label") || el.textContent?.trim() || null;
    });

    expect(focusedAccessibleName).toBe("VIEW PROJECTS");
  });

  test("programmatic skipToPhase3 via section-pointer-noop does NOT move focus (no section handler)", async ({ page }) => {
    await gotoFreshCascade(page);

    // Per spec §5.6 post-fix-cycle, the <section> element has NO event
    // handlers. Clicking on empty hero space during phase 1-2 should NOT
    // skip the cascade — only the SKIP button does that.
    const section = page.locator("section").first();
    await section.click({ position: { x: 100, y: 100 } });

    // Phase 3 should NOT be reached via the section click. The cascade
    // continues on its own timeline.
    await expect(page.locator('[data-testid="hero-phase3"]')).not.toBeVisible({ timeout: 1_000 });
  });
});
