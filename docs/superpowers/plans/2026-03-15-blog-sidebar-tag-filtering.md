# Blog Sidebar Navigation & Tag Filtering — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Obsidian-style collapsible sidebar with category-based file tree and AND-logic tag filtering to the blog section.

**Architecture:** Shared `BlogLayout` wraps all `/blog/*` routes via React Router nested layout. Sidebar renders `CategoryTree` + `TagFilter`. Filter state lives in URL search params (`?tags=`). Child routes consume filtered data via `useOutletContext`.

**Tech Stack:** React 18, TypeScript, React Router 6 (nested routes, Outlet context), Tailwind CSS, Framer Motion, Lucide icons, shadcn/ui Sheet, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-03-15-blog-sidebar-tag-filtering-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/features/blog/data.ts` | Add `category` to `BlogPost`, export `BlogOutletContext` type |
| Create | `src/features/blog/TagFilter.tsx` | Clickable tag pills with AND toggle logic |
| Create | `src/features/blog/CategoryTree.tsx` | Collapsible category→post tree with filtering |
| Create | `src/features/blog/BlogSidebar.tsx` | Composes CategoryTree + TagFilter; mobile Sheet wrapper |
| Create | `src/features/blog/BlogLayout.tsx` | Page shell, sidebar + Outlet, filter state from URL |
| Create | `src/pages/BlogLayoutPage.tsx` | Thin wrapper rendering BlogLayout |
| Modify | `src/features/blog/BlogIndex.tsx` | Strip page shell, consume outlet context |
| Modify | `src/features/blog/BlogPostPage.tsx` | Strip page shell, consume outlet context, clickable tags, back link with params |
| Modify | `src/App.tsx` | Nest blog routes under BlogLayoutPage |

---

## Chunk 0: Prerequisites

### Task 0: Install missing test dependency

- [ ] **Step 1: Install @testing-library/user-event**

```bash
npm install --legacy-peer-deps -D @testing-library/user-event
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @testing-library/user-event dev dependency"
```

---

## Chunk 1: Data Model + TagFilter

### Task 1: Update BlogPost interface and add BlogOutletContext type

**Files:**
- Modify: `src/features/blog/data.ts`

- [ ] **Step 1: Update data.ts with category field and context type**

```typescript
export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  category: string;
  excerpt: string;
}

export interface BlogOutletContext {
  filteredPosts: BlogPost[];
  activeTags: string[];
  allTags: string[];
}

export const blogPosts: BlogPost[] = [];
```

**Note:** Adding `category` is a breaking change for any existing `blogPosts` entries. Currently the array is empty, so no migration needed. If posts have been added before this task runs, each entry needs a `category: string` value added.

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `npm run test`
Expected: All tests pass (the example test and any others).

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/data.ts
git commit -m "feat(blog): add category field and BlogOutletContext type"
```

---

### Task 2: Create TagFilter component

**Files:**
- Create: `src/features/blog/TagFilter.tsx`
- Create: `src/features/blog/TagFilter.test.tsx`

- [ ] **Step 1: Write failing tests for TagFilter**

