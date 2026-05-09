# SEO Phase 2 - Design Specification

**Status:** Rev 2 - post-review (Codex/GPT-5.5 + consistency + socratic: 15 findings, 5 blockers)
**Review:** Codex/GPT-5.5 cross-model + consistency reviewer + socratic challenger
**Author:** Piotr Tarach + Claude
**Date:** 2026-05-09
**Branch:** TBD (will be created at implementation time)

## 1. Goal

Improve Core Web Vitals (LCP from 5.82s Poor to sub-1s Good), enable rich social previews on LinkedIn/Slack/Twitter, provide RSS/Atom feeds for readers, and enhance AI agent discoverability - all via build-time static generation with zero runtime infrastructure.

## 2. Non-Goals

- No framework migration (stays Vite + React, no Next.js)
- No server-side rendering at request time (no edge functions, no SSR runtime)
- No full MCP server (llms.txt extension only)
- No changes to the hero cascade animation design (theater preserved)
- No Tailwind v4 migration (separate backlog item)

## 3. Architecture Overview

All four subsystems are build-time scripts that run after `vite build` and produce static files in `dist/`. No runtime dependencies, no edge functions, no external services.

```
npm run build
  |
  v
vite build --> dist/   (SPA bundle, same as today)
  |
  v
post-build pipeline (new):
  |
  +-- generate-feeds.ts     --> dist/feed.xml, dist/atom.xml
  +-- generate-og-images.ts --> dist/og/*.png
  +-- prerender.ts          --> dist/index.html, dist/projects/index.html, ...
                                (overwrites SPA shell with pre-rendered HTML)
```

Build order matters: feeds run first (they only read source data). OG images run next (produces PNGs that prerender may reference). Prerender runs last (captures the fully built SPA, injects OG meta tags, writes final HTML). Note: `generate-llms-txt.ts` and `generate-sitemap.ts` run in the pre-build `generate:seo` step (writing to `public/`, which Vite copies to `dist/`). They are not part of the post-build pipeline.

### 3.1 File ownership

| Script | Reads | Writes |
|---|---|---|
| `generate-feeds.ts` | `src/features/blog/data.ts` | `dist/feed.xml`, `dist/atom.xml` |
| `generate-og-images.ts` | `src/features/blog/data.ts`, `public/fonts/*.ttf` | `dist/og/*.png` |
| `prerender.ts` | `dist/` (built SPA), `dist/og/` (generated images) | `dist/<route>/index.html` (overwrites) |

`generate-llms-txt.ts` and `generate-sitemap.ts` are pre-build scripts (part of `generate:seo`). They write to `public/` and Vite copies the output to `dist/`. They are not listed here because they do not operate on `dist/` directly.

## 4. Subsystem 1: Static Prerendering

### 4.1 Mechanism

Playwright (already a devDep) launches headless Chromium against `vite preview` (the production build), navigates to each route, waits for content to settle, captures the full DOM, and writes it as a static HTML file.

**Settle sequence:** the prerender script waits for each route to fully render before capture. The sequence is: `waitForLoadState('networkidle')` -> `waitForFonts()` -> `waitForMermaid()` -> `settleStyles()`. The `waitForMermaid` step reuses the function from the existing visual-determinism fixture (`e2e/fixtures/visual-determinism.ts`), which polls until every `svg[id^='mermaid-']` has a measurable bbox. This is necessary because Mermaid diagrams render asynchronously via `useEffect` + `mermaid.render()` and `networkidle` alone does not catch them.

**Error handling:** if `prerender.ts` crashes mid-route, the build MUST fail (non-zero exit). Before writing any files, `prerender.ts` captures all routes into memory. Only after all routes are captured does it write to `dist/`. This prevents partial deploys where some routes have pre-rendered HTML and others have the bare SPA shell.

Why Playwright instead of `react-dom/server` `renderToString`: the blog uses Framer Motion, react-router, sessionStorage, and client-side-only hooks (`useEffect`, `useState`). `renderToString` would require extensive refactoring to handle these. Playwright renders the real app in a real browser - zero compatibility work.

