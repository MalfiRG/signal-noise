# DESIGN.md — The Digital Matrix

> AI-agent-readable design system spec for Piotr Tarach's personal blog and portfolio. Optimized for coding agents (Claude, Stitch, etc.) to generate UI consistent with the established visual identity.

---

## 1. Visual Theme & Atmosphere

**Identity name:** Night City (cyberpunk-gold).
**Origin:** Cyberpunk 2077 palette grammar — yellow primary + cyan accent + amber learning-state on near-black backgrounds.
**Mood:** Mechanical, decisive, terminal-aesthetic. Reads as "system boot sequence" rather than "polished SaaS." The site should feel like a cyberdeck UI — every surface has weight, every motion has function, every word has bite.
**Density:** Spacious. Generous letter-spacing on labels, wide line-height on body, single-column on mobile. No cramped layouts; the eye should travel.
**Polish dial:** 4-5/10. Not glossy. Hand-built, opinionated, occasional rough edges preserved.

**Anti-themes** (do NOT generate):
- "Modern minimalist SaaS" (Stripe, Vercel marketing) — too generic, too friendly
- "Apple HIG / Material Design 3" — too polite
- "Brutalist / Web 1.0" — too retro-ironic
- Any pastel palette
- Any centered-card-with-blurred-gradient hero

---

## 2. Color Palette & Roles

All colors live as HSL CSS custom properties on `:root` in `src/index.css`. Tailwind utilities (`text-primary`, `bg-accent`, `text-learning`) map to these via `tailwind.config.ts`.

### Dark theme (default — Night City)

| Semantic role          | CSS var                | HSL                  | Hex      | Usage                                                  |
|-----------------------|-----------------------|---------------------|----------|--------------------------------------------------------|
| Background            | `--background`         | `222 15% 5%`        | `#0b0d12`| Page background, cards baseline                        |
| Foreground            | `--foreground`         | `57 80% 82%`        | `#f5e9a3`| Body text on dark surfaces                             |
| **Primary (yellow)**  | `--primary`            | `57 100% 48%`       | `#f3e600`| Headlines, CTA borders, active nav, scrollbar hover    |
| Primary foreground    | `--primary-foreground` | `222 15% 5%`        | `#0b0d12`| Text on yellow surfaces                                |
| **Accent (cyan)**     | `--accent`             | `171 77% 60%`       | `#52e3c8`| Glitch hover overlay, secondary highlights, link hover |
| **Learning (amber)**  | `--learning`           | `25 95% 55%`        | `#f78a1a`| In-progress skill bars, "still acquiring" state ONLY   |
| Card                  | `--card`               | `222 15% 8%`        | `#11141a`| Card surfaces, popovers                                |
| Secondary             | `--secondary`          | `222 20% 14%`       | `#1d2230`| Tabs background, subtle backgrounds                    |
| Muted                 | `--muted`              | `222 15% 15%`       | `#1f2329`| Disabled surfaces                                      |
| Muted foreground      | `--muted-foreground`   | `222 30% 55%`       | `#7080a4`| De-emphasized text, captions, "INITIALIZING SYSTEM"   |
| Border                | `--border`             | `222 30% 16%`       | `#1d2436`| All separators, default card borders                   |
| Destructive           | `--destructive`        | `0 84% 60%`         | `#ef4444`| Errors only — never decorative                         |

### Reading mode (blog post bodies — `.theme-reading` on descendant div)

Cream-paper palette for long-form reading. Triggered on `/blog/:slug` and `/how-i-do-it/:slug` routes via `App.tsx:isReadingMode` regex.

| Role               | HSL                | Notes                                              |
|--------------------|--------------------|----------------------------------------------------|
| Background         | `30 15% 88%`       | Warm cream                                         |
| Foreground         | `30 10% 15%`       | Near-black ink                                     |
| Primary            | `30 20% 30%`       | Muted brown for links/headings                     |
| Border             | `30 10% 78%`       | Soft separators                                    |
| Learning           | `25 60% 35%`       | Darker amber for cream-bg readability              |

Code blocks inside reading mode stay dark (Tomorrow Night palette via Prism) for contrast.

