import { test, expect } from "@playwright/test";
import { skipHeroCascadeViaInitScript } from "../fixtures/visual-determinism";

const VIEWPORTS = [
  { name: "iPhone SE 375", width: 375, height: 667, asymmetric: false },
  { name: "iPhone 14 Pro 414", width: 414, height: 896, asymmetric: false },
  { name: "iPad portrait 768", width: 768, height: 1024, asymmetric: true },
  { name: "Desktop 1280", width: 1280, height: 800, asymmetric: true },
] as const;

test.describe("HeroSignalNoise mobile reflow", () => {
  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await skipHeroCascadeViaInitScript(page);
      await page.goto("/");
      await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow, `viewport ${vp.width}px must not horizontally overflow`).toBeLessThanOrEqual(0);
    });

    test(`hero rows ${vp.asymmetric ? "have asymmetric padding" : "have no asymmetric padding"} at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await skipHeroCascadeViaInitScript(page);
      await page.goto("/");
      await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible();

      const leftPadding = await page.locator("[data-row='break']").evaluate(
        (el) => parseFloat(getComputedStyle(el as HTMLElement).paddingLeft)
      );
      const rightPadding = await page.locator("[data-row='prove']").evaluate(
        (el) => parseFloat(getComputedStyle(el as HTMLElement).paddingRight)
      );

      if (vp.asymmetric) {
        expect(leftPadding).toBeGreaterThan(0);
      } else {
        expect(leftPadding).toBe(0);
      }
    });
  }
});
