import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs/promises";

const OUT_DIR = path.resolve("playwright-report/design-routes");

const ROUTES = [
  { slug: "home", path: "/__design" },
  { slug: "projects", path: "/__design/projects" },
  { slug: "skills", path: "/__design/skills" },
  { slug: "how-i-do-it", path: "/__design/how-i-do-it" },
  { slug: "blog", path: "/__design/blog" },
] as const;

test.beforeAll(async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });
});

for (const route of ROUTES) {
  test(`design-route ${route.slug} loads + screenshots`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto(route.path, { waitUntil: "networkidle" });
    expect(response?.status(), `HTTP status for ${route.path}`).toBe(200);

    // Allow editor shell + tree-shaken dynamic import to settle.
    await page.waitForTimeout(800);

    const shell = page.locator(".design-companion-shell");
    await expect(shell, `editor shell present at ${route.path}`).toBeVisible();

    await page.screenshot({
      path: path.join(OUT_DIR, `${route.slug}.png`),
      fullPage: true,
    });

    if (errors.length > 0) {
      console.log(`[${route.slug}] runtime errors:\n  ${errors.join("\n  ")}`);
    }
    expect(errors, `runtime errors on ${route.path}`).toHaveLength(0);
  });
}
