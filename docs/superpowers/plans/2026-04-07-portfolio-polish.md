# Portfolio Polish — Santifer-Inspired Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring 5 santifer.io-inspired patterns into The Digital Matrix: self-hosted fonts, hero ambient orbs, card micro-interactions, build-time social stats (GitHub + LinkedIn), and multi-theme profiles (Violet, Amber).

**Architecture:** Each feature is independent and ships as its own commit. Build-time social stats use a pre-build script pattern (TypeScript scripts that fetch API data and write it into source files before `vite build`). Theme profiles use CSS custom property sets toggled via `next-themes` (already installed). All changes are additive — no existing functionality is removed.

**Tech Stack:** React 18, Tailwind CSS 3.4, Framer Motion 12, Vite 7, CSS custom properties, GitHub REST API, TypeScript build scripts, next-themes 0.3.0.

**Blog root:** `/mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `public/fonts/share-tech-mono-latin.woff2` | Self-hosted font file (latin) |
| `public/fonts/share-tech-mono-latin-ext.woff2` | Self-hosted font file (latin-ext for PL/CZ chars) |
| `public/fonts/orbitron-latin.woff2` | Self-hosted font file (latin) |
| `public/fonts/orbitron-latin-ext.woff2` | Self-hosted font file (latin-ext) |
| `public/fonts/atkinson-hyperlegible-400.woff2` | Self-hosted font file (regular weight) |
| `public/fonts/atkinson-hyperlegible-400-ext.woff2` | Self-hosted font file (regular, latin-ext) |
| `public/fonts/atkinson-hyperlegible-700.woff2` | Self-hosted font file (bold weight) |
| `public/fonts/atkinson-hyperlegible-700-ext.woff2` | Self-hosted font file (bold, latin-ext) |
| `public/fonts/atkinson-hyperlegible-italic.woff2` | Self-hosted font file (italic) |
| `public/fonts/atkinson-hyperlegible-italic-ext.woff2` | Self-hosted font file (italic, latin-ext) |
| `scripts/update-github-stats.ts` | Build-time GitHub stars/forks/language/pushed_at fetcher |
| `src/features/social-proof/SocialProof.tsx` | Homepage social proof section (GitHub repos, always visible) |
| `src/components/ThemeSelector.tsx` | Theme toggle dots (Matrix/Violet/Amber) using `useTheme()` |

### Modified Files

| File | What Changes |
|------|-------------|
| `src/index.css` | Remove Google Fonts import, add `@font-face` declarations (latin + latin-ext), migrate hardcoded `hsl(120...)` to CSS vars, add theme profiles (Violet, Amber), add hero orb keyframes, add `--matrix-rain-color` |
| `tailwind.config.ts` | Add `hero-glow` keyframe/animation entries |
| `src/pages/Index.tsx` | Add hero ambient orbs with increased opacity + `mix-blend-mode: screen`, import SocialProof section |
| `src/features/projects/data.ts` | Extend `Project` interface with required `stars`, `forks`, optional `language`, `pushedAt` fields |
| `src/features/projects/ProjectsList.tsx` | Render stars/forks/language badges, add card micro-interactions |
| `src/components/Navbar.tsx` | Add ThemeSelector to nav |
| `src/App.tsx` | Wrap app in `<ThemeProvider>` from next-themes |
| `src/components/MatrixRain.tsx` | Cache rain color at mount, update via `useTheme()` effect, theme trail-fade background |
| `package.json` | Add `tsx` devDependency, update build script to run stats fetcher inline |
| `index.html` | Remove Google Fonts `<link>` if present, add preload for woff2. NO inline theme script (next-themes handles FOUC) |

---

## Task 0: CSS Variable Migration

**Rationale:** ~20 hardcoded `hsl(120...)` values exist in `src/index.css` for scrollbars, text selection, scanline overlay, and markdown-body styles. Without converting these to CSS custom properties first, theme profiles will show purple/amber chrome but green scrollbars, green selection highlights, and green markdown text.

**Files:**
- Modify: `src/index.css` (all hardcoded `hsl(120...)` values in base and component layers)

- [ ] **Step 1: Add new CSS custom properties to `:root`**

Inside the `:root` block in `src/index.css`, after `--matrix-text-glow` (line 49), add:

```css
    --matrix-rain-color: 120 100% 50%;
    --scrollbar-thumb: 120 40% 20%;
    --prose-body: 120 40% 70%;
    --prose-heading-2: 120 100% 60%;
    --prose-heading-3: 120 80% 55%;
    --prose-quote: 120 40% 55%;
```

- [ ] **Step 2: Replace `--matrix-glow` and `--matrix-text-glow` to use `--primary`**

In `:root`, change lines 48-49 from:

```css
    --matrix-glow: 0 0 20px hsl(120 100% 50% / 0.5), 0 0 40px hsl(120 100% 50% / 0.2);
    --matrix-text-glow: 0 0 10px hsl(120 100% 50% / 0.8);
```

To:

```css
    --matrix-glow: 0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.2);
    --matrix-text-glow: 0 0 10px hsl(var(--primary) / 0.8);
```

Do the same inside the `@media (max-width: 640px)` block — change:

```css
      --matrix-text-glow: 0 0 6px hsl(120 100% 50% / 0.4);
      --matrix-glow: 0 0 12px hsl(120 100% 50% / 0.3);
