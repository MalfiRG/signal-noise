import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test.describe("SEO static files (smoke)", () => {
  test("robots.txt allows AI crawlers and references sitemap", async ({ page }) => {
    const response = await page.request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("User-agent: GPTBot");
    expect(body).toContain("User-agent: ClaudeBot");
    expect(body).toContain("User-agent: PerplexityBot");
    expect(body).toContain("Sitemap: https://piotrtarach.dev/sitemap.xml");
  });
});