### Color usage rules

- **Yellow primary** — scarce. Reserve for the SINGLE most important element on screen (active nav, headline, primary CTA). If everything is primary, nothing is.
- **Cyan accent** — decorative. Glitch overlays, hover states, ambient effects (orbs, scan-sweep). Never as primary text color (poor contrast on dark bg).
- **Amber learning** — exclusively for "still acquiring" state (Learning tab + bars on Skills page). Do NOT use for active/selected states (collides with primary semantics).
- **NEVER hardcode color hex/HSL in components.** Always use Tailwind utility (`text-primary`, `bg-accent`) or `hsl(var(--token))` in CSS. Hardcoded colors break theme cohesion.

---

## 3. Typography Rules

| Use                        | Font family                | Weight  | Tailwind utility | Notes                                          |
|----------------------------|----------------------------|---------|------------------|------------------------------------------------|
| **Body (default)**         | Chakra Petch               | 400-500 | (default)        | Geometric sans, light cyber feel               |
| **H1 / H5 / H6**           | Orbitron                   | 400-900 | `font-display`   | Wide, technical, futuristic. Used for hero & section openers |
| **H2 / H3 / H4**           | Rajdhani                   | 500-700 | `font-heading`   | Condensed cyber-sans. Subheadings              |
| **Monospace** (code, badges) | Share Tech Mono            | 400     | `font-mono`      | CRT terminal font. Used for code, the `> INITIALIZING SYSTEM...` label, badges |
| **Reading mode body**      | Atkinson Hyperlegible      | 400-700 | (auto in `.theme-reading`) | Maximum readability; replaces Chakra Petch in reading mode |

### Hierarchy table

| Level   | Size (desktop)              | Weight  | Tracking               | Line height |
|---------|----------------------------|---------|------------------------|-------------|
| Hero h1 | `text-5xl md:text-7xl`     | `font-black` (900) | normal | tight        |
| h2      | `text-2xl - text-3xl`      | 700     | normal                 | 1.3-1.4     |
| h3      | `text-xl`                  | 600     | normal                 | 1.4         |
| Body    | `text-base` (16px)         | 400     | normal                 | 1.7         |
| Subhead | `text-sm`                  | 400-500 | `tracking-widest`      | normal      |
| Label   | `text-xs`                  | 400     | `tracking-[0.2em]` to `tracking-[0.3em]` | normal |
| Code    | `text-sm` (0.875rem)       | 400     | normal                 | 1.6         |

### Typography rules

- **All-caps + wide tracking** for nav links and labels (`tracking-widest`, `tracking-[0.3em]`). Never all-caps without tracking — looks shouty.
- **Headlines should glow** — apply `.text-glow` utility (text-shadow from `--matrix-text-glow` var). Skip on mobile (`@media max-width:640px` softens the glow).
- **No typographic shrugs.** Don't write "Title Case Like This" — pick all-caps for headlines+labels, sentence case for body. Title Case is corporate.
- **Reading mode swaps** to Atkinson Hyperlegible globally for blog post bodies. Code blocks keep Share Tech Mono.

---

## 4. Component Stylings

### Buttons

Two variants on the home page hero:

**Primary CTA** (`VIEW PROJECTS` style):
```html
border border-primary/50 bg-primary/10 px-8 py-3 text-sm tracking-widest
text-primary hover:bg-primary/20 hover:border-primary
transition-all box-glow btn-interactive glitch-hover
```
- Outline button with primary-tinted fill (10% opacity)
- Yellow border at 50% opacity, brightens on hover
- `box-glow` adds yellow glow via `--matrix-glow` var
- `btn-interactive` adds 1px lift + glow on hover, instant settle on active
- `glitch-hover` adds the chromatic aberration text-glitch on hover (data-text attribute required)

**Secondary CTA** (`READ BLOG` style):
```html
border border-border px-8 py-3 text-sm tracking-widest
text-muted-foreground hover:border-primary/50 hover:text-foreground
transition-all btn-interactive glitch-hover
```
- Subtle outline, no fill
- Muted text, brightens to foreground on hover, border picks up primary tint

### Nav links (top navbar)

