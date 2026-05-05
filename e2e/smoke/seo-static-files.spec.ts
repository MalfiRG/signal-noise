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

  test("vercel.json has noindex headers for preview deploys", async () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf-8"));
    expect(config.headers).toBeDefined();
    expect(config.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/(.*)",
          has: expect.arrayContaining([
            expect.objectContaining({ type: "host", value: ".*\\.vercel\\.app" }),
          ]),
        }),
      ])
    );
  });

  test("index.html has theme-color, canonical, and og:url", async ({ page }) => {
    await page.goto("/");

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute("content", "#0b0d12");

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", "https://piotrtarach.dev/");

    const ogUrl = page.locator('meta[property="og:url"]');
    await expect(ogUrl).toHaveAttribute("content", "https://piotrtarach.dev/");
  });
});
