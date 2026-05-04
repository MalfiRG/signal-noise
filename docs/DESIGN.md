---
version: alpha
name: Night City
description: >
  Cyberpunk-gold (Cyberpunk 2077 palette grammar) personal blog and portfolio
  for Piotr Tarach. Yellow primary + cyan accent + amber learning-state on
  near-black backgrounds. Mechanical, decisive, terminal-aesthetic — reads as
  "system boot sequence" rather than "polished SaaS".
colors:
  primary: "#f3e600"
  primary-foreground: "#0b0d12"
  accent: "#52e3c8"
  learning: "#f78a1a"
  background: "#0b0d12"
  foreground: "#f5e9a3"
  card: "#11141a"
  secondary: "#1d2230"
  muted: "#1f2329"
  muted-foreground: "#7080a4"
  border: "#1d2436"
  destructive: "#ef4444"
  reading-background: "#dbd0c4"
  reading-foreground: "#2b2722"
  reading-primary: "#5c5246"
  reading-border: "#cbc5be"
  reading-learning: "#8e5e22"
typography:
  hero-h1:
    fontFamily: Orbitron
    fontSize: 4.5rem
    fontWeight: 900
    lineHeight: 1.1
  h2:
    fontFamily: Rajdhani
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.3
  h3:
    fontFamily: Rajdhani
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Chakra Petch
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  reading-body:
    fontFamily: Atkinson Hyperlegible
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  subhead:
    fontFamily: Chakra Petch
    fontSize: 0.875rem
    fontWeight: 400
    letterSpacing: 0.1em
  label-caps:
    fontFamily: Chakra Petch
    fontSize: 0.75rem
    fontWeight: 400
    letterSpacing: 0.3em
  code:
    fontFamily: Share Tech Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 4px
  full: 9999px
spacing:
  base: 16px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  section-y-mobile: 48px
  section-y-desktop: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-secondary-hover:
    textColor: "{colors.foreground}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.sm}"
    padding: 24px
  nav-link:
    textColor: "{colors.foreground}"
  nav-link-active:
    textColor: "{colors.primary}"
  tab-active:
    textColor: "{colors.primary}"
  tab-active-learning:
    textColor: "{colors.learning}"
  code-block:
    backgroundColor: "#2d2d2d"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
  code-inline:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
---

# DESIGN.md — SIGNAL_NOISE

> AI-agent-readable design system spec for Piotr Tarach's personal blog and portfolio. Optimized for coding agents (Claude, Stitch, etc.) to generate UI consistent with the established visual identity.

---

## Overview

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

## Colors

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

## Typography

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

## Layout

Layout combines spacing scale, grid system, whitespace philosophy, z-index hierarchy, and responsive collapse strategies.

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

### IdStrip responsive balance

`.id-strip` (`src/index.css`) uses `justify-content: center` so when content wraps on phone-portrait, all rows are centered (symmetric) instead of left-aligned. A `@media (max-width: 480px)` block tightens font-size 10→8px, gap 18→6px, letter-spacing 0.22em→0.12em, padding 6×14→5×8 — combined, four segments (NODE / OP / TS / UTC) fit on one row at 375px and `SEC: OK` lands centered on row 2.

The hero `<section>` itself uses `flex items-start md:items-center` (`Index.tsx`) so on mobile portrait the IdStrip sits right under the navbar (top-aligned) instead of being centered with ~150px of dead space above. Desktop keeps the dramatic vertically-centered cascade because `min-h-screen` provides the slack `items-center` needs to feel intentional.

---

## Elevation & Depth

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

## Shapes

The shape language is sharp — `--radius: 0.25rem` (4px) on cards and buttons. Pill / circular forms (`rounded-full`) are reserved for the corner-button pattern (theme dot, social icons) and the hero glow orbs.

| Token       | Value    | Used for                                              |
|-------------|----------|-------------------------------------------------------|
| `rounded.sm`  | 4px      | Cards, buttons, code-block wrappers, inline-code pill (in reading mode) |
| `rounded.full`| 9999px   | Theme dot / social icons (44×44 touch target), hero orbs (visual blur) |

**Rule:** sharp corners are intentional — they support the "cyberdeck UI" identity. Do not introduce intermediate radii (`rounded-md = 6px`, `rounded-lg = 8px`) without a brand-fit justification. The two-tier scale (sm + full) is the full vocabulary.

---

## Components

Each component below maps 1:1 to a key in the YAML `components` map at the top of this file. Variants (hover, active) are separate entries per Stitch spec §4.1. The `### theme-dot` subsection is description-only — its primary properties (`rounded.full`, 44×44 touch target) are already covered by `rounded.full` in the YAML root, so it has no YAML mirror.

