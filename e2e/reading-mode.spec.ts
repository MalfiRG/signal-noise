import { test, expect } from "./fixtures/blog-page";

test.describe("Theme activation", () => {
  test("reading mode is active on article pages", async ({ page, blogPage }) => {
    const themeWrapper = page.locator(".theme-reading");
    await expect(themeWrapper).toBeVisible();
  });

  test("reading mode is NOT active on blog index", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator(".theme-reading")).toHaveCount(0);
  });

  test("reading mode is NOT active on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".theme-reading")).toHaveCount(0);
  });
});

test.describe("CSS variable overrides", () => {
  test("background color is warm, not dark green", async ({ page, blogPage }) => {
    const wrapper = page.locator(".theme-reading");
    const bgColor = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toContain("0, 0, 0");
    const match = bgColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(match).toBeTruthy();
    const [, r, g, b] = match!.map(Number);
    expect(r).toBeGreaterThan(180);
    expect(g).toBeGreaterThan(170);
  });

  test("text color is dark, not green", async ({ page, blogPage }) => {
    const mdBody = page.locator(".theme-reading .markdown-body");
    const color = await mdBody.evaluate((el) => getComputedStyle(el).color);
    const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(match).toBeTruthy();
    const [, r, g, b] = match!.map(Number);
    expect(r).toBeLessThan(80);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(80);
  });
});

test.describe("Typography switch", () => {
  test("body text uses Atkinson Hyperlegible font", async ({ page, blogPage }) => {
    const body = page.locator(".theme-reading");
    const fontFamily = await body.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toContain("atkinson hyperlegible");
  });

  test("post title h1.font-display uses Atkinson Hyperlegible", async ({ page, blogPage }) => {
    const title = page.locator(".theme-reading h1.font-display");
    const fontFamily = await title.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toContain("atkinson hyperlegible");
  });
});

test.describe("Glow suppression", () => {
  test("text-glow elements have text-shadow: none", async ({ page, blogPage }) => {
    const glowEl = page.locator(".theme-reading .text-glow").first();
    await expect(glowEl).toBeVisible();
    const textShadow = await glowEl.evaluate((el) => getComputedStyle(el).textShadow);
    expect(textShadow).toBe("none");
  });

  test("box-glow elements have box-shadow: none if present", async ({ page, blogPage }) => {
    const glowEl = page.locator(".theme-reading .box-glow");
    const count = await glowEl.count();
    if (count === 0) {
      return;
    }
    const boxShadow = await glowEl.first().evaluate((el) => getComputedStyle(el).boxShadow);
    expect(boxShadow).toBe("none");
  });
});

test.describe("Code blocks stay dark", () => {
  test("pre elements keep dark background in reading mode", async ({ page, blogPage }) => {
    const pre = page.locator(".theme-reading .markdown-body pre").first();
    await expect(pre).toBeVisible();
    const bgColor = await pre.evaluate((el) => getComputedStyle(el).backgroundColor);
    const match = bgColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(match).toBeTruthy();
    const [, r, g, b] = match!.map(Number);
    expect(r).toBeLessThan(80);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(80);
  });
});

test.describe("In-content TOC hidden", () => {
  test("markdown-body has has-inline-toc class", async ({ page, blogPage }) => {
    const mdBody = page.locator(".markdown-body.has-inline-toc");
    await expect(mdBody).toBeVisible();
  });

  test("inline TOC ul is hidden in reading mode", async ({ page, blogPage }) => {
    const inlineToc = page.locator(".theme-reading .markdown-body.has-inline-toc > ul:first-of-type");
    await expect(inlineToc).toBeAttached();
    await expect(inlineToc).not.toBeVisible();
  });
});
