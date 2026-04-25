# The Digital Matrix — Agent Instructions

## Project Overview

Personal technical blog by **Piotr Tarach**, QA engineer based in Prague. Single visual identity: **Night City** (cyberpunk-gold — yellow primary `#f3e600` + cyan accent + amber learning-state). Reading-mode toggle for blog posts swaps to a cream/dark-text reading theme. Built as a React + TypeScript SPA.

**Repo:** `https://github.com/MalfiRG/the-digital-matrix.git`
**Hosting:** Vercel (auto-deploys from `main`)

## Authoritative documents (lazy-load when relevant)

- **`DESIGN.md`** — visual identity spec (palette HSLs, typography, components, motion grammar, do's/don'ts). Read for ANY UI/styling work before generating code.
- **`ARCHITECTURE.md`** — engineering architecture (routing, content pipeline, motion system internals, hero cascade state machine, testing layers). Read for structural changes.

---

## Git Conventions

- **Never** include `Co-Authored-By` lines in commit messages.

---

## Quick Start

```bash
# Install dependencies (legacy peer deps required due to Radix UI version conflicts)
npm install --legacy-peer-deps

# Dev server (http://localhost:8080)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Test
npm run test
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 18 + TypeScript 5.8 | Path alias `@/ → src/` |
| Bundler | Vite 7 | `@vitejs/plugin-react-swc` |
| Styling | Tailwind CSS 3 + CSS custom properties | Dark Matrix theme via CSS vars |
| Routing | React Router DOM 6 | `BrowserRouter` with `Routes`/`Route` |
| State | React Query (TanStack) | For async state where needed |
| Animations | Framer Motion 12 | Page transitions, staggered lists |
| Markdown | react-markdown + rehype/remark plugins | GFM, syntax highlighting, Mermaid diagrams |
| Icons | Lucide React | UI icons |
| UI Components | shadcn/ui (Radix primitives) | `src/components/ui/` |
| Deployment | Vercel | Auto-deploys from `main` |

---

## Project Structure

```
src/
├── App.tsx                                 # Root: providers (Query, Tooltip, Toast), router
├── main.tsx                                # React DOM render entry
├── components/
│   ├── Navbar.tsx                           # Fixed top nav (desktop + mobile hamburger)
│   ├── NavLink.tsx                          # Reusable nav link component
│   ├── markdown/
│   │   └── MarkdownRenderer.tsx             # Markdown rendering (GFM, syntax highlight, Mermaid, TOC)
│   └── ui/                                  # shadcn/ui component library (~40 components)
├── features/                                # Feature-based modules
│   ├── about/                               # Home page about section + tool badges
│   ├── blog/                                # Blog index + individual post pages (file-based)
│   │   ├── data.ts                          # BlogPost type + blogPosts array
│   │   ├── BlogIndex.tsx                    # Post list with date/tags/excerpt cards
│   │   └── BlogPostPage.tsx                 # Slug-based markdown post rendering
│   ├── how-i-do-it/                         # QA methodology documentation (file-based)
│   │   ├── data.ts                          # HowIDoItPage type + pages array
│   │   ├── HowIDoItIndex.tsx                # Methodology card grid
│   │   └── HowIDoItPage.tsx                 # Individual methodology page rendering
│   ├── projects/                            # Project cards (static data)
│   │   ├── data.ts                          # Project type + projects array
│   │   └── ProjectsList.tsx                 # Project grid with tech badges + links
│   └── skills/                              # Skills + animated progress bars
├── hooks/
│   ├── useMarkdownContent.ts                # Dynamic markdown loading hook (contentMap → slug → content)
│   ├── use-mobile.tsx                       # Mobile breakpoint hook
│   └── use-toast.ts                         # Toast hook
├── lib/
│   └── utils.ts                             # cn() helper (clsx + tailwind-merge)
├── pages/                                   # Thin page wrappers + markdown content
│   ├── Index.tsx                            # Home page
│   ├── BlogIndexPage.tsx                    # → features/blog/BlogIndex
│   ├── BlogSlugPage.tsx                     # → features/blog/BlogPostPage
│   ├── ProjectsPage.tsx                     # → features/projects/ProjectsList
│   ├── SkillsPage.tsx                       # → features/skills/Skills
│   ├── HowIDoItIndexPage.tsx                # → features/how-i-do-it/HowIDoItIndex
│   ├── HowIDoItSlugPage.tsx                 # → features/how-i-do-it/HowIDoItPage
│   ├── NotFound.tsx                         # 404 page
│   └── content/                             # Markdown content files
│       ├── blog/                            # Blog post markdown ({slug}.md)
│       └── how-i-do-it/                     # Methodology pages (5 .md files)
└── test/                                    # Vitest setup + example test
```

---

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:

```
@/ → src/
```

---

## Routes

```
/                    → Index
/projects            → ProjectsPage
/skills              → SkillsPage
/blog                → BlogIndexPage
/blog/:slug          → BlogSlugPage
/how-i-do-it         → HowIDoItIndexPage
/how-i-do-it/:slug   → HowIDoItSlugPage
*                    → NotFound
```

---

## Architecture Decisions

### File-Based Content (No Database)

All content is stored as static data or markdown files — no backend, no database, no CMS.

- **Blog posts**: Markdown files in `src/pages/content/blog/{slug}.md`, metadata in `features/blog/data.ts`
- **Projects**: Static array in `features/projects/data.ts`
- **How I Do It**: Markdown files in `src/pages/content/how-i-do-it/`, metadata in `features/how-i-do-it/data.ts`

Content rendering uses the `useMarkdownContent` hook with a `contentMap` of dynamic `import("path?raw")` calls, paired with `MarkdownRenderer` for rich rendering (GFM, syntax highlighting, Mermaid diagrams, TOC).

### Feature-Based Module Structure

Each feature folder contains its own components and data files. Cross-cutting concerns (hooks, UI, markdown renderer) live in `components/` and `hooks/`. This is the pattern to follow for new features.

### Page Wrapper Pattern

Route-level files in `src/pages/` are thin wrappers that import and render the actual feature component. This separates routing from feature logic.

### Visual Identity & Theme

**Single theme: Night City** (cyberpunk-gold). Yellow primary `#f3e600` (`hsl(57 100% 48%)`) on dark blue background `hsl(222 15% 5%)`, cyan accent `hsl(171 77% 60%)`, amber `--learning` token `hsl(25 95% 55%)` for the in-progress learning state on the Skills page. Ambient effects always on: scanline overlay, scan-sweep line (desktop only — killed on mobile), glitch-hover on nav links + buttons, hero orbs with breathing animation. Reading mode (`.theme-reading` on a descendant div) swaps to a cream/dark-text light palette for blog post bodies.

