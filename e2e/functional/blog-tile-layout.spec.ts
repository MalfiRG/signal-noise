import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Geometric regression guard for blog tag/title overflow on TWO surfaces:
 *
 *   1. The blog index tile (`BlogIndex.tsx`) — list view at `/blog`.
 *   2. The blog post header (`BlogPostPage.tsx`) — single-post view at
 *      `/blog/:slug`.
 *
 * Both surfaces render `(date · tags · title)` independently. The original
 * bugs:
 *
 *   - Index tile: tag list was `inline-flex flex-wrap`, sized to content,
 *     never wrapped → overflowed at narrow widths.
 *   - Post header: tag row was `flex` with NO `flex-wrap` directive at
 *     all → tags stayed in one row and overflowed past the content area.
 *
 * Why Playwright (not Vitest + jsdom):
 *   jsdom has no layout engine. `getBoundingClientRect()` returns zeros,
 *   so geometric containment can't be tested there. The bug is geometric,
 *   so the test must run in a real browser.
 *
 * Why functional suite (not visual-regression snapshots):
 *   Snapshots fail on font hinting, scrollbar widths, subpixel rendering.
 *   Geometric containment of a child rect inside a parent rect is the
 *   actual user-visible invariant we care about, expressed as one numeric
 *   comparison.
 *
 * Selector scope:
 *   `BlogIndex.tsx` renders an inline `BlogSidebar` (`md:hidden`) for
 *   mobile, AND `BlogLayout.tsx` renders a separate sidebar for desktop
 *   (`md:block`). Both contain `<a href="/blog/{slug}">` post links that
 *   could collide with a tile selector. Tiles carry an explicit
 *   `data-testid="blog-post-tile"` so the spec doesn't have to reason
 *   about CSS-driven visibility or DOM order.
 */

const VIEWPORTS = [
  { name: "mobile-narrow", width: 360, height: 800 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

// Sub-pixel rounding margin. Browser layout can place a child at e.g.
// card.right + 0.4px without a real visual overflow.
const TOLERANCE_PX = 1;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function rectOrFail(loc: Locator, label: string): Promise<Rect> {
  const box = await loc.boundingBox();
  if (!box) throw new Error(`No bounding box for ${label}`);
  return box;
}

function horizontallyContained(child: Rect, parent: Rect): boolean {
  return (
    child.x >= parent.x - TOLERANCE_PX &&
    child.x + child.width <= parent.x + parent.width + TOLERANCE_PX
  );
}

async function gotoBlogIndex(page: Page): Promise<void> {
  await page.goto("/blog");
  // Scoped to `main` so the desktop sidebar's per-post links don't satisfy
  // this locator before the actual tiles do.
  const firstTile = page.locator('[data-testid="blog-post-tile"]').first();
  await expect(firstTile).toBeVisible({ timeout: 5000 });
}

async function gotoAncovaPost(page: Page): Promise<void> {
  await page.goto("/blog/claude-code-cache-ttl-worktree-trap");
  // Wait for the post-page tag list to render (we know it has tags).
  await expect(
    page.locator('[data-testid="blog-post-tag-list"]'),
  ).toBeVisible({ timeout: 5000 });
}

test.describe("Blog tile (index) — content stays inside card boundaries", () => {
  // Reduced motion makes layout deterministic — Framer Motion snaps to
  // the final state immediately, so `boundingBox()` returns stable
  // numbers without timing windows. Motion-policy behavior is exercised
  // in `motion-wcag-session.spec.ts` and the hero specs.
  test.use({ reducedMotion: "reduce" });

  for (const vp of VIEWPORTS) {
    test(`tile children fit horizontally inside the card at ${vp.name} (${vp.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoBlogIndex(page);

      const tiles = page.locator('[data-testid="blog-post-tile"]');
      const tileCount = await tiles.count();
      expect(
        tileCount,
        "blog index must render at least one tile for this spec to be meaningful",
      ).toBeGreaterThan(0);

      for (let i = 0; i < tileCount; i++) {
        const tile = tiles.nth(i);
        await tile.scrollIntoViewIfNeeded();
        const tileBox = await rectOrFail(tile, `tile #${i}`);

        // Title — load-bearing for hyphen-heavy headlines like
        // "5-Minute-TTL" that some browsers refuse to break without
        // `overflow-wrap: anywhere`.
        const titleBox = await rectOrFail(
          tile.locator("h2"),
          `tile #${i} title`,
        );
        expect(
          horizontallyContained(titleBox, tileBox),
          `${vp.name} tile #${i}: title overflowed card. title=${JSON.stringify(titleBox)} card=${JSON.stringify(tileBox)}`,
        ).toBe(true);

        // Each tag must individually fit inside the card. We don't
        // assert row count because that drifts with font metrics.
        const tagList = tile.locator('[data-testid="blog-tag-list"]');
        if ((await tagList.count()) === 0) continue;

        const tags = tagList.locator('[role="link"]');
        const tagCount = await tags.count();
        for (let t = 0; t < tagCount; t++) {
          const tagBox = await rectOrFail(
            tags.nth(t),
            `tile #${i} tag #${t}`,
          );
          expect(
            horizontallyContained(tagBox, tileBox),
            `${vp.name} tile #${i} tag #${t}: overflowed card. tag=${JSON.stringify(tagBox)} card=${JSON.stringify(tileBox)}`,
          ).toBe(true);
        }
      }
    });
  }
});

