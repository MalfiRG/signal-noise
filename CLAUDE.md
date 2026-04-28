# The Digital Matrix — Agent Instructions

## Project Overview

Personal technical blog by **Piotr Tarach**, QA engineer based in Prague. Single visual identity: **Night City** (cyberpunk-gold). React + TypeScript SPA on Vercel.

**Repo:** `https://github.com/MalfiRG/the-digital-matrix.git` | **Hosting:** Vercel (auto from `main`).

---

## Authoritative documents (lazy-load when relevant)

The architecture-tier docs are the canonical source of truth for their respective domains. Read them on demand for the kind of work you're doing.

- **`README.md`** — project pitch, **canonical Tech Stack table**, Quick Start, doc map. Read FIRST when discovering the repo.
- **`DESIGN.md`** — visual identity (Google Stitch DESIGN.md format, alpha). Read for ANY UI/styling work BEFORE generating code. Sections: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts (+ extensions: Motion, References).
- **`ARCHITECTURE.md`** — engineering architecture (13 sections, numbering frozen):
  - **§1** System Overview · **§2** Directory Structure · **§3** Routing · **§4** Content Pipeline
  - **§5** Styling Architecture · **§6** Motion Design System · **§7** Hero Cascade Architecture
  - **§8** Build & Deploy · **§9** Testing Architecture · **§10** Key Abstractions
  - **§11** Conventions & Rules · **§12** Implementation Notes (the WHY-host) · **§13** References
- **`docs/superpowers/specs/`** — pre-implementation HARD SPECs.
- **`docs/superpowers/plans/`** — implementation plans (TDD-style).

---

## Resolving ambiguity (READ BEFORE "fixing" anything that looks weird)

When you encounter a pattern in this repo that looks wrong, redundant, or over-engineered:

1. **Search `ARCHITECTURE.md §12 Implementation Notes` first.** Most surprising patterns are documented there as deliberate, load-bearing decisions. Examples: `inert` instead of `aria-hidden+tabindex+pointer-events`; SKIP button as direct child of top-level fragment; double-rAF settle in the visual-determinism fixture; `setTimeout(..., 0)` for focus-after-unmount; `try/catch` on `localStorage.getItem`; `next-themes` provider despite single-theme (covered in §5 — kept as a routing anchor since `next-themes` is the most common "why is this still here?" question).
2. **Search by symbol or filename, not by line.** §12 references `useMotionPolicy`, `readAuthorOverride`, `gotoFreshCascade`, `freezeAnimationsViaInitScript`, etc. — names are stable; line numbers are not.
3. **One-liner inline comments are breadcrumbs, not explanations.** A comment like `// Wave 3 B2 stacking-context` or `// spec §5.3` points to a §12 subsection or a `docs/superpowers/specs/*.md` file. Don't strip them; follow them.
4. **If a pattern looks load-bearing but isn't in §12, check `git log -p <file>` for the introducing commit.** Most have descriptive conventional-commit messages.
5. **If still unclear, ASK before changing.** Reverting a deliberate fix in good faith has asymmetric cost — the original bug returns silently.

This rule is the consumer side of the workspace-global policy `~/.claude/rules/docs-over-code-comments.md`.

---

## Git Conventions

`→ ARCHITECTURE.md §11`. Highlight: **never** include `Co-Authored-By` lines in commits.

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_MOTION_OVERRIDE` | Forces motion policy `on`/`off` for every visitor (build-time default). Per-browser `localStorage["digital-matrix-motion-override"]` wins over this. See `src/lib/motion-config.ts`. | No |
| `VITE_VERCEL_ENV` | Bridged from Vercel's `VERCEL_ENV` by the build script. Drives blog visibility tiers (`production` hides drafts; `preview`/`development` show them). Do not set manually. | No (auto) |

### Blog post visibility tiers

Posts marked `draft: true` in `src/features/blog/data.ts` are gated by three environments:

| Environment | `import.meta.env.PROD` | `VITE_VERCEL_ENV` | Drafts visible? |
|---|---|---|---|
| `npm run dev` | `false` | (anything) | Yes |
| `npm run build` (local) | `true` | unset | Yes (treated as preview) |
| Vercel preview deploy | `true` | `preview` | Yes |
| Vercel production deploy | `true` | `production` | **No** |

Implementation: `detectVisibilityMode` in `src/features/blog/data.ts`.

### Author override — quick reference

To preview animations on mobile/tablet from your own browser without changing config or redeploying:

1. Open the site (any environment), F12 → Console
2. `localStorage.setItem("digital-matrix-motion-override", "on")` then reload
3. To revert: `localStorage.removeItem("digital-matrix-motion-override")` then reload

Per-browser, per-origin tool — never affects other visitors. Full control-plane explanation: `→ ARCHITECTURE.md §12 / Motion override precedence`.

---

## Agent Prompt Guide

Quick palette + ready-to-use prompts for new component generation. Migrated from DESIGN.md (Stitch spec doesn't host agent-prompts).

### Quick color reference (copy into prompts)

```
Night City palette:
- Primary: #f3e600 (yellow, hsl 57 100% 48%)
- Accent:  #52e3c8 (cyan, hsl 171 77% 60%)
- Learning: #f78a1a (amber, hsl 25 95% 55%)
- Background: #0b0d12 (near-black, hsl 222 15% 5%)
- Foreground: #f5e9a3 (warm cream-yellow, hsl 57 80% 82%)
- Border: #1d2436 (dark slate, hsl 222 30% 16%)
```

### Ready-to-use prompts

**For new component generation:**
> Generate a [component] for The Digital Matrix blog. Use Night City palette: primary=yellow `text-primary`, accent=cyan `text-accent`, never amber-500 (use `text-learning` if in-progress). Wrap interactive elements in `btn-interactive glitch-hover` (set `data-text` attr). Use Tailwind utilities exclusively — no hardcoded colors. Body font defaults to Chakra Petch; headings use `font-display` (Orbitron) for h1, `font-heading` (Rajdhani) for h2/h3/h4.

**For new page entrance:**
> Use `useItemVariant()` from `@/lib/motion` for stagger items (NOT `staggerItem` directly — bypasses mobile/reduced-motion guards). Wrap stagger children in a `motion.div` with `staggerContainer` variants. For hero pages with their own entrance theater, use `useHeroStaggerVariant()` instead.

**For ambient effects on a new full-page route:**
> Add `<div className="scanline-overlay scan-sweep" />` at App level when `!isTextSection`. Add a glow orb pair in opposite corners with `blur-3xl` + `mix-blend-mode: screen` + `--hero-orb-primary` / `--hero-orb-accent` colors + `animate-hero-glow-slow` / `animate-hero-glow-slower` keyframes.

---

## Known Considerations

- `npm install --legacy-peer-deps` is required (Radix UI peer dep conflicts).
- Dev server runs on port 8080 (NOT default 5173).
- Polish character transliteration in `MarkdownRenderer.tsx:customSlugify` (ą→a, ć→c, etc.).
- Path alias `@/` → `src/` (configured in `tsconfig.json` + `vite.config.ts`).
