import { test, expect } from "@playwright/test";

test.describe("RSS/Atom feeds", () => {
  test("feed.xml returns HTTP 200 with XML content", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toMatch(/xml|text\/xml|application\/rss\+xml/);
    const body = await res.text();
    expect(body.startsWith("<?xml")).toBe(true);
  });

  test("atom.xml returns HTTP 200 with XML content", async ({ request }) => {
    const res = await request.get("/atom.xml");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toMatch(/xml|text\/xml|application\/atom\+xml/);
    const body = await res.text();
    expect(body.startsWith("<?xml")).toBe(true);
  });

  test("feed discovery links present in page head", async ({ page }) => {
    await page.goto("/");
    const rssLink = page.locator('link[rel="alternate"][type="application/rss+xml"]');
    await expect(rssLink).toHaveAttribute("href", "/feed.xml");
    const atomLink = page.locator('link[rel="alternate"][type="application/atom+xml"]');
    await expect(atomLink).toHaveAttribute("href", "/atom.xml");
  });

  test("first RSS <link> click-through loads a page", async ({ page, request }) => {
    const res = await request.get("/feed.xml");
    const body = await res.text();
    const linkMatch = body.match(/<link>(https?:\/\/[^<]+\/blog\/[^<]+)<\/link>/);
    if (linkMatch) {
      const url = new URL(linkMatch[1]);
      await page.goto(url.pathname);
      await expect(page).not.toHaveTitle(/404/);
    }
  });
});
