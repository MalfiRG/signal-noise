import { test, expect } from "@playwright/test";

/**
 * Production-build contract: posts marked `draft: true` in
 * src/features/blog/data.ts MUST NOT appear in the deployed bundle.
 *
 * The implementation lives in src/features/blog/data.ts:getVisiblePosts and
 * is invoked at module load via `import.meta.env.PROD`. This spec runs
 * against `vite build && vite preview` (see playwright.prod-contract.config.ts)
 * so the assertion exercises the real prod bundle.
 *
 * Inverse spec lives at e2e/functional/blog-draft-visibility-dev.spec.ts —
 * asserts the same posts ARE visible during `npm run dev`.
 *
 * If this test fails, the draft contract has regressed: drafts are leaking
 * into production. Treat as a P1 — drafts may contain unfinished content,
 * sensitive notes, or pre-publish typos.
 */
test.describe("Blog draft filter — production build", () => {
  test("posts marked draft:true are absent from /blog index", async ({
    page,
  }) => {
    await page.goto("/blog");
    // Wait for the index to actually render before asserting absence.
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
      await expect(card).toHaveCount(0);
    }
  });

  test("draft slugs accessed directly fall through to the not-found state", async ({
    page,
  }) => {
    // Direct navigation to a draft URL must NOT render the post body. The
    // content map in BlogPostPage is built from visiblePosts, so the draft
    // slug is absent and the fallback `# Content not found` markdown fires.
    await page.goto("/blog/style-test");
    await expect(page.getByText(/content not found/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
