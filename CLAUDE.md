# The Digital Matrix — Agent Instructions

## Project Overview

Personal technical blog by **Piotr Tarach** (QA engineer at [redacted-employer]). Matrix-inspired aesthetic with digital rain background. Built as a React + TypeScript SPA.

**Repo:** `https://github.com/MalfiRG/the-digital-matrix.git`
**Hosting:** Vercel (auto-deploys from `main`)

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
│   ├── MatrixRain.tsx                       # Canvas digital rain effect
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

### Matrix Visual Identity

The entire UI is themed around The Matrix aesthetic:
- **MatrixRain**: Canvas-based falling characters (Katakana + Latin + numbers)
- **Glow effects**: Text shadows using Matrix green palette
- **CSS Variables**: `--matrix-primary` (#22b455 green), `--matrix-bg` (#111), etc.
- All custom styles in the global CSS using Tailwind `@layer` directives

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

Body content with callouts:

> **💡 Key Insight:** Important takeaway
> **🔥 Hot Take:** Opinionated stance
> **⚙️ Tech Note:** Technical detail

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
| (none currently) | | |

---

## Known Considerations

- `npm install --legacy-peer-deps` is required due to Radix UI peer dependency conflicts
- Dev server runs on port 8080 (not default 5173)
- Polish character transliteration is handled in `MarkdownRenderer.tsx` slug generation (ą→a, ć→c, etc.)
- `lovable-tagger` plugin runs in dev mode only (component tagging)
