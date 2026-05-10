# SEO Phase 2 - Plan 2: OG Image Generation

**Status:** Rev 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate branded OG images (1200x630 PNG) for every route at build time, enabling rich social previews on LinkedIn, Slack, Twitter, and other platforms that unfurl OG tags.

**Architecture:** A post-build script (`generate-og-images.ts`) reads the route manifest from `seo-config.ts`, renders a Night City branded card per route using Satori (JSX-to-SVG) + resvg (SVG-to-PNG), and writes PNGs to `dist/og/`. The prerender script (Plan 3) handles injecting `og:image` meta tags that reference these files.

**Tech Stack:** TypeScript (tsx), `satori` (JSX-to-SVG), `@resvg/resvg-js` (SVG-to-PNG rasterizer), TTF fonts

**Spec:** `docs/superpowers/specs/2026-05-09-seo-phase2-design.md` sections 5.1-5.5, 9.2

**Branch:** Create `feat/seo-phase2-og-images` from `main`

**Depends on:** Plan 1 (feeds) for the `seo-config.ts` with `SITE_URL`. Plan 3 (prerender) handles `og:image` meta tag injection - Plan 2 produces the files, Plan 3 references them. Plans 2 and 3 can be merged in either order. If Plan 2 merges first, the PNGs exist in `dist/og/` but no HTML references them yet (harmless). If Plan 3 merges first, `og:image` tags are omitted because the files don't exist yet (defensive check in prerender.ts).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/generate-og-images.ts` | Create | Satori + resvg OG image generation per route |
| `scripts/og-card-template.tsx` | Create | JSX template for the Night City branded card (importable by Satori) |
| `public/fonts/orbitron-latin.ttf` | Create (binary) | TTF version of Orbitron for Satori (build-time only, not served to browsers) |
| `public/fonts/chakra-petch-400-latin.ttf` | Create (binary) | TTF version of Chakra Petch for Satori |
| `public/fonts/share-tech-mono-latin.ttf` | Create (binary) | TTF version of Share Tech Mono for Satori |
| `scripts/seo-postbuild.ts` | Modify | Uncomment the OG image generation step |
| `scripts/__tests__/generate-og-images.test.ts` | Create | Vitest smoke + functional tests for OG image output |
| `e2e/preview-contract/og-images.spec.ts` | Create | E2E tests for OG meta tags and image accessibility |

---

### Task 1: Add TTF fonts for Satori

**Files:**
- Create: `public/fonts/orbitron-latin.ttf`
- Create: `public/fonts/chakra-petch-400-latin.ttf`
- Create: `public/fonts/share-tech-mono-latin.ttf`

Satori requires font files as `ArrayBuffer` and supports only TTF, OTF, and WOFF - NOT woff2. The existing woff2 files remain for browser use. The TTF files are only read by `generate-og-images.ts` at build time.

- [ ] **Step 1: Download TTF versions of the three fonts**

```bash
cd public/fonts

# Orbitron - variable weight, Latin
curl -L -o orbitron-latin.ttf \
  "https://fonts.gstatic.com/s/orbitron/v31/yMJRMIlzdpvBhQQL_Qq7dy0.ttf"

# Chakra Petch - 400 weight, Latin
curl -L -o chakra-petch-400-latin.ttf \
  "https://fonts.gstatic.com/s/chakrapetch/v11/cIf6MapbsEk7TDLdtEz1BwkWmpLJ.ttf"

# Share Tech Mono - 400 weight, Latin
curl -L -o share-tech-mono-latin.ttf \
  "https://fonts.gstatic.com/s/sharetechmono/v15/J7aHnp1uDWRBEqV98dVQztYldFcLowEF.ttf"
```

Note: These URLs are from Google Fonts' TTF distribution. If the URLs are stale, download from fonts.google.com manually. The exact font weights must match: Orbitron (regular/variable), Chakra Petch 400, Share Tech Mono 400.

- [ ] **Step 2: Verify the fonts are valid TTF**

```bash
file public/fonts/orbitron-latin.ttf
file public/fonts/chakra-petch-400-latin.ttf
file public/fonts/share-tech-mono-latin.ttf
```

Expected: each file identified as `TrueType font data` (or `OpenType font data`).

- [ ] **Step 3: Commit**

```bash
git add public/fonts/orbitron-latin.ttf public/fonts/chakra-petch-400-latin.ttf public/fonts/share-tech-mono-latin.ttf
git commit -m "feat(og): add TTF fonts for Satori OG image generation"
```