- **CSS Variables**: Color tokens live in `:root` of `src/index.css` (single-theme — no `.theme-*` class wrappers needed). Reading mode overrides via `.theme-reading` selector.
- **Fonts**: Body = Chakra Petch, h1/h5/h6 = Orbitron, h2/h3/h4 = Rajdhani. Reading mode swaps to Atkinson Hyperlegible.
- **Tailwind**: All custom colors map to CSS vars via `tailwind.config.ts` (e.g., `text-primary`, `bg-learning`, `text-accent`).
- **Stagger variants**: Index.tsx uses `staggerItem` (subtle vertical slide) via `useHeroStaggerVariant()` so the Phase 3 cascade doesn't compete with the heavy headline entrance theater. All other pages use `staggerItemCyber` (horizontal-shift) via `useItemVariant()`.
- MatrixRain component was removed (PR #27) — ambient orbs cover the visual-interest role now.

---

## Content Pipeline (Blog Posts)

This is a blog-first project. The content workflow:

1. **Record** voice dump on a topic
2. **Transcribe** (Speaker + timestamp format) → store in Notion
3. **Transform** via `voice-to-blog` skill → Markdown post + LinkedIn companion
4. **Review** for accuracy, voice fidelity, fact-checking
5. **Publish** → commit `.md` files to repo, Vercel auto-deploys
6. **Promote** → LinkedIn companion post (blog URL in first comment only)

### Blog Post Format

```markdown
---
title: "Post Title"
slug: "post-slug"
date: YYYY-MM-DD
tags: ["tag1", "tag2", "tag3"]
category: "Category"
reading_time: "~7 min"
description: "SEO description"
og_image: "<!-- PLACEHOLDER -->"
draft: true
---

Opening hook paragraph (no "Introduction" header)...

## Section with Personality-Rich Header

Body content — weave insights and opinions into prose (no labeled callout boxes).

Natural closing (no "Conclusion" header)
```

- **Naming**: `YYYY-MM-DD-slug.md` (blog), `YYYY-MM-DD-slug-linkedin.md` (LinkedIn companion)
- **Reading time**: ~5-7 minutes (~1,000-1,800 words)
- **Tone**: Direct, opinionated, metaphor-heavy. NO AI-isms ("delve", "landscape", "it's worth noting").
- **Draft by default**: All posts created with `draft: true`

---

## Development Conventions

### Adding a New Blog Post
1. Create `src/pages/content/blog/{slug}.md`
2. Add entry to `src/features/blog/data.ts` (slug, title, date, tags, excerpt)
3. The `BlogPostPage` contentMap auto-derives imports from the `blogPosts` array
4. Build and verify rendering

### Adding a New Project
1. Add entry to `src/features/projects/data.ts` (title, description, tech_stack, github_url, live_url)

### Adding a New Feature
1. Create `src/features/<feature-name>/` directory
2. Add component + data file
3. Create thin page wrapper in `src/pages/`
4. Add route in `App.tsx`
5. Add navbar menu entry in `Navbar.tsx`

### Styling Rules
- Use CSS variables for Matrix colors (never hardcode hex in components)
- Use Tailwind utility classes for layout, spacing, responsiveness
- Use `framer-motion` for animations
- **Gate animations via `useMotionPolicy()`**, not raw viewport checks. New components needing motion gating MUST destructure `animationsDisabled` from `useMotionPolicy()` in `@/lib/motion`. Do NOT re-implement device detection inline (`window.innerWidth < 768` style). Do NOT compare to literal breakpoint values in component code. Spec: `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md`.

---

## Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Root component — providers, router |
| `src/components/Navbar.tsx` | Top navigation (desktop + mobile) |
| `src/components/markdown/MarkdownRenderer.tsx` | Markdown rendering with Mermaid, TOC, syntax highlight |
| `src/hooks/useMarkdownContent.ts` | Dynamic markdown loading hook |
| `src/features/blog/data.ts` | Blog post metadata array |
| `src/features/blog/BlogPostPage.tsx` | Blog post rendering (slug → markdown) |
| `src/features/projects/data.ts` | Projects static data |
| `src/features/how-i-do-it/data.ts` | Reference pattern for feature data files |
| `vite.config.ts` | Build config — SWC plugin, path alias |

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_MOTION_OVERRIDE` | Forces motion policy to `on`/`off` for every visitor (build-time default). Per-browser `localStorage["digital-matrix-motion-override"]` wins over this. See `src/lib/motion-config.ts` for the layered precedence and `.env` for usage notes. | No |
| `VITE_VERCEL_ENV` | Bridged from Vercel's `VERCEL_ENV` by the build script. Drives the three-tier blog visibility logic (`production` hides drafts; `preview` shows them; `development` shows them). Do not set manually — the bridge is handled automatically. | No (set by build script) |

### Blog post visibility tiers

Posts marked `draft: true` in `src/features/blog/data.ts` are gated by **three** environments:

| Environment | `import.meta.env.PROD` | `VITE_VERCEL_ENV` | Drafts visible? |
|---|---|---|---|
| `npm run dev` | `false` | (anything) | Yes |
| `npm run build` (local) | `true` | unset | Yes (treated as preview) |
| Vercel preview deploy (PR URLs) | `true` | `preview` | Yes |
| Vercel production deploy (main domain) | `true` | `production` | **No** |

Implementation: `detectVisibilityMode` in `src/features/blog/data.ts` maps the env to a mode, `getVisiblePosts` filters drafts only when mode === "production". The `package.json` build script bridges `VERCEL_ENV` (Vercel-injected) to `VITE_VERCEL_ENV` (Vite-readable) at build time.

### Author override — quick reference

To preview animations on mobile/tablet from your own browser without changing config or redeploying:

1. Open the site (any environment), F12 → Console
2. `localStorage.setItem("digital-matrix-motion-override", "on")` then reload
3. To revert: `localStorage.removeItem("digital-matrix-motion-override")` then reload

This is a per-browser, per-origin tool — it never affects other visitors.

### Author override — quick reference

To preview animations on mobile/tablet from your own browser without changing config or redeploying:

1. Open the site (any environment), F12 → Console
2. `localStorage.setItem("digital-matrix-motion-override", "on")` then reload
3. To revert: `localStorage.removeItem("digital-matrix-motion-override")` then reload

This is a per-browser, per-origin tool — it never affects other visitors.

---

## Known Considerations

- `npm install --legacy-peer-deps` is required due to Radix UI peer dependency conflicts
- Dev server runs on port 8080 (not default 5173)
- Polish character transliteration is handled in `MarkdownRenderer.tsx` slug generation (ą→a, ć→c, etc.)
