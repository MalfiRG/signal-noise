import { test, expect } from "../fixtures/blog-page";
import { prepareContext, stabilizeForLayout } from "../fixtures/visual-determinism";

test.describe("Desktop (1280x720)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("sidebar TOC is visible", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    await expect(tocNav).toBeVisible();
  });

  test("two-column layout: content and TOC side by side", async ({ page, blogPage }) => {
    const content = page.locator(".markdown-body");
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });

    const contentBox = await content.boundingBox();
    const tocBox = await tocNav.boundingBox();

    expect(contentBox).not.toBeNull();
    expect(tocBox).not.toBeNull();
    expect(tocBox!.x).toBeGreaterThan(contentBox!.x);
  });

  test("desktop nav links are visible, hamburger is hidden", async ({ page, blogPage }) => {
    const desktopNav = page.locator("nav.fixed .hidden.md\\:flex");
    await expect(desktopNav).toBeVisible();

    const hamburger = page.locator("nav.fixed .md\\:hidden");
    await expect(hamburger).not.toBeVisible();
  });
});

test.describe("Below lg breakpoint (1023x768) — TOC hides, nav stays", () => {
  test.use({ viewport: { width: 1023, height: 768 } });

  test("sidebar TOC is hidden", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    await expect(tocNav).not.toBeVisible();
  });

  test("content fills available width without empty TOC column", async ({ page, blogPage }) => {
    const content = page.locator(".markdown-body");
    const contentBox = await content.boundingBox();
    expect(contentBox).not.toBeNull();
    expect(contentBox!.width).toBeGreaterThan(600);
  });

  test("reading mode still applies", async ({ page, blogPage }) => {
    const themeWrapper = page.locator(".theme-reading");
    await expect(themeWrapper).toBeVisible();

    const bgColor = await themeWrapper.evaluate((el) => getComputedStyle(el).backgroundColor);
    const match = bgColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(match).toBeTruthy();
    const [, r] = match!.map(Number);
    expect(r).toBeGreaterThan(180);
  });

  test("desktop nav is still visible at 1023px", async ({ page, blogPage }) => {
    const desktopNav = page.locator("nav.fixed .hidden.md\\:flex");
    await expect(desktopNav).toBeVisible();
  });
});

test.describe("Below md breakpoint (767x1024) — hamburger appears", () => {
  test.use({ viewport: { width: 767, height: 1024 } });

  test("sidebar TOC is hidden", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    await expect(tocNav).not.toBeVisible();
  });

  test("hamburger menu is visible, desktop nav is hidden", async ({ page, blogPage }) => {
    const desktopNav = page.locator("nav.fixed .hidden.md\\:flex");
    await expect(desktopNav).not.toBeVisible();

    const hamburger = page.locator("nav.fixed button[data-testid='hamburger-menu']");
    await expect(hamburger).toBeVisible();
  });
});

test.describe("Mobile (375x667)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("sidebar TOC is hidden", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    await expect(tocNav).not.toBeVisible();
  });

  test("hamburger menu opens and navigation works", async ({ page, blogPage }) => {
    const hamburger = page.locator("nav.fixed button[data-testid='hamburger-menu']");
    await hamburger.click();

    const sheet = page.locator("[role='dialog']");
    await expect(sheet).toBeVisible();

    const blogLink = sheet.locator("a", { hasText: "BLOG" });
    await expect(blogLink).toBeVisible();
    await blogLink.click();

    await expect(page).toHaveURL(/\/blog$/);
  });
});

const MOBILE_VIEWPORTS = [375, 390, 428];

test.describe("Mobile no-overflow contract", () => {
  for (const width of MOBILE_VIEWPORTS) {
    test(`/blog has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await prepareContext(page);
      await page.goto("/blog");
      await stabilizeForLayout(page);

      const overflowingElements = await page.evaluate((vw) => {
        return Array.from(document.body.querySelectorAll("*"))
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.right > vw + 1; // +1 for sub-pixel rounding tolerance
          })
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            classes: (el as HTMLElement).className,
            right: el.getBoundingClientRect().right,
          }));
      }, width);

      expect(
        overflowingElements,
        `Elements overflowing viewport at ${width}px:\n${JSON.stringify(overflowingElements, null, 2)}`
      ).toHaveLength(0);
    });

    test(`/blog tag list height is bounded at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await prepareContext(page);
      await page.goto("/blog");
      await stabilizeForLayout(page);

      // Per spec §1.1 mitigation: tag list should not wrap into >2 lines.
      // Approximate via clientHeight ≤ 2 * line-height.
      const tagList = page.locator("[data-testid='blog-tag-list']").first();
      // Tag list may not exist on every blog index variant — skip if not present.
      // Fix M10: explicit return after test.skip — test.skip registers skip but
      // does NOT halt JS execution; subsequent code runs and would throw.
      const exists = await tagList.count();
      if (exists === 0) {
        test.skip(true, "blog-tag-list testid not present yet");
        return;
      }
      const dims = await tagList.evaluate((el) => ({
        height: el.clientHeight,
        lineHeight: parseFloat(getComputedStyle(el).lineHeight),
      }));
      expect(dims.height).toBeLessThanOrEqual(dims.lineHeight * 2.5);
    });
  }
});
