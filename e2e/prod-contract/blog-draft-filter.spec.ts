import { test, expect } from "@playwright/test";

test.describe("Blog draft filter — production build", () => {
  test("posts marked draft:true are absent from /blog index", async ({
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
      await expect(card).toHaveCount(0);
    }
  });

  test("draft slugs accessed directly fall through to the not-found state", async ({
    page,
  }) => {
    await page.goto("/blog/style-test");
    await expect(page.getByText(/content not found/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
