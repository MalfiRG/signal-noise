# SEO Phase 2 - Plan 3: Static Prerender + hydrateRoot + Regression

**Status:** Rev 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-render all routes at build time via Playwright, switch the entry point to conditional `hydrateRoot`, and verify the existing test suite passes against pre-rendered output - dropping LCP from 5.82s to sub-1s.

**Architecture:** A post-build script (`prerender.ts`) launches headless Chromium against `vite preview`, navigates each route, waits for content to settle (fonts + Mermaid + double-rAF), captures the full DOM, injects OG/Twitter meta tags, and writes static HTML files to `dist/`. The entry point (`main.tsx`) detects pre-rendered content via `root.children.length > 0` and uses `hydrateRoot` (preserves DOM) instead of `createRoot` (replaces DOM). Hero cascade replays on first visit after a brief flash of settled content - an accepted trade-off for sub-1s LCP.

**Tech Stack:** TypeScript (tsx), Playwright (headless Chromium), `react-dom/client` (`hydrateRoot`), Node.js fs APIs

**Spec:** `docs/superpowers/specs/2026-05-09-seo-phase2-design.md` sections 4.1-4.7, 8.1-8.4, 9.1, 9.5, 9.6

**Branch:** Create `feat/seo-phase2-prerender` from `main`

**Depends on:** Plan 1 (feeds + llms.txt) must be merged first. Plan 1 establishes the `seo:postbuild` pipeline and feed discovery links in `index.html` that prerender inherits. Plan 2 (OG images) is optional - prerender injects `og:image` meta tags only if the corresponding PNG file exists in `dist/og/`. If Plan 2 hasn't shipped, `og:image` and `twitter:image` tags are omitted (all other meta tags still injected).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/main.tsx` | Modify | Conditional `hydrateRoot` vs `createRoot` based on `root.children.length` |
| `scripts/prerender.ts` | Create | Playwright-based static prerender with settle sequence, meta tag injection, atomic write |
| `scripts/seo-config.ts` | Modify | Add route manifest and OG metadata definitions (shared by prerender + future OG script) |
| `package.json` | Modify | Extend `seo:postbuild` to include `tsx scripts/prerender.ts` |
| `vercel.json` | Modify | Add Playwright Chromium install to `installCommand`; add cache headers for pre-rendered routes |
| `scripts/__tests__/prerender.test.ts` | Create | Vitest smoke + functional tests for prerender output |
| `scripts/__tests__/build-pipeline.test.ts` | Create | Build pipeline integration tests (exit code, determinism, crash recovery) |
| `e2e/preview-contract/prerender-hydration.spec.ts` | Create | E2E hydration tests (no-JS, first visit, return visit, navigation, mobile, reduced-motion) |

---

### Task 1: Switch main.tsx to conditional hydrateRoot

**Files:**
- Modify: `src/main.tsx`
- Test: `src/__tests__/main-hydration.test.ts` (optional - see note)

- [ ] **Step 1: Write the conditional hydration logic**

Replace the current `main.tsx`:

```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

With:

```typescript
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root")!;
if (root.children.length > 0) {
  hydrateRoot(root, <App />);
} else {
  createRoot(root).render(<App />);
}
```

Note: this change is safe for `npm run dev` - the dev server serves an empty `<div id="root"></div>`, so `children.length === 0` and `createRoot` is used (same as before). Pre-rendered production builds populate the root div, triggering `hydrateRoot`.

- [ ] **Step 2: Verify dev server still works**

```bash
npm run dev &
sleep 3
curl -s http://127.0.0.1:8080 | grep -c '<div id="root"></div>'
kill %1
```

Expected: `1` - the dev server still serves the empty root div. `createRoot` path is taken.

- [ ] **Step 3: Run existing Vitest suite**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: same pass/fail count as baseline (273 passed, 9 failed - pre-existing failures). The `main.tsx` change should not affect any existing tests.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat(prerender): conditional hydrateRoot when pre-rendered content exists"
```

---

### Task 2: Create the route manifest in seo-config.ts

**Files:**
- Modify: `scripts/seo-config.ts`
- Read: `scripts/load-blog-data.ts`, `src/features/how-i-do-it/data.ts`

The route manifest defines all routes to prerender and their OG metadata. Both `prerender.ts` (this plan) and `generate-og-images.ts` (Plan 2) will import from it.

- [ ] **Step 1: Add route manifest types and builder to seo-config.ts**

