import { test, expect } from "./fixtures/blog-page";

test.describe("Headings & TOC interaction", () => {
  test("all h2/h3 headings are rendered with id attributes", async ({ page, blogPage }) => {
    const headings = page.locator(".markdown-body h2, .markdown-body h3");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const id = await headings.nth(i).getAttribute("id");
      expect(id).toBeTruthy();
    }
  });

  test("TOC contains a link for every h2/h3 heading", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    await expect(tocNav).toBeVisible();

    const headings = page.locator(".markdown-body h2, .markdown-body h3");
    const headingCount = await headings.count();

    const tocLinks = tocNav.locator("a");
    const tocCount = await tocLinks.count();
    expect(tocCount).toBe(headingCount);
  });

  test("scrolling to a heading highlights the corresponding TOC link", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    // Wait for TOC to be rendered before scrolling
    await expect(tocNav).toBeVisible({ timeout: 10000 });

    const codeBlocksHeading = page.locator(".markdown-body h2#code-blocks");
    await expect(codeBlocksHeading).toBeVisible({ timeout: 10000 });

    // Scroll so the heading is near the top of the viewport (within IntersectionObserver rootMargin)
    await page.evaluate(() => {
      const el = document.getElementById("code-blocks");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: "instant" });
      }
    });
    await page.waitForTimeout(800);

    const activeTocLink = tocNav.locator("a.text-foreground.font-medium");
    await expect(activeTocLink).toBeVisible({ timeout: 5000 });
    const activeText = await activeTocLink.textContent();
    expect(activeText).toContain("Code Blocks");
  });

  test("clicking a TOC link scrolls to the target heading", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    const tablesLink = tocNav.locator("a", { hasText: "Tables" });
    await tablesLink.click();
    await page.waitForTimeout(1000);

    const tablesHeading = page.locator(".markdown-body h2#tables");
    await expect(tablesHeading).toBeInViewport();
  });

  test("h3 entries in the TOC are indented with pl-3", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    const h3headings = page.locator(".markdown-body h3");
    const firstH3Id = await h3headings.first().getAttribute("id");

    const h3TocLink = tocNav.locator(`a[href="#${firstH3Id}"]`);
    await expect(h3TocLink).toHaveClass(/pl-3/);
  });
});

test.describe("Code blocks", () => {
  test("syntax highlighting is applied to code blocks", async ({ page, blogPage }) => {
    const highlightedCode = page.locator("pre > code[class*='hljs']");
    const count = await highlightedCode.count();
    expect(count).toBeGreaterThan(0);
  });

  test("wide code blocks are horizontally scrollable", async ({ page, blogPage }) => {
    const preBlocks = page.locator(".markdown-body pre.overflow-x-auto");
    const count = await preBlocks.count();
    expect(count).toBeGreaterThan(0);

    // Verify the overflow-x-auto class is applied (enabling scroll when content overflows)
    // and that the CSS overflow-x property is set to auto or scroll
    const firstPre = preBlocks.first();
    const overflowX = await firstPre.evaluate((el) => window.getComputedStyle(el).overflowX);
    expect(["auto", "scroll"]).toContain(overflowX);
  });

  test("inline code has bg-secondary class", async ({ page, blogPage }) => {
    const inlineCode = page.locator(".markdown-body code:not(pre code)").first();
    await expect(inlineCode).toHaveClass(/bg-secondary/);
  });
});

test.describe("Tables", () => {
  test("tables render with correct structure", async ({ page, blogPage }) => {
    const table = page.locator(".markdown-body table").first();
    await expect(table).toBeVisible();
    await expect(table.locator("thead")).toBeVisible();
    await expect(table.locator("th").first()).toBeVisible();
    await expect(table.locator("td").first()).toBeVisible();
    await expect(table.locator("tr").first()).toBeVisible();
  });

  test("table wrapper has overflow-x-auto", async ({ page, blogPage }) => {
    const tableWrapper = page.locator(".markdown-body div.overflow-x-auto").first();
    await expect(tableWrapper).toBeVisible();
    const table = tableWrapper.locator("table");
    await expect(table).toBeVisible();
  });
});

test.describe("Mermaid diagrams", () => {
  test("at least 4 Mermaid diagrams render as SVGs", async ({ page, blogPage }) => {
    const mermaidSvgs = page.locator(".my-6 svg");
    await expect(mermaidSvgs).toHaveCount(4, { timeout: 15000 });
  });

  test("Mermaid SVGs have non-zero dimensions", async ({ page, blogPage }) => {
    const mermaidSvgs = page.locator(".my-6 svg");
    await expect(mermaidSvgs).toHaveCount(4, { timeout: 15000 });
    const count = await mermaidSvgs.count();

    for (let i = 0; i < count; i++) {
      const box = await mermaidSvgs.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    }
  });
});