```

To:

```css
      --matrix-text-glow: 0 0 6px hsl(var(--primary) / 0.4);
      --matrix-glow: 0 0 12px hsl(var(--primary) / 0.3);
```

- [ ] **Step 3: Replace `::selection` hardcoded colors**

Change:

```css
  ::selection {
    background: hsl(120 100% 50% / 0.3);
    color: hsl(120 100% 80%);
  }
```

To:

```css
  ::selection {
    background: hsl(var(--primary) / 0.3);
    color: hsl(var(--foreground));
  }
```

- [ ] **Step 4: Replace scrollbar hardcoded colors**

Change:

```css
  ::-webkit-scrollbar-track {
    background: hsl(120 10% 4%);
  }

  ::-webkit-scrollbar-thumb {
    background: hsl(120 40% 20%);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: hsl(120 100% 50%);
  }
```

To:

```css
  ::-webkit-scrollbar-track {
    background: hsl(var(--background));
  }

  ::-webkit-scrollbar-thumb {
    background: hsl(var(--scrollbar-thumb));
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--primary));
  }
```

- [ ] **Step 5: Replace scanline hardcoded colors**

Change the `.scanline` utility:

```css
  .scanline {
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      hsl(120 100% 50% / 0.03) 2px,
      hsl(120 100% 50% / 0.03) 4px
    );
    pointer-events: none;
  }
```

To:

```css
  .scanline {
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      hsl(var(--primary) / 0.03) 2px,
      hsl(var(--primary) / 0.03) 4px
    );
    pointer-events: none;
  }
```

- [ ] **Step 6: Replace all markdown-body hardcoded colors**

Change the entire `.markdown-body` component block from hardcoded values to CSS variable references:

```css
  .markdown-body {
    color: hsl(var(--foreground));
    line-height: 1.7;
    font-size: 0.9rem;
  }

  .markdown-body h1 {
    color: hsl(var(--foreground));
    font-family: 'Orbitron', sans-serif;
    text-shadow: var(--matrix-text-glow);
  }

  .markdown-body h2 {
    color: hsl(var(--prose-heading-2));
    font-family: 'Orbitron', sans-serif;
  }

  .markdown-body h3 {
    color: hsl(var(--prose-heading-3));
    font-family: 'Orbitron', sans-serif;
  }

  .markdown-body p {
    margin-bottom: 1rem;
    color: hsl(var(--prose-body));
  }

  .markdown-body strong {
    color: hsl(var(--foreground));
  }

  .markdown-body blockquote {
    border-left: 3px solid hsl(var(--primary));
    padding-left: 1rem;
    margin: 1rem 0;
    color: hsl(var(--prose-quote));
    font-style: italic;
  }

  .markdown-body li {
    color: hsl(var(--prose-body));
  }

  .markdown-body hr {
    border-color: hsl(var(--border));
    margin: 2rem 0;
  }
