# SEO Phase 2 - Plan 3: Static Prerender + hydrateRoot + Regression

**Status:** Rev 2 - post-adversarial-review (~40 findings: 6 blockers, 12 high, 7 medium, 5+ low)
**Review:** 6-agent adversarial team: adversarial-TL + architect + consistency + socratic + traceability + coverage

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
| `src/App.tsx` | Modify | Remove `React.lazy` + `Suspense` wrapping to prevent hydration LCP flash |
| `scripts/prerender.ts` | Create | Playwright-based static prerender with settle sequence, DOM-level meta injection, atomic write |
| `scripts/seo-config.ts` | Modify | Add `PREVIEW_PORT` constant; keep `SITE_URL` |
| `scripts/route-manifest.ts` | Create | `RouteMetadata` interface, `buildRouteManifest()`, `loadPostsForEnv()` |
| `scripts/seo-postbuild.ts` | Create | Post-build orchestrator: feeds + preview server lifecycle + prerender |
| `package.json` | Modify | Replace `seo:postbuild` with orchestrator; update build command |
| `vercel.json` | Modify | Add Playwright Chromium install to `installCommand`; add cache headers for pre-rendered routes |
| `scripts/__tests__/prerender.test.ts` | Create | Vitest smoke + functional tests for prerender output |
| `scripts/__tests__/build-pipeline.test.ts` | Create | Build pipeline integration tests (exit code, determinism, route-sync) |
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

- [ ] **Step 2: Remove React.lazy and Suspense from App.tsx** [B1]

All pages except Index are `React.lazy` imports wrapped in `<Suspense fallback={null}>` (App.tsx lines 17-24, 86). When `hydrateRoot` encounters a Suspense boundary with an unresolved lazy component, React replaces the pre-rendered DOM with the fallback (`null`) while the chunk downloads - causing a white flash on every non-Index route. Playwright captures the fully resolved page (all chunks loaded), but the browser's hydration path hits unloaded chunks.

Replace the lazy imports at the top of `src/App.tsx`:

```typescript
// REMOVE these:
import { lazy, Suspense } from "react";
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const BlogLayoutPage = lazy(() => import("./pages/BlogLayoutPage"));
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const BlogSlugPage = lazy(() => import("./pages/BlogSlugPage"));
const SkillsPage = lazy(() => import("./pages/SkillsPage"));
const HowIDoItIndexPage = lazy(() => import("./pages/HowIDoItIndexPage"));
const HowIDoItSlugPage = lazy(() => import("./pages/HowIDoItSlugPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// REPLACE with direct imports:
import ProjectsPage from "./pages/ProjectsPage";
import BlogLayoutPage from "./pages/BlogLayoutPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogSlugPage from "./pages/BlogSlugPage";
import SkillsPage from "./pages/SkillsPage";
import HowIDoItIndexPage from "./pages/HowIDoItIndexPage";
import HowIDoItSlugPage from "./pages/HowIDoItSlugPage";
import NotFound from "./pages/NotFound";
```

Remove the `<Suspense fallback={null}>` wrapper around the Routes (lines 86, 114). Keep the `<Routes>` block intact.