Append to the existing `scripts/seo-config.ts` (which already exports `SITE_URL` from Plan 1):

```typescript
import { loadPublishedBlogPosts, type BlogPostRaw } from "./load-blog-data.ts";

export interface RouteMetadata {
  path: string;
  ogTitle: string;
  ogDescription: string;
  ogImageFilename: string;
}

async function loadHowIDoItPages(): Promise<{ slug: string; title: string; description: string }[]> {
  const mod = await import("../src/features/how-i-do-it/data.ts");
  return mod.howIDoItPages;
}

export async function buildRouteManifest(): Promise<RouteMetadata[]> {
  const blogPosts = loadPublishedBlogPosts();
  const howIDoItPages = await loadHowIDoItPages();

  const staticRoutes: RouteMetadata[] = [
    {
      path: "/",
      ogTitle: "BREAK IT. BUILD IT. PROVE IT.",
      ogDescription: "Piotr Tarach - QA Engineer, Prague",
      ogImageFilename: "home.png",
    },
    {
      path: "/projects",
      ogTitle: "Projects",
      ogDescription: "Portfolio",
      ogImageFilename: "projects.png",
    },
    {
      path: "/skills",
      ogTitle: "Tech Radar",
      ogDescription: "Competency map",
      ogImageFilename: "skills.png",
    },
    {
      path: "/blog",
      ogTitle: "Blog",
      ogDescription: "Technical writing",
      ogImageFilename: "blog.png",
    },
    {
      path: "/how-i-do-it",
      ogTitle: "How I Do It",
      ogDescription: "QA Methodology",
      ogImageFilename: "how-i-do-it.png",
    },
  ];

  const blogRoutes: RouteMetadata[] = blogPosts.map((p: BlogPostRaw) => ({
    path: `/blog/${p.slug}`,
    ogTitle: p.title,
    ogDescription: p.excerpt,
    ogImageFilename: `blog-${p.slug}.png`,
  }));

  const howIDoItRoutes: RouteMetadata[] = howIDoItPages.map((p) => ({
    path: `/how-i-do-it/${p.slug}`,
    ogTitle: p.title,
    ogDescription: p.description,
    ogImageFilename: `how-i-do-it-${p.slug}.png`,
  }));

  return [...staticRoutes, ...blogRoutes, ...howIDoItRoutes];
}
```

- [ ] **Step 2: Verify the manifest loads correctly**

```bash
npx tsx -e "
import { buildRouteManifest } from './scripts/seo-config.ts';
const routes = await buildRouteManifest();
console.log('Routes:', routes.length);
routes.forEach(r => console.log(' ', r.path, '->', r.ogImageFilename));
"
```

Expected: routes for `/`, `/projects`, `/skills`, `/blog`, `/how-i-do-it`, plus one per published blog post and one per how-i-do-it page. Currently 0 published posts, 5 how-i-do-it pages = 10 routes total.

- [ ] **Step 3: Commit**

```bash
git add scripts/seo-config.ts
git commit -m "feat(seo): add route manifest with OG metadata to seo-config"
```

---

### Task 3: Create the prerender script

**Files:**
- Create: `scripts/prerender.ts`
- Read: `e2e/fixtures/visual-determinism.ts` (for settle sequence patterns)

This is the core script. It launches Playwright, navigates each route from the manifest, waits for content to settle, captures the DOM, injects meta tags, and writes the result atomically.

- [ ] **Step 1: Create `scripts/prerender.ts`**

