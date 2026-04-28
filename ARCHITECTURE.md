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

**Tech stack (architectural essentials):**

| Layer        | Technology                                | Architectural rationale                                       |
|--------------|-------------------------------------------|---------------------------------------------------------------|
| Theme        | next-themes (single theme: cyberpunk-gold) | FOUC prevention via inline script; preserves wiring for future themes (see §12) |
| Animations   | Framer Motion 12 + custom variants in `motion.ts` | Two-tier coexisting timing systems (JS variants + CSS vars) — see §6 |
| Deployment   | Vercel (auto from `main`) + Analytics + Speed Insights | SPA rewrite via `vercel.json`; Speed Insights affects test timing — see §9 |

Full Tech Stack table → `README.md`.

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

Color tokens live as HSL CSS custom properties on `:root` in `src/index.css`. `tailwind.config.ts` maps each token to a Tailwind utility (e.g., `text-primary` → `color: hsl(var(--primary))`). Single source of truth: the CSS `:root` block.

**Token list and brand rationale:** `→ DESIGN.md §Colors` (the YAML front matter mirrors the CSS tokens; the prose explains semantic roles and usage rules).

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
1. It applies `theme-cyberpunk-gold` class to `<html>` BEFORE first paint via inline `<script>`, preventing FOUC
2. It synchronously reads `localStorage` (also FOUC prevention)
3. It preserves the wiring point if a future theme is added — re-introducing themes wouldn't require restructuring

The `theme-cyberpunk-gold` class itself is currently a no-op at the CSS level (color tokens live in `:root`), but it serves as a defensive marker that hydration completed — useful for any future hydration-state-dependent CSS or JS that needs to know "themes are wired".

---

## 6. Motion Design System

> **Device-tier policy → `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md`** (HARD SPEC, not yet implemented).
> Canonical three-tier policy (mobile / tablet / desktop) with the public flag `animationsDisabled`. Replaces the inconsistent 640/768px breakpoints (no tablet tier) that existed across `motion.ts` and `use-mobile.tsx` pre-migration. All future motion work MUST cite that spec by filename in the plan.

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

