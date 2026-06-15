import { test, expect } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

test.describe("Navbar wordmark scroll-to-top", () => {
  test("clicking wordmark on homepage scrolls to top when already scrolled", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /PIOTR_TARACH/ }).first()).toBeVisible();

    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })
    );
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 })
      .toBeGreaterThan(200);

    const scrolledY = await page.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(200);

    await page.getByRole("link", { name: /PIOTR_TARACH/ }).first().click();

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 })
      .toBeLessThan(10);
  });

  test("clicking wordmark from another page navigates to homepage", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/blog");
    await expect(page).toHaveURL(/\/blog$/);

    await page.getByRole("link", { name: /PIOTR_TARACH/ }).first().click();

    await expect(page).toHaveURL(/\/$/);
  });
});