```html
text-sm tracking-widest transition-colors hover:text-primary
nav-link-motion glitch-hover
[active]:text-primary text-glow
```
- Active link gets the glow
- `nav-link-motion` adds the underline-grow indicator on hover
- `glitch-hover` always on (single-theme reality)

### Cards (Project cards, blog cards, skill rows)

```html
bg-card border border-border rounded-md p-6
hover:border-primary/50 transition-colors
neon-border-trace
```
- `--radius` is `0.25rem` — sharp corners are intentional
- `neon-border-trace` adds the rotating gradient border on hover (CSS `@property --border-angle`)

### Theme dot / social icon (the corner button pattern)

```html
w-5 h-5 rounded-full border-2 p-2.5 box-content
transition-all duration-200
border-transparent opacity-50 hover:opacity-80
inline-flex items-center justify-center text-foreground
```
- 20×20 content + 10px box-content padding = 44×44 touch target (WCAG 2.5.8)
- Used for GitHub/LinkedIn icons in navbar (replaces former theme dots)

### Tabs (Skills page)

- Container: `bg-secondary/50 border border-border` — subtle inset feel
- Active SKILLS tab: `text-primary text-glow` (yellow)
- Active LEARNING tab: `text-learning` (amber) — distinct semantic slot

### Code blocks (in markdown)

- Wrapped in `.code-block-wrapper` with scroll shadows (left/right gradients fade in when content overflows horizontally)
- Tomorrow Night Prism palette
- Language badge in top-right (`.code-lang-badge`)
- Copy button (`button[aria-label="Copy code"]`)
- Reading mode keeps the dark background (preserves contrast)

---

## 5. Layout Principles

### Spacing scale (Tailwind)

Default Tailwind 4px scale (1=4px, 2=8px, 4=16px, 6=24px, 8=32px, 12=48px, 16=64px). Stick to this — no `gap-[7px]`. Section padding: `py-16` desktop, `py-12` mobile.

### Grid system

- Container: `container mx-auto max-w-4xl` for content pages; `max-w-3xl` for hero text
- Skills/Projects: `grid-cols-1 md:grid-cols-2 gap-6`
- Blog post layout (desktop): `lg:grid-cols-[1fr_240px]` (content + TOC sidebar)

### Whitespace philosophy

**Generous vertical rhythm.** Hero takes full viewport (`min-h-screen`). Sections have `py-16+` of breathing room. Body text `leading-relaxed` (1.625) or `leading-7` (1.75) for long-form.

**Tight horizontal grouping.** Related items get `gap-1.5` (icon dots) or `gap-2` (badges). Unrelated items get `gap-6+`.

### Z-index hierarchy

| Layer                | z-index      | Notes                              |
|---------------------|--------------|------------------------------------|
| Page content        | `z-20`       | Default for foreground content     |
| Scanline overlay    | `z-10`       | Behind content, in front of bg     |
| Navbar              | `z-50`       | Always on top                      |
| Reduce-motion badge | `z-50`       | Bottom-right corner                |
| Scan-sweep line     | `9998`       | Above content but below dropdowns  |
| Scanline pattern    | `9999`       | Topmost ambient effect             |

---

## 6. Depth & Elevation

This is a flat design with **glow as the depth metaphor**. No traditional shadows on cards or surfaces.

| Effect              | Source                               | When to use                                  |
|---------------------|--------------------------------------|----------------------------------------------|
| `--matrix-glow`     | `0 0 20px hsl(primary/0.5), 0 0 40px hsl(primary/0.2)` | Active CTAs, hero box-glow      |
| `--matrix-text-glow`| `0 0 10px hsl(primary/0.8)`         | Headlines (`.text-glow` class)               |
| Hover lift          | `translateY(-1px)` + box-glow       | Interactive buttons (`.btn-interactive`)     |
| Hero orbs           | `blur-3xl` + `mix-blend-mode: screen` | Background ambiance only                     |
| Neon border trace   | Animated gradient via `@property`    | Card hover                                   |

**Rule:** glow intensity is softened on mobile via `@media (max-width:640px)` — strong glows feel harsh on small viewports close to the eye.

---

## 7. Motion Design

