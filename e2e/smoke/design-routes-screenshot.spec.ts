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

    const shell = page.locator(".design-companion-shell");
    await expect(shell, `editor shell present at ${route.path}`).toBeVisible();

    // Home cascade can take ~5-6s to reach phase 3. Wait for the terminal
    // testid so the screenshot captures the steady state, not a mid-cascade
    // frame. Other routes don't emit a phase signal — settle briefly.
    if (route.slug === "home") {
      await page
        .locator('[data-testid="hero-phase3"]')
        .waitFor({ timeout: 12000 })
        .catch(() => { /* fall through */ });
      // Wait for the third hero line to settle. LetterReveal staggers per
      // line at ~0.5s each plus per-letter sub-stagger; PROVE IT is the
      // last line so its full presence signals the cascade is complete.
      await page
        .locator('h1', { hasText: "PROVE IT" })
        .waitFor({ timeout: 12000 })
        .catch(() => { /* fall through */ });
      // Belt-and-suspenders: small settle for any tail animation.
      await page.waitForTimeout(1500);
    } else {
      await page.waitForTimeout(800);
    }

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
