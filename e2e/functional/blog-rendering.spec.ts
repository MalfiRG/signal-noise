import { test, expect } from "../fixtures/blog-page";

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
    await expect(tocNav).toBeVisible({ timeout: 10000 });

    const codeBlocksHeading = page.locator(".markdown-body h2#code-blocks");
    await expect(codeBlocksHeading).toBeVisible({ timeout: 10000 });

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
    const highlightedCode = page.locator(".code-block-wrapper code[class*='language-']");
    const count = await highlightedCode.count();
    expect(count).toBeGreaterThan(0);
  });

  test("code blocks have scroll container with overflow-x-auto", async ({ page, blogPage }) => {
    const scrollContainers = page.locator(".code-block-wrapper .code-scroll-container");
    const count = await scrollContainers.count();
    expect(count).toBeGreaterThan(0);

    const firstContainer = scrollContainers.first();
    const overflowX = await firstContainer.evaluate(
      (el) => window.getComputedStyle(el).getPropertyValue("overflow-x") || window.getComputedStyle(el).overflow
    );
    expect(["auto", "scroll"]).toContain(overflowX);
  });

  test("code blocks have a copy button", async ({ page, blogPage }) => {
    const copyBtn = page.locator(".code-block-wrapper button[aria-label='Copy code']").first();
    await expect(copyBtn).toBeAttached();
  });

  test("code blocks show language badge", async ({ page, blogPage }) => {
    const badge = page.locator(".code-block-wrapper .code-lang-badge").first();
    await expect(badge).toBeAttached();
    const text = await badge.textContent();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("code blocks are wider than prose paragraphs", async ({ page, blogPage }) => {
    const paragraph = page.locator(".markdown-body > p").first();
    const codeBlock = page.locator(".code-block-wrapper").first();

    await expect(paragraph).toBeVisible();
    await expect(codeBlock).toBeVisible();

    const pBox = await paragraph.boundingBox();
    const codeBox = await codeBlock.boundingBox();

    expect(pBox).not.toBeNull();
    expect(codeBox).not.toBeNull();
    expect(codeBox!.width).toBeGreaterThan(pBox!.width);
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
    const tableWrapper = page.locator(".markdown-body div.overflow-x-auto:has(table)").first();
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

test.describe("Images & GIFs", () => {
  test("all images have alt text", async ({ page, blogPage }) => {
    const images = page.locator(".markdown-body img");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).toBeTruthy();
    }
  });

  test("images have valid src attributes", async ({ page, blogPage }) => {
    const images = page.locator(".markdown-body img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const src = await images.nth(i).getAttribute("src");
      expect(src).toBeTruthy();
      expect(src!.length).toBeGreaterThan(0);
    }
  });
});

test.describe("Links", () => {
  test("internal anchor links do not open in new tab", async ({ page, blogPage }) => {
    const anchorLinks = page.locator('.markdown-body a[href^="#"]');
    const count = await anchorLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const target = await anchorLinks.nth(i).getAttribute("target");
      expect(target).not.toBe("_blank");
    }
  });

  test("external links open in new tab with noopener noreferrer", async ({ page, blogPage }) => {
    const externalLinks = page.locator('.markdown-body a[href^="http"]');
    const count = await externalLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const target = await externalLinks.nth(i).getAttribute("target");
      const rel = await externalLinks.nth(i).getAttribute("rel");
      expect(target).toBe("_blank");
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    }
  });

  test("external link URLs are well-formed", async ({ page, blogPage }) => {
    const externalLinks = page.locator('.markdown-body a[href^="http"]');
    const count = await externalLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await externalLinks.nth(i).getAttribute("href");
      expect(href).toBeTruthy();
      expect(() => new URL(href!)).not.toThrow();
    }
  });

  test("retrieval-economics 'previous post' link navigates to migration post", async ({ page }) => {
    await page.goto("/blog/mempalace-retrieval-economics");
    const link = page.locator('.markdown-body a', { hasText: "previous post" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/blog/mempalace-sqlite-vec-migration");
    await link.click();
    await expect(page).toHaveURL(/mempalace-sqlite-vec-migration/);
    await expect(page.locator("h1")).toContainText("ChromaDB");
  });
});

test.describe("Blockquotes", () => {
  test("blockquotes render as blockquote elements", async ({ page, blogPage }) => {
    const blockquotes = page.locator(".markdown-body blockquote");
    const count = await blockquotes.count();
    expect(count).toBeGreaterThan(0);
  });

  test("callout patterns have bold lead text", async ({ page, blogPage }) => {
    const calloutPatterns = ["Key Insight:", "Hot Take:", "Tech Note:", "Warning:"];

    for (const pattern of calloutPatterns) {
      const blockquote = page.locator(".markdown-body blockquote", { hasText: pattern });
      await expect(blockquote.first()).toBeVisible();
      const strong = blockquote.first().locator("strong", { hasText: pattern });
      await expect(strong).toBeVisible();
    }
  });
});

test.describe("Lists", () => {
  test("ordered lists render with list-decimal class", async ({ page, blogPage }) => {
    const ol = page.locator(".markdown-body ol.list-decimal");
    await expect(ol.first()).toBeVisible();
  });

  test("unordered lists render with list-disc class", async ({ page, blogPage }) => {
    const ul = page.locator(".markdown-body ul.list-disc");
    const count = await ul.count();
    expect(count).toBeGreaterThan(0);
    let foundVisible = false;
    for (let i = 0; i < count; i++) {
      const isVisible = await ul.nth(i).isVisible();
      if (isVisible) {
        foundVisible = true;
        break;
      }
    }
    expect(foundVisible).toBe(true);
  });

  test("nested lists exist", async ({ page, blogPage }) => {
    const nestedUl = page.locator(".markdown-body li ul, .markdown-body li ol");
    const count = await nestedUl.count();
    expect(count).toBeGreaterThan(0);
  });

  test("GFM task list checkboxes render", async ({ page, blogPage }) => {
    const checkboxes = page.locator('.markdown-body input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Typography", () => {
  test("inline formatting elements render", async ({ page, blogPage }) => {
    await expect(page.locator(".markdown-body strong").first()).toBeVisible();
    await expect(page.locator(".markdown-body em").first()).toBeVisible();
    await expect(page.locator(".markdown-body del").first()).toBeVisible();
  });

  test("horizontal rules render", async ({ page, blogPage }) => {
    const hrs = page.locator(".markdown-body hr");
    const count = await hrs.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Navigation", () => {
  test("BACK TO BLOG link navigates to /blog", async ({ page, blogPage }) => {
    const backLink = page.locator("a", { hasText: "BACK TO BLOG" });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/blog$/);
  });
});