Two timing systems coexist (deliberate trade-off, see ARCHITECTURE.md §Motion):
- **JS constants** (`src/lib/motion.ts`) — Framer Motion variants for entrance/transition
- **CSS custom properties** (`src/index.css`) — `--motion-instant`, `--motion-fast`, `--motion-normal` for hover/ambient effects

### Easing grammar (semantic mapping)

When choosing an easing curve, **pick by what the element represents**, not by what looks pretty:

| Curve                                     | Reads as                | Use for                                                  |
|-------------------------------------------|-------------------------|----------------------------------------------------------|
| `linear`                                  | machine procedure       | "INITIALIZING SYSTEM" letter cascade, loaders, meters    |
| `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out-expo`) | object arriving         | Default entrance — content blocks, paragraphs, cards     |
| `cubic-bezier(0.34, 1.56, 0.64, 1)` (`--ease-out-back`) | physical impact         | Stamp/landing moments (PROVE IT)                         |
| `steps(4)` / `steps(6)` / `steps(8)`      | broken signal / glitch  | Cyberpunk glitch effects, scan-sweep                     |
| `ease-in`                                 | departure / wind-up     | Element exits, dismissals                                |

### Hero cascade (home page only — `Index.tsx`)

Three-phase entrance theater. **Skip on return visit** via `sessionStorage["hero-cascade-played"]`.

| Phase | Timing (ms) | Element                              | Effect                                    |
|-------|-------------|--------------------------------------|-------------------------------------------|
| 1     | 200         | `> INITIALIZING SYSTEM...`           | Linear letter-reveal cascade              |
| 2     | 2000        | BREAK IT (glitch entrance)           | Chromatic aberration + brightness flash   |
| 2+1000| 3000        | BUILD IT (LetterReveal)              | Letter-by-letter reveal                   |
| 2+2200| 4200        | PROVE IT (stamp)                     | Blur + scale overshoot + settle           |
| 3     | 6000        | Subtitle, buttons, scroll hint       | Stagger entrance (subtle vertical slide)  |

Reduced-motion (`prefers-reduced-motion: reduce`) compresses to 100/600/1200ms with no animations beyond opacity.

### Subtle vs cyber stagger variants

- **Hero subtitle/buttons** use `staggerItem` (subtle vertical slide + blur) via `useHeroStaggerVariant()` — doesn't compete with the heavy headline theater above.
- **All other pages** use `staggerItemCyber` (horizontal shift + brightness flash) via `useItemVariant()` — more dramatic for first-impression of a new page.
- Both hooks respect mobile viewport (`staggerItemMobile` — opacity only) and reduced-motion (`reducedVariant` — instant).

### Ambient effects (always-on, suppressed on text routes)

- **Scanline overlay** — repeating-gradient horizontal lines, `position: fixed`, low opacity. Always on except `/blog`, `/how-i-do-it` (suppressed via `App.tsx:isTextSection`).
- **Scan-sweep** — single horizontal line traveling top→bottom every 6s. Desktop only (suppressed on mobile via `@media`).
- **Hero orbs** — two large `blur-3xl` divs in opposite corners, breathing animation (`hero-glow` keyframe, 8s + 11s offset). Always on at all viewport sizes.

---

## 8. Do's and Don'ts

### DO

- ✅ Use the `--learning` token for in-progress skill state (preserves info hierarchy)
- ✅ Wrap interactive elements in `btn-interactive` for consistent hover lift
- ✅ Apply `glitch-hover` to nav + CTA buttons (always-on cyber theme; no conditional)
- ✅ Use `text-glow` on the primary headline of every section
- ✅ Soften ambient effects on mobile via `@media (max-width:640px)` overrides
- ✅ Set `data-text` attribute on every element using `glitch-hover` or `hero-glitch-entrance` (the pseudo-elements read it)
- ✅ Use 44×44px touch targets for all mobile-tappable elements (WCAG 2.5.8)
- ✅ Reserve PROVE IT–style stamp impact for ONE element per page max

### DON'T