test.describe("Blog post header — tags wrap inside the content area", () => {
  test.use({ reducedMotion: "reduce" });

  for (const vp of VIEWPORTS) {
    test(`ANCOVA post-header tags fit inside main at ${vp.name} (${vp.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAncovaPost(page);

      // The post-page main column. The tag list and h1 must both fit
      // horizontally inside this rect — anything past it is overflow
      // (which on Vercel showed as tags spilling over the visible
      // reading-mode card edge).
      const mainBox = await rectOrFail(page.locator("main"), "main column");

      // Title h1 — the prominent headline.
      const titleBox = await rectOrFail(
        page.locator("main h1").first(),
        "post title h1",
      );
      expect(
        horizontallyContained(titleBox, mainBox),
        `${vp.name}: post title overflowed main. title=${JSON.stringify(titleBox)} main=${JSON.stringify(mainBox)}`,
      ).toBe(true);

      // Tag list — the original bug surface.
      const tagList = page.locator('[data-testid="blog-post-tag-list"]');
      const tags = tagList.locator("a[href^='/blog?tags=']");
      const tagCount = await tags.count();
      expect(
        tagCount,
        "ANCOVA post should expose multiple tags for this assertion to be meaningful",
      ).toBeGreaterThan(3);

      for (let t = 0; t < tagCount; t++) {
        const tagBox = await rectOrFail(
          tags.nth(t),
          `post tag #${t}`,
        );
        expect(
          horizontallyContained(tagBox, mainBox),
          `${vp.name} post tag #${t}: overflowed main. tag=${JSON.stringify(tagBox)} main=${JSON.stringify(mainBox)}`,
        ).toBe(true);
      }
    });
  }

  test("ANCOVA post-header tags wrap onto multiple rows on mobile", async ({
    page,
  }) => {
    // Stronger regression guard for the post-page failure mode. The
    // original bug was that `flex items-center gap-3 mb-2` had NO
    // `flex-wrap`, so 7 tags rendered in a single row that bled past
    // the card. After the fix, the tag-list block container wraps onto
    // multiple rows. Detect "wraps" via distinct row Y-coordinates so
    // the assertion stays robust against font-metric drift.
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAncovaPost(page);

    const tags = page.locator(
      "[data-testid='blog-post-tag-list'] a[href^='/blog?tags=']",
    );
    const tagCount = await tags.count();
    const ys: number[] = [];
    for (let t = 0; t < tagCount; t++) {
      const box = await tags.nth(t).boundingBox();
      if (box) ys.push(Math.round(box.y));
    }
    const distinctRows = new Set(ys);
    expect(
      distinctRows.size,
      `tags should wrap onto multiple rows at 375px (got ${distinctRows.size} row(s) across ${tagCount} tags)`,
    ).toBeGreaterThan(1);
  });
});
