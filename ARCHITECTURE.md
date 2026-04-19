# ARCHITECTURE.md — The Digital Matrix

> Engineering architecture for the blog. Companion to `DESIGN.md` (visual identity) — this doc covers the structural and runtime concerns: how the SPA is wired, how content flows, how motion is timed, how tests are layered.

---

## 1. System Overview

A static React SPA serving Piotr Tarach's personal blog and portfolio. No backend, no CMS, no database — all content is markdown files committed to the repo, bundled at build time, and rendered client-side. Deployed to Vercel; auto-deploys from `main`.

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                           │
│                                                          │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────────┐  │
│  │ React 18 │──▶│  React      │──▶│ MarkdownRenderer │  │
│  │ Router 6 │   │  Components │   │ (rehype + remark)│  │
│  └──────────┘   └─────────────┘   └──────────────────┘  │
│        │              │                    │             │
│        │              │                    └──▶ Mermaid  │
│        │              │                                  │
│        ▼              ▼                                  │
│  ┌──────────┐   ┌─────────────┐                          │
│  │ next-    │   │ Framer      │                          │
│  │ themes   │   │ Motion      │                          │
│  └──────────┘   └─────────────┘                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel Edge (CDN) — pre-built static bundle            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  GitHub repo (main) — source of truth                   │
│  src/pages/content/blog/{slug}.md  + features/blog/data.ts │
└─────────────────────────────────────────────────────────┘
```

**Tech stack:**

| Layer        | Technology                          | Notes                                          |
|--------------|--------------------------------------|------------------------------------------------|
| Framework    | React 18 + TypeScript 5.8           | Path alias `@/` → `src/`                       |
| Bundler      | Vite 7 + `@vitejs/plugin-react-swc` | SWC for fast transforms                        |
| Routing      | React Router DOM 6                  | `BrowserRouter` + `Routes`/`Route`             |
| State        | React Query (TanStack)              | For async state where needed (minimal usage)   |
| Animations   | Framer Motion 12                    | Page transitions, staggered lists              |
| Markdown     | react-markdown + rehype/remark       | GFM, Prism syntax, Mermaid, TOC, slug-from-id  |
| Icons        | Lucide React                         | UI iconography                                 |
| UI Components| shadcn/ui (Radix primitives)        | Sheets, dropdowns, tabs                        |
| Styling      | Tailwind CSS 3 + CSS custom properties | All colors via `:root` tokens                  |
| Theme        | next-themes (single theme: cyberpunk-gold) | `attribute="class"` on `<html>`                |
| Deployment   | Vercel (auto from `main`)           | Includes Analytics + Speed Insights            |

---

## 2. Directory Structure

```
src/
├── App.tsx                                # Providers + router root
├── main.tsx                               # ReactDOM.render entry
├── index.css                              # Global styles, theme tokens, motion CSS
├── components/
│   ├── Navbar.tsx                          # Fixed top nav (desktop + mobile sheet)
│   ├── LetterReveal.tsx                    # Per-letter cascade reveal primitive
│   ├── ScrollReveal.tsx                    # Container + item for scroll-triggered stagger
│   ├── PageTransition.tsx                  # AnimatePresence wrapper
│   ├── markdown/
│   │   ├── MarkdownRenderer.tsx            # Main markdown renderer (GFM, Prism, Mermaid, TOC)
│   │   └── CodeBlock.tsx                   # Code block w/ copy button + language badge + scroll shadows
│   └── ui/                                 # shadcn/ui (~40 components)
├── features/                              # Feature-based modules
│   ├── about/                              # Home page about section
│   ├── blog/                               # Blog index + post + sidebar
│   │   ├── data.ts                         # BlogPost type + array of post metadata
│   │   ├── BlogIndex.tsx                   # Filtered list view
│   │   ├── BlogPostPage.tsx                # Slug-based markdown render
│   │   ├── CategoryTree.tsx                # Sidebar navigation tree
│   │   └── ...
│   ├── how-i-do-it/                        # QA methodology pages
│   ├── projects/                           # Project cards
│   └── skills/                             # Skills + animated progress bars
├── hooks/
│   ├── useMarkdownContent.ts               # Dynamic markdown loading via contentMap
│   ├── useScrollRestoration.ts             # Restore scroll on route change
│   ├── use-mobile.tsx                      # Mobile breakpoint hook
│   └── use-toast.ts                        # Toast hook
├── lib/
│   ├── motion.ts                           # Motion variants + useHeroStaggerVariant + useItemVariant
│   └── utils.ts                            # cn() helper (clsx + tailwind-merge)
└── pages/                                 # Thin route wrappers + markdown content
    ├── Index.tsx                           # Home page
    ├── BlogIndexPage.tsx                   # → features/blog/BlogIndex
    ├── BlogSlugPage.tsx                    # → features/blog/BlogPostPage
    ├── ...
    └── content/
        ├── blog/                           # Blog post markdown ({slug}.md)
        └── how-i-do-it/                    # Methodology markdown
