# SIGNAL_NOISE

Personal technical blog and portfolio for **Piotr Tarach**, QA engineer based in Prague. Voice-first content pipeline + React SPA with cyberpunk-gold (Night City) visual identity. Reading-mode toggle for blog posts.

**Live:** https://piotrtarach.dev
**Repo:** https://github.com/MalfiRG/signal-noise

## Tech Stack

| Layer        | Technology                          | Notes                                          |
|--------------|-------------------------------------|------------------------------------------------|
| Framework    | React 18 + TypeScript 5.8           | Path alias `@/` → `src/`                       |
| Bundler      | Vite 7 + `@vitejs/plugin-react-swc` | SWC for fast transforms                        |
| Routing      | React Router DOM 6                  | `BrowserRouter` + `Routes`/`Route`             |
| State        | React Query (TanStack)              | Async state where needed (minimal usage)       |
| Animations   | Framer Motion 12                    | Page transitions, staggered lists              |
| Markdown     | react-markdown + rehype/remark      | GFM, Prism syntax, Mermaid, TOC, slug-from-id  |
| Icons        | Lucide React                        | UI iconography                                 |
| UI Components| shadcn/ui (Radix primitives)        | Sheets, dropdowns, tabs                        |
| Styling      | Tailwind CSS 3 + CSS custom properties | All colors via `:root` tokens                |
| Theme        | next-themes (single theme: cyberpunk-gold) | `attribute="class"` on `<html>`         |
| Deployment   | Vercel                              | Includes Analytics + Speed Insights            |

## Quick Start

```bash
npm install --legacy-peer-deps   # Radix UI peer dep conflicts require this
npm run dev                       # Dev server on http://localhost:8080 (NOT 5173)
npm run build                     # Production build → dist/
npm run preview                   # Serve dist/ locally
npm run lint
npm run test
```

## Documentation Map

| Doc | Role |
|---|---|
| [`docs/DESIGN.md`](docs/DESIGN.md) | Visual identity (Google Stitch spec format) — palette, typography, motion, components, do's/don'ts. Read for ANY UI/styling work. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Engineering architecture — routing, content pipeline, motion system internals, hero cascade state machine, testing layers, implementation notes (the WHY-host per workspace-global rule). |
| [`CLAUDE.md`](CLAUDE.md) | Agent instructions — authoritative-doc routing manifest, ambiguity-resolution rule, env vars, known gotchas. |
| [`docs/superpowers/specs/`](docs/superpowers/specs/) | Pre-implementation design specs (HARD SPEC tier). |
| [`docs/superpowers/plans/`](docs/superpowers/plans/) | Implementation plans (TDD-style, per-task). |
| [`e2e/`](e2e/) | Playwright suite — smoke / functional / visual tiers (see `ARCHITECTURE.md §9`). |

