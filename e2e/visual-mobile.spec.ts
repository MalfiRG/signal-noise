import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORTS = [
  { width: 375, height: 812, name: "375" },
  { width: 390, height: 844, name: "390" },
  { width: 428, height: 926, name: "428" },
];

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/projects", name: "projects" },
  { path: "/skills", name: "skills" },
  { path: "/blog", name: "blog-index" },
  { path: "/blog/style-test", name: "blog-post", waitFor: ".markdown-body", hasMermaid: true },
  { path: "/how-i-do-it", name: "how-i-do-it-index" },
  { path: "/how-i-do-it/test-plan", name: "how-i-do-it-post", waitFor: ".markdown-body" },
];

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Mobile ${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route.name} renders correctly`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "networkidle" });

        if (route.waitFor) {
          await expect(page.locator("svg.animate-spin")).toHaveCount(0, { timeout: 15000 });
          await expect(page.locator(route.waitFor)).toBeVisible({ timeout: 15000 });
        }

        if ((route as any).hasMermaid) {
          await page.waitForFunction(
            () => document.querySelectorAll("[id^='mermaid-'] svg, [id^='dmermaid-']").length > 0,
            { timeout: 15000 }
          ).catch(() => );
          await page.waitForTimeout(2000);
        }

        await page.waitForTimeout(1500);

        await expect(page).toHaveScreenshot(
          `${route.name}-${viewport.name}w.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
            animations: "disabled",
            timeout: 15000,
          }
        );
      });
    }
  });
}
