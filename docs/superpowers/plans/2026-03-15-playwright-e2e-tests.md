# Playwright E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright E2E tests covering blog content rendering, reading mode, and responsive layout, with CI/CD on push to `main`/`dev-*` branches.

**Architecture:** Feature-based spec files (`blog-rendering`, `reading-mode`, `responsive`) with a shared custom fixture that navigates to a `style-test` kitchen-sink blog post. Draft filtering hides the test post from production. GitHub Actions runs Chromium-only tests on push and PR.

**Tech Stack:** Playwright Test, GitHub Actions, Chromium

**Spec:** `docs/superpowers/specs/2026-03-15-playwright-e2e-tests-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `package.json` | Add `@playwright/test` devDependency, add `test:e2e` script | Modify |
| `playwright.config.ts` | Playwright config — baseURL, webServer, Chromium project, timeout, retries | Create |
| `.gitignore` | Add test-results/, playwright-report/, blob-report/, .playwright/ | Modify |
| `src/features/blog/data.ts` | Add `draft?: boolean` to `BlogPost` interface, mark `style-test` as draft | Modify |
| `src/features/blog/BlogIndex.tsx` | Filter out draft posts in production | Modify |
| `e2e/fixtures/blog-page.ts` | Custom Playwright fixture — navigates to style-test, waits for load | Create |
| `e2e/blog-rendering.spec.ts` | Tests for content elements: headings, TOC, code, tables, Mermaid, images, links, lists, blockquotes, typography, navigation | Create |
| `e2e/reading-mode.spec.ts` | Tests for theme activation, CSS overrides, font switch, glow suppression, code block preservation, inline TOC hiding | Create |
| `e2e/responsive.spec.ts` | Tests for desktop/tablet/mobile TOC, nav, and layout | Create |
| `.github/workflows/e2e.yml` | GitHub Actions workflow — trigger on push/PR, run Playwright, upload report on failure | Create |

---

## Chunk 1: Infrastructure & Draft Filtering

### Task 1: Install Playwright and configure the project

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install Playwright**

```bash
cd the-digital-matrix
npm install -D @playwright/test --legacy-peer-deps
npx playwright install chromium
```

- [ ] **Step 2: Add `test:e2e` script to `package.json`**

In `package.json`, add to the `"scripts"` block (after line 13, the `"test:watch"` entry):

```json
"test:e2e": "npx playwright test"
```

- [ ] **Step 3: Create `playwright.config.ts`**

Create `playwright.config.ts` at the project root:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 4: Add Playwright output directories to `.gitignore`**

Append to the end of `.gitignore`:

```
# Playwright
test-results/
playwright-report/
blob-report/
.playwright/
```

- [ ] **Step 5: Verify Playwright runs (no tests yet)**

```bash
npx playwright test
```

Expected: "No tests found" or similar — confirms config is valid and the dev server starts.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json playwright.config.ts .gitignore
git commit -m "chore: add Playwright test infrastructure"
```

---

### Task 2: Add draft filtering to blog posts

**Files:**
- Modify: `src/features/blog/data.ts:1-7` (interface) and `src/features/blog/data.ts:10-17` (style-test entry)
- Modify: `src/features/blog/BlogIndex.tsx:16`

- [ ] **Step 1: Add `draft` field to `BlogPost` interface**

In `src/features/blog/data.ts`, change the interface (lines 1-7) to:

```typescript
export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  draft?: boolean;
}
```

- [ ] **Step 2: Mark `style-test` as draft**

In the same file, add `draft: true` to the style-test entry (after line 16):

```typescript
export const blogPosts: BlogPost[] = [
  {
    slug: "style-test",
    title: "Style Test Kitchen Sink",
    date: "2026-03-15",
    tags: ["testing", "design", "internal"],
    excerpt:
      "A comprehensive preview of every content element — headings, code blocks, tables, Mermaid diagrams, images, GIFs, callouts, and more.",
    draft: true,
  },
];
```

- [ ] **Step 3: Filter drafts in `BlogIndex.tsx`**

In `src/features/blog/BlogIndex.tsx`, add a filtered list after the imports (before the return statement, inside the component):

```tsx
const visiblePosts = blogPosts.filter((p) => !p.draft || !import.meta.env.PROD);
```

Then change line 14 from:

```tsx
{blogPosts.length > 0 ? (
```

