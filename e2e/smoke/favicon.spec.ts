import { test, expect } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

test.describe("Favicon (smoke)", () => {
  test("serves favicon.svg with correct content-type", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/");

    const faviconLink = page.locator('link[rel="icon"][type="image/svg+xml"]');
    await expect(faviconLink).toHaveAttribute("href", "/favicon.svg");

    const response = await page.request.get("/favicon.svg");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");

    const body = await response.text();
    expect(body).toContain("#f3e600");
    expect(body).toContain("polyline");
  });
});
