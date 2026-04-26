import { test, expect, type Locator, type Page } from "@playwright/test";

// jsdom has no layout engine; geometric containment must run in a real browser

const VIEWPORTS = [
  { name: "mobile-narrow", width: 360, height: 800 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

// Sub-pixel rounding margin — browser layout may round to ±0.5px
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
  const firstTile = page.locator('[data-testid="blog-post-tile"]').first();
  await expect(firstTile).toBeVisible({ timeout: 5000 });
}

async function gotoAncovaPost(page: Page): Promise<void> {
  await page.goto("/blog/claude-code-cache-ttl-worktree-trap");
  await expect(
    page.locator('[data-testid="blog-post-tag-list"]'),
  ).toBeVisible({ timeout: 5000 });
}

test.describe("Blog tile (index) — content stays inside card boundaries", () => {
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

        // hyphen-heavy headlines need `overflow-wrap: anywhere` to break
        const titleBox = await rectOrFail(
          tile.locator("h2"),
          `tile #${i} title`,
        );
        expect(
          horizontallyContained(titleBox, tileBox),
          `${vp.name} tile #${i}: title overflowed card. title=${JSON.stringify(titleBox)} card=${JSON.stringify(tileBox)}`,
        ).toBe(true);

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

      const mainBox = await rectOrFail(page.locator("main"), "main column");

      const titleBox = await rectOrFail(
        page.locator("main h1").first(),
        "post title h1",
      );
      expect(
        horizontallyContained(titleBox, mainBox),
        `${vp.name}: post title overflowed main. title=${JSON.stringify(titleBox)} main=${JSON.stringify(mainBox)}`,
      ).toBe(true);

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
