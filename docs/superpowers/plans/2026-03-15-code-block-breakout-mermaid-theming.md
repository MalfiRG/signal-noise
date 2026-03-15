# Code Block Breakout & Mermaid Theme-Aware Rendering — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make code blocks break out of the narrow prose column for better readability, and fix Mermaid diagram colors in reading mode.

**Architecture:** Widen the blog layout container, constrain prose elements via CSS while letting code blocks fill available width. Replace raw `<pre>` with a `CodeBlock` component (copy button, scroll shadows, language badge). Make MermaidRenderer detect the active theme and initialize mermaid with correct colors before rendering.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, react-markdown, highlight.js, mermaid, Vitest + @testing-library/react, Playwright

**Spec:** `docs/superpowers/specs/2026-03-15-code-block-breakout-mermaid-theming-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/features/blog/BlogLayout.tsx` | Modify: widen `max-w-3xl` → `max-w-6xl` |
| `src/features/blog/BlogIndex.tsx` | Modify: wrap fragment root in `max-w-3xl mx-auto` div |
| `src/features/blog/BlogPostPage.tsx` | Modify: remove `max-w-[680px]` from content wrapper |
| `src/components/markdown/CodeBlock.tsx` | **Create**: code block wrapper with copy, scroll shadows, language badge |
| `src/components/markdown/CodeBlock.test.tsx` | **Create**: unit tests for CodeBlock |
| `src/components/markdown/MarkdownRenderer.tsx` | Modify: override `pre`+`code` components, add `useMermaidTheme` hook, update MermaidRenderer |
| `src/index.css` | Modify: add prose width constraint, scroll shadow styles, remove Mermaid CSS overrides |
| `e2e/blog-rendering.spec.ts` | Modify: update code block selectors for new DOM structure |
| `e2e/reading-mode.spec.ts` | Modify: update `pre` selectors for new CodeBlock wrapper |

---

## Chunk 1: Layout Restructure & CSS Prose Constraint

### Task 1: Widen BlogLayout Container

**Files:**
- Modify: `src/features/blog/BlogLayout.tsx:66`

- [ ] **Step 1: Change max-w-3xl to max-w-6xl**

In `BlogLayout.tsx` line 66, change:
```tsx
<div className="mx-auto max-w-3xl">
```
to:
```tsx
<div className="mx-auto max-w-6xl">
```

Also update the comment above it (lines 63-65) to reflect the change:
```tsx
{/* max-w-6xl gives code blocks room to breathe while keeping layout centered.
    BlogIndex constrains itself to max-w-3xl internally.
    Prose elements are constrained to 680px via CSS in index.css. */}
```

- [ ] **Step 2: Run dev server and verify blog index appears**

