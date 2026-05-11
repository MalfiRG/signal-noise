import { test, expect } from "@playwright/test";

test.describe("Blog draft visibility - Vercel preview build", () => {
  test("posts marked draft:true appear on /blog index in preview mode", async ({
    page,
  }) => {
    await page.goto("/blog");
    await expect(
      page.getByRole("heading", { name: /blog/i, level: 1 }),
    ).toBeVisible();

    const draftSlugs = [
      "claude-code-cache-ttl-worktree-trap",
      "rag-retrieval-harness",
      "style-test",
    ];

    for (const slug of draftSlugs) {
      const card = page.locator(`a[href*="/blog/${slug}"]`);
      await expect(card.first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("draft slugs accessed directly render the post body", async ({
    page,
  }) => {
    await page.goto("/blog/style-test");
    await expect(
      page.getByRole("heading", { name: /style test/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