---

### Task 2: Install Satori and resvg dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install satori and @resvg/resvg-js as devDeps**

```bash
npm install --save-dev satori @resvg/resvg-js --legacy-peer-deps
```

These are build-time-only dependencies - they run in the `seo:postbuild` pipeline, not in the browser bundle. `satori` converts JSX-like objects to SVG. `@resvg/resvg-js` rasterizes SVG to PNG.

- [ ] **Step 2: Verify the install succeeded**

```bash
npx tsx -e "import satori from 'satori'; import { Resvg } from '@resvg/resvg-js'; console.log('satori + resvg OK');"
```

Expected: `satori + resvg OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(og): add satori + resvg-js dependencies for OG image generation"
```

---

### Task 3: Create the OG card template

**Files:**
- Create: `scripts/og-card-template.tsx`

The template defines the JSX structure that Satori converts to SVG. It produces a 1200x630 Night City branded card with:
- Background: solid `#0b0d12`
- Top-left: terminal `>_` icon
- Title: Orbitron font, `#f3e600` (primary yellow), max 2 lines
- Subtitle: Chakra Petch, `#f5e9a3` (foreground)
- Bottom accent: horizontal line in `#52e3c8` (cyan)
- Bottom-right: `piotrtarach.dev` in Share Tech Mono, `#f5e9a3`

- [ ] **Step 1: Create `scripts/og-card-template.tsx`**

```tsx
import type { ReactNode } from "react";

interface OgCardProps {
  title: string;
  subtitle?: string;
}

export function OgCard({ title, subtitle }: OgCardProps): ReactNode {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 80px",
        backgroundColor: "#0b0d12",
        fontFamily: "Orbitron",
      }}
    >
      {/* Top-left terminal icon */}
      <div
        style={{
          display: "flex",
          fontSize: 32,
          color: "#52e3c8",
          fontFamily: "Share Tech Mono",
        }}
      >
        {">_"}
      </div>

      {/* Center: title + subtitle */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            fontSize: title.length > 30 ? 48 : 64,
            fontWeight: 700,
            color: "#f3e600",
            lineHeight: 1.2,
            fontFamily: "Orbitron",
            textShadow: "0 0 40px rgba(243, 230, 0, 0.3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 28,
              color: "#f5e9a3",
              fontFamily: "Chakra Petch",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Bottom: accent line + domain */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "2px",
            backgroundColor: "#52e3c8",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 22,
            color: "#f5e9a3",
            fontFamily: "Share Tech Mono",
          }}
        >
          piotrtarach.dev
        </div>
      </div>
    </div>
  );
}
```

Note: Satori has limited CSS support. It does NOT support `text-shadow` via the CSS property - use `filter` or accept no glow. The `textShadow` property above may be silently ignored by Satori. If the glow is important, it can be achieved via a duplicate text layer with blur. For Rev 1, accept no glow and revisit if needed.

Satori also does not support `-webkit-line-clamp`. The `overflow: hidden` with `textOverflow: ellipsis` provides single-line truncation. For multi-line, cap the title string to ~60 characters in the generator script.

- [ ] **Step 2: Verify the template compiles**

```bash
npx tsx -e "import { OgCard } from './scripts/og-card-template.tsx'; console.log('Template OK');"
```

Expected: `Template OK` (no import errors).

- [ ] **Step 3: Commit**

```bash
git add scripts/og-card-template.tsx
git commit -m "feat(og): Night City branded OG card template for Satori"
```

---

### Task 4: Create the OG image generator script

**Files:**
- Create: `scripts/generate-og-images.ts`
- Read: `scripts/seo-config.ts` (route manifest from Plan 1/3)

- [ ] **Step 1: Create `scripts/generate-og-images.ts`**

