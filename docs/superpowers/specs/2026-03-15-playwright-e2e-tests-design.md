# Playwright E2E Tests — Design Spec

**Date:** 2026-03-15
**Scope:** End-to-end testing for blog content rendering, reading mode, and responsive layout
**Test fixture:** `style-test` blog post — a kitchen-sink page with all supported content elements

---

## 1. Infrastructure & CI/CD

### Playwright Setup

- **Package:** `@playwright/test` (devDependency)
- **Config:** `playwright.config.ts` at project root
  - `baseURL`: `http://localhost:8080`
  - `webServer`: `npm run dev` (port 8080)
  - Single project: Chromium only (expand later if needed)
  - `testDir`: `e2e/`
- **Directory structure:**
  ```
  e2e/
    fixtures/
      blog-page.ts       # Custom fixture: navigates to style-test, waits for load
    blog-rendering.spec.ts
    reading-mode.spec.ts
    responsive.spec.ts
  ```
- **Scripts:** Add `"test:e2e": "npx playwright test"` to `package.json`
- **`.gitignore`:** Add `test-results/`, `playwright-report/`, `blob-report/`

### CI/CD (GitHub Actions)

- **File:** `.github/workflows/e2e.yml`
- **Triggers:** Push to `main` and `dev-*` branches
- **Steps:**
  1. Checkout
  2. Node.js setup
  3. `npm ci --legacy-peer-deps`
  4. Install Playwright browsers (`npx playwright install --with-deps chromium`)
  5. `npx playwright test`
  6. Upload `playwright-report/` as artifact on failure

### Draft Filtering

- Add `draft?: boolean` to `BlogPost` interface in `src/features/blog/data.ts`
- Mark `style-test` entry with `draft: true`
- `BlogIndex.tsx` filters out drafts when `import.meta.env.PROD` is true
- `BlogPostPage.tsx` renders all slugs regardless of draft status (tests navigate directly by URL)

---

## 2. Test Fixtures

### `e2e/fixtures/blog-page.ts`

Custom Playwright fixture extending the base `test`:

- **`blogPage` fixture:**
  - Navigates to `/blog/style-test`
  - Waits for `.markdown-body` to be visible
  - Waits for the `Loader2` spinner to disappear
  - Provides the `page` object positioned on the fully-rendered post

- **No Page Object Model.** Selectors live directly in tests as Playwright locators. The HTML structure is well-defined (`.markdown-body h2`, `nav`, `pre > code`, etc.) and doesn't need abstraction.

- **Imported as:** `import { test, expect } from './fixtures/blog-page';` in each spec file

---

## 3. Test Spec: `blog-rendering.spec.ts`

All tests run against the style-test page using the `blogPage` fixture.

### Headings & TOC Interaction

| Test | Assertion |
|------|-----------|
| All h2/h3 headings rendered | Each heading from the markdown exists in the DOM with correct `id` |
| TOC contains links for each heading | `nav` "On this page" section has an `<a>` for every h2/h3 |
| Scroll to heading highlights TOC | Scroll heading into viewport → corresponding TOC link gains `text-foreground font-medium` classes |
| Click TOC link scrolls to heading | Click TOC `<a>` → target heading is in viewport |
| h3 entries indented in TOC | h3-level TOC links have `pl-3` class |

### Code Blocks

| Test | Assertion |
|------|-----------|
| Syntax highlighting applied | Code blocks have `hljs` classes from rehype-highlight |
| Horizontal scroll on wide code | `pre` element: `scrollWidth > clientWidth`, programmatic `scrollLeft` changes |
| Inline code styled differently | `<code>` not inside `<pre>` has `bg-secondary` class |

### Tables

| Test | Assertion |
|------|-----------|
| Table structure correct | Tables render with `<th>`, `<td>`, `<thead>`, `<tr>` |
| Table wrapper scrollable | Parent `<div>` has `overflow-x-auto` |

### Mermaid Diagrams

| Test | Assertion |
|------|-----------|
| Mermaid diagrams rendered | At least 3 `<svg>` elements inside `.my-6` divs |
| SVGs have dimensions | Each SVG has non-zero `width` and `height` |

### Images & GIFs