```

**Architectural pattern:** Feature-based modules (`features/`) own their components + data. Cross-cutting primitives (`components/`, `hooks/`, `lib/`) are global. Routes (`pages/`) are thin wrappers around feature components.

---

## 3. Routing

```
/                    → Index                 (home, hero cascade)
/projects            → ProjectsPage          (project grid)
/skills              → SkillsPage            (skills + learning tabs)
/blog                → BlogLayoutPage        (sidebar + outlet)
   └─ /blog          → BlogIndexPage         (post list)
   └─ /blog/:slug    → BlogSlugPage          (markdown post)
/how-i-do-it         → HowIDoItIndexPage     (methodology grid)
/how-i-do-it/:slug   → HowIDoItSlugPage      (markdown methodology)
*                    → NotFound              (404)
```

### Reading-mode detection

`App.tsx:AppContent` uses two regexes to derive layout state:

| State            | Regex                              | Effect                                                    |
|-----------------|------------------------------------|-----------------------------------------------------------|
| `isReadingMode` | `/^\/(blog\|how-i-do-it)\/[^/]+/` | Wraps Outlet in `<div className="theme-reading ...">`     |
| `isTextSection` | `/^\/(blog\|how-i-do-it)(\/\|$)/` | Suppresses ambient effects (scanline overlay, scan-sweep) |

`isReadingMode` is **strict** — only matches `/blog/{slug}`, not `/blog`. `isTextSection` is **loose** — also matches `/blog` index. The split lets the blog INDEX still feel cyber while individual POSTS feel readable.

### PageTransition

`<PageTransition>` wraps the route Outlet. Uses Framer Motion's `AnimatePresence` to animate route changes. The variant is selected by `usePageVariant()` (cyber/reading/reduced) — see Motion section.

---

## 4. Content Pipeline

### How a blog post lands on screen

1. **Author edits** `src/pages/content/blog/2026-04-19-some-post.md`
2. **Adds metadata entry** to `src/features/blog/data.ts`:
   ```ts
   { slug: "some-post", title: "...", date: "2026-04-19", tags: [...], excerpt: "..." }
   ```
3. **`useMarkdownContent` hook** (`src/hooks/useMarkdownContent.ts`) maintains a `contentMap` of dynamic `import("../pages/content/blog/{slug}.md?raw")` calls — Vite's `?raw` suffix returns the file as a string at build time
4. **`BlogPostPage`** receives `slug` from React Router, calls `useMarkdownContent(slug)`, gets the markdown string
5. **`MarkdownRenderer`** processes the string through:
   - `remarkGfm` — GitHub Flavored Markdown (tables, task lists, strikethrough)
   - `rehypeSlug` — auto-id headings
   - `rehypeAutolinkHeadings` — anchor links on headings
   - `rehypePrismPlus` — syntax highlighting (Tomorrow Night palette)
   - Custom slugify (handles Polish chars: `ą→a`, `ć→c`, etc.)
   - Custom heading-id parser (`{#custom-id}` syntax in markdown)
   - Custom code block renderer → `<CodeBlock>` (with copy button, language badge, scroll shadows)
   - Mermaid diagram renderer for ` ```mermaid ` fences
   - TOC extraction → emits `headings` array via `onHeadingsExtracted` callback

### Mermaid theming

`MarkdownRenderer:useMermaidTheme` watches `<html>` class via `MutationObserver`:
- Outside reading mode: `buildDarkMermaidThemeCSS()` reads live `:root` CSS vars (yellow primary, dark background)
- Inside reading mode: hardcoded cream-paper palette
- The hook re-initializes Mermaid when `isReading` changes

### Code blocks

`CodeBlock.tsx` wraps every fenced code block:
- `.code-block-wrapper` — outer container with scroll shadows (`::before` / `::after` pseudo-elements)
- `.code-scroll-container` — inner overflow-x-auto container
- `.code-lang-badge` — language label (top-right)
- `button[aria-label="Copy code"]` — copy-to-clipboard
- `.can-scroll-left` / `.can-scroll-right` classes added by JS when content overflows; reveal scroll shadows

---

## 5. Styling Architecture

### Layer order

CSS is layered for predictable cascade resolution:

1. **`@font-face`** declarations (top of `index.css`, no layer) — all self-hosted woff2s in `public/fonts/`: Share Tech Mono, Orbitron, Atkinson Hyperlegible, Rajdhani (500/700), Chakra Petch (400). Each declared with `unicode-range` for latin + latin-ext (Polish character support).
2. **`@layer base`** — `:root` color tokens (single-theme Night City), `.theme-reading` overrides, font scoping, scrollbar, `::selection`.
3. **`@layer utilities`** — `.text-glow`, `.box-glow`, `.scanline`, `.theme-reading .hidden-in-reading`.
4. **`@layer components`** — `.markdown-body` typography, code block wrappers, Prism token colors, reading-mode markdown overrides.
5. **Unlayered rules** (rare) — `pre ::selection` / `code ::selection` token colors (must be unlayered to beat Prism token rules).

**Why layers matter here:** Tailwind's `base/components/utilities` layers + custom layers stack predictably. Unlayered rules always beat layered rules of identical specificity, which is exactly how the code-block selection-color override works.

### Theme tokens

All colors are HSL CSS custom properties on `:root`:

```css
:root {
  --primary: 57 100% 48%;          /* yellow */
  --accent: 171 77% 60%;           /* cyan */
  --learning: 25 95% 55%;          /* amber — distinct semantic slot */
  /* ... */
}
```

`tailwind.config.ts` maps these to Tailwind utilities:

```ts
colors: {
  primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
  accent:  { DEFAULT: "hsl(var(--accent))",  foreground: "hsl(var(--accent-foreground))" },
  learning:{ DEFAULT: "hsl(var(--learning))",foreground: "hsl(var(--learning-foreground))" },
  /* ... */
}
```

So `text-primary` resolves to `color: hsl(var(--primary))` which resolves to `hsl(57 100% 48%)`. Single source of truth.

### Reading mode

`.theme-reading` is applied to a **descendant `<div>`** (not `<html>`) by `App.tsx` when on a blog/methodology post route. CSS overrides cascade from there:
- All HSL tokens swap to cream-paper palette
- Body font swaps to Atkinson Hyperlegible
- All `text-glow` / `box-glow` text-shadows become `none`
- Markdown body styling shifts to long-form-reading typography
- Code blocks stay dark for contrast

Why a descendant div instead of `<html>`? It scopes the swap to content area only — the navbar (fixed at top) keeps its dark theme. Also avoids fighting `next-themes`'s `theme-cyberpunk-gold` class on `<html>`.

### `next-themes` role (single-theme)

After consolidation, `next-themes` is technically vestigial — there's only one theme to "switch" to. But we keep `ThemeProvider` because:
1. It applies `theme-cyberpunk-gold` class to `<html>` BEFORE first paint, preventing FOUC
2. It injects the inline `<script>` that reads `localStorage` synchronously (also FOUC prevention)
3. It preserves wiring for future theme additions without restructuring

---

## 6. Motion Design System

**Two coexisting timing systems** — by deliberate design (see `motion.ts` header comment):

| System              | Source of truth                  | Used for                                        |
|---------------------|----------------------------------|--------------------------------------------------|
| **JS constants**    | `src/lib/motion.ts`              | Framer Motion variants for entrance/transition  |
| **CSS properties**  | `src/index.css` (`:root` motion vars) | Hover/ambient CSS effects, keyframes            |

The systems share design intent (durations match, easings match) but aren't mechanically coupled. **If you change durations or easings on one side, update the other.**

### CSS motion tokens

```css
:root {
  --motion-instant:  100ms;
  --motion-fast:     150ms;
  --motion-normal:   300ms;          /* 250ms in cyber theme */
  --motion-slow:     500ms;
  --motion-reveal:   700ms;

  --ease-out-expo:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-back:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-glitch:      steps(4);
  --ease-mechanical:  steps(8);

  --stagger-fast:    50ms;
  --stagger-normal:  100ms;
  --stagger-slow:    150ms;
}
```

### JS variant exports

| Export                     | Purpose                                                    |
|---------------------------|-------------------------------------------------------------|
| `pageTransition.cyberpunk` | Default route transition (horizontal glitch + brightness)  |
| `pageTransition.reading`   | Reading-mode route transition (200ms opacity-only fade)    |
| `pageTransition.reduced`   | Reduced-motion (instant snap)                              |
| `staggerContainer`         | Container variant — orchestrates `staggerChildren`         |
| `staggerItem`              | Subtle vertical slide + blur — used by Index hero Phase 3  |
| `staggerItemCyber`         | Default — horizontal shift + brightness flash              |
| `staggerItemMobile`        | Mobile fallback — opacity only, no transform/blur          |
| `reducedVariant`           | Reduced-motion fallback — `{ opacity: 1, opacity: 1 }`     |

### Variant-selection hooks

| Hook                       | Returns based on                                            |
|---------------------------|-------------------------------------------------------------|
| `usePageVariant()`         | reduced-motion → `reduced`, else `cyberpunk`               |
| `useReadingPageVariant()`  | reduced-motion → `reduced`, else `reading`                 |
| `useItemVariant()`         | reduced → `reducedVariant`, mobile → `staggerItemMobile`, else `staggerItemCyber` |
| `useHeroStaggerVariant()`  | reduced → `reducedVariant`, mobile → `staggerItemMobile`, else `staggerItem` (subtle) |

**Why two stagger hooks?** Hero already runs heavy entrance theater (`hero-glitch-entrance` + `hero-stamp-entrance`). The Phase 3 stagger should be **subtle** to not compete; cyber stagger would fight the headline. Other pages get the cyber variant for first-impression drama.

---

## 7. Hero Cascade Architecture

The home page hero is a 3-phase cascade orchestrated by `Index.tsx:Index`. State lives in a single `phase: 0|1|2|3` integer + a `skipAnimation` boolean.

### State machine

```
        ┌─────────────────────────────────────────────────────────┐
        │                                                          │
        │  sessionStorage["hero-cascade-played"] === "1"?           │
        │                                                          │
        └────────────┬───────────────────────────────┬─────────────┘
                     │ YES                           │ NO
                     ▼                               ▼
        ┌────────────────────────┐    ┌──────────────────────────────┐
        │  skipAnimation = true   │    │  skipAnimation = false        │
        │  phase initial = 3      │    │  phase initial = 0            │
        │  No setTimeouts queued │    │  3 setTimeouts queue           │
        │  All elements rendered │    │  phase ticks 0→1→2→3 over 6s   │
        │  in settled state      │    │  Set sessionStorage at phase 3 │
        └────────────────────────┘    └──────────────────────────────┘
```

### Phase rendering

| Phase | Element                            | Mechanism                                                |
|-------|-----------------------------------|----------------------------------------------------------|
| 1     | `> INITIALIZING SYSTEM...`        | `<LetterReveal>` with `linear` easing (boot-sequence semantic) |
| 2     | BREAK IT (glitch)                 | `.hero-glitch-entrance` CSS class — 0.8s glitch + flash  |
| 2+1s  | BUILD IT (letters)                | `<LetterReveal startDelay={1000}>`                       |
| 2+2.2s| PROVE IT (stamp)                  | `.hero-stamp-entrance` CSS + inline `animationDelay: 2.2s` |
| 3     | Subtitle, buttons, scroll hint    | `<motion.div variants={heroItem}>` (subtle stagger)      |

### Skip-on-return mechanism

Per-element conditional in `animClass()` helper:
- `phase < gate` → return `"opacity-0"` (hidden)
- `phase >= gate && skipAnimation` → return `""` (settled, no animation)
- `phase >= gate && !skipAnimation` → return the animation class (entrance plays)

For Framer Motion children: `initial={skipAnimation ? "visible" : "hidden"}` bypasses the entrance variant entirely on skip.

For `LetterReveal`: external `skipAnimation` prop is OR'd with internal `hasPlayed` ref. Either condition causes spans to render in settled state (`opacity: 1`, no animation classes).

### Why `set-at-end` semantic

The sessionStorage flag writes only at the Phase 3 setTimeout, not on first mount. Trade-off:
- **Set-at-end:** if user clicks VIEW PROJECTS at 3s (mid-cascade), the flag isn't set; return visit replays. Honors "you didn't experience the full theater."
- **Set-on-mount alternative:** any visit counts as seen; mid-cascade interruption still skips on return. Simpler, but feels wrong if user never saw past Phase 1.

Current default: set-at-end. One-line change to flip if preference shifts.

---

## 8. Build & Deploy

### Local dev

```bash
npm install --legacy-peer-deps   # Radix UI peer dep conflicts require this
npm run dev                       # vite on port 8080 (NOT 5173)
```

**WSL2 caveat:** Vite HMR over NTFS cross-mounts is unreliable. After any runtime-affecting change, **hard-restart vite** (don't trust HMR). See `.claude/rules/hard-reload-dev-servers.md`.

### Build

```bash
npm run build      # vite build → dist/
npm run preview    # serve dist/ locally for verification
```

### Deploy

Vercel auto-deploys from `main`. `vercel.json` configures:
- `buildCommand`
- `outputDirectory: "dist"`
- SPA rewrite (catch-all → `index.html`)
- Analytics + Speed Insights enabled via `@vercel/analytics` + `@vercel/speed-insights`

GitHub Actions: see `.github/workflows/`.

---

## 9. Testing Architecture

Three test layers, each at a different cost/feedback ratio:

| Layer       | Tool       | Location              | Purpose                                          |
|------------|------------|-----------------------|--------------------------------------------------|
| Unit       | Vitest     | `src/**/*.test.tsx`   | Component logic, hooks, utility functions        |
| E2E        | Playwright | `e2e/*.spec.ts`       | Real browser, full user flows                    |
| Visual     | Playwright | `e2e/visual-mobile.spec.ts` (snapshots) | Mobile viewport visual regression                |

### Vitest

- Configured via `vite.config.ts` + `tsconfig.test.json`
- Watch mode disabled (WSL2 inotify issues)
- E2E specs excluded from Vitest run
- React Testing Library v16+ for React 19 compat (we're on React 18 — no compat hack needed)

### Playwright

- `playwright.config.ts`: `fullyParallel: true`, `workers: undefined` locally, `workers: 1` in CI, retries: 1 in CI
- Each test gets a fresh BrowserContext (no `storageState` configured globally) → sessionStorage isolated per test
- `webServer.command: "npm run dev"`, `reuseExistingServer: !CI`
- Custom fixture `e2e/fixtures/blog-page.ts` navigates to `/blog/style-test` and waits for content load

### Visual snapshot baselines

`visual-mobile.spec.ts` runs at 375/390/428px viewports. First-run "writing actual" mode generates baselines at `e2e/visual-mobile.spec.ts-snapshots/*.png`. Commit baselines after any visual-affecting change.

### Known caveats

- **WSL2 + Playwright:** uses headless Chromium with extracted libs + `LD_LIBRARY_PATH`. See `reference_playwright_wsl2` memory.
- **Test parallelism + dynamic markdown:** rare flake on `/blog/style-test` when many tests hit it simultaneously (markdown loads asynchronously). Single retry usually clears.
- **HMR-stale state in test runs:** if tests run against a long-lived dev server that's been HMR'd over many edits, stale state can cause non-reproducible failures. Hard-restart vite before running the full suite.

---

## 10. Key Abstractions

### `LetterReveal` (`src/components/LetterReveal.tsx`)

Per-character entrance reveal. Single CSS keyframe with per-span `animation-delay` (avoids 40+ Framer Motion instances per headline).

**Props:**
- `text: string` — full text (split into spans)
- `tag?: "h1" | "h2" | "h3" | "span"` — wrapper element
- `delayPerLetter?: number` — ms between each letter's animation start
- `startDelay?: number` — ms before the first letter
- `skipAnimation?: boolean` — external skip (used by Index for return visits)

**Internal:** `hasPlayed` ref + `internalSkip` state — also skips on second mount (e.g., back navigation). Effective skip = external `||` internal.

**Accessibility:** `aria-label={text}` on wrapper for screen readers; individual spans `aria-hidden`.

### `MarkdownRenderer` (`src/components/markdown/MarkdownRenderer.tsx`)

Single component handling all markdown rendering. Pipeline:
1. Custom slugify (Polish chars + custom `{#id}` syntax)
2. `remarkGfm` for GFM
3. `rehypeSlug` + `rehypeAutolinkHeadings` for nav anchors
4. `rehypePrismPlus` for code highlighting
5. Custom component overrides:
   - `<code>` → `<CodeBlock>` for fenced blocks; inline code styled separately
   - `pre` → null (CodeBlock handles it)
   - Mermaid fences → `<MermaidRenderer>` with theme-reactive CSS

**Mermaid theming:** `useMermaidTheme()` MutationObserver on `<html>` class — reinitializes Mermaid when reading-mode toggles.

### Motion hooks (`src/lib/motion.ts`)

See §6 above. The hook indirection (instead of importing variants directly) is what enforces mobile + reduced-motion handling. **Always use the hook**, never import variants directly.

---

## 11. Conventions & Rules

### Code style

- TypeScript strict mode (no `any`)
- Path alias `@/` → `src/`
- Tailwind utilities for styling, never hardcoded HSL/hex in components
- Use CSS vars (`hsl(var(--token))`) when Tailwind utility doesn't exist
- Use semantic Tailwind tokens (`text-primary`, `bg-learning`) not Tailwind named colors (`text-amber-500`)

### Git

- **NEVER** include `Co-Authored-By` lines in commits
- Conventional commit prefix (`feat`, `fix`, `chore`, `docs`)
- Stage specific files (avoid `git add -A` to prevent committing `.env`/secrets/binaries)
- CRLF guard on WSL2: verify line endings haven't flipped before commit (see `~/.claude/rules/crlf-guard.md`)

### Content (blog posts)

- Markdown in `src/pages/content/blog/{YYYY-MM-DD-slug}.md`
- Metadata in `src/features/blog/data.ts`
- Frontmatter: `title, slug, date, tags (3-6), category, reading_time, description, og_image, draft: true`
- Tone dial: 4-5/10 polish. No AI-isms (`delve`, `landscape`, `it's worth noting`)
- No labeled callout boxes — weave insights into prose
- Obfuscation: NO Veeam name in any output (workspace-global rule)

### Polish character handling

`MarkdownRenderer.tsx:customSlugify` transliterates `ą→a`, `ć→c`, `ę→e`, `ł→l`, `ń→n`, `ó→o`, `ś→s`, `ź→z`, `ż→z` for slugifying.

---

## 12. References

- **Design system:** `DESIGN.md` (visual identity, color palette, motion grammar)
- **Voice & content guide:** `skills/voice-to-blog/references/voice-style-guide.md`
- **WSL2 dev rules:** `.claude/rules/hard-reload-dev-servers.md`
- **Operator profile:** repo's `CLAUDE.md` + workspace `CLAUDE.md`
- **Repo:** https://github.com/MalfiRG/the-digital-matrix
- **Hosting:** Vercel (auto from `main`)

---

*Last updated: 2026-04-19 — single-theme consolidation commit `9ad49e1`*
