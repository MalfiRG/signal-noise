import { test, expect } from "./fixtures/blog-page";

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
