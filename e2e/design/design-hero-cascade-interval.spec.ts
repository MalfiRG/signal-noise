import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs/promises";

const OUT_DIR = path.resolve("playwright-report/hero-cascade-intervals");

const TIMEPOINTS_MS = [100, 500, 1000, 2000, 4000, 8000] as const;

const ROUTES = [
  { slug: "production-home", path: "/" },
  { slug: "editor-home", path: "/__design" },
] as const;

test.beforeAll(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });
});

for (const route of ROUTES) {
  test(`hero cascade interval - ${route.slug}`, async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      try { sessionStorage.clear(); } catch { /* noop */ }
    });
    await page.goto(route.path, { waitUntil: "domcontentloaded" });

    for (const ms of TIMEPOINTS_MS) {
      const padded = String(ms).padStart(5, "0");
      await page.waitForTimeout(ms === TIMEPOINTS_MS[0] ? ms : ms - TIMEPOINTS_MS[TIMEPOINTS_MS.indexOf(ms) - 1]);

      const frame = path.join(OUT_DIR, `${route.slug}-t${padded}.png`);
      await page.screenshot({ path: frame, fullPage: false });
    }

    expect(true).toBe(true);
  });
}
