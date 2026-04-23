import { test, expect } from "@playwright/test";
import { prepareContext, stabilizeForLayout, settleStyles } from "./fixtures/visual-determinism";

test.beforeEach(async ({ page }) => {
  await prepareContext(page);
});

test.describe("Verify blog index tags (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("blog index tags wrap properly", async ({ page }) => {
    await page.goto("/blog");
    await stabilizeForLayout(page);
    await page.screenshot({ path: "test-results/verify-blog-index-375.png" });

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });
});

test.describe("Verify blog index tags (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("blog index tags wrap properly", async ({ page }) => {
    await page.goto("/blog");
    await stabilizeForLayout(page);
    await page.screenshot({ path: "test-results/verify-blog-index-390.png" });

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });
});

test.describe("Verify code blocks preserve formatting (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("code blocks have white-space: pre", async ({ page }) => {
    await page.goto("/blog/style-test");
    await expect(page.locator("svg.animate-spin")).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".code-block-wrapper code").first()).toBeVisible({ timeout: 5000 });
    await settleStyles(page);

    const codeBlocks = page.locator(".code-block-wrapper code");
    const count = await codeBlocks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const whiteSpace = await codeBlocks.nth(i).evaluate(
        (el) => getComputedStyle(el).whiteSpace
      );
      expect(whiteSpace).toBe("pre");
    }
  });
});
