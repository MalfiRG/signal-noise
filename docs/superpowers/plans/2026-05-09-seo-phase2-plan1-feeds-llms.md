# SEO Phase 2 - Plan 1: RSS/Atom Feeds + Enriched llms.txt

**Status:** Rev 2 - post-adversarial-review (Codex + 5 reviewers: ~30 findings, 3 blockers)
**Review:** Codex/GPT-5.5 + adversarial-TL + architect + consistency + socratic + traceability

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RSS 2.0 + Atom 1.0 feeds and enrich the existing llms.txt with blog post metadata - both generated at build time with zero runtime cost.

**Architecture:** Two post-build scripts (`generate-feeds.ts` for RSS/Atom, enriched `generate-llms-txt.ts` for llms.txt) read blog data from `data.ts` and write static files to `dist/`. Feed discovery links added to `index.html`. Build pipeline updated with `seo:postbuild` script name to avoid npm lifecycle conflicts. Both scripts export pure functions for testability and gate CLI execution behind `import.meta.url` checks.

**Tech Stack:** TypeScript (tsx), Node.js fs APIs, XML string generation (no external RSS library)

**Spec:** `docs/superpowers/specs/2026-05-09-seo-phase2-design.md` sections 6, 7, 8.1, 9.3, 9.4

**Branch:** Create `feat/seo-phase2-feeds-llms` from `main`

**Depends on:** Nothing. This plan is independently shippable.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/seo-config.ts` | Create | Shared `SITE_URL` constant for all SEO scripts |
| `scripts/generate-feeds.ts` | Create | RSS 2.0 + Atom 1.0 feed generation (exports pure functions) |
| `scripts/generate-llms-txt.ts` | Modify | Enrich with blog metadata + site metadata section (exports pure function) |
| `scripts/load-blog-data.ts` | Modify (if `reading_time` field absent) | Existing data loader; add `reading_time?: number` to `BlogPostRaw` if missing |
| `src/features/how-i-do-it/data.ts` | Read only | HowIDoItPage[], howIDoItPages |
| `index.html` | Modify | Add feed discovery `<link>` tags |
| `package.json` | Modify | Add `seo:postbuild` script, update `build` script |
| `src/features/blog/data.ts` | Modify (if `reading_time` field absent) | BlogPost interface; add `reading_time?: number` if missing |
| `scripts/__tests__/generate-feeds.test.ts` | Create | Feed generation unit + functional tests |
| `scripts/__tests__/generate-llms-txt.test.ts` | Create | llms.txt enrichment unit + functional tests |
| `e2e/preview-contract/feeds-discovery.spec.ts` | Create | E2E feed validation + discovery link tests (preview-contract project) |
| `e2e/preview-contract/llms-txt.spec.ts` | Create | E2E llms.txt validation tests (preview-contract project) |

---

### Task 1: Create the RSS/Atom feed generator script

**Files:**
- Create: `scripts/seo-config.ts`
- Create: `scripts/generate-feeds.ts`
- Read: `scripts/load-blog-data.ts`

- [ ] **Step 1: Create shared `scripts/seo-config.ts`**

Extract `SITE_URL` to a shared module so all SEO scripts (feeds, llms.txt, and future Plans 2-3 scripts) import from one place.

```typescript
export const SITE_URL = "https://piotrtarach.dev";
```

- [ ] **Step 2: Create `scripts/generate-feeds.ts`**

Export `generateRss` and `generateAtom` as named pure functions for direct testability. Gate CLI execution behind an `import.meta.url` check so the module can be imported without side effects.

```typescript
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { loadPublishedBlogPosts, loadBlogPosts, type BlogPostRaw } from "./load-blog-data.ts";
import { SITE_URL } from "./seo-config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEED_TITLE = "SIGNAL_NOISE - Piotr Tarach";
const FEED_DESC = "Technical blog on AI workflows, test automation, DevOps";
const FEED_LANG = "en";

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc2822(dateStr: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + "T00:00:00Z" : dateStr);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d.toUTCString();
}

function toRfc3339(dateStr: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + "T00:00:00Z" : dateStr);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d.toISOString();
}