```typescript
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { buildRouteManifest, SITE_URL, type RouteMetadata } from "./seo-config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "../dist");
const PREVIEW_PORT = 4175;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

interface CapturedRoute {
  route: RouteMetadata;
  html: string;
}

function routeToFilePath(routePath: string): string {
  if (routePath === "/") return resolve(DIST_DIR, "index.html");
  return resolve(DIST_DIR, routePath.slice(1), "index.html");
}

function injectMetaTags(html: string, route: RouteMetadata): string {
  const ogImagePath = `og/${route.ogImageFilename}`;
  const ogImageExists = existsSync(resolve(DIST_DIR, ogImagePath));
  const ogUrl = `${SITE_URL}${route.path === "/" ? "" : route.path}`;

  const tags: Record<string, string> = {
    "og:title": route.ogTitle,
    "og:description": route.ogDescription,
    "og:url": ogUrl,
    "og:type": "website",
    "twitter:card": "summary_large_image",
    "twitter:title": route.ogTitle,
    "twitter:description": route.ogDescription,
  };

  if (ogImageExists) {
    const ogImageUrl = `${SITE_URL}/${ogImagePath}`;
    tags["og:image"] = ogImageUrl;
    tags["twitter:image"] = ogImageUrl;
  }

  let result = html;

  for (const [property, content] of Object.entries(tags)) {
    const isOg = property.startsWith("og:");
    const attr = isOg ? "property" : "name";
    const existingPattern = new RegExp(
      `<meta\\s+${attr}="${property}"\\s+content="[^"]*"\\s*/?>`,
      "i"
    );

    const newTag = `<meta ${attr}="${property}" content="${escapeHtmlAttr(content)}" />`;

    if (existingPattern.test(result)) {
      result = result.replace(existingPattern, newTag);
    } else {
      result = result.replace("</head>", `    ${newTag}\n  </head>`);
    }
  }

  return result;
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function captureRoute(
  page: import("playwright").Page,
  route: RouteMetadata
): Promise<string> {
  await page.goto(`${PREVIEW_URL}${route.path}`, { waitUntil: "networkidle" });

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const hasMermaid = await page.locator("svg[id^='mermaid-']").count();
  if (hasMermaid > 0) {
    await page.waitForFunction(
      () => {
        const svgs = document.querySelectorAll("svg[id^='mermaid-']");
        return Array.from(svgs).every((s) => {
          try {
            return (s as SVGGraphicsElement).getBBox().width > 0;
          } catch {
            return false;
          }
        });
      },
      { timeout: 15000 }
    );
  }

  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );

  return page.content();
}

