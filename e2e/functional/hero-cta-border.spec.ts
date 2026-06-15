import { test, expect } from "@playwright/test";

test.describe("Hero CTA buttons - border visibility", () => {
  for (const viewport of [
    { width: 390, height: 844, name: "mobile" },
    { width: 1280, height: 800, name: "desktop" },
  ]) {
    test(`READ BLOG border is visible at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");

      const readBlog = page.locator('a[href="/blog"]', {
        hasText: "READ BLOG",
      });
      await expect(readBlog).toBeVisible({ timeout: 10000 });

      const border = await readBlog.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          width: s.borderWidth,
          style: s.borderStyle,
          color: s.borderColor,
        };
      });

      expect(border.style).not.toBe("none");
      expect(border.width).not.toBe("0px");
      expect(border.color).not.toBe("rgba(0, 0, 0, 0)");
      expect(border.color).not.toBe("transparent");
    });
  }

  test("VIEW PROJECTS and READ BLOG both have visible borders at mobile 390px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const viewProjects = page.locator('a[href="/projects"]', {
      hasText: "VIEW PROJECTS",
    });
    const readBlog = page.locator('a[href="/blog"]', {
      hasText: "READ BLOG",
    });
    await expect(viewProjects).toBeVisible({ timeout: 10000 });
    await expect(readBlog).toBeVisible({ timeout: 10000 });

    for (const btn of [viewProjects, readBlog]) {
      const borderAlpha = await btn.evaluate((el) => {
        const color = getComputedStyle(el).borderColor;
        const m = color.match(
          /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
        );
        if (!m) return 1;
        return m[4] !== undefined ? parseFloat(m[4]) : 1;
      });
      expect(
        borderAlpha,
        `Button border alpha must be visible (>0.3)`,
      ).toBeGreaterThan(0.3);
    }
  });
});