| Test | Assertion |
|------|-----------|
| Images loaded | All `<img>` elements have `naturalWidth > 0` or valid `src` |
| Images have alt text | Every `<img>` has a non-empty `alt` attribute |

### Links

| Test | Assertion |
|------|-----------|
| Internal anchor links | `href` starting with `#` do NOT have `target="_blank"` |
| External links open in new tab | Have `target="_blank"` and `rel="noopener noreferrer"` |
| External URLs well-formed | `href` values are valid URLs (protocol + host) |

### Blockquotes

| Test | Assertion |
|------|-----------|
| Blockquotes render | `<blockquote>` elements exist |
| Callout patterns have bold lead | Callouts (Key Insight, Hot Take, etc.) contain `<strong>` as first inline element |

### Lists

| Test | Assertion |
|------|-----------|
| Ordered lists | `<ol>` with `list-decimal` class |
| Unordered lists | `<ul>` with `list-disc` class |
| Nested lists | Nested `<ul>`/`<ol>` elements inside `<li>` |
| GFM task list checkboxes | `<input type="checkbox">` elements inside list items |

### Typography

| Test | Assertion |
|------|-----------|
| Inline formatting | `<strong>`, `<em>`, `<del>` elements present |
| Horizontal rules | `<hr>` elements present |

---

## 4. Test Spec: `reading-mode.spec.ts`

### Theme Activation

| Test | Assertion |
|------|-----------|
| Reading mode on article pages | `/blog/style-test` → wrapper div has `theme-reading` class |
| No reading mode on index | `/blog` → `theme-reading` NOT present |
| No reading mode on home | `/` → `theme-reading` NOT present |

### CSS Variable Overrides

| Test | Assertion |
|------|-----------|
| Background color is warm | Computed `background-color` is in the warm sepia range, not dark Matrix green |
| Text color is dark | Computed `color` is dark brown/black, not green |

### Typography Switch

| Test | Assertion |
|------|-----------|
| Body uses Atkinson Hyperlegible | Computed `font-family` includes `Atkinson Hyperlegible` |
| `.font-display` overridden | Elements with `.font-display` also use Atkinson Hyperlegible |

### Glow Suppression

| Test | Assertion |
|------|-----------|
| Text glow removed | `.text-glow` elements have `text-shadow: none` |
| Box glow removed | `.box-glow` elements have `box-shadow: none` |

### Code Blocks Stay Dark

| Test | Assertion |
|------|-----------|
| Pre elements keep dark background | `background-color` of `pre` inside `.theme-reading .markdown-body` is in the dark blue range (`hsl(220 13% 18%)`), not warm |

### In-Content TOC Hidden

| Test | Assertion |
|------|-----------|
| Inline TOC not visible | The `<ul>` at the top of `.markdown-body.has-inline-toc` has `display: none` |

---

## 5. Test Spec: `responsive.spec.ts`

### Desktop (1280x720)

| Test | Assertion |
|------|-----------|
| Sidebar TOC visible | `nav` with "On this page" has `display: block` |
| Two-column layout | Content and TOC side by side |
| Desktop nav visible | Nav links visible, hamburger hidden |

### Tablet (1023x768 — below `lg` breakpoint)

| Test | Assertion |
|------|-----------|
| TOC hidden | Sidebar TOC has `display: none` |
| Content fills width | No empty TOC column |
| Reading mode still applies | `.theme-reading` class present, warm colors applied |
| Hamburger menu appears | Desktop nav hidden, hamburger button visible |

### Mobile (375x667)

| Test | Assertion |
|------|-----------|
| TOC hidden | Same as tablet |
| Hamburger menu functional | Open Sheet → nav links visible → click BLOG → navigates to `/blog` |

---

## 6. Decisions & Constraints

- **Chromium only** for CI — keeps runs fast. Firefox/WebKit can be added as separate CI matrix entries later.
- **No HTTP checks on external links** — we verify `href` format only. Actual link checking belongs in a separate scheduled job, not in E2E tests that run on every push.
- **No visual regression / screenshot tests** — out of scope for this round. Can be added later with Playwright's snapshot testing.
- **Scrollbar theming** is not tested — `::-webkit-scrollbar` computed styles are unreliable to assert against programmatically. Visual verification is more practical.
- **Mermaid rendering** is async with random IDs — tests wait for SVG to appear rather than asserting specific SVG content.