### 4.1b Entry point change (hydrateRoot)

`src/main.tsx` currently uses `createRoot().render()`, which REPLACES pre-rendered HTML on JS load. This defeats the entire prerender - the browser paints the pre-rendered content, then React destroys and re-creates it from scratch (visible flash, lost LCP benefit).

The fix: detect pre-rendered content and use `hydrateRoot` instead:

```typescript
// src/main.tsx - conditional hydration
import { createRoot, hydrateRoot } from "react-dom/client";

const root = document.getElementById("root")!;
if (root.children.length > 0) {
  hydrateRoot(root, <App />);
} else {
  createRoot(root).render(<App />);
}
```

This preserves SPA-mode development (`npm run dev` serves an empty root -> `createRoot`) while enabling hydration for pre-rendered production builds. With `hydrateRoot`, React walks the existing DOM and attaches event handlers without replacing it. Hydration mismatch warnings (see section 4.4) now carry real diagnostic value because `hydrateRoot` compares the pre-rendered DOM to what React would render.

### 4.2 Routes to prerender

| Route pattern | Output file | Content |
|---|---|---|
| `/` | `dist/index.html` | Landing page with hero in settled state |
| `/projects` | `dist/projects/index.html` | Project grid |
| `/skills` | `dist/skills/index.html` | Tech Radar |
| `/blog` | `dist/blog/index.html` | Blog index |
| `/blog/:slug` | `dist/blog/:slug/index.html` | Each published blog post |
| `/how-i-do-it` | `dist/how-i-do-it/index.html` | Methodology index |
| `/how-i-do-it/:slug` | `dist/how-i-do-it/:slug/index.html` | Each methodology page |

Dynamic slug list derived from `src/features/blog/data.ts` (blog posts) and `src/features/how-i-do-it/data.ts` (methodology pages, via `loadHowIDoItPages()`).

The NotFound route (`*`) is deliberately NOT pre-rendered. The catch-all rewrite serves the SPA shell, which client-side renders the 404 page.

### 4.3 Hero cascade handling

The prerender script injects `sessionStorage.setItem("hero-cascade-played", "1")` via `page.addInitScript()` before navigating to `/`. This triggers the replay-skip path in `Index.tsx` - the hero renders in settled state (phase 3, all text visible, no animations).

**First-time visitors with JS:** The pre-rendered HTML shows the settled hero (phase 3 content visible). The browser paints it immediately - this is the LCP event (~0.3s). React hydrates via `hydrateRoot` (see section 4.1b), detects an empty `sessionStorage`, and starts the cascade from phase 0. There IS a brief flash of settled content before the cascade replays (~100-300ms between hydration and phase 0 start). This is an accepted trade-off - the alternative (hiding the hero until React mounts) defeats LCP entirely, because the browser cannot count hidden content as an LCP candidate.

**Returning visitors:** `sessionStorage` has the flag, so React hydrates into settled state directly. The pre-rendered HTML already shows settled state. No flash, no cascade - the pre-rendered and hydrated states are identical.

**Search crawlers / social unfurlers:** No JS execution. They see the pre-rendered settled HTML with full content and OG meta tags. LCP for these bots is effectively TTFB.

### 4.4 Hydration contract

With `hydrateRoot` (section 4.1b), the pre-rendered HTML must match what React would render on hydration. Mismatches cause hydration warnings in the console and potential UI glitches. These warnings now carry real diagnostic value - `hydrateRoot` compares the pre-rendered DOM node-by-node against what React would produce. Key sources of mismatch to handle:

- **Date/time-dependent rendering:** If any component shows "today" or relative dates, the pre-rendered value diverges from the hydration value. Current codebase uses static dates from `data.ts` - no issue.
- **Random values:** None in the current codebase.
- **Window/viewport-dependent rendering:** `useMotionPolicy` reads viewport width to determine the motion tier. Pre-rendered HTML uses Playwright's default viewport. The hydration pass may compute a different tier on the user's actual viewport. Solution: the motion tier only affects CSS classes and animation variants, not content structure - hydration mismatch is cosmetic (wrong animation class), not structural.
- **`sessionStorage` reads during render (hero settled -> cascade transition):** `readHeroReplaySkip()` reads sessionStorage in a `useState` initializer. Pre-rendered HTML was captured with the flag set (settled state, phase 3). On hydration for first-time visitors, the flag is absent - React initializes in phase 0 and starts the cascade. This IS a structural mismatch (different phase -> different JSX tree). `hydrateRoot` logs a warning and React replaces the mismatched subtree. The visual result: the settled hero paints immediately (LCP), then React replaces it with the cascade starting at phase 0. The ~100-300ms flash of settled content before cascade is the accepted trade-off (see section 4.3). Returning visitors have the flag set, so the pre-rendered and hydrated states match - no warning, no flash.

### 4.5 Meta tag injection

After capturing each route's HTML, the prerender script injects or updates `<meta>` tags in the `<head>`:

```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://piotrtarach.dev/og/{route}.png" />
<meta property="og:url" content="https://piotrtarach.dev/{route}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://piotrtarach.dev/og/{route}.png" />
```

Values sourced from `data.ts` for blog posts, hardcoded for static pages.

`react-helmet-async` already manages `<head>` for the client-side SPA. The prerender captures whatever `react-helmet-async` injects. The injection step upserts - if `<meta property="og:title">` (or any other OG/Twitter tag) already exists in the captured HTML (injected by `react-helmet-async`), update its `content` attribute. Do not add a duplicate tag. For routes where helmet doesn't set OG tags, the script adds them post-capture.

### 4.6 Vercel configuration changes

Current `vercel.json` has a catch-all rewrite: `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]`. This sends every request to the SPA shell.

With pre-rendered files, Vercel's default behavior serves `dist/blog/my-post/index.html` for `/blog/my-post` automatically (filesystem routing takes priority over rewrites). The catch-all rewrite remains as a fallback for any route NOT pre-rendered.

The `rewrites` catch-all is unchanged. `installCommand` gains Playwright Chromium installation per section 8.3. Additionally, add a `headers` block for pre-rendered HTML routes to enable CDN edge caching:

```json
{
  "headers": [
    {
      "source": "/(blog|projects|skills|how-i-do-it)(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, s-maxage=3600, stale-while-revalidate=86400" }]
    }
  ]
}
```