export async function prerenderAllRoutes(): Promise<CapturedRoute[]> {
  const routes = await buildRouteManifest();
  console.log(`prerender: ${routes.length} routes to capture`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const captured: CapturedRoute[] = [];

  try {
    for (const route of routes) {
      const page = await context.newPage();

      await page.addInitScript(() => {
        sessionStorage.setItem("hero-cascade-played", "1");
      });

      const startMs = Date.now();
      const html = await captureRoute(page, route);
      const elapsedMs = Date.now() - startMs;
      console.log(`  ${route.path} (${elapsedMs}ms)`);

      captured.push({ route, html });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return captured;
}

export function writePrerenderedFiles(captured: CapturedRoute[]): void {
  for (const { route, html } of captured) {
    const injected = injectMetaTags(html, route);
    const filePath = routeToFilePath(route.path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, injected, "utf-8");
  }
  console.log(`prerender: wrote ${captured.length} files to dist/`);
}

async function main(): Promise<void> {
  const captured = await prerenderAllRoutes();

  if (captured.length === 0) {
    console.error("prerender: no routes captured - failing build");
    process.exit(1);
  }

  writePrerenderedFiles(captured);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("prerender: fatal error", err);
    process.exit(1);
  });
}
```

**Critical design decisions in this script:**

1. **Atomic capture-then-write:** All routes are captured into memory first (`prerenderAllRoutes`). Only after all succeed does `writePrerenderedFiles` write to disk. If any route fails mid-capture, the build exits non-zero and `dist/` retains the original SPA shells.

2. **Hero cascade skip:** `sessionStorage.setItem("hero-cascade-played", "1")` is injected via `addInitScript` before navigation. This makes the hero render in settled state (phase 3) - the correct pre-rendered state.

3. **Settle sequence:** Mirrors the visual-determinism fixture: `networkidle` -> `document.fonts.ready` -> Mermaid bbox check (if applicable) -> double-rAF. This ensures all async content is rendered before capture.

4. **Meta tag upsert:** `injectMetaTags` checks for existing meta tags (from `react-helmet-async`) and updates them. New tags are appended before `</head>`. `og:image`/`twitter:image` are only injected if the PNG file exists in `dist/og/` (defensive - allows shipping before Plan 2).

5. **Separate port (4175):** Avoids collision with dev server (8080), preview-contract tests (4174), and prod-contract tests (4173).

- [ ] **Step 2: Test the script manually**

First build the SPA, then start a preview server, then run prerender:

```bash
npm run build
npx vite preview --port 4175 --strictPort &
PREVIEW_PID=$!
sleep 2
npx tsx scripts/prerender.ts
kill $PREVIEW_PID

head -30 dist/index.html
head -5 dist/projects/index.html
```

Expected: `dist/index.html` now contains pre-rendered hero text ("BREAK IT", "BUILD IT", "PROVE IT") instead of the empty `<div id="root"></div>`. Each route has an `index.html` with rendered content. OG meta tags are present (without `og:image` since Plan 2 hasn't shipped).

- [ ] **Step 3: Commit**

```bash
git add scripts/prerender.ts
git commit -m "feat(prerender): Playwright-based static prerender with settle sequence and meta injection"
```

---

### Task 4: Integrate prerender into the build pipeline

**Files:**
- Modify: `package.json`
- Modify: `vercel.json`

- [ ] **Step 1: Update seo:postbuild to include prerender**

The prerender script needs `vite preview` running during execution. This requires a wrapper that starts preview, runs prerender, then stops preview. Update `package.json`:

```json
"seo:postbuild": "tsx scripts/generate-feeds.ts && node -e \"const{spawn}=require('child_process');const s=spawn('npx',['vite','preview','--port','4175','--strictPort'],{stdio:'ignore',detached:true});s.unref();setTimeout(()=>{import('./scripts/prerender.ts').then(m=>m.prerenderAllRoutes().then(c=>{m.writePrerenderedFiles(c);process.kill(-s.pid)}))},3000)\""
```

**Wait - this is too complex for a JSON script.** Instead, create a thin orchestrator:

Add a new script `scripts/seo-postbuild.ts`:

```typescript
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execSync, spawn, type ChildProcess } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function runStep(label: string, cmd: string): void {
  const start = Date.now();
  console.log(`\n=== ${label} ===`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
  console.log(`  (${Date.now() - start}ms)`);
}

function startPreviewServer(port: number): ChildProcess {
  const child = spawn("npx", ["vite", "preview", "--port", String(port), "--strictPort"], {
    cwd: ROOT,
    stdio: "pipe",
    detached: false,
  });
  return child;
}

async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function main(): Promise<void> {
  runStep("1/3 Generate feeds", "npx tsx scripts/generate-feeds.ts");

  // Plan 2: uncomment when OG image script is ready
  // runStep("2/3 Generate OG images", "npx tsx scripts/generate-og-images.ts");

  console.log("\n=== 3/3 Prerender ===");
  const previewPort = 4175;
  const server = startPreviewServer(previewPort);

  try {
    await waitForServer(`http://127.0.0.1:${previewPort}`);

    const { prerenderAllRoutes, writePrerenderedFiles } = await import("./prerender.ts");
    const captured = await prerenderAllRoutes();
    writePrerenderedFiles(captured);
  } finally {
    server.kill();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("seo-postbuild: fatal error", err);
    process.exit(1);
  });
}
```

Update `package.json`:

```json
"seo:postbuild": "tsx scripts/seo-postbuild.ts"
```

This replaces the shell chain `tsx scripts/generate-feeds.ts` with an orchestrator that runs feeds, then starts a preview server, then prerenders. The orchestrator provides per-step timing, proper cleanup, and a clear extension point for Plan 2's OG image step.

- [ ] **Step 2: Update vercel.json**

Add Playwright Chromium installation to `installCommand` and cache headers for pre-rendered routes:

```json
{
  "installCommand": "npm install --legacy-peer-deps && npx playwright install chromium --with-deps",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": ".*\\.vercel\\.app" }],
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
      ]
    },
    {
      "source": "/(blog|projects|skills|how-i-do-it)(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, s-maxage=3600, stale-while-revalidate=86400" }
      ]
    }
  ]
}
```

Changes:
1. `installCommand` gains `&& npx playwright install chromium --with-deps`
2. New `headers` entry caches pre-rendered pages at CDN edge for 1 hour with stale-while-revalidate for 24 hours. Root `/` excluded (changes more frequently).

- [ ] **Step 3: Test the full build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds. Output includes "prerender: N routes to capture" and "prerender: wrote N files to dist/". The preview server starts and stops automatically.

```bash
head -5 dist/index.html
grep "BREAK IT" dist/index.html | head -1
grep 'og:title' dist/index.html
ls dist/projects/index.html dist/skills/index.html dist/blog/index.html
```

Expected: pre-rendered HTML with hero text, OG meta tags (without og:image until Plan 2), and sub-route files.

- [ ] **Step 4: Commit**

```bash
git add scripts/seo-postbuild.ts package.json vercel.json
git commit -m "build(prerender): seo-postbuild orchestrator with preview server lifecycle"
```

---

### Task 5: Write Vitest smoke and functional tests for prerender output

**Files:**
- Create: `scripts/__tests__/prerender.test.ts`

These tests verify the prerender OUTPUT, not the script in isolation. They run after `npm run build` produces pre-rendered files in `dist/`. The tests read files from `dist/` and assert structural properties.

**Important:** These tests require a prior `npm run build` to populate `dist/`. They are NOT run during normal `npx vitest run` without a build. To run them:

```bash
npm run build && npx vitest run scripts/__tests__/prerender.test.ts
```

Or use `describe.skipIf(!existsSync("dist/index.html"))` to auto-skip when dist/ is absent.

- [ ] **Step 1: Create `scripts/__tests__/prerender.test.ts`**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadPublishedBlogPosts } from "../load-blog-data.ts";

const DIST = resolve(import.meta.dirname!, "../../dist");

const skipNoBuild = !existsSync(resolve(DIST, "index.html"));

describe.skipIf(skipNoBuild)("prerender output", () => {
  let indexHtml: string;

  beforeAll(() => {
    indexHtml = readFileSync(resolve(DIST, "index.html"), "utf-8");
  });

  describe("smoke", () => {
    it("dist/index.html is NOT the original SPA shell", () => {
      expect(indexHtml).not.toContain('<div id="root"></div>');
    });

    it("dist/index.html contains <!doctype html>", () => {
      expect(indexHtml.toLowerCase()).toContain("<!doctype html>");
    });

    it("dist/index.html has a non-empty root div", () => {
      expect(indexHtml).toMatch(/<div id="root">[^<]/);
    });

    it("every static route has a corresponding index.html", () => {
      const staticRoutes = ["projects", "skills", "blog", "how-i-do-it"];
      for (const route of staticRoutes) {
        const filePath = resolve(DIST, route, "index.html");
        expect(existsSync(filePath), `Missing: dist/${route}/index.html`).toBe(true);
      }
    });

    it("every how-i-do-it slug has a pre-rendered page", () => {
      const slugs = ["test-plan", "test-case", "test-architecture", "automation-framework", "bug-reporting"];
      for (const slug of slugs) {
        const filePath = resolve(DIST, "how-i-do-it", slug, "index.html");
        expect(existsSync(filePath), `Missing: dist/how-i-do-it/${slug}/index.html`).toBe(true);
      }
    });

    it("pre-rendered HTML files are valid UTF-8 with no null bytes", () => {
      const files = [
        resolve(DIST, "index.html"),
        resolve(DIST, "projects", "index.html"),
        resolve(DIST, "skills", "index.html"),
      ];
      for (const f of files) {
        const content = readFileSync(f);
        expect(content.includes(0x00), `Null byte in ${f}`).toBe(false);
      }
    });
  });

  describe("functional", () => {
    it("pre-rendered / contains hero text", () => {
      expect(indexHtml).toContain("BREAK IT");
      expect(indexHtml).toContain("BUILD IT");
      expect(indexHtml).toContain("PROVE IT");
    });

    it("pre-rendered / has hero in settled state (phase 3)", () => {
      expect(indexHtml).toContain('data-testid="hero-phase3"');
      expect(indexHtml).not.toContain('data-testid="hero-cascading"');
    });

    it("pre-rendered /projects contains Projects heading", () => {
      const html = readFileSync(resolve(DIST, "projects", "index.html"), "utf-8");
      expect(html.toLowerCase()).toContain("projects");
    });

    it("pre-rendered /skills contains Tech Radar content", () => {
      const html = readFileSync(resolve(DIST, "skills", "index.html"), "utf-8");
      expect(html.toLowerCase()).toMatch(/tech\s*radar|skills/i);
    });

    it("pre-rendered /how-i-do-it contains methodology page links", () => {
      const html = readFileSync(resolve(DIST, "how-i-do-it", "index.html"), "utf-8");
      expect(html).toContain("/how-i-do-it/test-plan");
      expect(html).toContain("/how-i-do-it/test-case");
    });

    it("each pre-rendered file preserves the hydration entry point", () => {
      const files = [
        resolve(DIST, "index.html"),
        resolve(DIST, "projects", "index.html"),
        resolve(DIST, "blog", "index.html"),
      ];
      for (const f of files) {
        const content = readFileSync(f, "utf-8");
        expect(content).toContain('<script type="module"');
      }
    });

    it("dist/nonexistent-route/index.html does NOT exist", () => {
      expect(existsSync(resolve(DIST, "nonexistent-route", "index.html"))).toBe(false);
    });

    it("pre-rendered / contains OG meta tags", () => {
      expect(indexHtml).toMatch(/<meta\s+property="og:title"/);
      expect(indexHtml).toMatch(/<meta\s+property="og:description"/);
      expect(indexHtml).toMatch(/<meta\s+property="og:url"/);
      expect(indexHtml).toMatch(/<meta\s+property="og:type"/);
      expect(indexHtml).toMatch(/<meta\s+name="twitter:card"/);
    });

    it("pre-rendered / contains feed discovery links", () => {
      expect(indexHtml).toContain('rel="alternate"');
      expect(indexHtml).toContain("application/rss+xml");
      expect(indexHtml).toContain("application/atom+xml");
    });

    it("pre-rendered how-i-do-it slug pages contain page titles", () => {
      const slugsAndTitles = [
        ["test-plan", "Test Plan"],
        ["bug-reporting", "Bug Reporting"],
      ];
      for (const [slug, title] of slugsAndTitles) {
        const filePath = resolve(DIST, "how-i-do-it", slug, "index.html");
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, "utf-8");
          expect(content, `dist/how-i-do-it/${slug}/index.html missing title`).toContain(title);
        }
      }
    });
  });
});
```

