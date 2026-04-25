import { test, expect } from "@playwright/test";

/**
 * Vercel-preview-build contract: posts marked draft:true MUST appear on the
 * preview deploy so authors can review unpublished content on the shareable
 * preview URL.
 *
 * The implementation lives in src/features/blog/data.ts:detectVisibilityMode
 * and getVisiblePosts. This spec runs against a build with
 * VERCEL_ENV=preview, which drives mode → "preview" and bypasses the draft
 * filter.
 *
 * Inverse spec lives at e2e/prod-contract/blog-draft-filter.spec.ts —
 * asserts the same posts are HIDDEN when VERCEL_ENV=production.
 *
 * If this test fails, the visibility filter is over-applying (hiding drafts
 * on preview deploys too) — authors lose preview ability.
 */
test.describe("Blog draft visibility — Vercel preview build", () => {
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
      "autonomous-qa-loop",
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
    // On preview deploys the draft slug is in visiblePosts, so the contentMap
    // includes it and the markdown body renders normally. This is the
    // inverse of the prod-contract spec which asserts the not-found
    // fallback fires.
    await page.goto("/blog/style-test");
    // The kitchen sink page has an h1 from its frontmatter title.
    await expect(
      page.getByRole("heading", { name: /style test/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
