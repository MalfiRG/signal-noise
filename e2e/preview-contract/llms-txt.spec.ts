import { test, expect } from "@playwright/test";

test.describe("llms.txt", () => {
  test("llms.txt returns HTTP 200 with text content", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("## Blog Posts");
    expect(body).toContain("## Site Metadata");
  });

  test("llms.txt discovery link present in page head", async ({ page }) => {
    await page.goto("/");
    const llmLink = page.locator('link[rel="llm"]');
    await expect(llmLink).toHaveAttribute("href", "/llms.txt");
  });

  test("first blog URL in llms.txt click-through loads a page", async ({ page, request }) => {
    const res = await request.get("/llms.txt");
    const body = await res.text();
    const urlMatch = body.match(/\(https:\/\/piotrtarach\.dev\/blog\/([^)]+)\)/);
    if (urlMatch) {
      await page.goto(`/blog/${urlMatch[1]}`);
      await expect(page).not.toHaveTitle(/404/);
    }
  });
});