```

- [ ] **Step 7: Verify no remaining hardcoded `hsl(120` in non-reading-mode rules**

Run:

```bash
grep -n "hsl(120" src/index.css
```

The ONLY remaining `hsl(120...)` values should be inside `.theme-reading` blocks (those use `hsl(30...)` and are reading-mode specific — not affected by theme profiles). All Matrix-green values in default/base rules must now reference CSS variables.

- [ ] **Step 8: Commit**

```bash
git add src/index.css
git commit -m "refactor: migrate hardcoded hsl(120) values to CSS custom properties"
```

---

## Task 1: Self-Hosted Fonts

**Files:**
- Create: `public/fonts/*.woff2` (10 files: latin + latin-ext for each font/weight)
- Modify: `src/index.css:4` (replace Google Fonts import with @font-face)
- Modify: `index.html` (add font preload links)

- [ ] **Step 1: Download font files**

```bash
cd /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/the-digital-matrix
mkdir -p public/fonts

# Share Tech Mono — latin
curl -L "https://fonts.gstatic.com/s/sharetechmono/v15/J7aHnp1uDWRBEqV98dVQztYldFc7pAsEIc3Xew.woff2" \
  -o public/fonts/share-tech-mono-latin.woff2

# Share Tech Mono — latin-ext
curl -L "https://fonts.gstatic.com/s/sharetechmono/v15/J7aHnp1uDWRBEqV98dVQztYldFc7pAsEIc3Xeg.woff2" \
  -o public/fonts/share-tech-mono-latin-ext.woff2

# Orbitron — latin (variable weight 400-900)
curl -L "https://fonts.gstatic.com/s/orbitron/v31/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWgz.woff2" \
  -o public/fonts/orbitron-latin.woff2

# Orbitron — latin-ext
curl -L "https://fonts.gstatic.com/s/orbitron/v31/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWg1.woff2" \
  -o public/fonts/orbitron-latin-ext.woff2

# Atkinson Hyperlegible — weight 400 (NOT variable font — needs separate weight files)
curl -L "https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt23C1KxNDXMspQ1lPyU89-1h6ONRlW45GE5AI5c7Y.woff2" \
  -o public/fonts/atkinson-hyperlegible-400.woff2

# Atkinson Hyperlegible — weight 400, latin-ext
curl -L "https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt23C1KxNDXMspQ1lPyU89-1h6ONRlW45GE5AI5c7k.woff2" \
  -o public/fonts/atkinson-hyperlegible-400-ext.woff2

# Atkinson Hyperlegible — weight 700
curl -L "https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt73C1KxNDXMspQ1lPyU89-1h6ONRlW45G8WbcNai-F.woff2" \
  -o public/fonts/atkinson-hyperlegible-700.woff2

# Atkinson Hyperlegible — weight 700, latin-ext
curl -L "https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt73C1KxNDXMspQ1lPyU89-1h6ONRlW45G8WbcNai-L.woff2" \
  -o public/fonts/atkinson-hyperlegible-700-ext.woff2

# Atkinson Hyperlegible — italic
curl -L "https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt43C1KxNDXMspQ1lPyU89-1h6ONRlW45G055ItWQGCbg.woff2" \
  -o public/fonts/atkinson-hyperlegible-italic.woff2

# Atkinson Hyperlegible — italic, latin-ext
curl -L "https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt43C1KxNDXMspQ1lPyU89-1h6ONRlW45G055ItWQGCYQ.woff2" \
  -o public/fonts/atkinson-hyperlegible-italic-ext.woff2
```

- [ ] **Step 2: Replace Google Fonts import in index.css**

Remove line 5 (`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono...')`).

Replace with `@font-face` blocks. Atkinson uses **separate files per weight** (it is NOT a variable font — the Google Fonts URL is misleading). Each font gets a latin block and a latin-ext block with `unicode-range`:

```css
/* ===== Self-hosted fonts — eliminates Google Fonts CDN round trip ===== */

/* Share Tech Mono — latin-ext */
@font-face {
  font-family: 'Share Tech Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/share-tech-mono-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* Share Tech Mono — latin */
@font-face {
  font-family: 'Share Tech Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/share-tech-mono-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Orbitron — latin-ext (variable weight 400-900) */
@font-face {
  font-family: 'Orbitron';
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  src: url('/fonts/orbitron-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* Orbitron — latin */
@font-face {
  font-family: 'Orbitron';
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  src: url('/fonts/orbitron-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Atkinson Hyperlegible — weight 400, latin-ext */
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-400-ext.woff2') format('woff2');
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* Atkinson Hyperlegible — weight 400, latin */
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Atkinson Hyperlegible — weight 700, latin-ext */
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-700-ext.woff2') format('woff2');
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* Atkinson Hyperlegible — weight 700, latin */
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Atkinson Hyperlegible — italic, latin-ext */
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-italic-ext.woff2') format('woff2');
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* Atkinson Hyperlegible — italic, latin */
@font-face {
  font-family: 'Atkinson Hyperlegible';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/atkinson-hyperlegible-italic.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

- [ ] **Step 3: Add preload hints in index.html**

In `<head>`, before any CSS:

```html
<link rel="preload" href="/fonts/share-tech-mono-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/orbitron-latin.woff2" as="font" type="font/woff2" crossorigin>
```

Only preload the two main fonts (not Atkinson — it's reading-mode only, loaded on demand).

- [ ] **Step 4: Remove any Google Fonts link tag from index.html if present**

Check `index.html` for `<link ... fonts.googleapis.com ...>` and remove if found.

- [ ] **Step 5: Verify fonts load locally**

```bash
npm run dev
```

Open browser, check Network tab — no requests to `fonts.googleapis.com`. Fonts render correctly. Matrix headings use Orbitron, body uses Share Tech Mono. Polish/Czech characters (ą, ć, ę, ř, ž) render from latin-ext subsets.

- [ ] **Step 6: Commit**

```bash
git add public/fonts/ src/index.css index.html
git commit -m "perf: self-host fonts with latin-ext subsets, remove Google Fonts CDN"
```

---

## Task 2: Hero Ambient Orbs

**Files:**
- Modify: `src/index.css` (add `hero-glow` keyframe, orb CSS vars)
- Modify: `tailwind.config.ts` (register animation)
- Modify: `src/pages/Index.tsx` (add orb divs behind hero content)

- [ ] **Step 1: Add hero-glow keyframe to index.css**

Add at the end of the file, outside any `@layer`:

```css
/* Hero ambient glow — slow breathing for background orbs */
@keyframes hero-glow {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.12); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes hero-glow {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
}
```

- [ ] **Step 2: Register animation in tailwind.config.ts**

Add to `theme.extend.keyframes`:

```typescript
"hero-glow": {
  "0%, 100%": { transform: "scale(1)", opacity: "0.6" },
  "50%": { transform: "scale(1.12)", opacity: "1" },
},
```

Add to `theme.extend.animation`:

```typescript
"hero-glow-slow": "hero-glow 8s ease-in-out infinite",
"hero-glow-slower": "hero-glow 11s ease-in-out infinite reverse",
```

- [ ] **Step 3: Add CSS custom properties for orb colors**

In `src/index.css`, inside `:root` (after the new `--prose-quote` var from Task 0):

```css
    --hero-orb-primary: 120 100% 50% / 0.18;
    --hero-orb-accent: 120 60% 30% / 0.14;
```

Note the increased opacity values (0.18/0.14 instead of 0.12/0.08) — UX review confirmed the orbs need higher opacity to be visible behind the MatrixRain canvas.

Also add to `.theme-reading` block:

```css
    --hero-orb-primary: 0 0% 0% / 0;
    --hero-orb-accent: 0 0% 0% / 0;
```

(Orbs are invisible in reading mode.)

- [ ] **Step 4: Add orb elements to Index.tsx**

Replace the hero `<section>` in `src/pages/Index.tsx`:

```tsx
<section className="relative z-20 min-h-screen flex items-center justify-center overflow-hidden">
  {/* Ambient orbs — mix-blend-mode: screen ensures visibility behind canvas */}
  <div
    className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 hidden sm:block animate-hero-glow-slow pointer-events-none"
    style={{ backgroundColor: 'hsl(var(--hero-orb-primary))', mixBlendMode: 'screen' }}
  />
  <div
    className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 hidden sm:block animate-hero-glow-slower pointer-events-none"
    style={{ backgroundColor: 'hsl(var(--hero-orb-accent))', mixBlendMode: 'screen' }}
  />

  <div className="text-center px-4 max-w-3xl">
    {/* ... existing hero content unchanged ... */}
  </div>
</section>
```

- [ ] **Step 5: Verify visually**

```bash
npm run dev
```

Check homepage — two soft green blurs should pulse slowly behind the hero text. They should be visible through the MatrixRain canvas (mix-blend-mode: screen). Invisible in reading mode. Hidden on mobile (<640px).

- [ ] **Step 6: Commit**

```bash
git add src/index.css tailwind.config.ts src/pages/Index.tsx
git commit -m "feat: add ambient glow orbs to hero section"
```

---

## Task 3: Card Micro-Interactions

**Files:**
- Modify: `src/features/projects/ProjectsList.tsx:22` (enhance card hover classes)
- Modify: `src/features/blog/BlogIndex.tsx` (enhance blog post card hovers — shadow/border only, NO translate)

- [ ] **Step 1: Enhance project card hover in ProjectsList.tsx**

Change the card's `className` (line 22) from:

```
border border-border bg-card/50 p-6 hover:border-primary/50 transition-all group
```

To:

```
border border-border bg-card/50 p-6 hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/15 transition-all duration-200 group
```

Changes from original plan: `hover:-translate-y-1` (4px lift, not 0.5/2px — UX review), `shadow-primary/15` (not /5 — bloom needs more opacity to be visible).

- [ ] **Step 2: Enhance blog post card hovers in BlogIndex.tsx**

Read `src/features/blog/BlogIndex.tsx` to find card elements. Apply shadow/border changes ONLY — **do NOT apply `hover:-translate-y-*`** to blog cards because they contain nested interactive elements (tag links). Translate on containers with nested clickable children causes hit-target confusion.

Add to blog post card wrappers:
```
hover:shadow-lg hover:shadow-primary/15 duration-200
```

Do NOT add `hover:-translate-y-*` to blog cards.

- [ ] **Step 3: Verify hover interactions**

```bash
npm run dev
```

Visit `/projects` — cards lift 4px with a visible shadow bloom on hover. Visit `/blog` — cards get shadow bloom but do NOT lift. Transitions feel smooth.

- [ ] **Step 4: Commit**

```bash
git add src/features/projects/ProjectsList.tsx src/features/blog/BlogIndex.tsx
git commit -m "feat: add card lift + shadow micro-interactions on hover"
```

---

## Task 4: Build-Time GitHub Stats

**Files:**
- Create: `scripts/update-github-stats.ts`
- Modify: `src/features/projects/data.ts` (add required `stars`, `forks`, optional `language`, `pushedAt` fields)
- Modify: `src/features/projects/ProjectsList.tsx` (render stars/forks/language)
- Modify: `package.json` (add `tsx` devDependency, update build script)

- [ ] **Step 1: Install tsx as devDependency**

```bash
npm install -D tsx
```

- [ ] **Step 2: Extend Project interface in data.ts**

In `src/features/projects/data.ts`, update the interface. Note: `stars` and `forks` are **required** with default `"0"` (not optional). Remove any `lucide-react` import from this file — icons belong in components only.

```typescript
export interface Project {
  title: string;
  description: string;
  tech_stack: string[];
  github_url?: string;
  live_url?: string;
  github_owner_repo?: string; // e.g. "MalfiRG/ScoutQL" — used by build script
  stars: string;              // e.g. "42" or "1.2K" — updated at build time, default "0"
  forks: string;              // e.g. "5" — updated at build time, default "0"
  language?: string;          // e.g. "TypeScript" — updated at build time
  pushedAt?: string;          // e.g. "2026-04-01" — updated at build time
}
```

Add fields to each project entry:

```typescript
export const projects: Project[] = [
  {
    title: "ScoutQL",
    description: "Personal job listing aggregator...",
    tech_stack: ["React", "TypeScript", "FastAPI", "SQLAlchemy", "Turso", "Tailwind CSS", "Docker"],
    github_url: "https://github.com/MalfiRG/ScoutQL",
    github_owner_repo: "MalfiRG/ScoutQL",
    stars: "0",
    forks: "0",
    language: "TypeScript",
    pushedAt: "",
  },
  {
    title: "The Digital Matrix",
    description: "This blog...",
    tech_stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion", "Markdown"],
    github_url: "https://github.com/MalfiRG/the-digital-matrix",
    live_url: "https://the-digital-matrix.vercel.app",
    github_owner_repo: "MalfiRG/the-digital-matrix",
    stars: "0",
    forks: "0",
    language: "TypeScript",
    pushedAt: "",
  },
  {
    title: "Whispr Local",
    description: "Audio transcription pipeline...",
    tech_stack: ["Python", "faster-whisper", "Google Colab", "CUDA", "Jupyter"],
    github_url: "https://github.com/MalfiRG/whispr-local",
    github_owner_repo: "MalfiRG/whispr-local",
    stars: "0",
    forks: "0",
    language: "Python",
    pushedAt: "",
  },
];
```

- [ ] **Step 3: Create the build script**

Create `scripts/update-github-stats.ts`:

```typescript
/**
 * Fetches current GitHub repo stats and updates data.ts.
 * Runs inline before vite build (see package.json "build" script).
 *
 * Usage: npx tsx scripts/update-github-stats.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '../src/features/projects/data.ts');

const REPOS = [
  { owner: 'MalfiRG', repo: 'ScoutQL' },
  { owner: 'MalfiRG', repo: 'the-digital-matrix' },
  { owner: 'MalfiRG', repo: 'whispr-local' },
];

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(n);
}

function formatDate(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

interface RepoStats {
  stars: number;
  forks: number;
  language: string;
  pushedAt: string;
}

async function fetchStats(owner: string, repo: string): Promise<RepoStats | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'User-Agent': 'digital-matrix-build/1.0',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!res.ok) {
      console.warn(`  Warning: GitHub API returned ${res.status} for ${owner}/${repo}`);
      return null;
    }
    const data = await res.json();
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language || '',
      pushedAt: formatDate(data.pushed_at || ''),
    };
  } catch (err) {
    console.warn(`  Warning: GitHub fetch failed:`, (err as Error).message);
    return null;
  }
}

async function main() {
  console.log('Updating GitHub stats...\n');

  let dataFile = readFileSync(DATA_PATH, 'utf-8');
  let changed = false;

  for (const { owner, repo } of REPOS) {
    const stats = await fetchStats(owner, repo);
    if (!stats) {
      console.log(`  Skip ${owner}/${repo}: fetch failed`);
      continue;
    }

    const s = formatCount(stats.stars);
    const f = formatCount(stats.forks);
    const ownerRepo = `${owner}/${repo}`;

    // Find the block containing this repo's github_owner_repo, then replace fields within it.
    // Uses a two-phase approach: find the block, then replace individual fields.
    const escapedRepo = ownerRepo.replace('/', '\\/');
    const blockRegex = new RegExp(
      `(github_owner_repo: "${escapedRepo}"[\\s\\S]*?)(stars: ")[^"]*(")(\\s*,\\s*\\n\\s*forks: ")[^"]*(")(\\s*,\\s*\\n\\s*language: ")[^"]*(")(\\s*,\\s*\\n\\s*pushedAt: ")[^"]*(")`,
    );

    const newData = dataFile.replace(
      blockRegex,
      `$1$2${s}$3$4${f}$5$6${stats.language}$7$8${stats.pushedAt}$9`,
    );

    if (newData !== dataFile) {
      dataFile = newData;
      changed = true;
      console.log(`  OK ${ownerRepo}: ${s} stars, ${f} forks, ${stats.language}, last push ${stats.pushedAt}`);
    } else {
      console.log(`  Skip ${ownerRepo}: no changes (${s} stars, ${f} forks)`);
    }
  }

  if (changed) {
    writeFileSync(DATA_PATH, dataFile, 'utf-8');
    console.log('\ndata.ts updated');
  } else {
    console.log('\nNo changes needed');
  }
}

main();
```

- [ ] **Step 4: Update build script in package.json**

Do NOT use a `prebuild` npm lifecycle hook — it may not fire with all package managers (Vercel may use different runners). Instead, chain the stats fetch directly into the `build` command:

```json
"build": "tsx scripts/update-github-stats.ts && vite build",
```

This guarantees the stats script runs before every build regardless of package manager.

- [ ] **Step 5: Render stars/forks/language in ProjectsList.tsx**

Import `Star`, `GitFork`, and `Clock` from lucide-react. After the links `</div>` (line 65), before `</motion.div>` (line 66), add:

```tsx
<div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
  {project.stars !== "0" ? (
    <>
      <span className="flex items-center gap-1">
        <Star className="h-3 w-3" />
        {project.stars}
      </span>
      {project.forks !== "0" && (
        <span className="flex items-center gap-1">
          <GitFork className="h-3 w-3" />
          {project.forks}
        </span>
      )}
    </>
  ) : (
    <>
      {project.language && (
        <span className="flex items-center gap-1">
          {project.language}
        </span>
      )}
      {project.pushedAt && (
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {project.pushedAt}
        </span>
      )}
    </>
  )}
</div>
```

When stars are "0", the card shows language and last-push date as fallback metrics instead of hiding the stats row entirely.

- [ ] **Step 6: Handle dual lockfile**

Check if `bun.lockb` exists in the project root. If it does, either remove it or add it to `.vercelignore`:

```bash
# Check for bun lockfile
ls -la bun.lockb 2>/dev/null && echo "bun.lockb exists — remove or ignore"
```

If present, remove it to ensure Vercel uses `package-lock.json` as the canonical lockfile:

```bash
rm -f bun.lockb
echo "bun.lockb" >> .gitignore
```

- [ ] **Step 7: Test the build script locally**

```bash
npx tsx scripts/update-github-stats.ts
```

Check `src/features/projects/data.ts` — stars, forks, language, and pushedAt values should be populated.

- [ ] **Step 8: Verify rendering**

```bash
npm run dev
```

Visit `/projects` — repos with stars show star/fork counts. Repos with 0 stars show language and last-push date instead.

- [ ] **Step 9: Commit**

```bash
git add scripts/update-github-stats.ts src/features/projects/data.ts src/features/projects/ProjectsList.tsx package.json package-lock.json .gitignore
git commit -m "feat: build-time GitHub stats on project cards with fallback metrics"
```

---

## Task 5: Social Proof Section (Homepage)

**Files:**
- Create: `src/features/social-proof/SocialProof.tsx`
- Modify: `src/pages/Index.tsx` (import and render SocialProof)

No separate `social-proof/data.ts` — SocialProof imports directly from `src/features/projects/data.ts` to eliminate data duplication. The build script updates one file; SocialProof reads it.

- [ ] **Step 1: Create SocialProof component**

Create `src/features/social-proof/SocialProof.tsx`:

```tsx
import { motion } from "framer-motion";
import { Star, GitFork, ExternalLink, Clock } from "lucide-react";
import { projects, type Project } from "@/features/projects/data";

const RepoCard = ({ project }: { project: Project }) => (
  <a
    href={project.github_url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex flex-col p-5 border border-border bg-card/50 hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/15 transition-all duration-200 group"
  >
    <p className="text-xs text-muted-foreground tracking-wider mb-1">
      {project.github_owner_repo}
    </p>
    <p className="text-sm text-foreground/80 leading-relaxed mb-4 flex-1">
      {project.description}
    </p>
    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/50">
      {project.stars !== "0" ? (
        <>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {project.stars}
          </span>
          {project.forks !== "0" && (
            <span className="flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5" />
              {project.forks}
            </span>
          )}
        </>
      ) : (
        <>
          {project.language && (
            <span>{project.language}</span>
          )}
          {project.pushedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {project.pushedAt}
            </span>
          )}
        </>
      )}
      <span className="ml-auto text-primary group-hover:underline flex items-center gap-1">
        View
        <ExternalLink className="w-3 h-3" />
      </span>
    </div>
  </a>
);

const SocialProof = () => {
  const githubProjects = projects.filter((p) => p.github_owner_repo);

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{"> cat ~/social.log"}</p>
          <h2 className="font-display text-4xl font-bold text-foreground text-glow">SIGNALS</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {githubProjects.map((project, i) => (
            <motion.div
              key={project.github_owner_repo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
            >
              <RepoCard project={project} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
```

Key differences from original plan:
- Imports from `projects/data.ts` (no data duplication)
- Always renders — no `hasContent` guard. Repos with 0 stars show language/date fallbacks
- Uses `whileInView` + `viewport={{ once: true, margin: "-50px" }}` instead of `animate` (animations fire on scroll, not on mount)
- LinkedIn cards removed for now (no public API, manually maintained data is stale by definition). Add back when Piotr has published LinkedIn posts to showcase.

- [ ] **Step 2: Add SocialProof to Index.tsx**

In `src/pages/Index.tsx`, import and render after AboutSection:

```tsx
import SocialProof from "@/features/social-proof/SocialProof";

// ... in render, after AboutSection:
<div className="relative z-20">
  <AboutSection />
  <SocialProof />
</div>
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Visit homepage, scroll past About — the Signals section should appear with GitHub repo cards. All repos are visible regardless of star count.

- [ ] **Step 4: Commit**

```bash
git add src/features/social-proof/ src/pages/Index.tsx
git commit -m "feat: add social proof section with GitHub repos on homepage"
```

---

## Task 6: Multi-Theme Profiles (Violet + Amber)

**Architecture:** Uses `next-themes@0.3.0` (already installed, imported in `src/components/ui/sonner.tsx`). This replaces hand-rolled localStorage, FOUC prevention inline scripts, and manual class toggling. The `ThemeProvider` wraps the app in `App.tsx` and the `ThemeSelector` uses the `useTheme()` hook.

**Files:**
- Modify: `src/index.css` (add two theme profiles as CSS custom property sets)
- Create: `src/components/ThemeSelector.tsx` (using `useTheme()` from next-themes)
- Modify: `src/components/Navbar.tsx` (add ThemeSelector)
- Modify: `src/App.tsx` (wrap app in `<ThemeProvider>`)
- Modify: `src/components/MatrixRain.tsx` (cache rain color, update via `useTheme()`)
- Modify: `index.html` (NO inline script — next-themes handles FOUC)

- [ ] **Step 1: Add Violet theme profile to index.css**

After the `:root` block and `@media (max-width: 640px)` (before `.theme-reading`), add:

```css
/* ========== THEME: VIOLET — Cyberpunk purple ========== */
.theme-violet {
  --background: 270 10% 5%;
  --foreground: 270 100% 85%;
  --card: 270 10% 8%;
  --card-foreground: 270 100% 85%;
  --popover: 270 10% 8%;
  --popover-foreground: 270 100% 85%;
  --primary: 270 100% 60%;
  --primary-foreground: 270 10% 5%;
  --secondary: 270 20% 14%;
  --secondary-foreground: 270 100% 85%;
  --muted: 270 10% 15%;
  --muted-foreground: 270 40% 55%;
  --accent: 330 100% 60%;
  --accent-foreground: 270 10% 5%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 270 30% 18%;
  --input: 270 30% 18%;
  --ring: 270 100% 60%;
  --sidebar-background: 270 10% 6%;
  --sidebar-foreground: 270 100% 85%;
  --sidebar-primary: 270 100% 60%;
  --sidebar-primary-foreground: 270 10% 5%;
  --sidebar-accent: 270 20% 14%;
  --sidebar-accent-foreground: 270 100% 85%;
  --sidebar-border: 270 30% 18%;
  --sidebar-ring: 270 100% 60%;
  --matrix-glow: 0 0 20px hsl(270 100% 60% / 0.5), 0 0 40px hsl(270 100% 60% / 0.2);
  --matrix-text-glow: 0 0 10px hsl(270 100% 60% / 0.8);
  --matrix-rain-color: 270 100% 60%;
  --scrollbar-thumb: 270 30% 22%;
  --prose-body: 270 40% 70%;
  --prose-heading-2: 270 100% 75%;
  --prose-heading-3: 270 80% 65%;
  --prose-quote: 270 40% 60%;
  --hero-orb-primary: 270 100% 60% / 0.18;
  --hero-orb-accent: 330 100% 60% / 0.14;
}

/* Soften glow on small screens */
@media (max-width: 640px) {
  .theme-violet {
    --matrix-text-glow: 0 0 6px hsl(270 100% 60% / 0.4);
    --matrix-glow: 0 0 12px hsl(270 100% 60% / 0.3);
  }
}
```

Note: `--muted-foreground` is `270 40% 55%` (bumped from 50% per review finding).

- [ ] **Step 2: Add Amber theme profile to index.css**

```css
/* ========== THEME: AMBER — Retro terminal ========== */
.theme-amber {
  --background: 30 10% 5%;
  --foreground: 38 90% 70%;
  --card: 30 10% 8%;
  --card-foreground: 38 90% 70%;
  --popover: 30 10% 8%;
  --popover-foreground: 38 90% 70%;
  --primary: 38 85% 50%;
  --primary-foreground: 30 10% 5%;
  --secondary: 30 20% 14%;
  --secondary-foreground: 38 90% 70%;
  --muted: 30 10% 15%;
  --muted-foreground: 38 40% 50%;
  --accent: 25 100% 45%;
  --accent-foreground: 30 10% 5%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 30 30% 16%;
  --input: 30 30% 16%;
  --ring: 38 85% 50%;
  --sidebar-background: 30 10% 6%;
  --sidebar-foreground: 38 90% 70%;
  --sidebar-primary: 38 85% 50%;
  --sidebar-primary-foreground: 30 10% 5%;
  --sidebar-accent: 30 20% 14%;
  --sidebar-accent-foreground: 38 90% 70%;
  --sidebar-border: 30 30% 16%;
  --sidebar-ring: 38 85% 50%;
  --matrix-glow: 0 0 20px hsl(38 85% 50% / 0.5), 0 0 40px hsl(38 85% 50% / 0.2);
  --matrix-text-glow: 0 0 10px hsl(38 85% 50% / 0.8);
  --matrix-rain-color: 38 85% 50%;
  --scrollbar-thumb: 30 30% 20%;
  --prose-body: 38 40% 65%;
  --prose-heading-2: 38 90% 65%;
  --prose-heading-3: 38 70% 58%;
  --prose-quote: 38 40% 55%;
  --hero-orb-primary: 38 85% 50% / 0.18;
  --hero-orb-accent: 25 100% 45% / 0.14;
}

@media (max-width: 640px) {
  .theme-amber {
    --matrix-text-glow: 0 0 6px hsl(38 85% 50% / 0.4);
    --matrix-glow: 0 0 12px hsl(38 85% 50% / 0.3);
  }
}
```

Note: `--primary` is `38 85% 50%` (desaturated from 100% per review finding). `--muted-foreground` is `38 40% 50%` (bumped from 45%).

- [ ] **Step 3: Add `--matrix-rain-color` to `.theme-reading`**

Inside the `.theme-reading` block in `:root`, add:

```css
    --matrix-rain-color: 0 0% 0% / 0;
```

This ensures rain characters are transparent in reading mode, preventing theme-colored rain from rendering in reading context.

- [ ] **Step 4: Update MatrixRain canvas color to use cached CSS variable**

Read `src/components/MatrixRain.tsx`. Replace the hardcoded green color with a cached CSS variable approach:

```typescript
import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

// ... inside the component:
const { resolvedTheme } = useTheme();
const rainColorRef = useRef<string>("hsl(120 100% 50%)");
const trailBgRef = useRef<string>("rgba(2, 10, 2, 0.05)");

// Cache color at mount and on theme change — NOT getComputedStyle every frame
useEffect(() => {
  const style = getComputedStyle(document.documentElement);
  const raw = style.getPropertyValue('--matrix-rain-color').trim();
  rainColorRef.current = raw ? `hsl(${raw})` : "hsl(120 100% 50%)";

  // Theme the trail-fade background too
  const bg = style.getPropertyValue('--background').trim();
  if (bg) {
    trailBgRef.current = `hsl(${bg} / 0.05)`;
  }
}, [resolvedTheme]);
```

In the animation loop, use `rainColorRef.current` for character color and `trailBgRef.current` for the trail-fade overlay instead of hardcoded values.

- [ ] **Step 5: Create ThemeSelector component using next-themes**

Create `src/components/ThemeSelector.tsx`:

```tsx
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const THEMES = [
  { id: "matrix", label: "Matrix", color: "hsl(120 100% 50%)" },
  { id: "violet", label: "Violet", color: "hsl(270 100% 60%)" },
  { id: "amber", label: "Amber", color: "hsl(38 85% 50%)" },
] as const;

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  // Desktop: inline dots
  if (!isMobile) {
    return (
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Theme selector">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`w-5 h-5 rounded-full border-2 p-2.5 box-content transition-all duration-200 ${
              theme === t.id
                ? "border-foreground scale-110"
                : "border-transparent opacity-50 hover:opacity-80"
            }`}
            style={{ backgroundColor: t.color }}
            role="radio"
            aria-checked={theme === t.id}
            aria-label={`Switch to ${t.label} theme`}
          />
        ))}
      </div>
    );
  }

  // Mobile: sheet with full-width labeled rows (48px min height touch targets)
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="w-5 h-5 rounded-full border-2 border-foreground"
          style={{
            backgroundColor: THEMES.find((t) => t.id === theme)?.color ?? THEMES[0].color,
          }}
          aria-label="Open theme selector"
        />
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-8">
        <SheetTitle className="text-sm text-muted-foreground tracking-wider mb-4">
          THEME
        </SheetTitle>
        <div className="flex flex-col gap-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-3 px-4 min-h-[48px] rounded transition-colors ${
                theme === t.id
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ThemeSelector;
```

Desktop: `w-5 h-5` dots with `p-2.5` padding for accessible touch targets. Mobile: full-width sheet with labeled rows (color dot + text), min 48px height per row.

- [ ] **Step 6: Wrap app in ThemeProvider in App.tsx**

In `src/App.tsx`, import and wrap:

```tsx
import { ThemeProvider } from "next-themes";

// In the component render, wrap the outermost element:
<ThemeProvider
  themes={["matrix", "violet", "amber"]}
  attribute="class"
  value={{ matrix: "", violet: "theme-violet", amber: "theme-amber" }}
  defaultTheme="matrix"
  storageKey="theme-profile"
  enableSystem={false}
>
  {/* existing app content (QueryClientProvider, Router, etc.) */}
</ThemeProvider>
```

The `value` map ensures Matrix theme has no class (uses `:root` defaults), while Violet and Amber add their respective classes. `enableSystem={false}` prevents OS dark/light mode from interfering.

Do NOT add any inline script to `index.html` for FOUC prevention — `next-themes` injects its own script via the provider.

- [ ] **Step 7: Add ThemeSelector to Navbar**

In `src/components/Navbar.tsx`, import and render `ThemeSelector` near the right side of the desktop nav:

```tsx
import ThemeSelector from "./ThemeSelector";

// In the nav JSX, add near the end of the desktop nav:
<ThemeSelector />
```

- [ ] **Step 8: Verify all three themes**

```bash
npm run dev
```

Click each color dot in the navbar. Verify:
- **Matrix (green):** Default appearance unchanged. Scrollbars, selection, scanlines, markdown all green.
- **Violet:** Purple glow, purple text, purple orbs, purple rain, purple scrollbars/selection/markdown.
- **Amber:** Amber glow, warm text, amber orbs, amber rain, amber scrollbars/selection/markdown.
- Theme persists across page refresh (next-themes localStorage under `theme-profile` key)
- Reading mode still works regardless of theme profile
- MatrixRain canvas updates color on theme switch (no page reload needed)
- Mobile: theme selector opens as a bottom sheet with labeled rows

- [ ] **Step 9: Commit**

```bash
git add src/index.css src/components/ThemeSelector.tsx src/components/Navbar.tsx src/components/MatrixRain.tsx src/App.tsx
git commit -m "feat: add Violet and Amber theme profiles with next-themes provider"
```

---

## Verification

### End-to-End Checklist

1. **CSS vars:** `grep -c "hsl(120" src/index.css` — count should be 0 outside `.theme-reading` blocks
2. **Fonts:** No network requests to `fonts.googleapis.com` in DevTools Network tab. Polish characters (ą, ć, ę) render from latin-ext subsets.
3. **Hero orbs:** Visible on homepage through MatrixRain canvas (mix-blend-mode: screen), pulsing slowly, hidden on mobile, invisible in reading mode
4. **Card hovers:** Project cards lift 4px + shadow bloom on hover. Blog cards get shadow bloom only (no translate).
5. **GitHub stats:** Run `npx tsx scripts/update-github-stats.ts`, then `npm run dev` — repos with stars show counts, repos with 0 stars show language + last-push date
6. **Social proof:** Signals section on homepage always visible, imports from projects/data.ts (no data duplication), animations fire on scroll
7. **Theme selector:** Desktop — three `w-5 h-5` dots. Mobile — bottom sheet with labeled rows (48px touch targets). Click each — entire site recolors including MatrixRain canvas, scrollbars, selection, scanlines, glow effects, orbs, and markdown body
8. **Theme persistence:** Select Amber, refresh page — Amber stays, no green flash (next-themes handles FOUC)
9. **Reading mode:** Still works on blog post pages regardless of active theme. `--matrix-rain-color` is transparent in reading mode.
10. **Build:** `npm run build` succeeds (tsx stats script runs inline, then Vite build). No `bun.lockb` conflicts.
11. **Lighthouse:** Run Lighthouse on dev server — self-hosted fonts with preload should improve FCP score

### Test Commands

```bash
# Unit tests still pass
npm run test

# Build succeeds (stats + vite)
npm run build

# E2E (if Playwright is configured)
npm run test:e2e

# Verify no hardcoded green outside reading mode
grep -n "hsl(120" src/index.css | grep -v "theme-reading"
```
