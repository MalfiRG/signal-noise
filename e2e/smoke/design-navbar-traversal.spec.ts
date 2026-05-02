import { test, expect } from "@playwright/test";

const NAV_TARGETS = [
  { label: "PROJECTS", expectedPath: "/__design/projects" },
  { label: "SKILLS", expectedPath: "/__design/skills" },
  { label: "BLOG", expectedPath: "/__design/blog" },
] as const;

test.describe("editor-aware navbar traversal", () => {
  for (const target of NAV_TARGETS) {
    test(`navbar ${target.label} from /__design stays in editor mode`, async ({ page }) => {
      await page.goto("/__design");
      await expect(page.locator(".design-companion-shell")).toBeVisible();

      // Top-bar nav link (desktop layout — viewport is plenty wide).
      // Use data-text attribute selector — getByRole struggles with the
      // glitch-hover wrapper layout. Restrict to <nav> scope to avoid
      // matching the social-icon links.
      const link = page.locator(`nav a[data-text="${target.label}"]`);
      await link.first().click();
      await page.waitForURL((url) => url.pathname === target.expectedPath, { timeout: 5000 });

      expect(new URL(page.url()).pathname).toBe(target.expectedPath);
      await expect(page.locator(".design-companion-shell")).toBeVisible();
    });
  }

  test("navbar HOME-icon (SIGNAL_NOISE wordmark) returns to /__design from a sub-page", async ({ page }) => {
    await page.goto("/__design/blog");
    await expect(page.locator(".design-companion-shell")).toBeVisible();
    await page.getByRole("link", { name: /SIGNAL_NOISE/ }).first().click();
    await page.waitForURL((url) => url.pathname === "/__design", { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe("/__design");
  });

  test("production navbar (no /__design prefix) at /blog navigates to /projects", async ({ page }) => {
    await page.goto("/blog");
    const link = page.locator(`nav a[data-text="PROJECTS"]`).first();
    await link.click();
    await page.waitForURL((url) => url.pathname === "/projects", { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe("/projects");
  });
});