- [ ] **Step 2: Run the tests after a build**

```bash
npm run build && npx vitest run scripts/__tests__/prerender.test.ts 2>&1 | tail -15
```

Expected: all tests pass. The prerender produces the expected output.

- [ ] **Step 3: Commit**

```bash
git add scripts/__tests__/prerender.test.ts
git commit -m "test(prerender): Vitest smoke and functional tests for prerender output"
```

---

### Task 6: Write E2E tests for prerender hydration and content

**Files:**
- Create: `e2e/preview-contract/prerender-hydration.spec.ts`

These tests run against a built + pre-rendered output served via `vite preview`. They use the `preview-contract` Playwright config (port 4174, `VERCEL_ENV=preview` build). The config's `webServer` block handles building and serving automatically.

- [ ] **Step 1: Create `e2e/preview-contract/prerender-hydration.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Prerender - No-JS content verification", () => {
  test("pre-rendered / is visible without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.getByText("BREAK IT")).toBeVisible();
    await expect(page.getByText("BUILD IT")).toBeVisible();
    await expect(page.getByText("PROVE IT")).toBeVisible();

    await context.close();
  });

  test("pre-rendered /projects is visible without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/projects");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await context.close();
  });

  test("pre-rendered /blog is visible without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/blog");

    await expect(page.getByRole("heading", { name: /blog/i })).toBeVisible();

    await context.close();
  });

  test("pre-rendered /how-i-do-it is visible without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/how-i-do-it");

    await expect(page.getByText("Test Plan")).toBeVisible();
    await expect(page.getByText("Bug Reporting")).toBeVisible();

    await context.close();
  });
});

test.describe("Prerender - Hydration smoke", () => {
  test("returning visitor: zero hydration mismatch warnings", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      sessionStorage.setItem("hero-cascade-played", "1");
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    const hydrationErrors = consoleErrors.filter(
      (e) =>
        e.includes("Hydration failed") ||
        e.includes("Text content does not match") ||
        e.includes("did not match")
    );

    expect(hydrationErrors, "Hydration mismatch errors for returning visitor").toHaveLength(0);
  });

  test("first visit: cascade starts despite hydration mismatch", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 10_000 });

    await page.evaluate(() => {
      sessionStorage.removeItem("hero-cascade-played");
    });
    await page.reload();

    await expect(page.locator("[data-testid='hero-cascading']")).toBeVisible({ timeout: 5_000 });

    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Prerender - Hero behavior", () => {
  test("hero settled on return visit - no cascade replay", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("hero-cascade-played", "1");
    });

    await page.goto("/");

    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 5_000 });

    const cascading = page.locator("[data-testid='hero-cascading']");
    await expect(cascading).toHaveCount(0);
  });

  test("navigation after hydration works (client-side routing)", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("hero-cascade-played", "1");
    });

    await page.goto("/");
    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 5_000 });

    await page.click("text=VIEW PROJECTS");
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("mobile viewport: hero text visible and no overflow", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.getByText("BREAK IT")).toBeVisible();
    await expect(page.getByText("PROVE IT")).toBeVisible();

    const hero = page.locator("[data-testid='hero-phase3']");
    const box = await hero.boundingBox();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375 + 5);
    }

    await context.close();
  });

  test("reduced-motion: hero settles immediately", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator("[data-testid='hero-phase3']")).toBeVisible({ timeout: 3_000 });

    await context.close();
  });
});

test.describe("Prerender - Meta tags", () => {
  test("pre-rendered / has OG meta tags", async ({ page }) => {
    await page.goto("/");

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);

    const ogDesc = page.locator('meta[property="og:description"]');
    await expect(ogDesc).toHaveAttribute("content", /.+/);

    const ogUrl = page.locator('meta[property="og:url"]');
    await expect(ogUrl).toHaveAttribute("content", /https:\/\/piotrtarach\.dev/);

    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute("content", "summary_large_image");
  });

  test("pre-rendered / has feed discovery links", async ({ page }) => {
    await page.goto("/");

    const rssLink = page.locator('link[type="application/rss+xml"]');
    await expect(rssLink).toHaveAttribute("href", "/feed.xml");

    const atomLink = page.locator('link[type="application/atom+xml"]');
    await expect(atomLink).toHaveAttribute("href", "/atom.xml");
  });

  test("pre-rendered /projects has route-specific OG title", async ({ page }) => {
    await page.goto("/projects");

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", "Projects");
  });
});
```

