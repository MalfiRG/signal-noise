import { test, expect } from "@playwright/test";
import { prepareContext, stabilizeForLayout } from "../fixtures/visual-determinism";

const VIEWPORTS = [
  { name: "375", width: 375, height: 800 },
  { name: "768", width: 768, height: 1100 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1920", width: 1920, height: 1080 },
] as const;

for (const vp of VIEWPORTS) {
  test(`homepage @ ${vp.name}px @visual`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await prepareContext(page, { freezeClock: true });
    await page.goto("/");
    await stabilizeForLayout(page);
    await expect(page).toHaveScreenshot(`homepage-${vp.name}.png`, { maxDiffPixelRatio: 0.001 });
  });
}