```typescript
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { buildRouteManifest, type RouteMetadata } from "./seo-config.ts";
import { OgCard } from "./og-card-template.tsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "../dist");
const FONTS_DIR = resolve(__dirname, "../public/fonts");
const OG_DIR = resolve(DIST_DIR, "og");

const WIDTH = 1200;
const HEIGHT = 630;

function loadFont(filename: string): ArrayBuffer {
  const buf = readFileSync(resolve(FONTS_DIR, filename));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export async function generateOgImage(
  route: RouteMetadata,
  fonts: { orbitron: ArrayBuffer; chakraPetch: ArrayBuffer; shareTekhMono: ArrayBuffer }
): Promise<Buffer> {
  const jsx = OgCard({
    title: route.ogTitle.length > 60 ? route.ogTitle.slice(0, 57) + "..." : route.ogTitle,
    subtitle: route.ogDescription,
  });

  const svg = await satori(jsx as React.ReactNode, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Orbitron", data: fonts.orbitron, weight: 700, style: "normal" },
      { name: "Chakra Petch", data: fonts.chakraPetch, weight: 400, style: "normal" },
      { name: "Share Tech Mono", data: fonts.shareTekhMono, weight: 400, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function generateAllOgImages(): Promise<{ filename: string; sizeBytes: number }[]> {
  const routes = await buildRouteManifest();
  console.log(`og-images: ${routes.length} images to generate`);

  const fonts = {
    orbitron: loadFont("orbitron-latin.ttf"),
    chakraPetch: loadFont("chakra-petch-400-latin.ttf"),
    shareTekhMono: loadFont("share-tech-mono-latin.ttf"),
  };

  mkdirSync(OG_DIR, { recursive: true });

  const results: { filename: string; sizeBytes: number }[] = [];

  for (const route of routes) {
    const startMs = Date.now();
    const pngBuffer = await generateOgImage(route, fonts);
    const outPath = resolve(OG_DIR, route.ogImageFilename);
    writeFileSync(outPath, pngBuffer);
    const elapsedMs = Date.now() - startMs;
    console.log(`  ${route.ogImageFilename} (${pngBuffer.length} bytes, ${elapsedMs}ms)`);
    results.push({ filename: route.ogImageFilename, sizeBytes: pngBuffer.length });
  }

  return results;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateAllOgImages()
    .then((results) => {
      const totalBytes = results.reduce((sum, r) => sum + r.sizeBytes, 0);
      console.log(`og-images: wrote ${results.length} images (${(totalBytes / 1024).toFixed(0)}KB total)`);
    })
    .catch((err) => {
      console.error("og-images: fatal error", err);
      process.exit(1);
    });
}
```

**Key design decisions:**

1. **Fonts loaded once:** All three TTF fonts are loaded into memory once, then passed to each `generateOgImage` call. No repeated disk reads.

2. **Title truncation:** Titles over 60 characters are truncated with ellipsis before rendering. This prevents overflow in the 1200x630 card.

3. **Pure function export:** `generateOgImage` accepts a single route + fonts and returns a PNG Buffer. This enables direct testing with fixture data without running the full pipeline.

4. **CLI gate:** The `import.meta.url` check prevents side effects when imported by tests or other scripts.

- [ ] **Step 2: Test the script manually**

```bash
npm run build
npx tsx scripts/generate-og-images.ts
ls -la dist/og/
file dist/og/home.png
```

