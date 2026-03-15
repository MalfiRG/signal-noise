import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ blogPage: void }>({
  blogPage: async ({ page }, use) => {
    await page.goto("/blog/style-test");
    // Wait for spinner to disappear and content to load
    await expect(page.locator("svg.animate-spin")).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });
    await use();
  },
});

export { expect } from "@playwright/test";