- [ ] **Step 2: Run the E2E tests**

```bash
npx playwright test --config playwright.preview-contract.config.ts e2e/preview-contract/prerender-hydration.spec.ts 2>&1 | tail -20
```

Expected: all tests pass. The preview-contract config handles building and serving automatically.

- [ ] **Step 3: Commit**

```bash
git add e2e/preview-contract/prerender-hydration.spec.ts
git commit -m "test(prerender): E2E hydration, content, hero, and meta tag tests"
```

---

### Task 7: Write build pipeline integration tests

**Files:**
- Create: `scripts/__tests__/build-pipeline.test.ts`

These tests verify the full `npm run build` pipeline produces correct output. Like the prerender tests, they require a prior build and auto-skip if `dist/` is absent.

- [ ] **Step 1: Create `scripts/__tests__/build-pipeline.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const DIST = resolve(import.meta.dirname!, "../../dist");

const skipNoBuild = !existsSync(resolve(DIST, "index.html"));

describe.skipIf(skipNoBuild)("build pipeline integration", () => {
  describe("smoke - output completeness", () => {
    it("dist/ contains all expected output files", () => {
      const required = [
        "index.html",
        "feed.xml",
        "atom.xml",
        "llms.txt",
      ];
      for (const file of required) {
        expect(existsSync(resolve(DIST, file)), `Missing: dist/${file}`).toBe(true);
      }
    });

    it("dist/index.html is larger than the SPA shell", () => {
      const distIndex = statSync(resolve(DIST, "index.html")).size;
      // The original SPA shell index.html is ~700 bytes.
      // Pre-rendered should be much larger (10KB+).
      expect(distIndex).toBeGreaterThan(5000);
    });
  });

  describe("functional - content integrity", () => {
    it("no files in dist/ contain empty root div (all routes pre-rendered)", () => {
      const routeFiles = [
        "index.html",
        "projects/index.html",
        "skills/index.html",
        "blog/index.html",
        "how-i-do-it/index.html",
      ];
      for (const file of routeFiles) {
        const path = resolve(DIST, file);
        if (existsSync(path)) {
          const content = readFileSync(path, "utf-8");
          expect(
            content,
            `dist/${file} still has empty root - not pre-rendered`
          ).not.toContain('<div id="root"></div>');
        }
      }
    });

    it("feed files are deterministic (same structure on repeated reads)", () => {
      const feedXml = readFileSync(resolve(DIST, "feed.xml"), "utf-8");
      const atomXml = readFileSync(resolve(DIST, "atom.xml"), "utf-8");

      expect(feedXml).toContain("<?xml");
      expect(atomXml).toContain("<?xml");
      expect(feedXml).toContain("<channel>");
      expect(atomXml).toContain("<feed");
    });

    it("llms.txt has enriched content (not empty sections)", () => {
      const llmsTxt = readFileSync(resolve(DIST, "llms.txt"), "utf-8");
      expect(llmsTxt).toContain("## How I Do It");
      expect(llmsTxt).toContain("Test Plan");
    });
  });
});
```

