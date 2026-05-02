import { test, expect, Page } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

const ROUTES: Array<{
  path: string;
  check: (page: Page) => ReturnType<Page["locator"]> | ReturnType<Page["getByRole"]>;
}> = [
  { path: "/", check: (p) => p.getByRole("heading", { level: 1 }).first() },
  { path: "/projects", check: (p) => p.getByRole("heading", { level: 1, name: /projects/i }).first() },
  { path: "/skills", check: (p) => p.getByRole("heading", { level: 1, name: /tech radar/i }).first() },
  { path: "/blog", check: (p) => p.getByRole("heading", { level: 1, name: /blog/i }).first() },
  { path: "/blog/style-test", check: (p) => p.locator(".markdown-body") },
  { path: "/how-i-do-it", check: (p) => p.getByRole("heading", { level: 1, name: /how/i }).first() },
  { path: "/how-i-do-it/test-plan", check: (p) => p.locator(".markdown-body") },
];

test.describe("Routes load (smoke)", () => {
  for (const { path, check } of ROUTES) {
    test(`${path} returns 200 and renders primary content`, async ({ page }) => {
      await prepareContext(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      // SPA NotFound returns 200 — assert URL match to detect client-side redirect
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "$"));
      await expect(check(page)).toBeVisible({ timeout: 5000 });
    });
  }
});