### button-primary

The primary CTA — outline button with primary-tinted fill (10% opacity) and a yellow border at 50% opacity that brightens on hover. Used for the home-page `VIEW PROJECTS` style and any "this is the action you came here for" surface.

```html
border border-primary/50 bg-primary/10 px-8 py-3 text-sm tracking-widest
text-primary hover:bg-primary/20 hover:border-primary
transition-all box-glow btn-interactive glitch-hover
```

- `box-glow` adds yellow glow via `--matrix-glow` var
- `btn-interactive` adds 1px lift + glow on hover, instant settle on active
- `glitch-hover` adds the chromatic aberration text-glitch on hover; **`data-text` attribute required** on every element using `glitch-hover` (the `::before` / `::after` pseudo-elements read `content: attr(data-text)`)

### button-primary-hover

State variant — fill brightens to `bg-primary/20`, border to `border-primary` (full opacity). The 1px hover lift from `btn-interactive` settles back on `:active`.

### button-secondary

Subtle outline, no fill. Used for the `READ BLOG` style — secondary actions that share visual hierarchy with primary but defer to it.

```html
border border-border px-8 py-3 text-sm tracking-widest
text-muted-foreground hover:border-primary/50 hover:text-foreground
transition-all btn-interactive glitch-hover
```

- Muted text on rest, brightens to foreground on hover
- Border picks up primary tint on hover (`border-primary/50`)

### button-secondary-hover

State variant — border tints to `border-primary/50`; text brightens from `text-muted-foreground` to `text-foreground`. No fill applied; the rest state has none.

### navbar-wordmark

Home link in the top navbar. Displays `PIOTR_TARACH` with a Lucide `Terminal` icon prefix. Uses `font-display` (Orbitron), `text-foreground`, `text-glow`, `tracking-wider`. Links to `/`.

### nav-link

Top navbar links. Always on `glitch-hover` (single-theme reality — no conditional). Active state is yellow with a text-glow.

```html
text-sm tracking-widest transition-colors hover:text-primary
nav-link-motion glitch-hover
[active]:text-primary text-glow
```

- `nav-link-motion` adds the underline-grow indicator on hover
- `glitch-hover` always on; requires `data-text` attribute

### nav-link-active

Active route variant — `text-primary` (yellow) plus `text-glow` (text-shadow from `--matrix-text-glow`). Set via the `[active]` state in the markup above; no separate Tailwind block.

### card

Project cards, blog cards, skill rows. Sharp corners (`--radius: 0.25rem`) are intentional — they support the cyberdeck identity. Hover swaps to `border-primary/50` and triggers `neon-border-trace`.

```html
bg-card border border-border rounded-md p-6
hover:border-primary/50 transition-colors
neon-border-trace
```

- `--radius` is `0.25rem` — sharp corners are intentional
- `neon-border-trace` adds the rotating gradient border on hover (CSS `@property --border-angle`)

### theme-dot

The corner-button pattern — borderless circular icon container, 44×44 touch target. Used for GitHub / LinkedIn icons in the navbar (replaces former theme dots from the multi-theme era). Description-only — has no YAML mirror because its properties (`rounded.full`, padding to hit 44×44) are already in the YAML root.

```html
w-5 h-5 rounded-full border-2 p-2.5 box-content
transition-all duration-200
border-transparent opacity-50 hover:opacity-80
inline-flex items-center justify-center text-foreground
```

- 20×20 content + 10px box-content padding = 44×44 touch target (WCAG 2.5.8)

### tab-active

Skills-page active tab indicator. `text-primary` (yellow) + `text-glow` for the SKILLS tab. Container is `bg-secondary/50 border border-border` (subtle inset feel).

### tab-active-learning

Active LEARNING tab variant — uses `text-learning` (amber) instead of `text-primary`. Distinct semantic slot signals "still acquiring", never confused with primary/active.

### code-block

Markdown code blocks. Wrapped in `.code-block-wrapper` with horizontal scroll shadows. Tomorrow Night Prism palette stays dark even in reading mode (preserves contrast).

```html
relative bg-[#2d2d2d] text-foreground rounded-md
.code-block-wrapper > pre + scroll-shadow gradients
```

- Language badge in top-right (`.code-lang-badge`)
- Copy button (`button[aria-label="Copy code"]`)

#### Reading-mode override

Two related bugs were fixed on this surface (regression history: the bg-mismatch has been reported three times):