Create `src/features/blog/TagFilter.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagFilter from "./TagFilter";

describe("TagFilter", () => {
  const allTags = ["testing", "automation", "ci-cd"];

  it("renders all tags as buttons", () => {
    render(<TagFilter allTags={allTags} activeTags={[]} onToggleTag={() => {}} />);
    expect(screen.getByRole("button", { name: "#testing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#automation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#ci-cd" })).toBeInTheDocument();
  });

  it("marks active tags with aria-pressed=true", () => {
    render(<TagFilter allTags={allTags} activeTags={["testing"]} onToggleTag={() => {}} />);
    expect(screen.getByRole("button", { name: "#testing" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "#automation" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onToggleTag with tag name when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TagFilter allTags={allTags} activeTags={[]} onToggleTag={onToggle} />);
    await user.click(screen.getByRole("button", { name: "#automation" }));
    expect(onToggle).toHaveBeenCalledWith("automation");
  });

  it("renders nothing when allTags is empty", () => {
    const { container } = render(<TagFilter allTags={[]} activeTags={[]} onToggleTag={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/blog/TagFilter.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement TagFilter**

Create `src/features/blog/TagFilter.tsx`:

```tsx
interface TagFilterProps {
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

const TagFilter = ({ allTags, activeTags, onToggleTag }: TagFilterProps) => {
  if (allTags.length === 0) return null;

  return (
    <div className="px-3 py-4 border-t border-border">
      <p className="text-xs tracking-[0.2em] text-muted-foreground mb-3">TAGS</p>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const isActive = activeTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              aria-pressed={isActive}
              className={`text-xs px-2 py-1 border rounded transition-colors tracking-wider ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              #{tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TagFilter;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/features/blog/TagFilter.test.tsx`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/blog/TagFilter.tsx src/features/blog/TagFilter.test.tsx
git commit -m "feat(blog): add TagFilter component with AND-logic tag pills"
```

---

## Chunk 2: CategoryTree

### Task 3: Create CategoryTree component

**Files:**
- Create: `src/features/blog/CategoryTree.tsx`
- Create: `src/features/blog/CategoryTree.test.tsx`

- [ ] **Step 1: Write failing tests for CategoryTree**

Create `src/features/blog/CategoryTree.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CategoryTree from "./CategoryTree";
import type { BlogPost } from "./data";

// Mock framer-motion to avoid AnimatePresence timing issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPosts: BlogPost[] = [
  { slug: "post-1", title: "Post One", date: "2026-01-01", tags: ["testing"], category: "QA", excerpt: "" },
  { slug: "post-2", title: "Post Two", date: "2026-01-02", tags: ["automation"], category: "QA", excerpt: "" },
  { slug: "post-3", title: "Post Three", date: "2026-01-03", tags: ["devops"], category: "DevOps", excerpt: "" },
];

const renderTree = (props: Partial<Parameters<typeof CategoryTree>[0]> = {}) =>
  render(
    <MemoryRouter>
      <CategoryTree
        posts={mockPosts}
        filteredSlugs={mockPosts.map((p) => p.slug)}
        activeTags={[]}
        {...props}
      />
    </MemoryRouter>
  );

describe("CategoryTree", () => {
  it("renders category groups from posts", () => {
    renderTree();
    expect(screen.getByText("QA")).toBeInTheDocument();
    expect(screen.getByText("DevOps")).toBeInTheDocument();
  });

  it("renders post titles as links", () => {
    renderTree();
    expect(screen.getByRole("link", { name: /Post One/ })).toHaveAttribute("href", "/blog/post-1");
    expect(screen.getByRole("link", { name: /Post Three/ })).toHaveAttribute("href", "/blog/post-3");
  });

  it("categories start expanded by default", () => {
    renderTree();
    expect(screen.getByText("Post One")).toBeVisible();
    expect(screen.getByText("Post Three")).toBeVisible();
  });

  it("collapses category when clicking category header", async () => {
    const user = userEvent.setup();
    renderTree();
    await user.click(screen.getByText("QA"));
    expect(screen.queryByText("Post One")).not.toBeInTheDocument();
    expect(screen.getByText("Post Three")).toBeVisible(); // DevOps still expanded
  });

  it("dims posts not in filteredSlugs", () => {
    const { container } = renderTree({ filteredSlugs: ["post-1"] });
    const links = container.querySelectorAll("a");
    const post2Link = Array.from(links).find((a) => a.textContent?.includes("Post Two"));
    expect(post2Link?.className).toContain("opacity-30");
  });

  it("auto-collapses categories with zero visible posts when filters active", () => {
    // Only post-3 (DevOps) matches — QA category has zero visible posts
    renderTree({ filteredSlugs: ["post-3"], activeTags: ["devops"] });
    // QA posts should not be visible (category auto-collapsed)
    expect(screen.queryByText("Post One")).not.toBeInTheDocument();
    // DevOps posts should be visible
    expect(screen.getByText("Post Three")).toBeVisible();
  });

  it("shows empty state when no posts", () => {
    renderTree({ posts: [] });
    expect(screen.getByText(/NO ENTRIES IN INDEX/)).toBeInTheDocument();
  });

  it("groups posts without category under Uncategorized", () => {
    const posts: BlogPost[] = [
      { slug: "no-cat", title: "No Cat Post", date: "2026-01-01", tags: [], category: "", excerpt: "" },
    ];
    renderTree({ posts, filteredSlugs: ["no-cat"] });
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    expect(screen.getByText("No Cat Post")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/blog/CategoryTree.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CategoryTree**

Create `src/features/blog/CategoryTree.tsx`:

```tsx
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Folder, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BlogPost } from "./data";

interface CategoryTreeProps {
  posts: BlogPost[];
  filteredSlugs: string[];
  activeTags: string[];
}

const CategoryTree = ({ posts, filteredSlugs, activeTags }: CategoryTreeProps) => {
  const postsByCategory = useMemo(() => {
    const map: Record<string, BlogPost[]> = {};
    for (const post of posts) {
      const cat = post.category || "Uncategorized";
      if (!map[cat]) map[cat] = [];
      map[cat].push(post);
    }
    return map;
  }, [posts]);

  const categories = useMemo(() => Object.keys(postsByCategory).sort(), [postsByCategory]);

  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map((c) => [c, true]))
  );

  const toggleCategory = (cat: string) => {
    setManualExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Auto-collapse categories with zero visible posts when filters are active
  const getIsExpanded = (cat: string) => {
    if (activeTags.length > 0) {
      const hasVisiblePosts = postsByCategory[cat].some((p) => filteredSlugs.includes(p.slug));
      if (!hasVisiblePosts) return false;
    }
    return manualExpanded[cat] ?? true;
  };

  const tagParams = activeTags.length > 0 ? `?tags=${activeTags.join(",")}` : "";

  if (posts.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-muted-foreground text-xs tracking-wider">
          {">"} NO ENTRIES IN INDEX
        </p>
      </div>
    );
  }

  return (
    <div className="px-1 py-2" role="tree">
      {categories.map((cat) => {
        const isExpanded = getIsExpanded(cat);
        return (
          <div key={cat} role="treeitem" aria-expanded={isExpanded}>
            <button
              onClick={() => toggleCategory(cat)}
              className="flex items-center gap-1 w-full px-2 py-1.5 text-xs tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
              <Folder className="h-3 w-3" />
              <span>{cat}</span>
              <span className="ml-auto text-border">{postsByCategory[cat].length}</span>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {postsByCategory[cat].map((post) => {
                    const isDimmed = !filteredSlugs.includes(post.slug);
                    return (
                      <Link
                        key={post.slug}
                        to={`/blog/${post.slug}${tagParams}`}
                        className={`flex items-center gap-1 px-2 py-1 pl-7 text-xs tracking-wider transition-colors hover:text-primary ${
                          isDimmed
                            ? "text-muted-foreground opacity-30"
                            : "text-muted-foreground"
                        }`}
                      >
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{post.title}</span>
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryTree;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/features/blog/CategoryTree.test.tsx`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/blog/CategoryTree.tsx src/features/blog/CategoryTree.test.tsx
git commit -m "feat(blog): add CategoryTree component with collapsible category groups"
```

---

## Chunk 3: BlogSidebar + BlogLayout + Routing

### Task 4: Create BlogSidebar component

**Files:**
- Create: `src/features/blog/BlogSidebar.tsx`

- [ ] **Step 1: Implement BlogSidebar**

Create `src/features/blog/BlogSidebar.tsx`:

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { FolderTree } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import CategoryTree from "./CategoryTree";
import TagFilter from "./TagFilter";
import type { BlogPost } from "./data";

interface BlogSidebarProps {
  posts: BlogPost[];
  filteredSlugs: string[];
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

const SidebarContent = ({ posts, filteredSlugs, allTags, activeTags, onToggleTag }: BlogSidebarProps) => (
  <div className="flex flex-col h-full">
    <div className="px-3 pt-3 pb-2">
      <p className="text-xs tracking-[0.2em] text-muted-foreground">FILE EXPLORER</p>
    </div>
    <div className="flex-1 overflow-y-auto">
      <CategoryTree posts={posts} filteredSlugs={filteredSlugs} activeTags={activeTags} />
    </div>
    <TagFilter allTags={allTags} activeTags={activeTags} onToggleTag={onToggleTag} />
  </div>
);

const BlogSidebar = (props: BlogSidebarProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary mb-2"
          >
            <FolderTree className="h-4 w-4 mr-2" />
            <span className="text-xs tracking-wider">EXPLORER</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-background border-border w-72 p-0">
          <SheetHeader className="px-3 pt-3">
            <SheetTitle className="font-display text-foreground text-glow tracking-wider text-left text-sm">
              BLOG EXPLORER
            </SheetTitle>
          </SheetHeader>
          <SidebarContent {...props} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-[250px] flex-shrink-0 border-r border-border bg-card/30 overflow-y-auto">
      <SidebarContent {...props} />
    </aside>
  );
};

export default BlogSidebar;
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/BlogSidebar.tsx
git commit -m "feat(blog): add BlogSidebar with desktop panel and mobile Sheet"
```

---

### Task 5: Create BlogLayout and BlogLayoutPage

**Files:**
- Create: `src/features/blog/BlogLayout.tsx`
- Create: `src/pages/BlogLayoutPage.tsx`

- [ ] **Step 1: Implement BlogLayout**

Create `src/features/blog/BlogLayout.tsx`:

```tsx
import { useMemo, useCallback } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { blogPosts } from "./data";
import type { BlogOutletContext } from "./data";
import BlogSidebar from "./BlogSidebar";

const BlogLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTags = useMemo(() => {
    const tagsParam = searchParams.get("tags");
    if (!tagsParam) return [];
    return tagsParam.split(",").filter(Boolean);
  }, [searchParams]);

  const allTags = useMemo(
    () => [...new Set(blogPosts.flatMap((p) => p.tags))].sort(),
    []
  );

  const filteredPosts = useMemo(() => {
    if (activeTags.length === 0) return blogPosts;
    return blogPosts.filter((post) =>
      activeTags.every((tag) =>
        post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
    );
  }, [activeTags]);

  const filteredSlugs = useMemo(
    () => filteredPosts.map((p) => p.slug),
    [filteredPosts]
  );

  const handleToggleTag = useCallback(
    (tag: string) => {
      const next = activeTags.includes(tag)
        ? activeTags.filter((t) => t !== tag)
        : [...activeTags, tag];
      if (next.length === 0) {
        searchParams.delete("tags");
      } else {
        searchParams.set("tags", next.join(","));
      }
      setSearchParams(searchParams, { replace: true });
    },
    [activeTags, searchParams, setSearchParams]
  );

  const context: BlogOutletContext = { filteredPosts, activeTags, allTags };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="flex">
        <BlogSidebar
          posts={blogPosts}
          filteredSlugs={filteredSlugs}
          allTags={allTags}
          activeTags={activeTags}
          onToggleTag={handleToggleTag}
        />
        <main className="flex-1 px-4">
          {/* max-w-3xl used for both index and post views since sidebar takes ~250px.
              BlogIndex was max-w-3xl, BlogPostPage was max-w-4xl — unified to 3xl
              to keep content readable alongside the sidebar. */}
          <div className="mx-auto max-w-3xl">
            <Outlet context={context} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default BlogLayout;
```

- [ ] **Step 2: Create BlogLayoutPage thin wrapper**

Create `src/pages/BlogLayoutPage.tsx`:

```tsx
import BlogLayout from "@/features/blog/BlogLayout";

const BlogLayoutPage = () => <BlogLayout />;

export default BlogLayoutPage;
```

- [ ] **Step 3: Verify files compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/blog/BlogLayout.tsx src/pages/BlogLayoutPage.tsx
git commit -m "feat(blog): add BlogLayout with sidebar, filter state, and outlet context"
```

---

### Task 6: Update routing in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx to use nested layout route**

In `src/App.tsx`:

1. Add import: `import BlogLayoutPage from "./pages/BlogLayoutPage";`
2. Replace the two flat blog routes:

```tsx
// BEFORE:
<Route path="/blog" element={<BlogIndexPage />} />
<Route path="/blog/:slug" element={<BlogSlugPage />} />

// AFTER:
<Route path="/blog" element={<BlogLayoutPage />}>
  <Route index element={<BlogIndexPage />} />
  <Route path=":slug" element={<BlogSlugPage />} />
</Route>
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(blog): nest blog routes under BlogLayout"
```

---

## Chunk 4: Modify Existing Components

### Task 7: Update BlogIndex to consume outlet context

**Files:**
- Modify: `src/features/blog/BlogIndex.tsx`

- [ ] **Step 1: Write test for BlogIndex with outlet context**

Create `src/features/blog/BlogIndex.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import BlogIndex from "./BlogIndex";
import type { BlogPost, BlogOutletContext } from "./data";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPosts: BlogPost[] = [
  { slug: "post-a", title: "Alpha Post", date: "2026-01-01", tags: ["testing"], category: "QA", excerpt: "Excerpt A" },
  { slug: "post-b", title: "Beta Post", date: "2026-01-02", tags: ["automation"], category: "DevOps", excerpt: "Excerpt B" },
];

// Layout component that provides outlet context to child routes
const ContextProvider = ({ context }: { context: BlogOutletContext }) => (
  <Outlet context={context} />
);

const renderBlogIndex = (context: BlogOutletContext) =>
  render(
    <MemoryRouter initialEntries={["/blog"]}>
      <Routes>
        <Route path="/blog" element={<ContextProvider context={context} />}>
          <Route index element={<BlogIndex />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe("BlogIndex", () => {
  it("renders filtered posts from outlet context", () => {
    renderBlogIndex({ filteredPosts: mockPosts, activeTags: [], allTags: ["testing", "automation"] });
    expect(screen.getByText("Alpha Post")).toBeInTheDocument();
    expect(screen.getByText("Beta Post")).toBeInTheDocument();
  });

  it("shows empty state when no filtered posts with active filters", () => {
    renderBlogIndex({ filteredPosts: [], activeTags: ["nonexistent"], allTags: ["testing"] });
    expect(screen.getByText(/NO MATCHES/)).toBeInTheDocument();
  });

  it("shows buffer empty when no posts and no active tags", () => {
    renderBlogIndex({ filteredPosts: [], activeTags: [], allTags: [] });
    expect(screen.getByText(/BUFFER EMPTY/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/blog/BlogIndex.test.tsx`
Expected: FAIL — BlogIndex currently uses `useOutletContext` but there's no outlet parent (if running against old code), or the component crashes because it still imports `blogPosts` directly.

- [ ] **Step 3: Update BlogIndex to use outlet context**

Replace `src/features/blog/BlogIndex.tsx` with:

```tsx
import { Link } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import type { BlogOutletContext } from "./data";

const BlogIndex = () => {
  const { filteredPosts, activeTags } = useOutletContext<BlogOutletContext>();

  const tagParams = activeTags.length > 0 ? `?tags=${activeTags.join(",")}` : "";

  return (
    <>
      <div className="mb-12">
        <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} cat ~/blog/posts.md</p>
        <h1 className="font-display text-4xl font-bold text-foreground text-glow">BLOG</h1>
      </div>

      {filteredPosts.length > 0 ? (
        <div className="space-y-8">
          {filteredPosts.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/blog/${post.slug}${tagParams}`}
                className="block border border-border bg-card/50 p-6 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-muted-foreground text-xs tracking-wider">
                    {post.date}
                  </span>
                  {post.tags.length > 0 && (
                    <>
                      <span className="text-border">|</span>
                      {post.tags.map((tag) => (
                        <Link
                          key={tag}
                          to={`/blog?tags=${tag}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary/60 tracking-wider hover:text-primary transition-colors"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </>
                  )}
                </div>
                <h2 className="font-display text-xl font-bold text-foreground group-hover:text-glow mb-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      ) : activeTags.length > 0 ? (
        <div className="text-center py-20 border border-border/50">
          <p className="text-muted-foreground text-sm tracking-wider">
            {">"} NO MATCHES. REFINE SEARCH PARAMETERS.
          </p>
        </div>
      ) : (
        <div className="text-center py-20 border border-border/50">
          <p className="text-muted-foreground text-sm tracking-wider">
            {">"} NO POSTS FOUND. BUFFER EMPTY.
          </p>
        </div>
      )}
    </>
  );
};

export default BlogIndex;
```

Key changes:
- Removed `min-h-screen pt-24 pb-16 px-4` and `container mx-auto max-w-3xl` outer wrappers (BlogLayout owns these now)
- Uses `useOutletContext<BlogOutletContext>()` instead of importing `blogPosts`
- Tags on post cards are now clickable `Link` components to `/blog?tags={tag}`
- Post links include `tagParams` to preserve filter context
- Two distinct empty states: "NO MATCHES" (filters active) vs "BUFFER EMPTY" (no posts at all)

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/features/blog/BlogIndex.test.tsx`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/blog/BlogIndex.tsx src/features/blog/BlogIndex.test.tsx
git commit -m "feat(blog): BlogIndex consumes outlet context with tag filtering"
```

---

### Task 8: Update BlogPostPage to consume outlet context

**Files:**
- Modify: `src/features/blog/BlogPostPage.tsx`

- [ ] **Step 1: Update BlogPostPage**

Replace `src/features/blog/BlogPostPage.tsx` with:

```tsx
import { useParams, Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useMarkdownContent } from "@/hooks/useMarkdownContent";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { blogPosts } from "./data";
import type { BlogOutletContext } from "./data";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { activeTags } = useOutletContext<BlogOutletContext>();

  const contentMap = useMemo(() => {
    const map: Record<string, () => Promise<string>> = {};
    for (const post of blogPosts) {
      map[post.slug] = () =>
        import(`../../pages/content/blog/${post.slug}.md?raw`).then((mod) => mod.default);
    }
    return map;
  }, []);

  const { markdownContent, isLoading } = useMarkdownContent({
    contentMap,
    slug: slug || "",
    fallback: "# Content not found",
  });

  const postInfo = blogPosts.find((p) => p.slug === slug);

  const backParams = activeTags.length > 0 ? `?tags=${activeTags.join(",")}` : "";

  return (
    <>
      <Link
        to={`/blog${backParams}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm tracking-wider mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        BACK TO BLOG
      </Link>

      {postInfo && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-muted-foreground text-xs tracking-wider">
              {postInfo.date}
            </span>
            {postInfo.tags.length > 0 &&
              postInfo.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/blog?tags=${tag}`}
                  className="text-xs text-primary/60 tracking-wider hover:text-primary transition-colors"
                >
                  #{tag}
                </Link>
              ))}
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground text-glow">
            {postInfo.title}
          </h1>
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <MarkdownRenderer
            content={markdownContent}
            className="border border-border p-6"
          />
        )}
      </motion.div>
    </>
  );
};

export default BlogPostPage;
```

Key changes:
- Removed `min-h-screen pt-24 pb-16 px-4` and `container mx-auto max-w-4xl` outer wrappers
- Uses `useOutletContext<BlogOutletContext>()` to get `activeTags`
- Back link appends `?tags=` params to preserve filter context
- Tags in header are now clickable `Link` components to `/blog?tags={tag}`

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/BlogPostPage.tsx
git commit -m "feat(blog): BlogPostPage consumes outlet context with clickable tags"
```

---

## Chunk 5: Integration Verification

### Task 9: Run full test suite and verify build

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors (warnings acceptable).

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Start dev server and manually verify**

Run: `npm run dev`

Check in browser:
1. `http://localhost:8080/blog` — shows sidebar with "FILE EXPLORER" header, empty category tree (`> NO ENTRIES IN INDEX`), tag filter hidden (no tags), main content shows `> NO POSTS FOUND. BUFFER EMPTY.`
2. Sidebar is visible on desktop, toggle button on mobile viewport
3. No console errors

- [ ] **Step 5: Final commit (if any lint/type fixes needed)**

```bash
git add -A
git commit -m "fix: address lint and type issues from blog sidebar integration"
```

Only commit this if fixes were needed. Skip if everything passed clean.