to:

```tsx
{visiblePosts.length > 0 ? (
```

And change line 16 from:

```tsx
{blogPosts.map((post, i) => (
```

to:

```tsx
{visiblePosts.map((post, i) => (
```

- [ ] **Step 4: Verify locally**

Run `npm run dev` and navigate to `/blog`. The style-test post should be visible in dev mode.

Run `npm run build && npm run preview` and navigate to `/blog`. The style-test post should NOT appear in the production build. (The page at `/blog/style-test` should still render if navigated to directly.)

- [ ] **Step 5: Commit**

```bash
git add src/features/blog/data.ts src/features/blog/BlogIndex.tsx
git commit -m "feat: add draft filtering for blog posts"
```

---

## Chunk 2: Test Fixture & Blog Rendering Tests

### Task 3: Create the blog page test fixture

**Files:**
- Create: `e2e/fixtures/blog-page.ts`

- [ ] **Step 1: Create the fixtures directory and fixture file**

```bash
mkdir -p e2e/fixtures
```

Create `e2e/fixtures/blog-page.ts`:

```typescript
import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ blogPage: void }>({
  blogPage: async ({ page }, use) => {
    await page.goto("/blog/style-test");
    // Wait for spinner to disappear and content to load
    await expect(page.locator("svg.animate-spin")).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });
    await use();
  },
});

export { expect } from "@playwright/test";
```

- [ ] **Step 2: Verify the fixture works with a smoke test**

Create a temporary `e2e/smoke.spec.ts`:

```typescript
import { test, expect } from "./fixtures/blog-page";

test("style-test page loads", async ({ page, blogPage }) => {
  await expect(page.locator(".markdown-body")).toBeVisible();
});
```

Run:

```bash
npx playwright test e2e/smoke.spec.ts
```

Expected: PASS

- [ ] **Step 3: Remove smoke test and commit**

Delete `e2e/smoke.spec.ts`, then:

```bash
git add e2e/fixtures/blog-page.ts
git commit -m "feat: add Playwright blog page test fixture"
```

---

### Task 4: Write blog-rendering.spec.ts — headings & TOC interaction

**Files:**
- Create: `e2e/blog-rendering.spec.ts`

- [ ] **Step 1: Create the spec file with heading and TOC tests**

Create `e2e/blog-rendering.spec.ts`:

```typescript
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
    // Scroll to the "Code Blocks" heading
    const codeBlocksHeading = page.locator(".markdown-body h2#code-blocks");
    await codeBlocksHeading.scrollIntoViewIfNeeded();
    // Wait for IntersectionObserver to fire
    await page.waitForTimeout(500);

    const activeTocLink = tocNav.locator("a.text-foreground.font-medium");
    await expect(activeTocLink).toBeVisible();
    const activeText = await activeTocLink.textContent();
    expect(activeText).toContain("Code Blocks");
  });

  test("clicking a TOC link scrolls to the target heading", async ({ page, blogPage }) => {
    const tocNav = page.locator("nav", { has: page.getByText("On this page") });
    const tablesLink = tocNav.locator("a", { hasText: "Tables" });
    await tablesLink.click();

    // Wait for smooth scroll
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
```

- [ ] **Step 2: Run the tests**

```bash
npx playwright test e2e/blog-rendering.spec.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/blog-rendering.spec.ts
git commit -m "test: add heading and TOC interaction E2E tests"
```

---

### Task 5: Add code block, table, and Mermaid tests to blog-rendering.spec.ts

**Files:**
- Modify: `e2e/blog-rendering.spec.ts`

- [ ] **Step 1: Add code block tests**

Append to `e2e/blog-rendering.spec.ts`:

```typescript
test.describe("Code blocks", () => {
  test("syntax highlighting is applied to code blocks", async ({ page, blogPage }) => {
    const highlightedCode = page.locator("pre > code[class*='hljs']");
    const count = await highlightedCode.count();
    expect(count).toBeGreaterThan(0);
  });

  test("wide code blocks are horizontally scrollable", async ({ page, blogPage }) => {
    // Target the inner <pre> with overflow-x-auto (the custom code component renders its own <pre>)
    const preBlocks = page.locator(".markdown-body pre.overflow-x-auto");
    const count = await preBlocks.count();
    expect(count).toBeGreaterThan(0);

    // Find a pre block with overflow
    let foundScrollable = false;
    for (let i = 0; i < count; i++) {
      const isScrollable = await preBlocks.nth(i).evaluate((el) => el.scrollWidth > el.clientWidth);
      if (isScrollable) {
        // Verify we can actually scroll it
        await preBlocks.nth(i).evaluate((el) => { el.scrollLeft = 50; });
        const scrollLeft = await preBlocks.nth(i).evaluate((el) => el.scrollLeft);
        expect(scrollLeft).toBeGreaterThan(0);
        foundScrollable = true;
        break;
      }
    }
    expect(foundScrollable).toBe(true);
  });

  test("inline code has bg-secondary class", async ({ page, blogPage }) => {
    // Inline code: <code> NOT inside <pre>
    const inlineCode = page.locator(".markdown-body code:not(pre code)").first();
    await expect(inlineCode).toHaveClass(/bg-secondary/);
  });
});
```

- [ ] **Step 2: Add table tests**

Append to `e2e/blog-rendering.spec.ts`:

```typescript
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
    const tableWrapper = page.locator(".markdown-body .overflow-x-auto").first();
    await expect(tableWrapper).toBeVisible();
    const table = tableWrapper.locator("table");
    await expect(table).toBeVisible();
  });
});
```

- [ ] **Step 3: Add Mermaid diagram tests**

Append to `e2e/blog-rendering.spec.ts`:

```typescript
test.describe("Mermaid diagrams", () => {
  test("at least 4 Mermaid diagrams render as SVGs", async ({ page, blogPage }) => {
    const mermaidSvgs = page.locator(".my-6 svg");
    await expect(mermaidSvgs).toHaveCount(4, { timeout: 15000 });
  });

  test("Mermaid SVGs have non-zero dimensions", async ({ page, blogPage }) => {
    const mermaidSvgs = page.locator(".my-6 svg");
    // Wait for all 4 to render before checking dimensions
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
```

- [ ] **Step 4: Run the tests**

```bash
npx playwright test e2e/blog-rendering.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add e2e/blog-rendering.spec.ts
git commit -m "test: add code block, table, and Mermaid E2E tests"
```

---

### Task 6: Add image, link, blockquote, list, typography, and navigation tests

**Files:**
- Modify: `e2e/blog-rendering.spec.ts`

- [ ] **Step 1: Add image & GIF tests**

Append to `e2e/blog-rendering.spec.ts`:

```typescript
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
      // Accept both absolute URLs and relative paths
      expect(src!.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Add link tests**

Append:

```typescript
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
});
```

- [ ] **Step 3: Add blockquote tests**

Append:

```typescript
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
```

- [ ] **Step 4: Add list tests**

Append:

```typescript
test.describe("Lists", () => {
  test("ordered lists render with list-decimal class", async ({ page, blogPage }) => {
    const ol = page.locator(".markdown-body ol.list-decimal");
    await expect(ol.first()).toBeVisible();
  });

  test("unordered lists render with list-disc class", async ({ page, blogPage }) => {
    const ul = page.locator(".markdown-body ul.list-disc");
    await expect(ul.first()).toBeVisible();
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
```

- [ ] **Step 5: Add typography and navigation tests**

Append:

```typescript
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
```

- [ ] **Step 6: Run all blog-rendering tests**

```bash
npx playwright test e2e/blog-rendering.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add e2e/blog-rendering.spec.ts
git commit -m "test: add image, link, blockquote, list, typography, and navigation E2E tests"
```

---

## Chunk 3: Reading Mode Tests

### Task 7: Write reading-mode.spec.ts

**Files:**
- Create: `e2e/reading-mode.spec.ts`

- [ ] **Step 1: Create the spec file with all reading mode tests**

Create `e2e/reading-mode.spec.ts`:

```typescript
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
    // Should be warm sepia (hsl 30 15% 88% ≈ rgb(228, 221, 210)), not dark green
    expect(bgColor).not.toContain("0, 0, 0"); // not black
    // Parse RGB values and verify warm tones (R > G > B, all high)
    const match = bgColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(match).toBeTruthy();
    const [, r, g, b] = match!.map(Number);
    expect(r).toBeGreaterThan(180); // warm, light
    expect(g).toBeGreaterThan(170);
  });

  test("text color is dark, not green", async ({ page, blogPage }) => {
    const wrapper = page.locator(".theme-reading");
    const color = await wrapper.evaluate((el) => getComputedStyle(el).color);
    const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(match).toBeTruthy();
    const [, r, g, b] = match!.map(Number);
    // Dark brownish (hsl 30 10% 15% ≈ rgb(42, 38, 35)), not green
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
    // The post title h1 has text-glow class
    const glowEl = page.locator(".theme-reading .text-glow").first();
    await expect(glowEl).toBeVisible();
    const textShadow = await glowEl.evaluate((el) => getComputedStyle(el).textShadow);
    expect(textShadow).toBe("none");
  });

  // Note: box-glow is not currently used on blog post pages.
  // This test verifies the CSS rule exists by checking any box-glow element if present.
  test("box-glow elements have box-shadow: none if present", async ({ page, blogPage }) => {
    const glowEl = page.locator(".theme-reading .box-glow");
    const count = await glowEl.count();
    if (count === 0) {
      // No box-glow elements on this page — CSS rule still exists in index.css
      // but there's nothing to assert against. This is expected.
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
    // Dark blue-ish (hsl(220 13% 18%) ≈ rgb(40, 44, 52)), not warm
    expect(r).toBeLessThan(80);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(80);
  });
});

// Precondition: style-test.md contains a "Table of Contents" section,
// which causes MarkdownRenderer to set hasTableOfContents=true and apply has-inline-toc class.
test.describe("In-content TOC hidden", () => {
  test("markdown-body has has-inline-toc class", async ({ page, blogPage }) => {
    const mdBody = page.locator(".markdown-body.has-inline-toc");
    await expect(mdBody).toBeVisible();
  });

  test("inline TOC ul is hidden in reading mode", async ({ page, blogPage }) => {
    const inlineToc = page.locator(".theme-reading .markdown-body.has-inline-toc > ul:first-of-type");
    // Should exist in DOM but be hidden
    await expect(inlineToc).toBeAttached();
    await expect(inlineToc).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npx playwright test e2e/reading-mode.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/reading-mode.spec.ts
git commit -m "test: add reading mode E2E tests"
```

---

## Chunk 4: Responsive Tests & CI/CD

### Task 8: Write responsive.spec.ts

**Files:**
- Create: `e2e/responsive.spec.ts`

- [ ] **Step 1: Create the spec file with all responsive tests**

Create `e2e/responsive.spec.ts`:

```typescript
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
    // TOC should be to the right of content
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
    // Content should use most of the viewport width
    expect(contentBox!.width).toBeGreaterThan(600);
  });

  test("reading mode still applies", async ({ page, blogPage }) => {
    const themeWrapper = page.locator(".theme-reading");
    await expect(themeWrapper).toBeVisible();

    const bgColor = await themeWrapper.evaluate((el) => getComputedStyle(el).backgroundColor);
    const match = bgColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(match).toBeTruthy();
    const [, r] = match!.map(Number);
    expect(r).toBeGreaterThan(180); // warm sepia, not dark
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

    const hamburger = page.locator("nav.fixed .md\\:hidden button");
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
    const hamburger = page.locator("nav.fixed .md\\:hidden button");
    await hamburger.click();

    // Sheet opens with nav links
    const sheet = page.locator("[role='dialog']");
    await expect(sheet).toBeVisible();

    const blogLink = sheet.locator("a", { hasText: "BLOG" });
    await expect(blogLink).toBeVisible();
    await blogLink.click();

    await expect(page).toHaveURL(/\/blog$/);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npx playwright test e2e/responsive.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/responsive.spec.ts
git commit -m "test: add responsive layout E2E tests"
```

---

### Task 9: Create GitHub Actions CI/CD workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Create the workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create the workflow file**

Create `.github/workflows/e2e.yml`:

```yaml
name: Playwright E2E Tests

on:
  push:
    branches: [main, dev-*]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Playwright tests
        run: npx playwright test

      # Upload on success and failure (!cancelled) — Playwright best practice
      # so reports are available for debugging even on green runs
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 3: Verify workflow syntax**

```bash
cat .github/workflows/e2e.yml | head -5
```

Expected: The YAML should be valid (no syntax errors).

- [ ] **Step 4: Run the full test suite locally one final time**

```bash
npx playwright test
```

Expected: All tests across all 3 spec files PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: add GitHub Actions workflow for Playwright E2E tests"
```