1. **`.theme-reading .code-block-wrapper` border** — the original border declaration sat on `pre[class*="language-"]`, which never renders in this codebase because `CodeBlock.tsx` replaces `<pre>` with `<div class="code-block-wrapper">`. Re-anchored to `.code-block-wrapper` with a warm-brown tone (`hsl(30 25% 45%)`) tuned against the cream page bg (NOT the dark code bg) plus a faint box-shadow lift so the frame reads on mobile WebKit at low DPI.
2. **`<pre>`/`<code>` background unification** — both `.theme-reading .markdown-body pre[class*="language-"]` and `.theme-reading .markdown-body code[class*="language-"]` use `#2d2d2d !important` to match the `CodeBlock.tsx` inline style on `.code-block-wrapper`. Earlier value `hsl(220 13% 15%)` (= `#21252b`) sat ~5 lightness units darker than the wrapper. Because `<code>` renders `display: inline; white-space: pre`, ANY background mismatch tiles only behind text on each visual line — producing a per-line stripe regression visually identical to the inline-pill border leak (next entry) but structurally distinct (bg mismatch, not border leak).

**Test anchor:** `e2e/functional/code-block-styling.spec.ts` locks the invariant — `codeBg === wrapperBg === rgb(45, 45, 45)` at every code-block on the page, both desktop and mobile.

### code-inline

Inline `<code>` rendered inside markdown prose — pills out the code from surrounding text in reading mode. Uses the muted background + sm radius. Applied via `.theme-reading .markdown-body code:not([class*="language-"])` — language-class anchor required.

```html
inline-block px-1 py-0.5 rounded-sm bg-muted/40
text-foreground border border-border/60
```

- Language-class anchor: the rule uses `:not([class*="language-"])` — NOT `:not(pre code)`. The `:not(pre code)` form is inert because `CodeBlock.tsx` replaces `<pre>` with `<div class="code-block-wrapper">`, so `pre code` no longer matches anything in the rendered DOM and the exclusion silently fired on fenced `<code>` too.
- Failure mode (without language-class anchor): with `display: inline; white-space: pre` on the highlighted `<code>` plus a 1px border + 0.1em padding on the pill rule, `box-decoration-break: slice` tiles the pill outline onto every visual line — the per-line pill border regression. Same shape as the bg-mismatch stripe regression in `code-block` reading-mode override.
- The `language-*` class that `rehype-prism-plus` stamps on every fenced `<code>` is invariant across tag substitution. The same `:not([class*="language-"])` anchor applies to the theme-agnostic `overflow-wrap: anywhere` rule for consistency.

**Test anchor:** `e2e/functional/code-block-styling.spec.ts` "Fenced code excluded from inline-pill styling" — `border-top-width === 0px` AND `padding-left === 0px` on every `code[class*="language-"]` on the page.

---

## Do's and Don'ts

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

## Motion

> **Device-tier policy → `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md`** (HARD SPEC).
> Three tiers (mobile `<768`, tablet `[768, 1024)`, desktop `≥1024`) + one public flag `animationsDisabled`. Desktop defaults to animations-on; mobile/tablet default to animations-off. OS reduced-motion and per-session replay-skip override on top. Uses half-open interval notation to match the spec's `>= 768 && < 1024` contract.

Two timing systems coexist (deliberate trade-off, see ARCHITECTURE.md §6):
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

**Mobile orb override scope:** `@media (max-width: 640px)` (`src/index.css`) redefines `.animate-hero-glow-slow` and `.animate-hero-glow-slower` to use the `hero-glow-mobile` keyframe — tighter scale (1.04 vs 1.12 desktop), tighter opacity (0.75-0.85 vs 0.6-1.0), slower tempo (16s/22s vs 8s/11s). Mobile orbs sit closer to the eye and compete with the hero entrance cascade if they breathe too actively.

---

## References

- **Codebase:** `https://github.com/MalfiRG/signal-noise`
- **Architecture:** see `ARCHITECTURE.md` (component tree, routing, motion system internals)
- **Tone & voice (for blog content):** see `skills/voice-to-blog/references/voice-style-guide.md`
- **DESIGN.md convention:** Google Stitch / VoltAgent collection (https://github.com/VoltAgent/awesome-design-md)
- **WCAG 2.5.8 touch targets:** 44×44px minimum, met across all interactive elements
- **Cyberpunk 2077 palette grammar:** yellow + orange + cyan canonical, on near-black backgrounds
- **Stitch lint validation:** `npx --yes @google/design.md lint DESIGN.md` — runs against the alpha spec. Acceptable warnings: section-order on extensions (Motion, References), orphaned-tokens on body-level color tokens. See spec at https://github.com/google-labs-code/design.md.

---

*Last updated: 2026-04-19 — single-theme consolidation commit `9ad49e1`*
