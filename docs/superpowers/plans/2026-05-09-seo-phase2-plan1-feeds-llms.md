# SEO Phase 2 - Plan 1: RSS/Atom Feeds + Enriched llms.txt

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RSS 2.0 + Atom 1.0 feeds and enrich the existing llms.txt with blog post metadata - both generated at build time with zero runtime cost.

**Architecture:** Two post-build scripts (`generate-feeds.ts` for RSS/Atom, enriched `generate-llms-txt.ts` for llms.txt) read blog data from `data.ts` and write static files to `dist/`. Feed discovery links added to `index.html`. Build pipeline updated with `seo:postbuild` script name to avoid npm lifecycle conflicts.

**Tech Stack:** TypeScript (tsx), Node.js fs APIs, XML string generation (no external RSS library)

**Spec:** `docs/superpowers/specs/2026-05-09-seo-phase2-design.md` sections 6, 7, 8.1, 9.3, 9.4

**Branch:** Create `feat/seo-phase2-feeds-llms` from `main`

**Depends on:** Nothing. This plan is independently shippable.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/generate-feeds.ts` | Create | RSS 2.0 + Atom 1.0 feed generation |
| `scripts/generate-llms-txt.ts` | Modify | Enrich with blog metadata + site metadata section |
| `scripts/load-blog-data.ts` | Read only | Existing data loader (BlogPostRaw, loadPublishedBlogPosts) |
| `src/features/how-i-do-it/data.ts` | Read only | HowIDoItPage[], howIDoItPages |
| `index.html` | Modify | Add feed discovery `<link>` tags |
| `package.json` | Modify | Add `seo:postbuild` script, update `build` script |
| `src/features/blog/data.ts` | Read only | BlogPost interface (reading_time field check) |
| `tests/scripts/generate-feeds.test.ts` | Create | Feed generation smoke + functional tests |
| `tests/scripts/generate-llms-txt.test.ts` | Create | llms.txt enrichment smoke + functional tests |
| `e2e/functional/feeds-discovery.spec.ts` | Create | E2E feed validation + discovery link tests |
| `e2e/functional/llms-txt.spec.ts` | Create | E2E llms.txt validation tests |

---

### Task 1: Create the RSS/Atom feed generator script

**Files:**
- Create: `scripts/generate-feeds.ts`
- Read: `scripts/load-blog-data.ts`

- [ ] **Step 1: Create `scripts/generate-feeds.ts`**

```typescript
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { loadPublishedBlogPosts, type BlogPostRaw } from "./load-blog-data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://piotrtarach.dev";
const FEED_TITLE = "SIGNAL_NOISE - Piotr Tarach";
const FEED_DESC = "Technical blog on AI workflows, test automation, DevOps";
const FEED_LANG = "en";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc2822(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toUTCString();
}

function toRfc3339(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toISOString();
}