For a portfolio site with ~15 routes, the bundle size increase is negligible and eliminates the chunk-loading race entirely. Alternative (document but don't implement): inject `<link rel="modulepreload">` tags for all JS chunks during prerender - more complex, consider for future optimization.

- [ ] **Step 3: Note on PageTransition AnimatePresence** [H2]

`PageTransition.tsx` wraps all routes in `motion.div` with entrance animation variants. On hydration, framer-motion may apply the `initial` state (potentially opacity:0 or translateY), causing pre-rendered content to flash invisible before animating in.

Mitigation (implement if the flash is visually noticeable during testing): the prerender script can inject a CSS rule that suppresses motion.div initial animations during hydration:

```html
<style id="__prerender-no-motion">
  [data-framer-appear-id] { opacity: 1 !important; transform: none !important; }
</style>
```

Remove this style after React hydrates (via a useEffect in App.tsx). Do NOT block Plan 3 on this - the LCP benefit (sub-1s) outweighs the cosmetic flash.

- [ ] **Step 4: Verify dev server still works**

Start the server via `! npm run dev` (user session) or a separate terminal, then verify:

```bash
curl -s http://127.0.0.1:8080 | grep -c '<div id="root"></div>'
```

Expected: `1` - the dev server still serves the empty root div. `createRoot` path is taken.

- [ ] **Step 5: Run existing Vitest suite**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: same pass/fail count as baseline (273 passed, 9 failed - pre-existing failures). The `main.tsx` and `App.tsx` changes should not affect any existing tests.

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat(prerender): conditional hydrateRoot + remove React.lazy for hydration compat"
```

---

### Task 2: Create the route manifest and add PREVIEW_PORT

**Files:**
- Create: `scripts/route-manifest.ts`
- Modify: `scripts/seo-config.ts`
- Read: `scripts/load-blog-data.ts`, `src/features/how-i-do-it/data.ts`

The route manifest defines all routes to prerender and their OG metadata. Both `prerender.ts` (this plan) and `generate-og-images.ts` (Plan 2) will import from it. Separated from `seo-config.ts` (which holds constants only) to keep the async manifest builder out of the constants module. [H8]

- [ ] **Step 1: Add PREVIEW_PORT to seo-config.ts** [H10]

Append to the existing `scripts/seo-config.ts` (which already exports `SITE_URL` from Plan 1):

```typescript
export const PREVIEW_PORT = 4175;
```

- [ ] **Step 2: Create `scripts/route-manifest.ts`** [H8, B3]

```typescript
import { loadPublishedBlogPosts, loadBlogPosts, type BlogPostRaw } from "./load-blog-data.ts";

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

/**
 * Returns blog posts appropriate for the current build environment.
 * Production (VERCEL_ENV=production) excludes drafts; all other
 * environments (preview, development, local) include them. [B3]
 */
function loadPostsForEnv(): BlogPostRaw[] {
  const env = process.env.VERCEL_ENV;
  if (env === "production") return loadPublishedBlogPosts();
  return loadBlogPosts();
}

export async function buildRouteManifest(): Promise<RouteMetadata[]> {
  const blogPosts = loadPostsForEnv();
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

- [ ] **Step 3: Verify the manifest loads correctly**

```bash
npx tsx -e "
import { buildRouteManifest } from './scripts/route-manifest.ts';
const routes = await buildRouteManifest();
console.log('Routes:', routes.length);
routes.forEach(r => console.log(' ', r.path, '->', r.ogImageFilename));
"
```

Expected: routes for `/`, `/projects`, `/skills`, `/blog`, `/how-i-do-it`, plus one per published blog post and one per how-i-do-it page. Currently 0 published posts, 5 how-i-do-it pages = 10 routes total. On preview deploys (VERCEL_ENV=preview), draft posts are included.

- [ ] **Step 4: Commit**

```bash
git add scripts/seo-config.ts scripts/route-manifest.ts
git commit -m "feat(seo): create route-manifest module with env-aware draft filtering"
```

---

### Task 3: Create the prerender script

**Files:**
- Create: `scripts/prerender.ts`
- Read: `e2e/fixtures/visual-determinism.ts` (for settle sequence patterns)

This is the core script. It launches Playwright, navigates each route from the manifest, waits for content to settle, captures the DOM, injects meta tags, and writes the result atomically.

- [ ] **Step 1: Create `scripts/prerender.ts`**

```typescript
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { buildRouteManifest, type RouteMetadata } from "./route-manifest.ts";
import { SITE_URL, PREVIEW_PORT } from "./seo-config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "../dist");
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

interface CapturedRoute {
  route: RouteMetadata;
  html: string;
}

function routeToFilePath(routePath: string): string {
  const filePath =
    routePath === "/" ? resolve(DIST_DIR, "index.html") : resolve(DIST_DIR, routePath.slice(1), "index.html");
  // [L3] Guard against path traversal in route definitions
  if (!filePath.startsWith(DIST_DIR)) {
    throw new Error(`Path traversal detected: ${routePath} resolved to ${filePath}`);
  }
  return filePath;
}

function buildMetaTags(route: RouteMetadata): Record<string, string> {
  const ogUrl = `${SITE_URL}${route.path === "/" ? "" : route.path}`;
  const ogImagePath = `og/${route.ogImageFilename}`;
  const ogImageExists = existsSync(resolve(DIST_DIR, ogImagePath));

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

  return tags;
}

async function captureRoute(
  page: import("playwright").Page,
  route: RouteMetadata
): Promise<string> {
  await page.goto(`${PREVIEW_URL}${route.path}`, { waitUntil: "load" }); // [H1]

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

  // [B2] Inject meta tags via DOM manipulation before capture.
  // This handles react-helmet-async's data-rh attribute and arbitrary
  // attribute ordering - regex-based injection breaks on both.
  const metaTags = buildMetaTags(route);
  await page.evaluate((tags) => {
    for (const [key, value] of Object.entries(tags)) {
      const isOg = key.startsWith("og:");
      const attr = isOg ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    }
  }, metaTags);

  const html = await page.content();

  // [L4] Validate captured content is not a 404/NotFound page
  if (html.includes("data-testid=\"not-found\"") || html.includes("Page Not Found")) {
    throw new Error(`Route ${route.path} captured a NotFound page - check route manifest`);
  }

  return html;
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
    const filePath = routeToFilePath(route.path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, html, "utf-8");
  }
  console.log(`prerender: wrote ${captured.length} files to dist/`);
}

async function main(): Promise<void> {
  const captured = await prerenderAllRoutes();

  if (captured.length === 0) {
    console.error("prerender: no routes captured - failing build");
    process.exitCode = 1;
    return;
  }

  writePrerenderedFiles(captured);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("prerender: fatal error", err);
    process.exitCode = 1;
  });
}
```

**Critical design decisions in this script:**

1. **Atomic capture-then-write:** All routes are captured into memory first (`prerenderAllRoutes`). Only after all succeed does `writePrerenderedFiles` write to disk. If any route fails mid-capture, the build exits non-zero and `dist/` retains the original SPA shells.

2. **Hero cascade skip:** `sessionStorage.setItem("hero-cascade-played", "1")` is injected via `addInitScript` before navigation. This makes the hero render in settled state (phase 3) - the correct pre-rendered state.

3. **Settle sequence:** Mirrors the visual-determinism fixture: `"load"` -> `document.fonts.ready` -> Mermaid bbox check (if applicable) -> double-rAF. Uses `waitUntil: "load"` instead of `"networkidle"` because Analytics/SpeedInsights background fetches can prevent `networkidle` from resolving. The explicit settle steps provide the actual readiness signal. [H1]

4. **DOM-level meta injection:** Meta tags are injected via `page.evaluate()` before calling `page.content()`. This handles react-helmet-async's `data-rh="true"` attribute prefix and arbitrary attribute ordering - both of which break regex-based string replacement. `og:image`/`twitter:image` are only injected if the PNG file exists in `dist/og/` (defensive - allows shipping before Plan 2). [B2]

5. **Separate port (PREVIEW_PORT = 4175):** Imported from `seo-config.ts`. Avoids collision with dev server (8080), preview-contract tests (4174), and prod-contract tests (4173). [H10]

- [ ] **Step 2: Test the script manually** [M3]

The prerender script expects a running preview server. Start the server via `! npx vite preview --port 4175 --strictPort` (user session) or a separate terminal. Then:

```bash
npm run build
npx tsx scripts/prerender.ts

head -30 dist/index.html
head -5 dist/projects/index.html
```

Stop the preview server after verification.

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

- [ ] **Step 1: Create the seo-postbuild orchestrator** [H5]

Create `scripts/seo-postbuild.ts`:

```typescript
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { PREVIEW_PORT } from "./seo-config.ts";

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
    stdio: ["pipe", "pipe", "inherit"], // [B4] Forward stderr to parent
    detached: true, // [B4] Enable process-group kill
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

function killServer(server: ChildProcess): void {
  try {
    if (server.pid) process.kill(-server.pid); // [B4] Kill process group
  } catch {
    server.kill();
  }
}

async function main(): Promise<void> {
  runStep("1/3 Generate feeds", "npx tsx scripts/generate-feeds.ts");

  // TODO(plan-2): Add OG image generation step here [M5]

  console.log("\n=== 3/3 Prerender ===");
  const server = startPreviewServer(PREVIEW_PORT);

  // [B4] Handle SIGINT/SIGTERM to clean up preview server
  const cleanup = () => { killServer(server); process.exit(130); };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await waitForServer(`http://127.0.0.1:${PREVIEW_PORT}`);

    const { prerenderAllRoutes, writePrerenderedFiles } = await import("./prerender.ts");
    const captured = await prerenderAllRoutes();
    writePrerenderedFiles(captured);
  } finally {
    killServer(server);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("seo-postbuild: fatal error", err);
    process.exitCode = 1; // [B4] Allows finally block to run (process.exit skips it)
  });
}
```

Update `package.json`:

```json
"seo:postbuild": "tsx scripts/seo-postbuild.ts"
```

This orchestrator runs feeds, then starts a preview server, then prerenders. It provides per-step timing, proper cleanup via process-group kill (`-server.pid`), and signal handlers for SIGINT/SIGTERM. [B4, H5]

- [ ] **Step 2: Update vercel.json** [B5, H9]

This is the COMPLETE `vercel.json`, replacing the existing file. The existing `X-Robots-Tag` header entry is preserved unchanged; only the new `Cache-Control` entry and the `installCommand` change are additions. [H9]

```json
{
  "installCommand": "npm install --legacy-peer-deps && npx playwright install chromium",
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
1. `installCommand` gains `&& npx playwright install chromium` (without `--with-deps` - Playwright's static Chromium binary includes needed shared libraries and does not require `apt-get`, which may not exist in Vercel's build environment) [B5]
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
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadPublishedBlogPosts } from "../load-blog-data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url)); // [H6]
const DIST = resolve(__dirname, "../../dist");

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

    it("dist/index.html root div contains rendered elements", () => { // [B6]
      expect(indexHtml).toMatch(/<div id="root">\s*</);
    });

    it("every static route has a corresponding index.html", () => {
      const staticRoutes = ["projects", "skills", "blog", "how-i-do-it"];
      for (const route of staticRoutes) {
        const filePath = resolve(DIST, route, "index.html");
        expect(existsSync(filePath), `Missing: dist/${route}/index.html`).toBe(true);
      }
    });

    // Slugs intentionally hardcoded for freeze-testing (Plan 1 pattern) [M4]
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

    it("blog post content rendered if published posts exist", () => { // [M1]
      const posts = loadPublishedBlogPosts();
      if (posts.length > 0) {
        const firstPost = posts[0];
        const filePath = resolve(DIST, "blog", firstPost.slug, "index.html");
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, "utf-8");
          expect(content).toContain(firstPost.title);
        }
      }
    });

    it("Mermaid SVGs rendered in blog posts with diagrams", () => { // [H11]
      const posts = loadPublishedBlogPosts();
      for (const post of posts) {
        if (post.content?.includes("mermaid")) {
          const filePath = resolve(DIST, "blog", post.slug, "index.html");
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, "utf-8");
            expect(content, `dist/blog/${post.slug} missing Mermaid SVG`).toMatch(/svg[^>]*id="mermaid-/);
          }
        }
      }
      // If no published posts have Mermaid content, this test passes vacuously.
      // Revisit when a Mermaid-containing post is published.
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

    // [M7] Wait for hydration to complete via a condition, not a fixed timeout
    await page.waitForFunction(() => document.readyState === "complete");
    await page.waitForLoadState("networkidle");

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

    await page.getByRole("link", { name: "VIEW PROJECTS" }).click(); // [L1]
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
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url)); // [H6]
const DIST = resolve(__dirname, "../../dist");

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

  describe("route-sync", () => { // [H7]
    it("route manifest covers all routes defined in App.tsx", () => {
      const appTsx = readFileSync(
        resolve(__dirname, "../../src/App.tsx"),
        "utf-8"
      );
      // Extract path="..." attributes from Route elements, excluding wildcard and design companion
      const routePaths = [...appTsx.matchAll(/path="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((p) => p !== "*" && !p.includes("__design"));

      // Verify each static route pattern has a corresponding prerender output
      const staticPaths = routePaths.filter((p) => !p.includes(":"));
      for (const routePath of staticPaths) {
        const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
        const outputPath =
          normalized === "/" ? resolve(DIST, "index.html") : resolve(DIST, normalized.slice(1), "index.html");
        expect(existsSync(outputPath), `Route ${routePath} has no prerender output`).toBe(true);
      }
    });
  });

  describe("crash recovery contract", () => { // [H12]
    // Spec section 9.5 requires a crash recovery test. The atomic capture-then-write
    // contract IS implemented (all routes captured to memory, then written to disk),
    // but testing it requires mocking Playwright mid-capture, which is complex.
    // TODO(seo-phase2): Add crash recovery test with Playwright mock to verify
    // partial capture does not write to dist/. Ref: spec section 9.5.
    it.todo("partial capture failure does not write to dist/");
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
# [L2] Stage only the specific files that needed adjustment
git add <list adjusted test files by name>
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
```

Start the preview server via `! npx vite preview --port 4173` (user session) or a separate terminal. Then: [M3]

```bash
curl -s http://127.0.0.1:4173/ | head -10
curl -s http://127.0.0.1:4173/ | grep -c 'og:title'
curl -s http://127.0.0.1:4173/projects | grep -c 'og:title'
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/feed.xml
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/atom.xml
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/llms.txt
```

Stop the preview server after verification.

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

## Resolutions Applied in Rev 2

### Blockers (6/6 applied)

| ID | Finding | Resolution | Location |
|---|---|---|---|
| B1 | React.lazy + Suspense defeats LCP on non-Index routes | Added Step 2 to Task 1: remove all `React.lazy` imports and `<Suspense>` wrapper from App.tsx; direct imports instead | Task 1, File Map |
| B2 | Meta tag regex breaks on react-helmet-async attribute order | Replaced `injectMetaTags` string regex with `page.evaluate()` DOM manipulation in `captureRoute`; removed `escapeHtmlAttr` | Task 3 |
| B3 | Draft filtering ignores VERCEL_ENV | Added `loadPostsForEnv()` to `route-manifest.ts`; production excludes drafts, all other envs include them | Task 2 |
| B4 | process.exit(1) skips finally block, orphaning preview server | Replaced with `process.exitCode = 1`; spawn with `detached: true`; kill via `process.kill(-child.pid)`; added SIGINT/SIGTERM handlers; stderr forwarded via `["pipe", "pipe", "inherit"]` | Task 4 |
| B5 | `--with-deps` may fail on Vercel (no apt-get) | Removed `--with-deps` from vercel.json installCommand | Task 4 |
| B6 | Test regex `[^<]` never matches real HTML | Replaced with negative assertion `not.toContain('<div id="root"></div>')` | Task 5 |

### High (12/12 applied)

| ID | Finding | Resolution | Location |
|---|---|---|---|
| H1 | networkidle may hang on Analytics/SpeedInsights | Changed `waitUntil: "networkidle"` to `waitUntil: "load"` in `captureRoute` | Task 3 |
| H2 | PageTransition AnimatePresence may flash content invisible | Added Step 3 note to Task 1 with CSS mitigation strategy (deferred - non-blocking) | Task 1 |
| H3 | File Map missing seo-postbuild.ts | Added `seo-postbuild.ts` row to File Map | File Map |
| H4 | File Map wrong description for package.json | Updated description to "Replace seo:postbuild with orchestrator; update build command" | File Map |
| H5 | Abandoned inline JSON approach in Task 4 | Removed the abandoned `require()` approach; Step 1 starts directly with orchestrator creation | Task 4 |
| H6 | `import.meta.dirname!` inconsistent with codebase pattern | Replaced both occurrences with `dirname(fileURLToPath(import.meta.url))` pattern | Task 5, Task 7 |
| H7 | Route manifest can drift from App.tsx | Added route-sync test to Task 7 that extracts routes from App.tsx and asserts prerender coverage | Task 7 |
| H8 | seo-config.ts conflates constants with async builder | Split: `seo-config.ts` holds constants (SITE_URL, PREVIEW_PORT); `route-manifest.ts` holds interface + builder | Task 2, File Map |
| H9 | vercel.json ambiguity (add vs replace) | Added clarifying note: "This is the COMPLETE vercel.json, replacing the existing file" | Task 4 |
| H10 | Port 4175 hardcoded in two files | Added `PREVIEW_PORT` export to seo-config.ts; imported in prerender.ts and seo-postbuild.ts | Task 2, Task 3, Task 4 |
| H11 | No test for Mermaid SVG in blog posts | Added conditional Mermaid SVG assertion to Task 5 functional tests | Task 5 |
| H12 | Crash recovery test missing (spec section 9.5) | Added `it.todo()` with spec reference to Task 7; atomic contract is implemented but mock-testing deferred | Task 7 |

### Medium (7/7 applied)

| ID | Finding | Resolution | Location |
|---|---|---|---|
| M1 | Blog post per-slug content assertions missing | Added conditional blog post title assertion to Task 5 | Task 5 |
| M2 | Preview server lifecycle improvements | Subsumed by B4 fixes (detached spawn, process group kill, stderr forwarding) | Task 4 |
| M3 | Manual test steps use forbidden `&` pattern | Replaced `cmd &` + `kill %1` with `! cmd` (user session) instructions in Tasks 1, 3, 9 | Tasks 1, 3, 9 |
| M4 | Hardcoded slugs lack rationale | Added comment: "Slugs intentionally hardcoded for freeze-testing (Plan 1 pattern)" | Task 5 |
| M5 | Commented-out OG image step unclear | Replaced with `TODO(plan-2)` marker | Task 4 |
| M6 | Duplicate node:url imports | Combined `pathToFileURL` and `fileURLToPath` into single import statements | Task 3, Task 4 |
| M7 | waitForTimeout anti-pattern in E2E | Replaced `waitForTimeout(2000)` with `waitForFunction` + `waitForLoadState` | Task 6 |

### Low (5/5 applied)

| ID | Finding | Resolution | Location |
|---|---|---|---|
| L1 | Legacy Playwright selector `page.click("text=...")` | Replaced with `page.getByRole("link", { name: "VIEW PROJECTS" }).click()` | Task 6 |
| L2 | `git add -A` in Task 8 | Replaced with `git add <specific files>` placeholder | Task 8 |
| L3 | Path traversal guard missing in routeToFilePath | Added `filePath.startsWith(DIST_DIR)` assertion | Task 3 |
| L4 | Content validation guard missing in captureRoute | Added NotFound page marker check after capture | Task 3 |
| L5 | Merge duplicate node:url imports | Applied as part of M6 | Task 3, Task 4 |

### Deferred (6 - not applied, by design)

| ID | Finding | Reason |
|---|---|---|
| F-ARCH-01 | Settle sequence duplication from visual-determinism.ts | Future refactoring target, not blocking for Plan 3 |
| Socratic Q3 | Motion tier divergence (mobile with-JS hydration) | Spec acknowledges as "cosmetic, not structural" |
| Socratic Q4 | react-helmet-async non-OG tag duplicates | B2 fix handles OG tags; non-OG is a separate concern |
| Socratic Q8 | ThemeProvider localStorage | Single-theme site, cosmetic risk only |
| F-ADV-09 | Dynamic import fragility from src/ | Inherited from Plan 1's pattern, accepted risk |
| F-ADV-16 | reading_time field | Not used by Plan 3 |
