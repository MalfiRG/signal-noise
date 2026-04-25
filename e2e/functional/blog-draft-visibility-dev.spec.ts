import { test, expect } from "@playwright/test";

/**
 * Dev-server contract: drafts MUST be visible during `npm run dev` so authors
 * can preview them. This is the inverse of the production contract — both
 * halves of `import.meta.env.PROD ? filtered : all` need test coverage.
 *
 * The functional Playwright config runs against `npm run dev`, so
 * import.meta.env.PROD === false, and getVisiblePosts() returns all posts.
 *
 * If this test fails, the draft filter is over-applying (hiding drafts in dev
 * too) — authors would lose preview ability.
 *
 * The complementary prod-build spec lives at
 *   e2e/prod-contract/blog-draft-filter.spec.ts
 * and is run via `npm run test:e2e:prod-contract`.
 */
test.describe("Blog draft visibility — dev mode", () => {
  test("draft posts appear in /blog index during dev", async ({ page }) => {
    await page.goto("/blog");

    // The 4 currently-draft posts at time of writing (2026-04-25). If posts
    // are flipped to draft:false later this test will still pass — it asserts
    // visibility, not draft-ness. The prod-contract spec is what enforces
    // hidden-when-draft.
    const draftSlugs = [
      "claude-code-cache-ttl-worktree-trap",
      "rag-retrieval-harness",
      "autonomous-qa-loop",
      "style-test",
    ];

    for (const slug of draftSlugs) {
      // Cards link to /blog/{slug}; using attribute-contains to be resilient
      // to query-param suffixes from the tag filter.
      const card = page.locator(`a[href*="/blog/${slug}"]`);
      await expect(card.first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
