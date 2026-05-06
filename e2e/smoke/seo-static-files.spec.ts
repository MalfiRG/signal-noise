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

  test("manifest.webmanifest is served and valid", async ({ page }) => {
    const response = await page.request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe("PIOTR_TARACH | SIGNAL_NOISE");
    expect(manifest.short_name).toBe("PIOTR_TARACH");
    expect(manifest.theme_color).toBe("#0b0d12");
    expect(manifest.background_color).toBe("#0b0d12");
    expect(manifest.display).toBe("standalone");
  });

  test("index.html links to manifest", async ({ page }) => {
    await page.goto("/");
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");
  });

  test("sitemap.xml lists all public routes", async ({ page }) => {
    const response = await page.request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");

    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("https://piotrtarach.dev/");
    expect(body).toContain("https://piotrtarach.dev/projects");
    expect(body).toContain("https://piotrtarach.dev/skills");
    expect(body).toContain("https://piotrtarach.dev/blog");
    expect(body).toContain("https://piotrtarach.dev/how-i-do-it");
    // Blog post URLs only appear when non-draft posts exist in data.ts.
    // Currently all posts are draft:true, so /blog (the index route) is the
    // only blog-related URL asserted here.
  });

  test("llms.txt describes site content for AI crawlers", async ({ page }) => {
    const response = await page.request.get("/llms.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("# PIOTR_TARACH | SIGNAL_NOISE");
    expect(body).toContain("## Blog Posts");
    // /blog/ (with trailing slash) only appears when non-draft posts exist.
    // All current posts are draft:true, so we assert the static route /blog instead.
    expect(body).toContain("/blog");
    expect(body).toContain("## How I Do It");
    expect(body).toContain("/how-i-do-it/");
  });

  test("index.html has link rel=llm pointing to llms.txt", async ({ page }) => {
    await page.goto("/");
    const llmLink = page.locator('link[rel="llm"]');
    await expect(llmLink).toHaveAttribute("href", "/llms.txt");
  });
});
