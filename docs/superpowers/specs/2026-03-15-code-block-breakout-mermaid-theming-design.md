# Code Block Breakout & Mermaid Theme-Aware Rendering

## Problem

1. **Code blocks** are constrained to the 680px prose reading column. Wide code requires horizontal scrolling, which is a poor UX on both desktop and mobile.
2. **Mermaid diagrams** display aggressive green/black/gray Matrix theme colors even in reading mode. The CSS overrides in `index.css` (lines 297-312) cannot override the inline SVG styles baked in by `mermaid.render()`.

## Solution Overview

Two changes:
- **Code blocks** break out of the prose column to fill available width, while prose stays at 680px for readability.
- **Mermaid diagrams** detect the active theme and initialize with the correct color palette before rendering, eliminating the CSS specificity battle.

---

## Design

### 1. Layout Restructure for Code Block Breakout

**Goal:** Prose stays at 680px. Code blocks expand to fill the available parent width.

#### BlogLayout.tsx (line 66)

Widen `max-w-3xl` to `max-w-6xl` (1152px) to give code blocks room to breathe while still centering the layout. The `mx-auto` centering is preserved.

Before:
```jsx
<div className="mx-auto max-w-3xl">
  <Outlet context={context} />
</div>
```

After:
```jsx
<div className="mx-auto max-w-6xl">
  <Outlet context={context} />
</div>
```

#### BlogIndex.tsx

BlogIndex currently renders a fragment (`<>...</>`) as its root. Wrap it in a new `<div className="max-w-3xl mx-auto">` so the blog index retains its current narrower layout within the now-wider BlogLayout container.

#### BlogPostPage.tsx (line 80)

Remove `max-w-[680px]` from the content wrapper. The `flex-1` fills available space, capped by the parent `max-w-6xl`.

Before:
```jsx
<div className="flex-1 min-w-0 max-w-[680px]">
```

After:
```jsx
<div className="flex-1 min-w-0">
```

On a 1280px viewport: sidebar (250px) + padding (32px) = 282px, leaving ~998px for the main area. The `max-w-6xl` caps at 1152px but 998px is smaller, so effective content area is ~998px. With TOC visible (208px + 32px gap), code blocks get ~758px. Without TOC (screens < lg), code blocks get ~998px. Prose is always constrained to 680px via CSS (see below).

#### index.css — Prose Width Constraint

Add CSS rules to constrain prose elements within `.markdown-body` to 680px:

```css
.markdown-body > p,
.markdown-body > h1,
.markdown-body > h2,
.markdown-body > h3,
.markdown-body > h4,
.markdown-body > h5,
.markdown-body > h6,
.markdown-body > ul,
.markdown-body > ol,
.markdown-body > blockquote,
.markdown-body > hr,
.markdown-body > .overflow-x-auto /* table wrapper */ {
  max-width: 680px;
}
```

Note: ReactMarkdown renders elements as direct children of `.markdown-body` (no intermediate wrapper), so the `>` direct-child selector works correctly.

Code blocks (`.code-block-wrapper`) are NOT included, so they fill the parent width. Images inside `<p>` tags inherit the 680px prose constraint, which is acceptable for now.

Note: h4-h6 are included in the CSS width constraint for completeness. The existing `renderHeading` function in MarkdownRenderer only handles h1-h3 (the only levels used in blog content). Adding h4-h6 component overrides is intentionally deferred — they can be added later if blog content starts using deeper heading levels.

### 2. CodeBlock Component

Create a new `CodeBlock` wrapper that replaces the raw `<pre>` for fenced code blocks.

**Important: react-markdown nesting.** In react-markdown, a fenced code block produces `<pre><code class="language-x">...</code></pre>`. The `code` component handler replaces the inner `<code>`, NOT the outer `<pre>`. The current code incorrectly returns `<pre>` from the `code` handler, producing nested `<pre><pre>`. To fix this, we override **both** `pre` and `code` components:

- **`pre` component**: Renders the `CodeBlock` wrapper (the outer container with copy button, scroll shadows, language badge).
- **`code` component**: For block code (has className), returns just the `<code>` element. For inline code, returns styled `<code>`. For mermaid, returns `<MermaidRenderer>`.

