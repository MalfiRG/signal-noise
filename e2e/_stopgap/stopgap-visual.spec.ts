// TEMPORARY — Wave 1 stopgap visual baseline. Removed in Wave 3 when the
// kitchen-sink test lands at e2e/visual/kitchen-sink.spec.ts.
// Spec: docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md §6 Wave 1.

import { test, expect } from "@playwright/test";

test.describe("Wave 1 stopgap", () => {
  test.describe.configure({ retries: 0 });   // Force first-run failure to surface for baseline gen
  test.use({ viewport: { width: 390, height: 844 } });

  test("/blog/style-test renders deterministically", async ({ page }) => {
    await page.goto("/blog/style-test");
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 15000 });
    // Hold for fonts. Will become document.fonts.ready in Wave 2.
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("style-test-390w.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
      timeout: 15000,
    });
  });
});