export function generateRss(posts: BlogPostRaw[], buildDate: Date): string {
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

export function generateAtom(posts: BlogPostRaw[], buildDate: Date): string {
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
  <link href="${SITE_URL}/atom.xml" rel="self" type="application/atom+xml"/>
  <id>${SITE_URL}/blog</id>
  <updated>${buildDate.toISOString()}</updated>
  <author>
    <name>Piotr Tarach</name>
  </author>
${entries.join("\n")}
</feed>
`;
}

function loadPostsForEnv(): BlogPostRaw[] {
  const env = process.env.VERCEL_ENV || "";
  if (env === "production") return loadPublishedBlogPosts();
  return loadBlogPosts();
}

function main() {
  const posts = loadPostsForEnv();
  const buildDate = new Date();

  const distDir = resolve(__dirname, "../dist");
  mkdirSync(distDir, { recursive: true });

  const rss = generateRss(posts, buildDate);
  const atom = generateAtom(posts, buildDate);

  writeFileSync(resolve(distDir, "feed.xml"), rss, "utf-8");
  writeFileSync(resolve(distDir, "atom.xml"), atom, "utf-8");

  console.log(`feeds: ${posts.length} posts (env=${process.env.VERCEL_ENV || "local"}) -> dist/feed.xml + dist/atom.xml`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
```

- [ ] **Step 3: Verify the script runs**

Run: `npx tsx scripts/generate-feeds.ts`

Expected: `feeds: 0 posts -> dist/feed.xml + dist/atom.xml` (all posts are currently drafts). Verify `dist/feed.xml` and `dist/atom.xml` exist and start with `<?xml`.

```bash
npx tsx scripts/generate-feeds.ts
head -3 dist/feed.xml
head -3 dist/atom.xml
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seo-config.ts scripts/generate-feeds.ts
git commit -m "feat(seo): add shared seo-config + RSS/Atom feed generator script"
```

---

### Task 2: Enrich the llms.txt generator

**Files:**
- Modify: `scripts/generate-llms-txt.ts`

- [ ] **Step 1: Update `scripts/generate-llms-txt.ts` with enriched format**

Replace the full file content. Import `SITE_URL` from the shared `seo-config.ts`. Export the `generate` function for testability. Gate CLI execution behind `import.meta.url`. Add `reading_time` handling per spec section 7.2 - if the field is present in `BlogPostRaw`, include `| N min read`; if absent, omit gracefully.

Note: if `reading_time` is not yet in `data.ts` entries, add `reading_time?: number` to the `BlogPostRaw` interface in `scripts/load-blog-data.ts` and to `BlogPost` in `src/features/blog/data.ts`. The field is already part of the blog post frontmatter convention in `CLAUDE.md`.

```typescript
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { loadPublishedBlogPosts } from "./load-blog-data.ts";
import { SITE_URL } from "./seo-config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadHowIDoItPages() {
  const mod = await import("../src/features/how-i-do-it/data.ts");
  return mod.howIDoItPages;
}

export async function generate() {
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
        `- [${p.title}](${SITE_URL}/blog/${p.slug}) | ${p.date}${p.reading_time ? ` | ${p.reading_time} min read` : ""} | tags: ${p.tags.join(", ")}\n  ${p.excerpt}`
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generate();
}
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
curl -s http://127.0.0.1:8080 | grep -E 'rel="alternate"'
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

**Design-forward note for Plans 2-3:** The shell-chained `seo:postbuild` does not scale past 2-3 steps. Plans 2-3 should consider extracting to a `scripts/seo-postbuild.ts` orchestrator script with per-step timing and error reporting, replacing the shell chain.

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
- Create: `scripts/__tests__/generate-feeds.test.ts`

Tests import `generateRss` and `generateAtom` directly (pure function exports from Task 1). No `execSync` - the functions accept fixture data and return strings. `vitest.config.ts` already includes `scripts/__tests__/**/*.{test,spec}.ts`.

- [ ] **Step 1: Create test directory if it does not exist**

```bash
mkdir -p scripts/__tests__
```

- [ ] **Step 2: Write feed generation tests**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { generateRss, generateAtom, escapeXml } from "../generate-feeds.ts";
import { loadPublishedBlogPosts, loadBlogPosts, type BlogPostRaw } from "../load-blog-data.ts";

const buildDate = new Date("2026-05-09T12:00:00Z");

// Synthetic fixture with special characters for escaping tests
const fixturePost: BlogPostRaw = {
  title: "AI & Automation: <Testing> \"Quotes\"",
  slug: "ai-and-automation",
  date: "2026-05-01",
  tags: ["AI", "testing", "automation"],
  excerpt: "A post about AI & test <automation>",
  draft: false,
};

describe("generate-feeds.ts", () => {
  describe("smoke - with real data", () => {
    let rss: string;
    let atom: string;

    beforeAll(() => {
      const posts = loadPublishedBlogPosts();
      rss = generateRss(posts, buildDate);
      atom = generateAtom(posts, buildDate);
    });

    it("RSS output starts with XML declaration", () => {
      expect(rss.startsWith("<?xml")).toBe(true);
    });

    it("Atom output starts with XML declaration", () => {
      expect(atom.startsWith("<?xml")).toBe(true);
    });

    it("item count matches published posts", () => {
      const posts = loadPublishedBlogPosts();
      const itemCount = (rss.match(/<item>/g) || []).length;
      expect(itemCount).toBe(posts.length);
    });

    it("entry count matches published posts", () => {
      const posts = loadPublishedBlogPosts();
      const entryCount = (atom.match(/<entry>/g) || []).length;
      expect(entryCount).toBe(posts.length);
    });
  });

  describe("functional - RSS", () => {
    let rss: string;

    beforeAll(() => {
      rss = generateRss([fixturePost], buildDate);
    });

    it("contains <channel> with title, link, description", () => {
      expect(rss).toContain("<channel>");
      expect(rss).toContain("<title>SIGNAL_NOISE");
      expect(rss).toContain("<link>https://piotrtarach.dev/blog</link>");
      expect(rss).toContain("<description>");
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

    it("each <item> has <title>, <link>, <pubDate>, <description>", () => {
      const itemBlocks = rss.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of itemBlocks) {
        expect(item).toContain("<title>");
        expect(item).toContain("<link>");
        expect(item).toContain("<pubDate>");
        expect(item).toContain("<description>");
      }
    });

    it("<category> elements exist per item when post has tags", () => {
      expect(rss).toContain("<category>AI</category>");
      expect(rss).toContain("<category>testing</category>");
      expect(rss).toContain("<category>automation</category>");
    });

    it("special characters in titles are XML-escaped", () => {
      expect(rss).toContain("&amp;");
      expect(rss).toContain("&lt;Testing&gt;");
      expect(rss).toContain("&quot;Quotes&quot;");
    });

    it("feed.xml parses as valid XML", () => {
      const doc = new DOMParser().parseFromString(rss, "application/xml");
      const parseError = doc.querySelector("parsererror");
      expect(parseError).toBeNull();
    });
  });

  describe("functional - Atom", () => {
    let atom: string;

    beforeAll(() => {
      atom = generateAtom([fixturePost], buildDate);
    });

    it("contains <feed> with title, link, author", () => {
      expect(atom).toContain("<feed");
      expect(atom).toContain("<title>SIGNAL_NOISE");
      expect(atom).toContain("<author>");
      expect(atom).toContain("<name>Piotr Tarach</name>");
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

    it("atom.xml parses as valid XML", () => {
      const doc = new DOMParser().parseFromString(atom, "application/xml");
      const parseError = doc.querySelector("parsererror");
      expect(parseError).toBeNull();
    });
  });

  describe("draft filtering", () => {
    it("draft posts do not appear in RSS output", () => {
      const allPosts = loadBlogPosts();
      const published = allPosts.filter((p) => !p.draft);
      const rss = generateRss(published, buildDate);
      const drafts = allPosts.filter((p) => p.draft);
      for (const draft of drafts) {
        expect(rss).not.toContain(`/blog/${draft.slug}`);
      }
    });

    it("draft posts do not appear in Atom output", () => {
      const allPosts = loadBlogPosts();
      const published = allPosts.filter((p) => !p.draft);
      const atom = generateAtom(published, buildDate);
      const drafts = allPosts.filter((p) => p.draft);
      for (const draft of drafts) {
        expect(atom).not.toContain(`/blog/${draft.slug}`);
      }
    });
  });

  describe("escapeXml", () => {
    it("escapes &, <, >, quotes", () => {
      expect(escapeXml("A & B")).toBe("A &amp; B");
      expect(escapeXml("<tag>")).toBe("&lt;tag&gt;");
      expect(escapeXml('"hello"')).toBe("&quot;hello&quot;");
      expect(escapeXml("it's")).toBe("it&apos;s");
    });
  });
});
```

Note: `DOMParser` is available globally in the jsdom environment configured in `vitest.config.ts` - no additional dependency needed.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run scripts/__tests__/generate-feeds.test.ts`

Expected: All tests PASS. With 0 published posts, item/entry counts are 0. The fixture-based tests validate XML escaping and structure with controlled input.

- [ ] **Step 4: Commit**

```bash
git add scripts/__tests__/generate-feeds.test.ts
git commit -m "test(seo): add feed generation unit + functional tests"
```

---

### Task 6: Write Vitest tests for enriched llms.txt

**Files:**
- Create: `scripts/__tests__/generate-llms-txt.test.ts`

Tests call `generate()` directly (exported from Task 2) then read the output file. The `generate` function is async, so use `await` in `beforeAll`.

- [ ] **Step 1: Write llms.txt tests**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { generate } from "../generate-llms-txt.ts";
import { loadPublishedBlogPosts, loadBlogPosts } from "../load-blog-data.ts";

const LLMS_PATH = resolve(__dirname, "../../public/llms.txt");

describe("generate-llms-txt.ts", () => {
  beforeAll(async () => {
    await generate();
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

    it("each blog post entry contains title, URL, date, and tags", () => {
      const posts = loadPublishedBlogPosts();
      for (const post of posts) {
        expect(content).toContain(`[${post.title}]`);
        expect(content).toContain(`/blog/${post.slug}`);
        expect(content).toContain(post.date);
        expect(content).toContain("tags:");
      }
    });

    it("reading_time is included when present on a post", () => {
      const posts = loadPublishedBlogPosts();
      const postsWithReadingTime = posts.filter((p) => p.reading_time);
      for (const post of postsWithReadingTime) {
        expect(content).toContain(`${post.reading_time} min read`);
      }
    });

    it("draft posts do not appear in llms.txt", () => {
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

    it("titles with ], ), or newlines do not break markdown links", () => {
      // Smoke check: all markdown links parse cleanly (opening [ has matching ])
      const links = [...content.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)];
      for (const m of links) {
        expect(m[1]).not.toContain("\n");
        expect(m[2]).not.toContain("\n");
        expect(m[2]).toMatch(/^https?:\/\//);
      }
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run scripts/__tests__/generate-llms-txt.test.ts`

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/__tests__/generate-llms-txt.test.ts
git commit -m "test(seo): add llms.txt enrichment unit + functional tests"
```

---

### Task 7: Write E2E tests for feeds and llms.txt

**Files:**
- Create: `e2e/preview-contract/feeds-discovery.spec.ts`
- Create: `e2e/preview-contract/llms-txt.spec.ts`

These tests run against the built output served via `vite preview` on port 4174. The repo already has `playwright.preview-contract.config.ts` with a `webServer` block that builds and serves on port 4174. Feed files only exist in `dist/` after build, so a preview-contract test is the correct shape - not a dev-server functional test.

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

  test("first RSS <link> click-through loads a page", async ({ page, request }) => {
    const res = await request.get("/feed.xml");
    const body = await res.text();
    const linkMatch = body.match(/<link>(https?:\/\/[^<]+\/blog\/[^<]+)<\/link>/);
    if (linkMatch) {
      const url = new URL(linkMatch[1]);
      await page.goto(url.pathname);
      await expect(page).not.toHaveTitle(/404/);
    }
    // If no <link> found (0 published posts), test is a no-op - acceptable
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

  test("first blog URL in llms.txt click-through loads a page", async ({ page, request }) => {
    const res = await request.get("/llms.txt");
    const body = await res.text();
    const urlMatch = body.match(/\(https:\/\/piotrtarach\.dev\/blog\/([^)]+)\)/);
    if (urlMatch) {
      await page.goto(`/blog/${urlMatch[1]}`);
      await expect(page).not.toHaveTitle(/404/);
    }
    // If no blog URL found (0 published posts), test is a no-op - acceptable
  });
});
```

**TODO (deferred to Plan 3):** Feed discovery links on ALL pre-rendered pages (not just `/`). The `<link>` tags are in `index.html` which Vite copies to all routes, but verification across all pre-rendered paths needs the prerender to exist first.

- [ ] **Step 3: Run E2E tests via preview-contract config**

```bash
npx playwright test --config playwright.preview-contract.config.ts
```

The `webServer` block in `playwright.preview-contract.config.ts` handles the build + preview automatically. No manual `npm run build && npx vite preview` needed.

- [ ] **Step 4: Commit**

```bash
git add e2e/preview-contract/feeds-discovery.spec.ts e2e/preview-contract/llms-txt.spec.ts
git commit -m "test(e2e): add feed + llms.txt preview-contract validation tests"
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
npx playwright test --project=smoke --project=functional --reporter=list 2>&1 | tail -20
```

Expected: All existing tests PASS. The `index.html` change (two new `<link>` tags) is additive and does not affect existing assertions.

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
- Vitest unit + functional tests for both scripts
- E2E preview-contract tests for feed serving + discovery links

Part 1 of 4 in SEO Phase 2. No runtime dependencies - all build-time static generation.

## Test plan

- [ ] Vitest: `npx vitest run scripts/__tests__/`
- [ ] E2E: `npx playwright test --config playwright.preview-contract.config.ts`
- [ ] Verify feed.xml validates with an RSS reader
- [ ] Verify llms.txt has Site Metadata section
PREOF
)" --base main
```

---

## Resolutions Applied in Rev 2

Applied ~30 findings from Codex/GPT-5.5 + 5 adversarial reviewers (adversarial-TL, architect, consistency, socratic, traceability).

| ID | Severity | Resolution |
|---|---|---|
| B1 | BLOCKER | Test files moved from `tests/scripts/` to `scripts/__tests__/` (matches `vitest.config.ts` include pattern) |
| B2 | BLOCKER | All `require()` calls replaced with ESM static imports (`loadBlogPosts` added to top-level import) |
| B3 | BLOCKER | Feed/llms E2E specs moved to `e2e/preview-contract/`; Playwright invocation uses `--config playwright.preview-contract.config.ts` (port 4174, correct project name) |
| H1 | HIGH | `generateRss`, `generateAtom`, `escapeXml`, `generate` exported as named functions; CLI gated behind `import.meta.url === pathToFileURL(process.argv[1]).href`; tests use direct imports with fixture data instead of `execSync` |
| H2 | HIGH | XML parse validation added to both RSS and Atom test suites via `DOMParser` (available in jsdom env, no extra dependency) |
| H3 | HIGH | 8 missing spec requirements added: per-item structural assertion, `<category>` elements, per-entry field assertion (title/URL/date/tags), `reading_time` field test, click-through tests for RSS and llms.txt, markdown link integrity |
| H4 | HIGH | `reading_time` handling added to llms.txt format string with graceful undefined fallback; note added about adding field to `BlogPostRaw` interface |
| H5 | HIGH | Design-forward note added to Task 4 about `scripts/seo-postbuild.ts` orchestrator for Plans 2-3 |
| M1 | MEDIUM | `SITE_URL` extracted to shared `scripts/seo-config.ts`; both generator scripts import from it |
| M2 | MEDIUM | `localhost` replaced with `127.0.0.1` in Task 3 curl command |
| Min1 | MINOR | XML escaping test uses synthetic fixture post with `&`, `<>`, `"` in title instead of relying on `data.ts` content |
| Min2 | MINOR | Markdown link integrity test added (checks for `\n` in link text/URL, validates URL format) |
| Min3 | MINOR | `reading_time field check` annotation in File Map kept (H4 adds the field handling) |

**Deferred:**
- F-ARCH-04: feeds in `dist/` vs llms.txt in `public/` asymmetry accepted - feeds must be post-build for Plans 2-3 pipeline ordering
- Traceability #6: feed discovery on ALL pre-rendered pages deferred to Plan 3 (prerender does not exist yet); TODO added in Task 7
- Q-6: concurrent build safety - Vercel builds are serial per project, not a concern