**File:** New component `src/components/markdown/CodeBlock.tsx`

**Features:**
- **Language badge** — top-left, subtle, shows detected language
- **Copy button** — top-right, `aria-label="Copy code"`, copies code text to clipboard, shows "Copied!" feedback for 2 seconds via `aria-live="polite"` region
- **Scroll shadows** — gradient overlays on left/right edges that appear only when content overflows horizontally. Detected via scroll position and element dimensions using a scroll event handler that toggles `can-scroll-left` / `can-scroll-right` CSS classes.
- **No max-width** — fills available parent width
- Preserves existing `atom-one-dark` syntax highlighting and the reading-mode dark background override

**Structure:**
```jsx
<div className="code-block-wrapper relative my-4 group">
  {language && <span className="code-lang-badge">{language}</span>}
  <button className="code-copy-btn" aria-label="Copy code" onClick={handleCopy}>
    {copied ? <span aria-live="polite">Copied!</span> : <CopyIcon />}
  </button>
  <div className="code-scroll-container overflow-x-auto" ref={scrollRef} onScroll={handleScroll}>
    {children} {/* The <code> element from react-markdown */}
  </div>
</div>
```

**MarkdownRenderer component overrides:**
```tsx
pre({ children, ...props }) {
  // Extract language from the inner <code> element's className
  const codeEl = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === 'code'
  );
  const language = React.isValidElement(codeEl)
    ? /language-(\w+)/.exec(codeEl.props.className || '')?.[1] || ''
    : '';
  return <CodeBlock language={language}>{children}</CodeBlock>;
},
code({ className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const isInline = !className;

  if (language === "mermaid") {
    return <MermaidRenderer code={String(children).replace(/\n$/, "")} />;
  }

  // Block code: return just <code>, the <pre> wrapper handles the container
  if (!isInline) {
    return <code className={className} {...props}>{children}</code>;
  }

  // Inline code
  return <code className="bg-secondary text-foreground px-1 rounded" {...props}>{children}</code>;
}
```

**Scroll shadow CSS (index.css):**
```css
.code-block-wrapper {
  position: relative;
}

.code-block-wrapper::before,
.code-block-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 24px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 200ms;
  z-index: 1;
}

/* Matrix theme: gradient from code block bg (same as --background) */
.code-block-wrapper::before {
  left: 0;
  background: linear-gradient(to right, hsl(var(--background)), transparent);
}
.code-block-wrapper::after {
  right: 0;
  background: linear-gradient(to left, hsl(var(--background)), transparent);
}

/* Reading theme: gradient from dark code block bg, not the page cream bg */
.theme-reading .code-block-wrapper::before {
  left: 0;
  background: linear-gradient(to right, hsl(220 13% 18%), transparent);
}
.theme-reading .code-block-wrapper::after {
  right: 0;
  background: linear-gradient(to left, hsl(220 13% 18%), transparent);
}

.code-block-wrapper.can-scroll-left::before,
.code-block-wrapper.can-scroll-right::after {
  opacity: 1;
}
```

### 3. Mermaid Theme-Aware Rendering

**Goal:** Mermaid diagrams render with the correct color palette for the active theme, without relying on external CSS overrides.

#### Changes to MarkdownRenderer.tsx

**Remove** the top-level `mermaid.initialize()` call (lines 45-69).

**Create a `useMermaidTheme` hook** (defined in `MarkdownRenderer.tsx` alongside `MermaidRenderer`, since both are internal to that module) that centralizes mermaid initialization. This avoids calling `mermaid.initialize()` per-component (which is unsupported — mermaid treats it as a global singleton config). The hook:

1. Detects the current theme via `document.querySelector('.theme-reading')`
2. Watches for theme changes via `MutationObserver` on `document.documentElement` (the `class` attribute changes when `.theme-reading` is toggled)
3. Calls `mermaid.initialize()` once per theme change
4. Returns the current theme state so MermaidRenderer can include it in its `useEffect` dependency array