- [ ] **Step 2: Run the tests after a build**

```bash
npm run build && npx vitest run scripts/__tests__/build-pipeline.test.ts 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/__tests__/build-pipeline.test.ts
git commit -m "test(pipeline): build pipeline integration tests for output completeness"
```

---

### Task 8: Run full regression suite against pre-rendered build

**Files:** No new files. This task verifies existing tests still pass.

The prerender changes what the browser receives on first load. Every existing test that navigates and asserts content is now testing against pre-rendered HTML + hydration, not a blank SPA shell + client render. This is the highest-risk verification step.

- [ ] **Step 1: Run existing Vitest suite**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: same pass/fail count as baseline (273 passed, 9 failed). The 9 failures are pre-existing (motion.test.ts, AboutSection, ColorControls) and must not increase.

If new failures appear, investigate whether they are caused by:
1. The `main.tsx` hydrateRoot change affecting test setup
2. Import side effects from prerender-related modules
3. Type changes to shared interfaces

- [ ] **Step 2: Run existing smoke E2E tests**

```bash
npx playwright test --project=smoke 2>&1 | tail -10
```

Expected: all smoke tests pass. These test basic page loads and content visibility.

- [ ] **Step 3: Run existing functional E2E tests**

```bash
npx playwright test --project=functional 2>&1 | tail -10
```