This caches pre-rendered pages at the CDN edge for 1 hour with stale-while-revalidate for 24 hours. The root `/` is excluded (changes more frequently - uses Vercel's default caching).

### 4.7 LCP impact

| State | TTFB | FCP | LCP |
|---|---|---|---|
| Current (SPA) | 0.25s | 2.63s | 5.82s |
| After prerender | 0.25s | ~0.3s | ~0.3-0.5s |

The browser receives pre-rendered HTML with hero text at TTFB. First paint happens immediately (no JS to wait for). LCP anchors to the largest text element in the pre-rendered HTML - the hero heading - which is painted at first contentful paint. JS loads in the background and hydrates silently.

## 5. Subsystem 2: OG Image Generation

### 5.1 Mechanism

`@vercel/og` (which wraps satori + resvg) converts JSX-like markup to SVG, then rasterizes to PNG. Runs as a Node script at build time - no Vercel function needed.

### 5.2 Template

Night City branded 1200x630 card (OG standard dimensions):

- Background: solid `#0b0d12`
- Top-left: terminal `>_` icon (matches favicon)
- Title: Orbitron font, `#f3e600` (primary yellow), max 2 lines with ellipsis
- Subtitle (for blog posts): date + tags in Chakra Petch, `#f5e9a3` (foreground)
- Bottom accent: horizontal line in `#52e3c8` (cyan)
- Bottom-right: `piotrtarach.dev` in Share Tech Mono, `#f5e9a3`
- Subtle glow effect around title (CSS text-shadow equivalent via satori filter)

### 5.3 Per-route images

| Route | Image filename | Title text | Subtitle |
|---|---|---|---|
| `/` | `og/home.png` | BREAK IT. BUILD IT. PROVE IT. | Piotr Tarach - QA Engineer, Prague |
| `/projects` | `og/projects.png` | Projects | Portfolio |
| `/skills` | `og/skills.png` | Tech Radar | Competency map |
| `/blog` | `og/blog.png` | Blog | Technical writing |
| `/blog/:slug` | `og/blog-:slug.png` | Post title from `data.ts` | Date + tags |
| `/how-i-do-it` | `og/how-i-do-it.png` | How I Do It | QA Methodology |
| `/how-i-do-it/:slug` | `og/how-i-do-it-:slug.png` | Methodology title | - |

### 5.4 Font loading

Satori requires font files as `ArrayBuffer` and supports TTF, OTF, and WOFF formats only - it does NOT support woff2. The implementation must ship TTF versions of the fonts in `public/fonts/` for use by the OG script at build time (these are not served to browsers):
- `orbitron-latin.ttf` - titles
- `chakra-petch-400-latin.ttf` - body text
- `share-tech-mono-latin.ttf` - domain name

The existing woff2 files remain for browser use. The TTF files are only read by `generate-og-images.ts` during the build.

### 5.5 Output

PNG files at 1200x630px, written to `dist/og/`. Typical file size: 20-50KB per image (text-heavy, low complexity). Total for ~15 routes: ~300-750KB added to the deploy.

## 6. Subsystem 3: RSS/Atom Feeds

### 6.1 Output files

- `dist/feed.xml` - RSS 2.0
- `dist/atom.xml` - Atom 1.0

### 6.2 Feed content

Per entry:
- Title, link (`https://piotrtarach.dev/blog/:slug`), publication date
- Description/excerpt from `data.ts`
- Tags as `<category>` elements
- Author: Piotr Tarach
- No full post body (excerpt only - drives traffic to the site)

### 6.3 Feed metadata

- Channel title: "SIGNAL_NOISE - Piotr Tarach"
- Channel link: `https://piotrtarach.dev/blog`
- Channel description: "Technical blog on AI workflows, test automation, DevOps"
- Language: `en`
- Last build date: build timestamp

### 6.4 Draft filtering

Production builds exclude `draft: true` posts. Postbuild scripts (`generate-feeds.ts`, `generate-og-images.ts`, `prerender.ts`) read `process.env.VERCEL_ENV` directly - not the `VITE_` prefixed version. `VERCEL_ENV` is a Vercel system env var available to all build steps without explicit forwarding. The `VITE_` prefix is only needed for client-side code bundled by Vite (via `import.meta.env`).

Pre-build scripts (`generate-llms-txt.ts`, `generate-sitemap.ts`) also read `process.env.VERCEL_ENV` directly since they run as tsx scripts, not inside the Vite bundle.

### 6.5 Feed discovery

Add the two `<link rel="alternate">` lines to the source `index.html` `<head>` (next to the existing `<link rel="llm">` at line 13). Vite copies them to `dist/`; prerender inherits them in each route's `<head>`.

```html
<link rel="alternate" type="application/rss+xml" title="SIGNAL_NOISE RSS" href="/feed.xml" />
<link rel="alternate" type="application/atom+xml" title="SIGNAL_NOISE Atom" href="/atom.xml" />
```

## 7. Subsystem 4: Enriched llms.txt

### 7.1 Changes to `generate-llms-txt.ts`

Extend the existing script to:

1. Populate the currently empty `## Blog Posts` section from `src/features/blog/data.ts`
2. Populate `## How I Do It` section from `src/features/how-i-do-it/data.ts` (via `loadHowIDoItPages()`, not filesystem scan)
3. Add per-post metadata: title, date, tags, reading time, excerpt
4. Add a `## Site Metadata` section with author info and content type descriptions
5. Apply the same draft filtering as feeds (reading `process.env.VERCEL_ENV` directly per section 6.4)

### 7.2 Format

Enriched entry format:
```
## Blog Posts

- [Post Title](https://piotrtarach.dev/blog/slug) | 2026-05-01 | tags: playwright, automation | 5 min read
  Brief excerpt describing the post content.
```

### 7.3 Site metadata section

```
## Site Metadata

Author: Piotr Tarach
Role: QA Engineer, Prague
Site: https://piotrtarach.dev
Feed: https://piotrtarach.dev/feed.xml

Content types:
- Blog posts: Technical articles on AI workflows, test automation, DevOps, Claude Code
- How I Do It: QA methodology guides (test plans, test cases, automation frameworks, bug reporting)
- Projects: Portfolio of technical projects
- Skills: Tech Radar competency map
```

## 8. Build Pipeline Integration

### 8.1 Updated build command

```json
{
  "build": "tsx scripts/update-github-stats.ts && npm run generate:seo && VITE_VERCEL_ENV=\"${VERCEL_ENV:-}\" vite build && npm run seo:postbuild",
  "seo:postbuild": "tsx scripts/generate-feeds.ts && tsx scripts/generate-og-images.ts && tsx scripts/prerender.ts"
}
```

The script is named `seo:postbuild` (not `postbuild`) to avoid npm lifecycle double-execution. npm auto-runs a script named `postbuild` after `build` completes - if the build command also explicitly calls `npm run postbuild`, the pipeline runs twice. The namespaced `seo:postbuild` name makes the invocation explicit-only.

The `VITE_VERCEL_ENV="${VERCEL_ENV:-}"` forwarding in the build command is for `vite build` (client-side bundle via `import.meta.env`). Postbuild scripts read `process.env.VERCEL_ENV` directly (see section 6.4) - no explicit forwarding needed for them.

Order:
1. `generate:seo` - sitemap + llms.txt (reads source, writes to `public/` for Vite to copy)
2. `vite build` - produces `dist/` with SPA bundle
3. `generate-feeds.ts` - writes feeds to `dist/`
4. `generate-og-images.ts` - writes OG images to `dist/og/`
5. `prerender.ts` - captures routes, injects OG meta tags, overwrites `dist/<route>/index.html`

### 8.2 Build time impact

Current build: ~29s (from Vercel deploy data).

Estimated additions:
- Feed generation: <1s (string concatenation)
- OG image generation: ~5-10s (satori + resvg for ~15 images)
- Prerender: ~20-40s (Playwright navigating ~15 routes serially, with settle waits)

Total estimated: ~55-80s. Within Vercel's free tier build limits (45 min).

Optimization if needed: prerender routes in parallel (Playwright can run multiple pages in one browser context).

### 8.3 CI considerations

Playwright needs Chromium installed. In the Vercel build environment, Playwright's Chromium can be installed via `npx playwright install chromium --with-deps`. Add to `installCommand` in `vercel.json`:

```json
{
  "installCommand": "npm install --legacy-peer-deps && npx playwright install chromium --with-deps"
}
```

Alternatively, use `playwright-chromium` as a devDep (lighter, Chromium-only install).

### 8.4 Local development

Prerendering is a production-only step. `npm run dev` is unaffected - it still runs the Vite dev server with client-side rendering. Developers only encounter prerendering when running `npm run build` locally.

## 9. Testing Strategy

Three tiers: smoke (build output exists and is structurally valid), functional (behavior matches spec per subsystem), E2E (full production build served and verified via browser). Every subsystem gets all three tiers. Unit tests (Vitest) cover the script logic in isolation. Playwright tests cover the built output.

### 9.1 Prerender tests

**Smoke (Vitest):**
- `prerender.ts` produces `dist/index.html` that is NOT the original SPA shell (contains more than just `<div id="root"></div>`)
- `dist/index.html` contains `<!doctype html>` and a non-empty `<div id="root">`
- Every route from the route manifest produces a corresponding `dist/<route>/index.html` file
- All produced HTML files are valid UTF-8 with no null bytes

**Functional (Vitest + filesystem):**
- Pre-rendered `/` contains "BREAK IT", "BUILD IT", "PROVE IT" text content (hero in settled state)
- Pre-rendered `/` contains `data-testid="hero-phase3"` (settled state, not `hero-cascading`)
- Pre-rendered `/blog` contains at least one blog post title from `data.ts`
- Pre-rendered `/projects` contains "Projects" heading
- Pre-rendered `/skills` contains "Tech Radar" or equivalent heading
- Pre-rendered `/how-i-do-it` contains methodology page links
- Pre-rendered `/blog/:slug` for each published post contains the post title
- Pre-rendered `/how-i-do-it/:slug` for each methodology contains the page title
- Draft posts (`draft: true`) do NOT have pre-rendered pages in production builds
- Each pre-rendered file contains `<script type="module" src=` (the hydration entry point is preserved)
- `dist/nonexistent-route/index.html` does NOT exist (404 route is not pre-rendered)
- For blog posts containing Mermaid diagrams, the pre-rendered HTML contains `<svg id="mermaid-` elements (not empty containers)

**E2E (Playwright against `vite preview` of the built output):**
- **No-JS content verification:** For each pre-rendered route, navigate with `javaScriptEnabled: false`. Assert that the page content is visible (text present in DOM). This proves the HTML is self-sufficient without JS.
- **Hydration smoke (returning visitor):** Set `sessionStorage["hero-cascade-played"] = "1"`, navigate to `/` with JS enabled. Wait for React hydration. Assert zero hydration mismatch warnings in the console (`console.error` listener for "Hydration failed" / "Text content does not match" / "did not match"). Returning visitors have matching pre-rendered and hydrated states - `hydrateRoot` produces no warnings.
- **Hydration smoke (first visit):** Navigate to `/` with empty sessionStorage and JS enabled. Expect hydration mismatch warnings in the console (the pre-rendered settled hero diverges from the phase-0 JSX tree React produces). Assert that despite the warning, the cascade starts and progresses through phases 0->3. This is the known trade-off (see section 4.4).
- **Hero cascade on first visit:** Navigate to `/` with empty sessionStorage. Assert the settled hero text is visible before React hydrates (pre-rendered LCP content). After hydration, assert the cascade plays (phases 0->3 progression via `data-testid` changes). There is a brief flash of settled content before the cascade starts - this is the accepted trade-off.
- **Hero settled on return visit:** Set `sessionStorage["hero-cascade-played"] = "1"`, navigate to `/`. Assert `data-testid="hero-phase3"` is visible immediately (no cascade). Pre-rendered HTML matches hydrated state - no visual jump.
- **Navigation after hydration:** Navigate to `/`, wait for hydration, click "VIEW PROJECTS" link. Assert `/projects` page loads with content (client-side routing works after hydration).
- **Mobile viewport prerender:** Navigate to `/` at 375px width with `javaScriptEnabled: false`. Assert hero text is visible and fits within viewport (no overflow).
- **Reduced-motion prerender:** Emulate `prefers-reduced-motion: reduce`, navigate to `/` with JS. Assert hero settles immediately (same as SPA behavior - prerender doesn't break the reduced-motion path).

### 9.2 OG image tests

**Smoke (Vitest + filesystem):**
- `generate-og-images.ts` produces PNG files in `dist/og/`
- `dist/og/home.png` exists
- `dist/og/blog.png` exists
- For each published blog post slug, `dist/og/blog-:slug.png` exists
- For each how-i-do-it slug, `dist/og/how-i-do-it-:slug.png` exists
- No OG images generated for draft posts

**Functional (Vitest):**
- Each PNG file has valid PNG magic bytes (`\x89PNG\r\n\x1a\n`)
- Each PNG has dimensions 1200x630 (read via `sharp` or PNG header parsing)
- Each PNG file size is between 5KB and 200KB (sanity bounds - too small = blank, too large = something went wrong)
- Home OG image contains embedded text "BREAK IT" (OCR not needed - just verify non-blank by checking file size > 10KB)

**E2E (Playwright against built output):**
- For each pre-rendered route, assert `<meta property="og:image">` tag is present in `<head>`
- Assert `og:image` URL is absolute (`https://piotrtarach.dev/og/...`)
- Parse the `og:image` URL's pathname and resolve it against the local preview server base URL (e.g., `http://localhost:4173/og/home.png`), not the absolute production URL. Fetch that resolved URL. Assert HTTP 200 and `content-type: image/png`
- Assert `<meta property="og:title">` is present and non-empty
- Assert `<meta property="og:description">` is present and non-empty
- Assert `<meta name="twitter:card" content="summary_large_image">` is present
- Assert `<meta name="twitter:image">` matches `og:image` value

### 9.3 RSS/Atom feed tests

**Smoke (Vitest + filesystem):**
- `dist/feed.xml` exists and is non-empty
- `dist/atom.xml` exists and is non-empty
- Both files start with `<?xml` declaration

**Functional (Vitest):**
- `feed.xml` parses as valid XML (no parse errors)
- `atom.xml` parses as valid XML
- RSS feed contains `<channel>` with `<title>`, `<link>`, `<description>`
- Atom feed contains `<feed>` with `<title>`, `<link>`, `<author>`
- Number of `<item>` (RSS) / `<entry>` (Atom) elements equals the number of published (non-draft) blog posts in `data.ts`
- Each item/entry has `<title>`, `<link>`, `<pubDate>`/`<published>`, `<description>`/`<summary>`
- RSS `<link>` values are absolute URLs starting with `https://piotrtarach.dev/blog/`
- Atom `<link href="...">` values are absolute URLs
- Tags appear as `<category>` elements
- Draft posts do NOT appear in feeds
- Special characters in titles (`&`, `<`, `>`, `"`) are XML-escaped
- Feed `<pubDate>`/`<updated>` is a valid RFC 2822 (RSS) / RFC 3339 (Atom) date string

**E2E (Playwright against built output):**
- Fetch `/feed.xml` from preview server. Assert HTTP 200, `content-type` contains `xml`
- Fetch `/atom.xml`. Assert HTTP 200, `content-type` contains `xml`
- Parse RSS feed in the test, click-through the first `<link>` via Playwright - assert the blog post page loads
- Assert `<link rel="alternate" type="application/rss+xml">` is present in the pre-rendered `<head>` of every page (feed auto-discovery)
- Assert `<link rel="alternate" type="application/atom+xml">` is present alongside the RSS link

### 9.4 llms.txt tests

**Smoke (Vitest + filesystem):**
- `dist/llms.txt` exists and is non-empty
- Contains `## Blog Posts` section heading
- Contains `## How I Do It` section heading
- Contains `## Site Metadata` section heading

**Functional (Vitest):**
- `## Blog Posts` section contains at least one entry (not empty like current production)
- Number of blog post entries matches the number of published (non-draft) posts in `data.ts`
- Each blog post entry contains a title, URL, date, and tags
- URLs are absolute (`https://piotrtarach.dev/blog/...`)
- `## How I Do It` section contains all methodology pages (matches entries from `src/features/how-i-do-it/data.ts`)
- `## Site Metadata` section contains `Author:`, `Site:`, `Feed:` fields
- Draft posts do NOT appear in llms.txt
- No broken markdown links (every `[text](url)` has non-empty text and url)

**E2E (Playwright against built output):**
- Fetch `/llms.txt` from preview server. Assert HTTP 200, content is UTF-8 text
- Assert `<link rel="llm" href="/llms.txt">` is present in pre-rendered `<head>` (existing, verify not broken)
- Parse the first blog post URL from the response body, navigate to it via Playwright - assert the page loads

### 9.5 Build pipeline integration tests

**Smoke:**
- `npm run build` completes with exit code 0
- Build time is under 120s (2x the 90s target - CI headroom)
- `dist/` contains all expected output files: `index.html`, `feed.xml`, `atom.xml`, `llms.txt`, `og/home.png`

**Functional:**
- Build output is deterministic: running `npm run build` twice produces byte-identical `feed.xml`, `atom.xml`, `llms.txt` (OG images may differ slightly due to rendering, HTML may differ due to timestamps - exclude these from determinism check)
- `dist/index.html` is larger than the original SPA shell `index.html` (pre-rendered content was injected)
- No files in `dist/` contain `<div id="root"></div>` with empty content (every route was pre-rendered)
- Prerender crash recovery: simulate a prerender failure (e.g., mock a route that throws) and assert the build exits non-zero without modifying `dist/`. This validates the "capture all into memory, then write" contract from section 4.1

### 9.6 Regression tests (existing suite must not break)

**Existing E2E suite against pre-rendered build:**
- All existing smoke tests (`e2e/smoke/`) pass against the pre-rendered build served via `vite preview`
- All existing functional tests (`e2e/functional/`) pass - especially hero cascade tests, hero skip-and-badge, hero focus management, hero motion tier
- Visual snapshots (`e2e/visual/`) pass or are updated with deliberate review (pre-rendered HTML may change settled-state rendering slightly)
- Blog draft visibility tests pass: drafts hidden in production build, visible in preview/dev

This is the highest-risk test category. The prerender changes what the browser receives on first load. Every existing test that navigates to a page and asserts content is now testing against pre-rendered HTML + hydration, not a blank SPA shell + client render. Failures here indicate hydration mismatches or prerender artifacts.

## 10. Rollback

All changes are build-time. Rollback = revert the commits and redeploy. The SPA fallback (catch-all rewrite to `index.html`) means even a partially broken prerender degrades gracefully to the current SPA behavior.

## 11. Success Criteria

| Metric | Current | Target |
|---|---|---|
| LCP (P75, production) | 5.82s (Poor) | <1.0s (Good) |
| FCP (P75, production) | 2.63s | <0.5s |
| LinkedIn share preview | No image, generic title | Branded OG card with title + tags |
| RSS feed | None | Valid RSS 2.0 + Atom 1.0 |
| llms.txt blog posts | Empty section | All published posts with metadata |
| Build time | ~29s | <90s |

## 12. Resolutions Applied in Rev 2

Findings from Codex/GPT-5.5 cross-model review, consistency reviewer, and socratic challenger. 15 total: 5 blockers, 6 major, 2 medium, 2 minor.

### Blockers (5)

| ID | Finding | Section(s) changed |
|---|---|---|
| B1 | `createRoot().render()` replaces pre-rendered HTML - switch to conditional `hydrateRoot` | 4.1b (new), 4.4, 9.1 |
| B2 | `hero-pending` class hides LCP content - redesign to let settled hero paint, accept flash-before-cascade trade-off | 4.3, 4.4, 9.1 |
| B3 | `VITE_VERCEL_ENV` scoped to Vite bundle only - postbuild scripts read `process.env.VERCEL_ENV` directly | 6.4, 7.1, 8.1 |
| B4 | npm lifecycle auto-runs `postbuild` after `build` - renamed to `seo:postbuild` to prevent double execution | 8.1 |
| B5 | `generate-llms-txt.ts` listed in post-build diagram but writes to `public/` (pre-build) - removed from post-build pipeline | 3 (diagram), 3.1 (table) |

### Major (6)

| ID | Finding | Section(s) changed |
|---|---|---|
| M1 | Satori does not support woff2 - requires TTF/OTF/WOFF | 3.1, 5.4 |
| M2 | how-i-do-it slugs from `data.ts`, not filesystem scan | 3.1, 4.2, 7.1, 9.4 |
| M3 | Section 4.6 vs 8.3 vercel.json contradiction | 4.6 |
| M4 | Prerender settle condition undefined for Mermaid async rendering | 4.1, 9.1 |
| M5 | OG tag injection must upsert, not append (react-helmet-async may pre-inject) | 4.5 |
| M6 | Partial prerender crash must fail the build, not produce partial dist/ | 4.1, 9.5 |

### Medium (2)

| ID | Finding | Section(s) changed |
|---|---|---|
| Med1 | 404 page deliberately not pre-rendered - add negative test | 4.2, 9.1 |
| Med2 | Cache headers for pre-rendered HTML routes at CDN edge | 4.6 |

### Minor (2)

| ID | Finding | Section(s) changed |
|---|---|---|
| Min1 | OG E2E tests resolve og:image pathname against local preview server, not production URL | 9.2 |
| Min2 | Feed discovery links placed next to existing `<link rel="llm">` in source index.html | 6.5 |