function generateRss(posts: BlogPostRaw[], buildDate: Date): string {
  const items = posts.map((p) => {
    const cats = p.tags
      .map((t) => `      <category>${escapeXml(t)}</category>`)
      .join("\n");
    return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${toRfc2822(p.date)}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
${cats}
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml(FEED_DESC)}</description>
    <language>${FEED_LANG}</language>
    <lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>
`;
}

function generateAtom(posts: BlogPostRaw[], buildDate: Date): string {
  const entries = posts.map((p) => {
    const cats = p.tags
      .map((t) => `    <category term="${escapeXml(t)}"/>`)
      .join("\n");
    return `  <entry>
    <title>${escapeXml(p.title)}</title>
    <link href="${SITE_URL}/blog/${p.slug}"/>
    <id>${SITE_URL}/blog/${p.slug}</id>
    <published>${toRfc3339(p.date)}</published>
    <updated>${toRfc3339(p.date)}</updated>
    <summary>${escapeXml(p.excerpt)}</summary>
${cats}
  </entry>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(FEED_TITLE)}</title>
  <link href="${SITE_URL}/blog"/>
  <link href="${SITE_URL}/atom.xml" rel="self"/>
  <id>${SITE_URL}/blog</id>
  <updated>${buildDate.toISOString()}</updated>
  <author>
    <name>Piotr Tarach</name>
  </author>
${entries.join("\n")}
</feed>
`;
}

function main() {
  const posts = loadPublishedBlogPosts();
  const buildDate = new Date();

  const distDir = resolve(__dirname, "../dist");
  mkdirSync(distDir, { recursive: true });

  const rss = generateRss(posts, buildDate);
  const atom = generateAtom(posts, buildDate);

  writeFileSync(resolve(distDir, "feed.xml"), rss, "utf-8");
  writeFileSync(resolve(distDir, "atom.xml"), atom, "utf-8");

  console.log(`feeds: ${posts.length} posts -> dist/feed.xml + dist/atom.xml`);
}

main();
```

- [ ] **Step 2: Verify the script runs**

Run: `npx tsx scripts/generate-feeds.ts`

Expected: `feeds: 0 posts -> dist/feed.xml + dist/atom.xml` (all posts are currently drafts). Verify `dist/feed.xml` and `dist/atom.xml` exist and start with `<?xml`.

```bash
npx tsx scripts/generate-feeds.ts
head -3 dist/feed.xml
head -3 dist/atom.xml
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-feeds.ts
git commit -m "feat(seo): add RSS 2.0 + Atom 1.0 feed generator script"
```

---

### Task 2: Enrich the llms.txt generator

**Files:**
- Modify: `scripts/generate-llms-txt.ts`

- [ ] **Step 1: Update `scripts/generate-llms-txt.ts` with enriched format**

Replace the full file content:

```typescript
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { loadPublishedBlogPosts } from "./load-blog-data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://piotrtarach.dev";

async function loadHowIDoItPages() {
  const mod = await import("../src/features/how-i-do-it/data.ts");
  return mod.howIDoItPages;
}

async function generate() {
  const blogPosts = loadPublishedBlogPosts();
  const howIDoItPages = await loadHowIDoItPages();

  const lines = [
    "# PIOTR_TARACH | SIGNAL_NOISE",
    "",
    "> Personal technical blog and portfolio by Piotr Tarach, QA Engineer based in Prague.",
    "> Topics: AI workflows, test automation, DevOps, Claude Code, Playwright, Python.",
    "",
    `- Homepage: ${SITE_URL}/`,
    `- Projects: ${SITE_URL}/projects`,
    `- Skills (Tech Radar): ${SITE_URL}/skills`,
    `- Blog: ${SITE_URL}/blog`,
    `- How I Do It: ${SITE_URL}/how-i-do-it`,
    "",
    "## Site Metadata",
    "",
    "Author: Piotr Tarach",
    "Role: QA Engineer, Prague",
    `Site: ${SITE_URL}`,
    `Feed: ${SITE_URL}/feed.xml`,
    "",
    "Content types:",
    "- Blog posts: Technical articles on AI workflows, test automation, DevOps, Claude Code",
    "- How I Do It: QA methodology guides (test plans, test cases, automation frameworks, bug reporting)",
    "- Projects: Portfolio of technical projects",
    "- Skills: Tech Radar competency map",
    "",
    "## Blog Posts",
    "",
    ...blogPosts.map(
      (p) =>
        `- [${p.title}](${SITE_URL}/blog/${p.slug}) | ${p.date} | tags: ${p.tags.join(", ")}\n  ${p.excerpt}`
    ),
    ...(blogPosts.length === 0 ? ["(No published posts yet)"] : []),
    "",
    "## How I Do It",
    "",
    ...howIDoItPages.map(
      (p: { title: string; slug: string; description: string }) =>
        `- [${p.title}](${SITE_URL}/how-i-do-it/${p.slug}): ${p.description}`
    ),
    "",
  ];

  const outPath = resolve(__dirname, "../public/llms.txt");
  writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`llms.txt: ${blogPosts.length} blog posts, ${howIDoItPages.length} how-i-do-it pages -> ${outPath}`);
}

generate();
```

- [ ] **Step 2: Verify the script runs and output is enriched**

```bash
npx tsx scripts/generate-llms-txt.ts
cat public/llms.txt
```

Expected: `## Site Metadata` section present, `## Blog Posts` shows `(No published posts yet)`, `## How I Do It` shows all 5 methodology pages with descriptions.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-llms-txt.ts
git commit -m "feat(seo): enrich llms.txt with site metadata and blog post details"
```

---

### Task 3: Add feed discovery links to index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add feed `<link>` tags next to existing `<link rel="llm">`**

After `<link rel="llm" href="/llms.txt" />` (line 13), add:

```html
<link rel="alternate" type="application/rss+xml" title="SIGNAL_NOISE RSS" href="/feed.xml" />
<link rel="alternate" type="application/atom+xml" title="SIGNAL_NOISE Atom" href="/atom.xml" />
```

- [ ] **Step 2: Verify with dev server**

```bash
curl -s http://localhost:8080 | grep -E 'rel="alternate"'
```

Expected: two `<link>` tags with `application/rss+xml` and `application/atom+xml`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(seo): add RSS/Atom feed discovery links to index.html"
```

---

### Task 4: Update build pipeline with seo:postbuild

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `seo:postbuild` script and update `build` script**

In `package.json`, add the `seo:postbuild` script and append `&& npm run seo:postbuild` to the `build` script:

```json
"seo:postbuild": "tsx scripts/generate-feeds.ts",
"build": "tsx scripts/update-github-stats.ts && npm run generate:seo && VITE_VERCEL_ENV=\"${VERCEL_ENV:-}\" vite build && npm run seo:postbuild",
```

Note: `seo:postbuild` currently only runs `generate-feeds.ts`. Plans 2-3 will add `generate-og-images.ts` and `prerender.ts` to this chain. The name `seo:postbuild` (not `postbuild`) avoids npm lifecycle double-execution.

- [ ] **Step 2: Test the full build**

```bash
npm run build 2>&1 | tail -10
ls dist/feed.xml dist/atom.xml dist/llms.txt
```

Expected: build succeeds, all three files exist in `dist/`. `llms.txt` is copied from `public/` by Vite. `feed.xml` and `atom.xml` are written by the post-build script.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build(seo): add seo:postbuild pipeline for feed generation"
```

---

### Task 5: Write Vitest tests for feed generation

**Files:**
- Create: `tests/scripts/generate-feeds.test.ts`

- [ ] **Step 1: Create test directory if it doesn't exist**

```bash
mkdir -p tests/scripts
```

- [ ] **Step 2: Write feed generation tests**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { loadPublishedBlogPosts } from "../../scripts/load-blog-data.ts";

const DIST = resolve(__dirname, "../../dist");

describe("generate-feeds.ts", () => {
  beforeAll(() => {
    execSync("npx tsx scripts/generate-feeds.ts", {
      cwd: resolve(__dirname, "../.."),
      stdio: "pipe",
    });
  });

  describe("smoke", () => {
    it("produces dist/feed.xml", () => {
      expect(existsSync(resolve(DIST, "feed.xml"))).toBe(true);
    });

    it("produces dist/atom.xml", () => {
      expect(existsSync(resolve(DIST, "atom.xml"))).toBe(true);
    });

    it("feed.xml starts with XML declaration", () => {
      const content = readFileSync(resolve(DIST, "feed.xml"), "utf-8");
      expect(content.startsWith("<?xml")).toBe(true);
    });

    it("atom.xml starts with XML declaration", () => {
      const content = readFileSync(resolve(DIST, "atom.xml"), "utf-8");
      expect(content.startsWith("<?xml")).toBe(true);
    });
  });

  describe("functional - RSS", () => {
    let rss: string;

    beforeAll(() => {
      rss = readFileSync(resolve(DIST, "feed.xml"), "utf-8");
    });

    it("contains <channel> with title, link, description", () => {
      expect(rss).toContain("<channel>");
      expect(rss).toContain("<title>SIGNAL_NOISE");
      expect(rss).toContain("<link>https://piotrtarach.dev/blog</link>");
      expect(rss).toContain("<description>");
    });

    it("item count matches published posts", () => {
      const posts = loadPublishedBlogPosts();
      const itemCount = (rss.match(/<item>/g) || []).length;
      expect(itemCount).toBe(posts.length);
    });

    it("RSS link values are absolute URLs", () => {
      const links = [...rss.matchAll(/<link>(https?:\/\/[^<]+)<\/link>/g)];
      for (const m of links) {
        expect(m[1]).toMatch(/^https:\/\/piotrtarach\.dev\//);
      }
    });

    it("lastBuildDate is valid RFC 2822", () => {
      const match = rss.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
      expect(match).not.toBeNull();
      if (match) {
        const d = new Date(match[1]);
        expect(d.getTime()).not.toBeNaN();
      }
    });

    it("special characters in titles are XML-escaped", () => {
      expect(rss).not.toMatch(/<title>[^<]*[&<>][^<]*<\/title>/);
    });
  });

  describe("functional - Atom", () => {
    let atom: string;

    beforeAll(() => {
      atom = readFileSync(resolve(DIST, "atom.xml"), "utf-8");
    });

    it("contains <feed> with title, link, author", () => {
      expect(atom).toContain("<feed");
      expect(atom).toContain("<title>SIGNAL_NOISE");
      expect(atom).toContain("<author>");
      expect(atom).toContain("<name>Piotr Tarach</name>");
    });

    it("entry count matches published posts", () => {
      const posts = loadPublishedBlogPosts();
      const entryCount = (atom.match(/<entry>/g) || []).length;
      expect(entryCount).toBe(posts.length);
    });

    it("Atom link href values are absolute URLs", () => {
      const links = [...atom.matchAll(/href="(https?:\/\/[^"]+)"/g)];
      for (const m of links) {
        expect(m[1]).toMatch(/^https:\/\/piotrtarach\.dev\//);
      }
    });

    it("updated is valid RFC 3339", () => {
      const match = atom.match(/<updated>([^<]+)<\/updated>/);
      expect(match).not.toBeNull();
      if (match) {
        expect(match[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });
  });

  describe("draft filtering", () => {
    it("draft posts do not appear in RSS", () => {
      const rss = readFileSync(resolve(DIST, "feed.xml"), "utf-8");
      const { loadBlogPosts } = require("../../scripts/load-blog-data.ts") as typeof import("../../scripts/load-blog-data.ts");
      const drafts = loadBlogPosts().filter((p) => p.draft);
      for (const draft of drafts) {
        expect(rss).not.toContain(`/blog/${draft.slug}`);
      }
    });

    it("draft posts do not appear in Atom", () => {
      const atom = readFileSync(resolve(DIST, "atom.xml"), "utf-8");
      const { loadBlogPosts } = require("../../scripts/load-blog-data.ts") as typeof import("../../scripts/load-blog-data.ts");
      const drafts = loadBlogPosts().filter((p) => p.draft);
      for (const draft of drafts) {
        expect(atom).not.toContain(`/blog/${draft.slug}`);
      }
    });
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run tests/scripts/generate-feeds.test.ts`

Expected: All tests PASS. With 0 published posts, item/entry counts are 0, draft filtering confirms drafts are excluded.

- [ ] **Step 4: Commit**

```bash
git add tests/scripts/generate-feeds.test.ts
git commit -m "test(seo): add feed generation smoke + functional tests"
```

---

### Task 6: Write Vitest tests for enriched llms.txt

**Files:**
- Create: `tests/scripts/generate-llms-txt.test.ts`

- [ ] **Step 1: Write llms.txt tests**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";
import { loadPublishedBlogPosts } from "../../scripts/load-blog-data.ts";

const LLMS_PATH = resolve(__dirname, "../../public/llms.txt");

describe("generate-llms-txt.ts", () => {
  beforeAll(() => {
    execSync("npx tsx scripts/generate-llms-txt.ts", {
      cwd: resolve(__dirname, "../.."),
      stdio: "pipe",
    });
  });

  describe("smoke", () => {
    it("produces public/llms.txt", () => {
      const content = readFileSync(LLMS_PATH, "utf-8");
      expect(content.length).toBeGreaterThan(0);
    });

    it("contains ## Blog Posts section", () => {
      const content = readFileSync(LLMS_PATH, "utf-8");
      expect(content).toContain("## Blog Posts");
    });

    it("contains ## How I Do It section", () => {
      const content = readFileSync(LLMS_PATH, "utf-8");
      expect(content).toContain("## How I Do It");
    });

    it("contains ## Site Metadata section", () => {
      const content = readFileSync(LLMS_PATH, "utf-8");
      expect(content).toContain("## Site Metadata");
    });
  });

  describe("functional", () => {
    let content: string;

    beforeAll(() => {
      content = readFileSync(LLMS_PATH, "utf-8");
    });

    it("Site Metadata contains Author, Site, Feed fields", () => {
      expect(content).toContain("Author: Piotr Tarach");
      expect(content).toContain("Site: https://piotrtarach.dev");
      expect(content).toContain("Feed: https://piotrtarach.dev/feed.xml");
    });

    it("How I Do It section contains all 5 methodology pages", () => {
      expect(content).toContain("Test Plan");
      expect(content).toContain("Test Case Design");
      expect(content).toContain("Test Architecture");
      expect(content).toContain("Automation Framework");
      expect(content).toContain("Bug Reporting");
    });

    it("How I Do It entries have absolute URLs", () => {
      const howitLinks = [...content.matchAll(/\(https:\/\/piotrtarach\.dev\/how-i-do-it\/[^)]+\)/g)];
      expect(howitLinks.length).toBe(5);
    });

    it("Blog Posts count matches published posts", () => {
      const posts = loadPublishedBlogPosts();
      if (posts.length === 0) {
        expect(content).toContain("(No published posts yet)");
      } else {
        const blogLinks = [...content.matchAll(/\(https:\/\/piotrtarach\.dev\/blog\/[^)]+\)/g)];
        expect(blogLinks.length).toBe(posts.length);
      }
    });

    it("draft posts do not appear in llms.txt", () => {
      const { loadBlogPosts } = require("../../scripts/load-blog-data.ts") as typeof import("../../scripts/load-blog-data.ts");
      const drafts = loadBlogPosts().filter((p) => p.draft);
      for (const draft of drafts) {
        expect(content).not.toContain(`/blog/${draft.slug}`);
      }
    });

    it("all markdown links have non-empty text and URL", () => {
      const links = [...content.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)];
      for (const m of links) {
        expect(m[1].length).toBeGreaterThan(0);
        expect(m[2].length).toBeGreaterThan(0);
      }
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/scripts/generate-llms-txt.test.ts`

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/scripts/generate-llms-txt.test.ts
git commit -m "test(seo): add llms.txt enrichment smoke + functional tests"
```

---

### Task 7: Write E2E tests for feeds and llms.txt

**Files:**
- Create: `e2e/functional/feeds-discovery.spec.ts`
- Create: `e2e/functional/llms-txt.spec.ts`

These tests run against the built output served via `vite preview`.

- [ ] **Step 1: Create feed E2E tests**

```typescript
import { test, expect } from "@playwright/test";

test.describe("RSS/Atom feeds", () => {
  test("feed.xml returns HTTP 200 with XML content", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toMatch(/xml|text\/xml|application\/rss\+xml/);
    const body = await res.text();
    expect(body.startsWith("<?xml")).toBe(true);
  });

  test("atom.xml returns HTTP 200 with XML content", async ({ request }) => {
    const res = await request.get("/atom.xml");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toMatch(/xml|text\/xml|application\/atom\+xml/);
    const body = await res.text();
    expect(body.startsWith("<?xml")).toBe(true);
  });

  test("feed discovery links present in page head", async ({ page }) => {
    await page.goto("/");
    const rssLink = page.locator('link[rel="alternate"][type="application/rss+xml"]');
    await expect(rssLink).toHaveAttribute("href", "/feed.xml");
    const atomLink = page.locator('link[rel="alternate"][type="application/atom+xml"]');
    await expect(atomLink).toHaveAttribute("href", "/atom.xml");
  });
});
```

- [ ] **Step 2: Create llms.txt E2E tests**

```typescript
import { test, expect } from "@playwright/test";

test.describe("llms.txt", () => {
  test("llms.txt returns HTTP 200 with text content", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("## Blog Posts");
    expect(body).toContain("## Site Metadata");
  });

  test("llms.txt discovery link present in page head", async ({ page }) => {
    await page.goto("/");
    const llmLink = page.locator('link[rel="llm"]');
    await expect(llmLink).toHaveAttribute("href", "/llms.txt");
  });
});
```

- [ ] **Step 3: Run E2E tests against dev server**

```bash
npx playwright test e2e/functional/feeds-discovery.spec.ts e2e/functional/llms-txt.spec.ts --project=chromium
```

Note: the dev server serves `public/llms.txt` (via Vite's static serving) but NOT `dist/feed.xml` or `dist/atom.xml`. The feed tests will only pass against a built output (`npm run build && npm run preview`). For dev-server testing, only the discovery link tests and llms.txt tests run.

For full validation, build first:
```bash
npm run build && npx vite preview &
sleep 2
npx playwright test e2e/functional/feeds-discovery.spec.ts e2e/functional/llms-txt.spec.ts --project=chromium
```

- [ ] **Step 4: Commit**

```bash
git add e2e/functional/feeds-discovery.spec.ts e2e/functional/llms-txt.spec.ts
git commit -m "test(e2e): add feed + llms.txt validation tests"
```

---

### Task 8: Run full regression suite

- [ ] **Step 1: Run existing Vitest suite**

```bash
npx vitest run
```

Expected: All existing tests PASS. The llms.txt change shouldn't break anything.

- [ ] **Step 2: Run existing E2E smoke + functional suite**

```bash
npx playwright test --project=chromium --reporter=list 2>&1 | tail -20
```

Expected: All existing tests PASS. The `index.html` change (two new `<link>` tags) is additive and shouldn't affect any existing assertions.

- [ ] **Step 3: Commit if any fixups were needed**

If regression tests revealed issues, fix and commit. Otherwise, no commit needed.

---

### Task 9: Final verification and PR

- [ ] **Step 1: Verify the full build produces all expected files**

```bash
npm run build
ls -la dist/feed.xml dist/atom.xml dist/llms.txt
head -5 dist/feed.xml
head -5 dist/atom.xml
grep "## Site Metadata" dist/llms.txt
```

- [ ] **Step 2: Push and create PR**

```bash
git push origin feat/seo-phase2-feeds-llms
gh pr create --title "feat(seo): RSS/Atom feeds + enriched llms.txt" --body "$(cat <<'PREOF'
## Summary

- Add `scripts/generate-feeds.ts` producing RSS 2.0 (`feed.xml`) + Atom 1.0 (`atom.xml`)
- Enrich `scripts/generate-llms-txt.ts` with blog metadata + site metadata section
- Add feed discovery `<link>` tags to `index.html`
- Add `seo:postbuild` build pipeline step
- Vitest smoke + functional tests for both scripts
- E2E tests for feed serving + discovery links

Part 1 of 4 in SEO Phase 2. No runtime dependencies - all build-time static generation.

## Test plan

- [ ] Vitest: `npx vitest run tests/scripts/`
- [ ] E2E: build + preview + playwright test feeds-discovery + llms-txt
- [ ] Verify feed.xml validates with an RSS reader
- [ ] Verify llms.txt has Site Metadata section
PREOF
)" --base main
```