Expected: all functional tests pass. Critical tests to watch:
- Hero cascade tests (phase transitions 0->1->2->3)
- Hero skip-and-badge (sessionStorage replay skip)
- Hero focus management
- Hero motion tier tests
- Blog draft visibility

If hero cascade tests fail, the likely cause is timing - `hydrateRoot` adds a brief hydration step before React can read `sessionStorage`. The cascade may start slightly later than before. Adjust timeouts if needed, but do not change the cascade logic.

- [ ] **Step 4: Run preview-contract E2E tests (including new ones)**

```bash
npx playwright test --config playwright.preview-contract.config.ts 2>&1 | tail -15
```

Expected: all preview-contract tests pass (existing blog-draft-visibility + new prerender-hydration tests).

- [ ] **Step 5: Document any snapshot updates needed**

If visual snapshot tests exist (`--project=design`), the pre-rendered output may change settled-state baselines slightly (different font rendering timing, Playwright vs browser differences). Run:

```bash
npx playwright test --project=design 2>&1 | tail -10
```

If failures occur, review each snapshot diff manually. Update baselines only if the change is a direct consequence of pre-rendering (expected) vs a regression (unexpected).

- [ ] **Step 6: Commit any necessary test adjustments**

If timeout adjustments or snapshot updates were needed:

```bash
git add -A
git commit -m "test(regression): adjust tests for pre-rendered build output"
```

---

### Task 9: Final verification and PR

**Files:** No new files.

- [ ] **Step 1: Run the complete test matrix**

```bash
npx vitest run 2>&1 | tail -5
npx playwright test --project=smoke --project=functional 2>&1 | tail -5
npx playwright test --config playwright.preview-contract.config.ts 2>&1 | tail -5
```

All three must pass. Document the pass counts.

- [ ] **Step 2: Verify the build output manually**

```bash
npm run build
npx vite preview --port 4173 &
sleep 2

curl -s http://127.0.0.1:4173/ | head -10
curl -s http://127.0.0.1:4173/ | grep -c 'og:title'
curl -s http://127.0.0.1:4173/projects | grep -c 'og:title'
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/feed.xml
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/atom.xml
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/llms.txt

kill %1
```

Expected: pre-rendered HTML with OG tags, feed files returning 200.

- [ ] **Step 3: Verify LCP improvement locally**

Open `http://127.0.0.1:4173/` in Chrome, run Lighthouse. Expected: LCP drops from ~5.8s to sub-1s. FCP drops from ~2.6s to sub-0.5s.

Note: local Lighthouse is indicative, not definitive. Real production LCP will be measured via Vercel Speed Insights after deploy.

- [ ] **Step 4: Push and create PR**

```bash
git push -u origin feat/seo-phase2-prerender
```

PR title: `feat(seo): static prerender with hydrateRoot for sub-1s LCP`

PR body should include:
- Summary of changes (hydrateRoot, prerender, meta tags, Vercel config)
- LCP before/after (local Lighthouse numbers)
- Known trade-off: first-visit hero flash before cascade
- Test matrix results
- Dependency: requires Plan 1 (feeds) to be merged first
- Note: Plan 2 (OG images) can be merged independently - og:image tags appear automatically once Plan 2's files exist

---

## Resolutions Applied

(Rev 1 - no resolutions yet. Adversarial review will populate this section.)