- ❌ Hardcode hex/HSL colors in components — use Tailwind utilities or `hsl(var(--token))`
- ❌ Use `text-amber-500` / `bg-amber-500` Tailwind utilities — use `text-learning` / `bg-learning` instead (matches Night City palette)
- ❌ Add `Co-Authored-By: Claude` to commits (project rule)
- ❌ Use Title Case for headlines — choose all-caps + wide tracking, OR sentence case
- ❌ Use the cyan accent for primary text color (poor contrast on dark bg)
- ❌ Stack heavy entrance animations (cyber stagger + glitch + stamp simultaneously) — pick subtle stagger if the page already has theater
- ❌ Use `Co-Authored-By` lines, callout boxes (`> **Key Insight:**`), or "delve" / "landscape" / "it's worth noting" / "let's dive in" AI-isms in blog posts
- ❌ Use scan-sweep on mobile (re-enabled = distracting at small viewports)
- ❌ Use `font-mono` on body — body is `Chakra Petch` (sans), `font-mono` is for code/badges only

---

## 9. Responsive Behavior

### Breakpoints (Tailwind defaults)

| Token   | Min-width | Notes                                       |
|---------|-----------|---------------------------------------------|
| `sm`    | 640px     | Hero orbs threshold (now: always on)        |
| `md`    | 768px     | Mobile nav → desktop nav switch             |
| `lg`    | 1024px    | Sidebar TOC appears on blog post pages      |
| `xl`    | 1280px    | Container padding stops growing             |

### Mobile-first overrides

- **Glow intensity** softened (`--matrix-text-glow: 0 0 6px ...` vs `0 0 10px`)
- **Scan-sweep** killed (single CSS rule in mobile @media)
- **Glitch-hover pseudo-elements** killed (no hover on touch devices, hero glitch animation kept)
- **Hero stamp** animation duration shortened (0.6s vs 1s)
- **Stagger items** swap to `staggerItemMobile` (opacity-only, no transform/blur)

### Touch targets

- Hamburger: 44×44 minimum (`min-h-[44px] min-w-[44px]` on the button)
- All nav items in mobile sheet: `min-h-[48px]`
- EXPLORER button on blog: `min-h-[44px]` + `affordance-pulse` animation to signal tappability

### Collapse strategies

- **Desktop nav (`hidden md:flex`)** ↔ **Mobile sheet (`md:hidden`)** — hard switch at `md` breakpoint, no transition
- **Blog TOC sidebar (`hidden lg:block`)** ↔ **Mobile EXPLORER button + drawer** — sidebar disappears below `lg`, EXPLORER button + Sheet drawer takes over
- **Hero text scaling** — `text-5xl md:text-7xl` (from 48px → 72px at md+)

---

## 10. Agent Prompt Guide

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
> Use `useItemVariant()` from `@/lib/motion` for stagger items (NOT `staggerItem` directly — bypasses mobile/reduced-motion guards). Wrap stagger children in a `motion.div` with `staggerContainer` variants. Initial state `hidden`, animate to `visible` on phase ready. For hero pages with their own entrance theater, use `useHeroStaggerVariant()` instead (subtle, doesn't compete).

**For ambient effects on a new full-page route:**
> Add `<div className="scanline-overlay scan-sweep" />` at App level when `!isTextSection`. Add a glow orb pair in opposite corners with `blur-3xl` + `mix-blend-mode: screen` + `--hero-orb-primary` / `--hero-orb-accent` colors + `animate-hero-glow-slow` / `animate-hero-glow-slower` keyframes.

---

## 11. References

- **Codebase:** `https://github.com/MalfiRG/the-digital-matrix`
- **Architecture:** see `ARCHITECTURE.md` (component tree, routing, motion system internals)
- **Tone & voice (for blog content):** see `skills/voice-to-blog/references/voice-style-guide.md`
- **DESIGN.md convention:** Google Stitch / VoltAgent collection (https://github.com/VoltAgent/awesome-design-md)
- **WCAG 2.5.8 touch targets:** 44×44px minimum, met across all interactive elements
- **Cyberpunk 2077 palette grammar:** yellow + orange + cyan canonical, on near-black backgrounds

---

*Last updated: 2026-04-19 — single-theme consolidation commit `9ad49e1`*
