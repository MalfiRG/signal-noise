import { test, expect } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

test.describe("Reading mode wrapper (smoke)", () => {
  test("/blog/style-test mounts .theme-reading wrapper around rendered markdown", async ({ page }) => {
    await prepareContext(page);
    const response = await page.goto("/blog/style-test");
    expect(response?.status()).toBe(200);
    const wrapper = page.locator(".theme-reading").first();
    await expect(wrapper).toBeVisible({ timeout: 5000 });
    await expect(wrapper.locator(".markdown-body")).toBeVisible({ timeout: 5000 });
  });
});