**Stagger semantics:** `→ DESIGN.md §Motion / Subtle vs cyber stagger variants` covers the rationale (hero subtitle uses subtle variant so the Phase 3 cascade doesn't fight the headline theater above; other pages get the cyber variant for first-impression drama). The hook indirection (which lives here as architecture) enforces mobile-fallback and reduced-motion handling — always use the hook, never import variants directly.

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

The Playwright suite is organized into three tiers under `e2e/`, each with its own signal contract and wall-clock budget. Placement is enforced via file-scoped overrides in `eslint.config.js` so the structure cannot drift.

The smoke tier (`e2e/smoke/`) covers route load + key element renders and runs in <60s wall-clock as a PR gate on every push and PR. The functional tier (`e2e/functional/`) covers DOM/structural, interactions, and computed-style assertions, runs in <5min, and also gates every PR. The visual tier (`e2e/visual/`) covers pixel-diff via `toHaveScreenshot`, runs only on `main` push + `workflow_dispatch`, and is informational rather than gating (see spec §2.0 for the full placement rubric).

The visual tier uses a separate `playwright.visual.config.ts` that runs against `npm run preview` (not the dev server) inside a webServer with `--strictPort` and `SKIP_GITHUB_FETCH=1`. Baselines are regenerated only inside the pinned Docker image `mcr.microsoft.com/playwright:v1.58.2-jammy` via `npm run test:e2e:update-baselines`. The `kitchen-sink.spec.ts` `beforeAll` guard hard-fails on host-machine `--update-snapshots` (override with `ALLOW_HOST_SNAPSHOT_UPDATE=1`).

Dependabot Playwright bumps are handled via the manual `.github/workflows/regen-visual-baselines.yml` `workflow_dispatch` workflow: the maintainer triggers it against the Dependabot branch, the workflow runs regen in the same Docker image, and opens an auto-PR with the new baselines for review. `e2e/visual/__snapshots__/**` is covered by `.github/CODEOWNERS` so baseline changes always require explicit maintainer approval.

Determinism patterns live in `e2e/fixtures/visual-determinism.ts`: `prepareContext(page)` (pre-`goto`, addInitScript-based) + `stabilizeForLayout(page, opts)` (post-`goto`). Full rationale and the helper API: `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md`.

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
- Obfuscation: follow workspace-global content policy

### Polish character handling

`MarkdownRenderer.tsx:customSlugify` transliterates `ą→a`, `ć→c`, `ę→e`, `ł→l`, `ń→n`, `ó→o`, `ś→s`, `ź→z`, `ż→z` for slugifying.

---

## 12. Implementation Notes

WHYs that previously lived as code comments. Code stays self-documenting; non-obvious decisions live here.

### Two-tier route transition system

`PageTransition` (`src/components/PageTransition.tsx`) wraps the top-level Outlet with `AnimatePresence` keyed on the **first path segment** (`/` + first path part). This means cross-section navigation (Home → Blog, Blog → Projects) triggers the outer transition, but intra-blog navigation (`/blog → /blog/some-slug`) does NOT — both share the same key (`/blog`).

`BlogLayout` (`src/features/blog/BlogLayout.tsx`) provides the inner `AnimatePresence` keyed on full `location.pathname` for intra-blog navigation. It uses `useReadingPageVariant()` (200ms opacity-only fade) for `/blog/:slug` post pages and `usePageVariant()` for the index. The two-tier split avoids double-render flash on intra-section navigation.

`mode="wait"` on both ensures exit completes before enter starts.

### Manual scroll restoration

`useScrollRestoration()` (`src/hooks/useScrollRestoration.ts`) replaces the browser's native `history.scrollRestoration` because:

- Mobile browsers evict background tabs and reload the SPA when the user returns. Native restoration fires before React mounts content, so scroll position resets to 0.
- `AnimatePresence` enter animations take 200-400ms; restoring before the animation settles produces visible jump.

The hook saves `window.scrollY` to sessionStorage on `visibilitychange` (tab background) and `beforeunload`, then restores after a 500ms delay (covers both classic 400ms and reading 200ms variants with margin). `sessionStorage` key is `scroll-pos`, scoped per-pathname.

### Markdown renderer — Mermaid theming

`useMermaidTheme()` (`src/components/markdown/MarkdownRenderer.tsx`) reads CSS custom properties at call time via `getComputedStyle(document.documentElement)`. This means Mermaid diagrams pick up the live Night City palette without hardcoding colors, and the function automatically adapts if a future theme is added.

Reading mode swaps to a fixed cream-paper Mermaid palette (`readingThemeCSS`) since reading mode uses a different background. The two paths are gated by an `isReading` MutationObserver on `<html>` class.

The `typeof window === "undefined"` SSR branch in `buildDarkMermaidThemeCSS` is dead code under the current Vite client-only setup, but kept to satisfy TypeScript and any future SSR scenario.

### Reading-mode CSS — `!important` usage

`readingThemeCSS` (string constant in `MarkdownRenderer.tsx`) and several `.theme-reading .markdown-body` rules in `index.css` use `!important`. This is necessary because:

- Mermaid SVG output sets inline `fill`/`stroke` attributes that beat regular CSS specificity
- `rehype-prism-plus` Prism token rules need to be overridden for code-in-reading-mode
- Hardcoded reading-mode colors must beat the layered `:root` and `@layer components` rules

`!important` in this codebase is allowed ONLY for these three cases. Any new `!important` usage requires a justification at PR review.

### CategoryTree auto-collapse

`getIsExpanded()` (`src/features/blog/CategoryTree.tsx`) auto-collapses categories that have zero visible posts when filters are active, but respects the user's manual expand/collapse state otherwise. This keeps the sidebar tidy when filtering by tag without losing user intent.

### BlogLayout `max-w-6xl` content width

The blog post container uses `max-w-6xl` (72rem ≈ 1152px) so code blocks have room to breathe horizontally without wrapping. Prose elements inside are constrained to 680px via CSS in `index.css` (`.markdown-body > p, .markdown-body > h2, ...`). This produces narrow text columns inside a wider canvas — readable prose without cramped code samples.

`BlogIndex.tsx` constrains itself to `max-w-3xl` separately for tighter post-list layout.

### Frontmatter parser — supported subset

`parseFrontmatter()` (`src/lib/frontmatter.ts`) handles the YAML subset used in blog frontmatter only:

- Quoted strings (`"foo"`) — quotes stripped
- Unquoted scalars
- JSON arrays (`["a", "b"]`) — `JSON.parse`d
- Booleans (`true` / `false`)

Anything else (multi-line strings, anchors, complex nested objects) is unsupported. If frontmatter complexity grows beyond this, switch to a real YAML library (`yaml` or `js-yaml`).

### Scroll restoration vs hero skip — different sessionStorage keys

Two unrelated sessionStorage features coexist:

| Key                    | Owner                       | Purpose                                              |
|------------------------|----------------------------|------------------------------------------------------|
| `scroll-pos`           | `useScrollRestoration`      | Per-pathname scroll position dictionary              |
| `hero-cascade-played`  | `Index.tsx` hero cascade    | Boolean flag — first visit plays full theater       |

Both clear on tab close.

### CSS source order — unlayered beats layered

In `index.css`, code-block selection-color rules (`pre ::selection`, `code ::selection`, etc.) live OUTSIDE any `@layer` block. This is intentional: unlayered rules always beat layered rules of identical specificity, and we need these to override Prism's syntax-highlight token colors during text selection. Moving them inside `@layer components` would lose the override.

The same principle protects the `body` font swap to Chakra Petch (in `@layer base`, edited in-place rather than added unlayered).

### Sonner toast theme — hardcoded "dark"

Sonner's `Toaster` accepts `theme="light" | "dark" | "system"`. Passing the next-themes value (`"cyberpunk-gold"`) silently falls back to `"light"` and renders toasts on a white background against our dark UI. We hardcode `theme="dark"` in `src/components/ui/sonner.tsx` to avoid this.

If a future theme adds a light reading-mode for toasts (currently reading mode is descendant-scoped only), this needs a swap.

### Hero glitch entrance — `data-text` requirement

Elements using `.hero-glitch-entrance` or `.glitch-hover` CSS classes MUST also set the `data-text="..."` attribute matching their visible text. The pseudo-elements (`::before`, `::after`) read `content: attr(data-text)` to render the chromatic-aberration overlays.

Forgetting `data-text` produces silent failure: animation runs, but the overlay layers are blank.

### Motion override precedence (control plane)

The motion-policy author override forces animations on regardless of device tier. It is a three-layer config evaluated top-down, first match wins:

1. **`localStorage["digital-matrix-motion-override"]`** — per-browser, per-origin. Values `"on"` or `"off"` win over the env var. Set from DevTools console for personal preview without redeploying. Case-sensitive — `"ON"` / `"true"` / `"1"` do NOT activate (spec §4 point 4 mandates exact `"on"`).
2. **`VITE_MOTION_OVERRIDE`** (env var) — build-time substitution; requires Vite restart or Vercel redeploy. Use to force animations on for ALL visitors (demo, A/B test). Read once in `motion-config.ts`.
3. **Tier default** — desktop = on, tablet/mobile = off (`useMotionPolicy` in `src/lib/motion.ts`).

Read path lives in `readAuthorOverride()`. The `try/catch` around `localStorage.getItem` is load-bearing: Safari private mode and sandboxed iframes throw on access — fall through to the env var instead of crashing the render.

A module-level `authorOverrideWarned` latch ensures the activation `console.info` fires once per page load, not once per `useMotionPolicy` call. Multiple components consume the hook and would otherwise spam the console.

`useMotionPolicy` evaluation order matches spec `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md` §4 + §10 H7: `prefersReducedMotion` → `heroReplaySkip` → `authorOverride` → tier default. The numbering in the spec reflects priority, not source-line order — `heroReplaySkip` is checked BEFORE `authorOverride` so the override cannot un-suppress a within-session replay-skip.

The `heroReplaySkip` parameter is a documented contract — only `src/pages/Index.tsx` is allowed to pass it. No runtime enforcement; the contract is policed at review time.

### Hero cascade — replay-skip persistence, focus management, inert semantics

`writeHeroReplayFlag()` in `Index.tsx` always persists `sessionStorage["hero-cascade-played"] = "1"` after the cascade settles or after SKIP, regardless of build mode. The earlier DEV-gate (`isDevBuild()` no-op under `import.meta.env.DEV`) was removed 2026-04-28: the dev server is the operative live-preview surface for Meshnet phone smoke testing, and the no-op caused a "cascade replays on every reload" regression report. New tab semantics still come for free — `sessionStorage` is per-tab/per-origin, so closing the tab and opening a fresh one replays the cascade naturally. To force-replay during cascade iteration, clear the flag from DevTools (`sessionStorage.removeItem("hero-cascade-played")`).

`e2e/functional/hero-skip-and-badge.spec.ts` locks the new contract: flag persists after SKIP, reload-in-tab lands directly in `phase3` with no SKIP button, fresh browser context replays.

The `skipToPhase3` handler schedules `setTimeout(() => viewProjectsRef.current?.focus(), 0)` so keyboard users aren't stranded on the unmounted SKIP button. Resolves Wave 3 review B5 / F-UX-05. The `react-router-dom` `<Link>` ref-forwarding contract is what makes this work; if it changes, `e2e/functional/hero-focus-management.spec.ts` fails loudly.

The SKIP button MUST be a direct child of the top-level fragment (NOT nested inside the hero `<section>` or the `<div className="relative z-20">` around `AboutSection`). Each of those creates a later stacking context that would paint over a nested `z-40` button. See Wave 3 review B2.

The CTA region uses HTML `inert` (React 19 boolean prop) to gate it during phases 0–2, NOT `aria-hidden="true"` + `tabindex="-1"` + `pointer-events-none`. `inert` subsumes all three: removes the subtree from the accessibility tree, blocks focus into descendants, disables pointer events. axe-DevTools previously flagged the `aria-hidden` + focusable-children pair as a Serious WCAG violation; `inert` resolves it cleanly. `e2e/functional/a11y-essentials.spec.ts` locks both directions — no aria-hidden ancestor over focusables, AND `inert` is present during the cascade.

`LetterReveal skipAnimation` receives `animationsDisabled` (which already composes `heroReplaySkip` via `useMotionPolicy`) — no double-pass needed per spec §5.3.

Tri-state badge (`F-UX-03 + F-CONS-05` convergence): `animationsDisabled` can be caused by (1) OS reduced-motion, (2) session replay-skip, or (3) tier default. The cause determines the badge label so the user understands WHY motion is off. Priority follows the §4 evaluation chain: OS > session > tier. Badge dismissal persists in `localStorage` (`hero-badge-dismissed`); the dismissal is cosmetic, so the write is wrapped in a swallowed `try/catch`.

### Visual determinism fixture (Playwright)

`e2e/fixtures/visual-determinism.ts` exposes pre-goto and post-goto primitives plus a façade.

**Pre-goto (must run via `addInitScript` so they fire before React mounts on every navigation):**

- `freezeAnimationsViaInitScript` injects a `<style id="__test-determinism">` that zeroes `animation`, `transition`, and forces `scroll-behavior: auto`. The style is **prepended as the first child of `<head>`** so author rules cannot win on source-order tie-break. Limitation: framer-motion `layout` animations are rAF-driven via `useLayoutEffect` and are NOT covered by CSS injection — tests exercising `layout` props must additionally wrap with `<MotionConfig reducedMotion="always">` in a test-only render.
- `skipHeroCascadeViaInitScript` pre-seeds `sessionStorage["hero-cascade-played"] = "1"` so `Index.tsx`'s `useState(() => readHeroReplaySkip())` initializer captures `true` on mount — skipping the 6-second hero cascade entirely.

**Post-goto:**

- `waitForFonts` awaits `document.fonts.ready` with a watchdog timeout (default 10s). Replaces every `waitForTimeout(1500)` in the suite. The watchdog prevents a stalled `FontFaceSet` from hanging the run indefinitely.
- `waitForMermaid` polls until every rendered `svg[id^='mermaid-']` has a measurable bbox. Selector precision matters: the `mermaid-*` id lives on the `<svg>` ITSELF (not on a parent), so `svg[id^='mermaid-']` is correct, NOT `[id^='mermaid-'] svg`. `getBBox()` throws on hidden/detached SVGs — wrap in `try/catch` and treat as not-yet-measurable so polling continues.
- `settleStyles` does a double-rAF: the first schedules in-frame; the second guarantees paint after the first commits. Chromium's pipeline is rAF callbacks → style → layout → paint → composite, so a single rAF resolves before paint and a single-rAF screenshot captures mid-paint state.

**Façade:**

- `prepareContext` defaults `freezeKeyframes: true` and `skipHeroCascade: true`; both are opt-out so verification can isolate whether keyframe freezing is load-bearing for CSS animation coverage on Playwright 1.58.2.
- `stabilizeForLayout` composes fonts → Mermaid → settle → optional ready-locator visibility check.

### Hero skip-on-return + badge testing strategy

`e2e/functional/hero-skip-and-badge.spec.ts` covers paths the Wave 2 smoke suite (`e2e/smoke/hero-motion-tier.spec.ts`, three happy-path reach-phase-3 scenarios) intentionally skips: SKIP-button activation, badge state transitions, sessionStorage round-trip, dev-host write suppression. Lives in the `functional` Playwright project so it stays out of smoke-gate wall-clock budgets.

Spec contract walkthrough:

- §5.6 — SKIP button is the only skip mechanism. Wave 3 F-UX-01 removed `pointerdown` on `<section>` and `Space` on `<section>` for a11y. Native button semantics still let Space and Enter activate when the SKIP button itself is focused. Space with no focused element preserves native page-scroll. Mobile tier renders settled (no cascade), so no SKIP button.
- §5.7 — three badge states (reduce-motion / animations-off-device / animations-off-session), each `data-testid`-keyed and dismissible per session.
- §5.9 — dev escape hatch: `import.meta.env.DEV === true` → `sessionStorage["hero-cascade-played"]` write is suppressed. Playwright runs against `npm run dev`, so the flag is NOT written — that's what these tests assert. Production-build behavior is covered by the prod-contract suite once a corresponding spec lands.

`gotoFreshCascade` clears `sessionStorage` AFTER the first navigation (origin is `null` before a goto). Every test starts from `phase=0`.

### Hero focus management testing

`e2e/functional/hero-focus-management.spec.ts` resolves Wave 3 iteration-2 finding F-CONS-06: the suite asserted skip REACHES phase 3 but nothing asserted where focus LANDS. Locks the `viewProjectsRef.current?.focus()` invariant scheduled inside `skipToPhase3()`.

Uses accessible-name matching (`aria-label || textContent`) so the test stays resilient to markup tweaks. If `react-router-dom`'s `<Link>` ref-forwarding contract changes, this test fails loudly instead of silently regressing a11y.

A second test confirms the post-Wave-3 contract that the hero `<section>` has NO event handlers — clicking on empty hero space during phases 1–2 must NOT skip the cascade. Only the SKIP button does.

### A11y essentials — landmark and inert hygiene

`e2e/functional/a11y-essentials.spec.ts` locks three contracts derived from Brave DevTools accessibility audit findings on the Vercel preview:

1. **Single `<main>` per page** (WCAG 2.4.1 Bypass Blocks). `App.tsx` wraps every route in one `<main>`; `BlogLayout.tsx` was downgraded from `<main>` to `<div>` so blog routes don't end up with two.
2. **No focusable element inside an `aria-hidden="true"` or `data-aria-hidden="true"` subtree.** `Index.tsx` was the original offender — the cascade-gated CTA region used `aria-hidden` + `pointer-events-none` while keeping CTA links focusable. Fix: switch to `inert`. The spec catches any regression that reintroduces aria-hidden over focusables, independent of the CSS approach.
3. **Skills page Tabs triggers meet WCAG AA 4.5:1 contrast** against their effective background. Inactive tabs previously fell to ~4.0 against `bg-secondary/50` and now use `text-foreground/70`.

Why DOM probes instead of axe-core: axe is a 200kb runtime payload for findings we already know to expect. Three focused DOM queries give exact failing selectors and zero new dependencies.

The cascade-window assertion runs without waiting for phase 3 — the original bug lived during phases 0–2, so the assertion has to hold mid-cascade. A separate test pins the implementation: the CTA wrapper must carry `inert`, not just lack `aria-hidden` (a regression to "remove aria-hidden but don't add inert" would lose the focus-trap-out behavior).

The CTA wrapper search walks ancestors up to `<main>` because Framer Motion may wrap the inert region in another div — the spec doesn't anchor on class names (brittle to refactor).

### Blog tile geometric regression testing

`e2e/functional/blog-tile-layout.spec.ts` guards two surfaces independently:

1. **Blog index tile** (`BlogIndex.tsx`) — original bug: tag list was `inline-flex flex-wrap`, sized to content, never wrapped → overflowed at narrow widths.
2. **Blog post header** (`BlogPostPage.tsx`) — original bug: tag row was `flex` with NO `flex-wrap` directive → 7 tags rendered single-row and bled past the card.

**Why Playwright, not Vitest + jsdom:** jsdom has no layout engine. `getBoundingClientRect()` returns zeros, so geometric containment can't be tested there. The bug is geometric → real browser required.

**Why functional suite, not visual-regression snapshots:** snapshots fail on font hinting, scrollbar widths, subpixel rendering. Geometric containment of a child rect inside a parent rect is the actual user-visible invariant, expressed as one numeric comparison.

`TOLERANCE_PX = 1` absorbs sub-pixel rounding — browsers can place a child at `card.right + 0.4px` without a real visual overflow.

Selector scope: `BlogIndex` renders an inline mobile sidebar (`md:hidden`) AND `BlogLayout` renders a desktop sidebar (`md:block`); both contain `<a href="/blog/{slug}">` post links that would collide with a generic tile selector. Tiles carry `data-testid="blog-post-tile"` so the spec doesn't reason about CSS-driven visibility or DOM order.

`reducedMotion: "reduce"` is set so Framer Motion snaps to final state and `boundingBox()` returns stable numbers without timing windows. Motion-policy behavior itself is exercised in `motion-wcag-session.spec.ts` and the hero specs.

The mobile-wrap test asserts distinct row Y-coordinates rather than a row count — robust against font-metric drift.

### Motion policy composition — cross-consumer coherence test scope

`src/test/motion-policy-composition.test.tsx` fills gaps in the Wave 2 plan's `src/lib/motion.test.ts` (which covers the 5 primary evaluation-chain cases at the unit level). Three categories:

1. **localStorage author-override edge cases.** Missing key, arbitrary non-`"on"` values (`"true"`, `"1"`, `"ON"`), exact `"on"`, and override-suppressed cases (OS reduced-motion wins; `heroReplaySkip` wins per spec §4 H7). The case-sensitivity assertion is load-bearing — spec §4 point 4 says exactly `"on"`.
2. **localStorage read failure (private mode).** `Storage.prototype.getItem` mocked to throw `"The operation is insecure"` — hook must not crash; falls through to env-var/tier path.
3. **Cross-consumer coherence.** Spec §5.3 mandates that all downstream consumers (`useMotionPolicy`, `useHeroStaggerVariant`, `useItemVariant`, plus `animClass` and `LetterReveal skipAnimation` indirectly) agree on the same `animationsDisabled` value. A bug where they disagree would be visible only via integration — each individual hook test would pass. This block calls them together in a single render and asserts every surface reads the same underlying state across the four canonical input combinations (desktop on, tablet off, OS-reduced-motion override, mobile + author override).

### Device-tier boundary test scope

`src/test/use-device-tier-boundaries.test.tsx` complements the Wave 2 `src/hooks/use-device-tier.test.tsx` (which tests 375/900/1440 mid-tier widths plus boundary widths 768 and 1024). Adds:

- **Off-by-one neighbors** at 767 and 1023 — confirms the `min-width` media-query semantics (`< 768 = mobile`, `768 ≤ x < 1024 = tablet`, `≥ 1024 = desktop`).
- **Reactive matchMedia change events.** The Wave 2 test fires `renderHook` at a fixed width and asserts once; it never simulates an `MediaQueryList` `change` event, so a regression to a non-reactive `isMobileViewport()` snapshot would pass that suite. A custom `matchMedia` stub captures registered handlers so we trigger them manually, mimicking a real resize crossing a tier boundary. Three transitions covered: desktop→tablet (1440→900), tablet→mobile (900→400), mobile→desktop (375→1440).
- **iPad 10th-gen rotation case.** Portrait 810×1080 → tablet, landscape 1080×810 → desktop by width-only rule. Spec §1 explicitly defers tablet-regardless-of-orientation (`pointer:coarse`) to §8.1 open questions, NOT shipping. The test pins the width-only contract (1080 → desktop) so a future change toward orientation-aware tiering is forced through spec review, not slipped in silently.

### Hero asymmetric stagger — gated negative margins

`.hero-h .h-row.left` and `.h-row.right` (`src/index.css`) use `margin-left` / `margin-right` of `clamp(-120px, -6vw, 0px)` to pull BREAK leftward and PROVE rightward beyond the 960px hero container. The negative-margin block is gated to `@media (min-width: 1280px)` because at narrower viewports the 960px container collapses to fill the viewport and the negative margin pushes content past the screen edge — phone-landscape (~720–960px) and tablet (~768–1023px) showed BREAK clipping off the left and PROVE clipping off the right when the original `min-width: 768px` gate fired.

The 768–1279px tier still gets visible asymmetric stagger from padding alone (`padding-left: clamp(0, 4vw, 48px)` on `.left`, `padding-right: 0` on `.right`). Mobile (<768px) keeps both rows centered.

`docs-over-code-comments.md` mandates that the WHY for the threshold lives here, not inline; the rule itself only carries the threshold value.

### Inline-code overflow guard — defensive containment

`.markdown-body { overflow-x: hidden }` is intentional, NOT cargo-culted. Long unbreakable identifiers in inline `<code>` (e.g. `message.usage.cache_creation.ephemeral_5m_input_tokens`) used to push document width past viewport width on mobile, triggering horizontal page scroll that clipped the navbar/title/tags off-screen. Two-layer fix:

- **Semantic** — `.markdown-body code:not([class*="language-"]) { overflow-wrap: anywhere }` lets the long identifier wrap inside the pill.
- **Defensive** — `.markdown-body { overflow-x: hidden }` clips any future unbreakable element inside the article instead of letting it force page scroll. Fenced code blocks already scroll within their own `.code-block-wrapper` and are unaffected.

Style-test fixture `src/pages/content/blog/style-test.md` includes a deliberately-long identifier (tagged `DO_NOT_REMOVE` in the prose) so `e2e/functional/code-block-styling.spec.ts` "Inline-code overflow guard" has something to assert on. Removing that line breaks the regression test.

### SCROLL TO EXPLORE arrow — outer-div scroll-fade pattern

`HeroSignalNoise.tsx` wraps the SCROLL TO EXPLORE prompt in TWO nested elements: an outer plain `<div>` carries the scroll-driven `transition-opacity` + `opacity-0/100` Tailwind classes; an inner `<motion.div variants={heroItem}>` carries the cascade entrance animation. They MUST be split because Framer Motion sets inline `opacity: 1` after the variant resolves, and inline styles always win over CSS classes on the same element — putting `opacity-0` on the same element that has `variants={heroItem}` does nothing.

Same shape as the `inert` boolean prop split on the CTA wrapper a few lines above (Wave 3 B5) and the `data-cta-wrap` split on the CTA flex container — all three are cases where one element needs CSS-driven semantics AND framer-motion-driven animation, and the framer's inline styles win unless the concerns live on different elements.

Scroll trigger: `useEffect` listens for `window.scrollY > 40`, sets a `scrolled` boolean, the outer div toggles `opacity-100 ↔ opacity-0 pointer-events-none` with a 300ms transition. `aria-hidden` flips when scrolled so screen readers stop announcing the prompt once it's no longer relevant.

`e2e/functional/hero-skip-and-badge.spec.ts` "Hero scroll-to-explore arrow" reads computed opacity on the closest `.transition-opacity` ancestor — explicitly NOT on the inner element, since framer-motion's inline opacity would leak into that read and produce false-positive passes.

---

## 13. References

- **Design system:** `DESIGN.md` (visual identity, color palette, motion grammar)
- **Voice & content guide:** `skills/voice-to-blog/references/voice-style-guide.md`
- **WSL2 dev rules:** `.claude/rules/hard-reload-dev-servers.md`
- **Operator profile:** repo's `CLAUDE.md` + workspace `CLAUDE.md`
- **Repo:** https://github.com/MalfiRG/the-digital-matrix
- **Hosting:** Vercel (auto from `main`)

---

*Last updated: 2026-04-19 — single-theme consolidation commit `9ad49e1`*