```tsx
function useMermaidTheme() {
  const [isReading, setIsReading] = useState(
    () => !!document.querySelector('.theme-reading')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsReading(!!document.querySelector('.theme-reading'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeCSS: isReading ? readingThemeCSS : matrixThemeCSS,
    });
  }, [isReading]);

  return isReading;
}
```

**MermaidRenderer component** — uses the hook and includes theme in deps:

```tsx
const MermaidRenderer = ({ code }: { code: string }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const isReading = useMermaidTheme();

  useEffect(() => {
    if (!mermaidRef.current) return;

    // Generate a fresh ID for each render to avoid mermaid's global ID registry conflicts
    const codeId = `mermaid-${crypto.randomUUID()}`;
    mermaidRef.current.innerHTML = '';

    mermaid.render(codeId, code)
      .then(({ svg }) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      })
      .catch((error) => {
        console.error('Failed to render mermaid diagram:', error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<pre>Error: ${error.message}</pre>`;
        }
      });
  }, [code, isReading]);

  return <div className="my-6" ref={mermaidRef} />;
};
```

**Bugfix note:** The existing code generates `codeId` outside the `useEffect` (line 73) and includes it in the dependency array (line 92). Since `Math.random()` produces a new value every render, this creates an infinite re-render loop. The fix above generates the ID inside the effect, avoiding the loop, and uses `crypto.randomUUID()` for better uniqueness.

**Theme CSS constants:**

```ts
const matrixThemeCSS = `
  .node rect, .node circle, .node ellipse, .node polygon, .node path {
    fill: hsl(120 10% 7%);
    stroke: hsl(120 100% 50%);
  }
  .edgePath .path { stroke: hsl(120 100% 50%); }
  .cluster rect { fill: hsl(120 10% 4%); stroke: hsl(120 100% 50%); }
  .label { color: hsl(120 100% 65%); }
  .edgeLabel { background-color: hsl(120 10% 7%); color: hsl(120 100% 65%); }
`;

const readingThemeCSS = `
  .node rect, .node circle, .node ellipse, .node polygon, .node path {
    fill: hsl(30 15% 90%);
    stroke: hsl(30 20% 50%);
  }
  .edgePath .path { stroke: hsl(30 10% 45%); }
  .cluster rect { fill: hsl(30 15% 92%); stroke: hsl(30 20% 50%); }
  .label { color: hsl(30 10% 15%); }
  .edgeLabel { background-color: hsl(30 15% 88%); color: hsl(30 10% 15%); }
`;
```

#### Cleanup in index.css

Remove the now-unnecessary Mermaid CSS overrides (lines 297-312) since the SVG is rendered with correct styles from the start.

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/blog/BlogLayout.tsx` | Widen `max-w-3xl` → `max-w-6xl` |
| `src/features/blog/BlogIndex.tsx` | Wrap root in `max-w-3xl mx-auto` div |
| `src/features/blog/BlogPostPage.tsx` | Remove `max-w-[680px]` from content wrapper |
| `src/components/markdown/CodeBlock.tsx` | **New** — code block wrapper with copy, language badge, scroll shadows |
| `src/components/markdown/MarkdownRenderer.tsx` | Override `pre` + `code` components, `useMermaidTheme` hook, theme-aware MermaidRenderer |
| `src/index.css` | Prose width constraint, scroll shadow styles (theme-aware), remove Mermaid CSS overrides |

## Testing

- Desktop: code blocks visibly wider than prose paragraphs
- Mobile: scroll shadows appear on overflowing code blocks
- Copy button: copies code content to clipboard, shows "Copied!" feedback
- No nested `<pre>` elements in DOM (verify with DevTools)
- Mermaid in reading mode: warm brown/cream palette, no green
- Mermaid in Matrix mode: green-on-black palette unchanged
- Theme toggle: mermaid diagrams re-render with correct colors after switching
- TOC sidebar: still functional and properly positioned
- BlogIndex: layout unchanged (still constrained to max-w-3xl)
- Accessibility: copy button focusable via keyboard, aria-label present