Expected: PNG files in `dist/og/` for each route. Each file is a valid PNG (verified by `file` command). Typical size: 20-50KB per image.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-og-images.ts
git commit -m "feat(og): OG image generator with Satori + resvg (Night City cards)"
```

---

### Task 5: Integrate OG images into the build pipeline

**Files:**
- Modify: `scripts/seo-postbuild.ts` (if Plan 3 has shipped) OR `package.json` (if Plan 3 has not shipped)

The integration depends on whether Plan 3's `seo-postbuild.ts` orchestrator exists.

**If Plan 3 has shipped (seo-postbuild.ts exists):**

- [ ] **Step 1a: Uncomment the OG image step in seo-postbuild.ts**

Find the commented-out line:
```typescript
// runStep("2/3 Generate OG images", "npx tsx scripts/generate-og-images.ts");
```

Uncomment it:
```typescript
runStep("2/3 Generate OG images", "npx tsx scripts/generate-og-images.ts");
```

**If Plan 3 has NOT shipped (shell chain in package.json):**

- [ ] **Step 1b: Extend the seo:postbuild shell chain**

```json
"seo:postbuild": "tsx scripts/generate-feeds.ts && tsx scripts/generate-og-images.ts"
```

- [ ] **Step 2: Test the full build**

```bash
npm run build 2>&1 | tail -20
ls dist/og/*.png | wc -l
```

Expected: build succeeds. OG images generated for all routes (~10 files currently).

- [ ] **Step 3: Commit**

```bash
git add scripts/seo-postbuild.ts package.json
git commit -m "build(og): integrate OG image generation into seo:postbuild pipeline"
```

---

### Task 6: Write Vitest tests for OG image output

**Files:**
- Create: `scripts/__tests__/generate-og-images.test.ts`

These tests run after `npm run build` produces OG images. They verify file existence, PNG validity, dimensions, and file size bounds. Auto-skip if `dist/og/` doesn't exist.

- [ ] **Step 1: Create `scripts/__tests__/generate-og-images.test.ts`**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DIST_OG = resolve(import.meta.dirname!, "../../dist/og");

const skipNoBuild = !existsSync(DIST_OG);

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) return null;
  // IHDR chunk starts at byte 8: 4-byte length + 4-byte "IHDR" + 4-byte width + 4-byte height
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe.skipIf(skipNoBuild)("OG image output", () => {
  let pngFiles: string[];

  beforeAll(() => {
    pngFiles = readdirSync(DIST_OG).filter((f) => f.endsWith(".png"));
  });

  describe("smoke", () => {
    it("dist/og/ contains PNG files", () => {
      expect(pngFiles.length).toBeGreaterThan(0);
    });

    it("dist/og/home.png exists", () => {
      expect(existsSync(resolve(DIST_OG, "home.png"))).toBe(true);
    });

    it("dist/og/blog.png exists", () => {
      expect(existsSync(resolve(DIST_OG, "blog.png"))).toBe(true);
    });

    it("dist/og/projects.png exists", () => {
      expect(existsSync(resolve(DIST_OG, "projects.png"))).toBe(true);
    });

    it("how-i-do-it slug OG images exist", () => {
      const expected = [
        "how-i-do-it-test-plan.png",
        "how-i-do-it-test-case.png",
        "how-i-do-it-test-architecture.png",
        "how-i-do-it-automation-framework.png",
        "how-i-do-it-bug-reporting.png",
      ];
      for (const file of expected) {
        expect(existsSync(resolve(DIST_OG, file)), `Missing: dist/og/${file}`).toBe(true);
      }
    });
  });

  describe("functional", () => {
    it("each PNG file has valid PNG magic bytes", () => {
      for (const file of pngFiles) {
        const buf = readFileSync(resolve(DIST_OG, file));
        const hasMagic = buf.subarray(0, 8).equals(PNG_MAGIC);
        expect(hasMagic, `${file} has invalid PNG header`).toBe(true);
      }
    });

    it("each PNG has dimensions 1200x630", () => {
      for (const file of pngFiles) {
        const buf = readFileSync(resolve(DIST_OG, file));
        const dims = readPngDimensions(buf);
        expect(dims, `${file} could not read dimensions`).not.toBeNull();
        expect(dims!.width, `${file} width`).toBe(1200);
        expect(dims!.height, `${file} height`).toBe(630);
      }
    });

    it("each PNG file size is between 5KB and 200KB", () => {
      for (const file of pngFiles) {
        const buf = readFileSync(resolve(DIST_OG, file));
        expect(buf.length, `${file} too small`).toBeGreaterThan(5 * 1024);
        expect(buf.length, `${file} too large`).toBeLessThan(200 * 1024);
      }
    });

    it("home.png is non-blank (file size > 10KB)", () => {
      const buf = readFileSync(resolve(DIST_OG, "home.png"));
      expect(buf.length).toBeGreaterThan(10 * 1024);
    });
  });
});
```

**Key decisions:**

1. **PNG header parsing without sharp:** Reads IHDR chunk directly from the PNG binary. The first 8 bytes are magic, next 4 are IHDR chunk length, next 4 are "IHDR", next 4 are width (big-endian uint32), next 4 are height. No external dependency needed.

2. **File size bounds:** 5KB minimum catches blank/corrupted images. 200KB maximum catches rendering errors that produce oversized output. Text-heavy 1200x630 cards typically fall in 20-50KB range.

- [ ] **Step 2: Run the tests after a build**

```bash
npm run build && npx vitest run scripts/__tests__/generate-og-images.test.ts 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/__tests__/generate-og-images.test.ts
git commit -m "test(og): Vitest smoke and functional tests for OG image output"
```

---

### Task 7: Write E2E tests for OG images

**Files:**
- Create: `e2e/preview-contract/og-images.spec.ts`

These tests run against a built + served preview and verify that OG meta tags are present in the HTML and that the referenced image files are accessible.

- [ ] **Step 1: Create `e2e/preview-contract/og-images.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

const routes = [
  { path: "/", expectedTitle: /BREAK IT|Piotr Tarach/i },
  { path: "/projects", expectedTitle: /projects/i },
  { path: "/skills", expectedTitle: /tech radar/i },
  { path: "/blog", expectedTitle: /blog/i },
  { path: "/how-i-do-it", expectedTitle: /how i do it/i },
];

test.describe("OG images - meta tags and accessibility", () => {
  for (const route of routes) {
    test(`${route.path} has og:title meta tag`, async ({ page }) => {
      await page.goto(route.path);

      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute("content", route.expectedTitle);
    });

    test(`${route.path} has og:description meta tag`, async ({ page }) => {
      await page.goto(route.path);

      const ogDesc = page.locator('meta[property="og:description"]');
      await expect(ogDesc).toHaveAttribute("content", /.+/);
    });

    test(`${route.path} has og:image pointing to accessible PNG`, async ({ page, request }) => {
      await page.goto(route.path);

      const ogImage = page.locator('meta[property="og:image"]');
      const count = await ogImage.count();

      if (count === 0) {
        // og:image not present - Plan 3 may not have shipped yet, or OG files missing
        test.skip();
        return;
      }

      const imageUrl = await ogImage.getAttribute("content");
      expect(imageUrl).toBeTruthy();
      expect(imageUrl).toMatch(/^https:\/\/piotrtarach\.dev\/og\//);

      // Resolve the production URL to the local preview server
      const pathname = new URL(imageUrl!).pathname;
      const localUrl = `http://127.0.0.1:4174${pathname}`;

      const response = await request.get(localUrl);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
    });

    test(`${route.path} has twitter:card = summary_large_image`, async ({ page }) => {
      await page.goto(route.path);

      const twitterCard = page.locator('meta[name="twitter:card"]');
      await expect(twitterCard).toHaveAttribute("content", "summary_large_image");
    });

    test(`${route.path} twitter:image matches og:image`, async ({ page }) => {
      await page.goto(route.path);

      const ogImage = page.locator('meta[property="og:image"]');
      const twitterImage = page.locator('meta[name="twitter:image"]');

      const ogCount = await ogImage.count();
      const twCount = await twitterImage.count();

      if (ogCount === 0 || twCount === 0) {
        test.skip();
        return;
      }

      const ogSrc = await ogImage.getAttribute("content");
      const twSrc = await twitterImage.getAttribute("content");
      expect(ogSrc).toBe(twSrc);
    });
  }
});
```

- [ ] **Step 2: Run the E2E tests**

```bash
npx playwright test --config playwright.preview-contract.config.ts e2e/preview-contract/og-images.spec.ts 2>&1 | tail -20
```

Expected: all tests pass (assuming both Plan 2 and Plan 3 have shipped). If Plan 3 hasn't shipped yet, og:image tests will be skipped (the `test.skip()` guard).

- [ ] **Step 3: Commit**

```bash
git add e2e/preview-contract/og-images.spec.ts
git commit -m "test(og): E2E tests for OG meta tags and image accessibility"
```

---

### Task 8: Run regression suite and final verification

**Files:** No new files.

- [ ] **Step 1: Run existing Vitest suite**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: same pass/fail count as baseline (273 passed, 9 failed). OG image changes should not affect existing tests.

- [ ] **Step 2: Run existing E2E suites**

```bash
npx playwright test --project=smoke --project=functional 2>&1 | tail -10
```

Expected: all pass. OG image generation is a build-time addition that does not change runtime behavior.

- [ ] **Step 3: Run all preview-contract tests**

```bash
npx playwright test --config playwright.preview-contract.config.ts 2>&1 | tail -15
```

Expected: all preview-contract tests pass (blog-draft-visibility + og-images + any prerender tests from Plan 3).

- [ ] **Step 4: Verify OG image quality manually**

```bash
npm run build
ls -la dist/og/
# Open dist/og/home.png in an image viewer to verify the Night City branding
```

Check:
- Background is dark (`#0b0d12`)
- Title text is visible in yellow
- Terminal icon `>_` in top-left
- Cyan accent line at bottom
- `piotrtarach.dev` in bottom-right

- [ ] **Step 5: Push and create PR**

```bash
git push -u origin feat/seo-phase2-og-images
```

PR title: `feat(seo): Night City branded OG images via Satori + resvg`

PR body should include:
- Summary: build-time OG image generation for all routes
- Screenshot of a sample OG card (attach `dist/og/home.png`)
- Test matrix results
- Dependency note: Plan 3 (prerender) injects og:image meta tags that reference these files
- Font note: TTF files added to public/fonts/ for Satori (not served to browsers)

---

## Resolutions Applied

(Rev 1 - no resolutions yet. Adversarial review will populate this section.)
