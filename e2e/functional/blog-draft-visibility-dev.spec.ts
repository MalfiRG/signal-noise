import { test, expect } from "@playwright/test";

test.describe("Blog draft visibility — dev mode", () => {
  test("draft posts appear in /blog index during dev", async ({ page }) => {
    await page.goto("/blog");

    const draftSlugs = [
      "claude-code-cache-ttl-worktree-trap",
      "rag-retrieval-harness",
      "autonomous-qa-loop",
      "style-test",
    ];

    for (const slug of draftSlugs) {
      const card = page.locator(`a[href*="/blog/${slug}"]`);
      await expect(card.first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