Run: `npm run dev`
Expected: Blog index at `/blog` renders. Content may appear wider than before (we fix this in the next task).

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/BlogLayout.tsx
git commit -m "widen BlogLayout container from max-w-3xl to max-w-6xl"
```

---

### Task 2: Constrain BlogIndex Width

**Files:**
- Modify: `src/features/blog/BlogIndex.tsx`

- [ ] **Step 1: Wrap fragment root in max-w-3xl div**

In `BlogIndex.tsx`, change the return from a fragment `<>...</>` to a `<div>` wrapper:

```tsx
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-12">
        <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} cat ~/blog/posts.md</p>
        <h1 className="font-display text-4xl font-bold text-foreground text-glow">BLOG</h1>
      </div>

      {filteredPosts.length > 0 ? (
        // ... rest unchanged
```

Close with `</div>` instead of `</>`.

- [ ] **Step 2: Run existing BlogIndex unit tests**

Run: `npx vitest run src/features/blog/BlogIndex.test.tsx`
Expected: All 3 tests pass. The wrapper div doesn't affect content rendering.

- [ ] **Step 3: Verify visually**

Open `/blog` in browser. Layout should look identical to before (the new div constrains to the same 768px the parent used to).

- [ ] **Step 4: Commit**

```bash
git add src/features/blog/BlogIndex.tsx
git commit -m "wrap BlogIndex root in max-w-3xl container"
```

---

### Task 3: Remove BlogPostPage Width Constraint

**Files:**
- Modify: `src/features/blog/BlogPostPage.tsx:80`

- [ ] **Step 1: Remove max-w-[680px] from content wrapper**

In `BlogPostPage.tsx` line 80, change:
```tsx
<div className="flex-1 min-w-0 max-w-[680px]">
```
to:
```tsx
<div className="flex-1 min-w-0">
```

- [ ] **Step 2: Verify visually**

Open a blog post in browser. Content (including prose) will now be wider than before. This is expected — the CSS prose constraint in the next task will fix prose width.

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/BlogPostPage.tsx
git commit -m "remove max-w-[680px] from BlogPostPage content wrapper"
```

---

### Task 4: Add CSS Prose Width Constraint

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add prose width constraint rules**

In `src/index.css`, inside the `@layer components` block (after the existing `.markdown-body hr` rule around line 239), add:

```css
  /* Prose width constraint: keep text readable while code blocks break out */
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
  .markdown-body > .overflow-x-auto {
    max-width: 680px;
  }
```

- [ ] **Step 2: Verify visually**

Open a blog post. Prose (paragraphs, headings, lists) should be constrained to ~680px. Code blocks (`<pre>`) should be wider, filling the available parent width.

- [ ] **Step 3: Run existing e2e tests to check nothing broke**

Run: `npx playwright test e2e/reading-mode.spec.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "add CSS prose width constraint for code block breakout"
```

---

## Chunk 2: CodeBlock Component

### Task 5: Write CodeBlock Unit Tests

**Files:**
- Create: `src/components/markdown/CodeBlock.test.tsx`

- [ ] **Step 1: Write failing tests for CodeBlock**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeBlock } from "./CodeBlock";

// Mock navigator.clipboard
beforeEach(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

describe("CodeBlock", () => {
  it("renders children inside a code-block-wrapper", () => {
    render(
      <CodeBlock language="typescript">
        <code>const x = 1;</code>
      </CodeBlock>
    );
    const wrapper = document.querySelector(".code-block-wrapper");
    expect(wrapper).toBeTruthy();
    expect(screen.getByText("const x = 1;")).toBeTruthy();
  });

  it("shows language badge when language is provided", () => {
    render(
      <CodeBlock language="python">
        <code>print("hello")</code>
      </CodeBlock>
    );
    expect(screen.getByText("python")).toBeTruthy();
  });

  it("hides language badge when language is empty", () => {
    render(
      <CodeBlock language="">
        <code>some code</code>
      </CodeBlock>
    );
    const badge = document.querySelector(".code-lang-badge");
    expect(badge).toBeNull();
  });

  it("has a copy button with aria-label", () => {
    render(
      <CodeBlock language="js">
        <code>let a = 1;</code>
      </CodeBlock>
    );
    const btn = screen.getByRole("button", { name: "Copy code" });
    expect(btn).toBeTruthy();
  });

  it("copies code text to clipboard on click", async () => {
    const user = userEvent.setup();
    render(
      <CodeBlock language="js">
        <code>let a = 1;</code>
      </CodeBlock>
    );
    const btn = screen.getByRole("button", { name: "Copy code" });
    await user.click(btn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("let a = 1;");
  });

  it("shows Copied! feedback after clicking copy", async () => {
    const user = userEvent.setup();
    render(
      <CodeBlock language="js">
        <code>let a = 1;</code>
      </CodeBlock>
    );
    const btn = screen.getByRole("button", { name: "Copy code" });
    await user.click(btn);
    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  it("has overflow-x-auto on the scroll container", () => {
    render(
      <CodeBlock language="js">
        <code>code</code>
      </CodeBlock>
    );
    const scrollContainer = document.querySelector(".code-scroll-container");
    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer!.classList.contains("overflow-x-auto")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/markdown/CodeBlock.test.tsx`
Expected: FAIL — `CodeBlock` module not found.

---

### Task 6: Implement CodeBlock Component

**Files:**
- Create: `src/components/markdown/CodeBlock.tsx`

- [ ] **Step 1: Create the CodeBlock component**

```tsx
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  language: string;
  children: ReactNode;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    const codeText = scrollRef.current?.textContent || "";
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const updateScrollShadows = useCallback(() => {
    const el = scrollRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;

    wrapper.classList.toggle("can-scroll-left", canScrollLeft);
    wrapper.classList.toggle("can-scroll-right", canScrollRight);
  }, []);

  useEffect(() => {
    updateScrollShadows();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateScrollShadows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollShadows]);

  return (
    <div ref={wrapperRef} className="code-block-wrapper relative my-4 group">
      {language && (
        <span className="code-lang-badge absolute top-2 left-3 text-xs text-muted-foreground opacity-60 select-none z-10">
          {language}
        </span>
      )}
      <button
        className="code-copy-btn absolute top-2 right-3 p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
        aria-label="Copy code"
        onClick={handleCopy}
      >
        {copied ? (
          <span aria-live="polite" className="flex items-center gap-1 text-xs">
            <Check className="h-3.5 w-3.5" /> Copied!
          </span>
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <div
        ref={scrollRef}
        className="code-scroll-container overflow-x-auto"
        onScroll={updateScrollShadows}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/components/markdown/CodeBlock.test.tsx`
Expected: All 7 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/markdown/CodeBlock.tsx src/components/markdown/CodeBlock.test.tsx
git commit -m "add CodeBlock component with copy button, language badge, scroll shadows"
```

---

### Task 7: Add Scroll Shadow CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add scroll shadow styles**

In `src/index.css`, inside the `@layer components` block:

**First**, update the reading-mode code block dark background rule. The existing rule (lines 277-280) targets `pre`, which no longer exists. Change:

```css
  /* BEFORE: */
  .theme-reading .markdown-body pre {
    background-color: hsl(220 13% 18%) !important;
    color: hsl(220 14% 71%) !important;
  }
```

to:

```css
  /* Code blocks: keep dark in reading mode */
  .theme-reading .markdown-body .code-block-wrapper code {
    background-color: hsl(220 13% 18%) !important;
    color: hsl(220 14% 71%) !important;
  }
```

**Then**, after the prose width constraint, add the scroll shadow styles:

```css
  /* Code block scroll shadows */
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

  .code-block-wrapper::before {
    left: 0;
    background: linear-gradient(to right, hsl(var(--background)), transparent);
  }
  .code-block-wrapper::after {
    right: 0;
    background: linear-gradient(to left, hsl(var(--background)), transparent);
  }

  .theme-reading .code-block-wrapper::before {
    background: linear-gradient(to right, hsl(220 13% 18%), transparent);
  }
  .theme-reading .code-block-wrapper::after {
    background: linear-gradient(to left, hsl(220 13% 18%), transparent);
  }

  .code-block-wrapper.can-scroll-left::before,
  .code-block-wrapper.can-scroll-right::after {
    opacity: 1;
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "add scroll shadow CSS for code block overflow indicators"
```

---

### Task 8: Wire CodeBlock into MarkdownRenderer

**Files:**
- Modify: `src/components/markdown/MarkdownRenderer.tsx:278-298`

- [ ] **Step 1: Add import for CodeBlock and React**

At the top of `MarkdownRenderer.tsx`, update the React import and add CodeBlock:
```tsx
import React, { useEffect, useRef, useState } from "react";
```
(merges the existing `{ useEffect, useRef, useState }` import with the default `React` import)

Add the CodeBlock import:
```tsx
import { CodeBlock } from "./CodeBlock";
```

- [ ] **Step 2: Add `pre` component override and update `code` override**

In the `components` prop of `<ReactMarkdown>` (around line 219), add a `pre` handler and replace the existing `code` handler (lines 278-298):

Add after the `tr` handler (line 276):

```tsx
          pre({ children }) {
            const codeEl = React.Children.toArray(children).find(
              (child) => React.isValidElement(child) && child.type === "code"
            );
            const className = React.isValidElement(codeEl)
              ? (codeEl as React.ReactElement<{ className?: string }>).props?.className || ""
              : "";

            // Mermaid blocks are handled by the code handler — don't wrap in CodeBlock
            if (className.includes("language-mermaid")) {
              return <>{children}</>;
            }

            const language = /language-(\w+)/.exec(className)?.[1] || "";
            return <CodeBlock language={language}>{children}</CodeBlock>;
          },

          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const isInline = !className;

            if (language === "mermaid") {
              return <MermaidRenderer code={String(children).replace(/\n$/, "")} />;
            }

            // Block code: padding/border on the element, background from highlight.js atom-one-dark
            if (!isInline) {
              return (
                <code className={`${className} block p-4 rounded border border-border`} {...props}>
                  {children}
                </code>
              );
            }

            // Inline code
            return (
              <code className="bg-secondary text-foreground px-1 rounded" {...props}>
                {children}
              </code>
            );
          },
```

Note: Block `<code>` gets `p-4 rounded border border-border` for layout but NO `bg-background` — the dark background comes from highlight.js `atom-one-dark.css` (`.hljs { background: #282c34 }`). The reading-mode dark background is handled by CSS targeting `.code-block-wrapper code` (see Task 7). Mermaid blocks bypass the CodeBlock wrapper entirely so they don't get a copy button or language badge.

- [ ] **Step 3: Run unit tests**

Run: `npx vitest run`
Expected: All tests pass (CodeBlock tests + existing tests).

- [ ] **Step 4: Run dev server and verify code blocks render correctly**

Open a blog post with code blocks. Verify:
- Code blocks have language badge (top-left)
- Copy button appears on hover (top-right)
- Code blocks are wider than prose
- Syntax highlighting still works
- Inline code (`backtick`) still renders correctly

- [ ] **Step 5: Commit**

```bash
git add src/components/markdown/MarkdownRenderer.tsx
git commit -m "wire CodeBlock into MarkdownRenderer with pre/code overrides"
```

---

## Chunk 3: Mermaid Theme-Aware Rendering

### Task 9: Add useMermaidTheme Hook and Update MermaidRenderer

**Files:**
- Modify: `src/components/markdown/MarkdownRenderer.tsx:45-94`

- [ ] **Step 1: Replace the top-level mermaid.initialize() and MermaidRenderer**

Remove lines 45-95 (the `mermaid.initialize()` call, the current `MermaidRenderer` component, and the `codeId` line).

Replace with:

```tsx
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

function useMermaidTheme() {
  const [isReading, setIsReading] = useState(
    () => !!document.querySelector(".theme-reading")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsReading(!!document.querySelector(".theme-reading"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeCSS: isReading ? readingThemeCSS : matrixThemeCSS,
    });
  }, [isReading]);

  return isReading;
}

const MermaidRenderer = ({ code }: { code: string }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const isReading = useMermaidTheme();

  useEffect(() => {
    if (!mermaidRef.current) return;

    const codeId = `mermaid-${crypto.randomUUID()}`;
    mermaidRef.current.innerHTML = "";

    mermaid
      .render(codeId, code)
      .then(({ svg }) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      })
      .catch((error) => {
        console.error("Failed to render mermaid diagram:", error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<pre>Error rendering diagram: ${error.message}</pre>`;
        }
      });
  }, [code, isReading]);

  return <div className="my-6" ref={mermaidRef} />;
};
```

- [ ] **Step 2: Remove Mermaid CSS overrides from index.css**

In `src/index.css`, delete the Mermaid CSS override block (lines 297-312):

```css
  /* DELETE THIS BLOCK: */
  /* Mermaid diagrams: warm tones */
  .theme-reading .mermaid .node rect,
  .theme-reading .mermaid .node polygon {
    fill: hsl(30 15% 90%) !important;
    stroke: hsl(30 20% 50%) !important;
  }
  .theme-reading .mermaid .edgeLabel {
    background-color: hsl(30 15% 88%) !important;
    color: hsl(30 10% 15%) !important;
  }
  .theme-reading .mermaid text {
    fill: hsl(30 10% 15%) !important;
  }
  .theme-reading .mermaid .edgePath path {
    stroke: hsl(30 10% 45%) !important;
  }
```

- [ ] **Step 3: Run unit tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Verify mermaid diagrams visually**

Open a blog post with Mermaid diagrams in the browser. Verify:
- In reading mode (blog post page): diagrams use warm brown/cream palette
- Navigate to a Matrix-themed page with mermaid (if any): diagrams use green/black palette

- [ ] **Step 5: Commit**

```bash
git add src/components/markdown/MarkdownRenderer.tsx src/index.css
git commit -m "make MermaidRenderer theme-aware with useMermaidTheme hook

Removes top-level mermaid.initialize() and CSS !important overrides.
Mermaid now re-initializes with correct themeCSS when theme changes.
Also fixes infinite re-render loop caused by codeId in dependency array."
```

---

## Chunk 4: E2E Test Updates

### Task 10: Update Code Block E2E Tests

**Files:**
- Modify: `e2e/blog-rendering.spec.ts:71-93`

- [ ] **Step 1: Update code block test selectors**

The old tests look for `pre.overflow-x-auto` and `pre > code`. The new DOM structure is:
```
.code-block-wrapper > .code-scroll-container.overflow-x-auto > code.block.hljs
```
Mermaid blocks bypass CodeBlock and render directly as `<div class="my-6"><svg>...</svg></div>`.

Replace the "Code blocks" describe block (lines 71-94) with:

```ts
test.describe("Code blocks", () => {
  test("syntax highlighting is applied to code blocks", async ({ page, blogPage }) => {
    const highlightedCode = page.locator(".code-block-wrapper code[class*='hljs']");
    const count = await highlightedCode.count();
    expect(count).toBeGreaterThan(0);
  });

  test("code blocks have scroll container with overflow-x-auto", async ({ page, blogPage }) => {
    const scrollContainers = page.locator(".code-block-wrapper .code-scroll-container");
    const count = await scrollContainers.count();
    expect(count).toBeGreaterThan(0);

    const firstContainer = scrollContainers.first();
    const overflowX = await firstContainer.evaluate((el) => window.getComputedStyle(el).overflowX);
    expect(["auto", "scroll"]).toContain(overflowX);
  });

  test("code blocks have a copy button", async ({ page, blogPage }) => {
    const copyBtn = page.locator(".code-block-wrapper button[aria-label='Copy code']").first();
    await expect(copyBtn).toBeAttached();
  });

  test("code blocks show language badge", async ({ page, blogPage }) => {
    const badge = page.locator(".code-block-wrapper .code-lang-badge").first();
    await expect(badge).toBeAttached();
    const text = await badge.textContent();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("code blocks are wider than prose paragraphs", async ({ page, blogPage }) => {
    const paragraph = page.locator(".markdown-body > p").first();
    const codeBlock = page.locator(".code-block-wrapper").first();

    await expect(paragraph).toBeVisible();
    await expect(codeBlock).toBeVisible();

    const pBox = await paragraph.boundingBox();
    const codeBox = await codeBlock.boundingBox();

    expect(pBox).not.toBeNull();
    expect(codeBox).not.toBeNull();
    expect(codeBox!.width).toBeGreaterThan(pBox!.width);
  });

  test("inline code has bg-secondary class", async ({ page, blogPage }) => {
    const inlineCode = page.locator(".markdown-body code:not(.code-block-wrapper code)").first();
    await expect(inlineCode).toHaveClass(/bg-secondary/);
  });
});
```

- [ ] **Step 2: Update reading-mode pre selector**

In `e2e/reading-mode.spec.ts`, the "Code blocks stay dark" test (lines 77-89) uses `.theme-reading .markdown-body pre`. Update it to target the `code` element inside CodeBlock instead:

Replace lines 77-89 with:
```ts
test.describe("Code blocks stay dark", () => {
  test("code block elements keep dark background in reading mode", async ({ page, blogPage }) => {
    const codeEl = page.locator(".theme-reading .markdown-body .code-block-wrapper code").first();
    await expect(codeEl).toBeVisible();
    const bgColor = await codeEl.evaluate((el) => getComputedStyle(el).backgroundColor);
    const match = bgColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
    expect(match).toBeTruthy();
    const [, r, g, b] = match!.map(Number);
    expect(r).toBeLessThan(80);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(80);
  });
});
```

- [ ] **Step 3: Run all e2e tests**

Run: `npx playwright test`
Expected: All e2e tests pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/blog-rendering.spec.ts e2e/reading-mode.spec.ts
git commit -m "update e2e tests for new CodeBlock component DOM structure"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All pass.

- [ ] **Step 2: Run all e2e tests**

Run: `npx playwright test`
Expected: All pass.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: No TypeScript errors, clean build.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: No lint errors.

- [ ] **Step 5: Manual spot-check checklist**

Open dev server and verify:
- [ ] Blog post: code blocks wider than prose on desktop
- [ ] Blog post: copy button works (hover to reveal, click copies)
- [ ] Blog post: language badge shows on code blocks
- [ ] Blog post: scroll shadows appear on mobile-width viewport
- [ ] Blog post: Mermaid diagrams use warm colors in reading mode
- [ ] Blog post: Mermaid diagrams do NOT have copy button or language badge
- [ ] Blog post: copy button is keyboard-focusable (Tab key)
- [ ] Blog index: layout unchanged (narrow, centered)
- [ ] TOC sidebar: still functional on large screens
- [ ] Inline code: still styled correctly (bg-secondary)
- [ ] No nested `<pre>` elements (check DevTools)

- [ ] **Step 6: Clean up any temp files**

Run: `git status`
Remove any untracked artifacts before final commit.
