# Blog Sidebar Navigation & Tag Filtering

**Date:** 2026-03-15
**Status:** Draft

## Overview

Add an Obsidian-style sidebar file-tree and tag-based filtering to the blog section. The sidebar shows posts grouped by category in a collapsible tree. Tags act as AND-logic filters that affect both the post list and the sidebar tree. Filter state lives in URL search params for shareability and persistence.

## Requirements

- Persistent sidebar on all `/blog/*` routes with a collapsible category tree
- Tag filtering with AND logic (selecting more tags narrows results)
- Tags clickable in sidebar, on post cards, and on individual post pages
- Filtering affects both the post list and sidebar tree (non-matching posts greyed out/hidden)
- Filter state in URL search params (`?tags=foo,bar`)
- Mobile: sidebar as slide-in panel via existing Sheet component
- Empty states for no posts and no filter matches

## Data Model Changes

Add `category` field to `BlogPost` interface in `src/features/blog/data.ts`:

```typescript
export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  category: string;   // Tree grouping (e.g., "QA Engineering", "Automation")
  excerpt: string;
}
```

Derived data computed at render time from `blogPosts`:
- `categories` — unique category list
- `allTags` — unique tag list
- `postsByCategory` — `Record<string, BlogPost[]>`

No separate data store needed.

## Component Architecture

All new components inside `src/features/blog/`:

```
src/features/blog/
├── data.ts              # existing — add category field
├── BlogIndex.tsx        # existing — receives filtered posts as prop
├── BlogPostPage.tsx     # existing — tag clicks navigate to filtered index
├── BlogLayout.tsx       # NEW — sidebar + <Outlet /> wrapper
├── BlogSidebar.tsx      # NEW — composes CategoryTree + TagFilter
├── CategoryTree.tsx     # NEW — collapsible folder tree by category
└── TagFilter.tsx        # NEW — clickable tag pills, AND logic
```

### BlogLayout

Wraps all `/blog/*` routes. Renders `BlogSidebar` on the left, `<Outlet />` on the right. Reads `?tags=foo,bar` from URL search params, computes filtered posts, passes them to child routes via Outlet context.

### BlogSidebar

Composition component stacking `CategoryTree` and `TagFilter` vertically. On mobile (< 768px), collapses into a toggleable slide-in panel using the existing shadcn/ui `Sheet` component.

### CategoryTree

Groups posts by `category`. Each category is a collapsible node with chevron + folder icon. Posts are leaf nodes linking to `/blog/:slug`. When tag filters are active, non-matching posts are greyed out or hidden. Categories with zero visible posts collapse automatically.

### TagFilter

Renders all unique tags as clickable pills below the category tree. Active tags highlighted in Matrix green. Clicking toggles the tag in URL search params. AND logic: only posts matching ALL active tags are shown.

### BlogIndex (modified)

Receives filtered `BlogPost[]` from layout context instead of importing `blogPosts` directly. Renders the post card list with only filtered results.

### BlogPostPage (modified)

Tags in the post header become clickable links navigating to `/blog?tags=tagname`. Back link preserves `?tags=` params to restore filtered list.

## Routing Changes

Current:
```tsx
<Route path="/blog" element={<BlogIndexPage />} />
<Route path="/blog/:slug" element={<BlogSlugPage />} />
```

New (nested layout route):
```tsx
<Route path="/blog" element={<BlogLayoutPage />}>
  <Route index element={<BlogIndexPage />} />
  <Route path=":slug" element={<BlogSlugPage />} />
</Route>
```

`BlogLayoutPage` — new thin wrapper in `src/pages/` rendering `BlogLayout`.

### URL Examples

| URL | Behavior |
|-----|----------|
| `/blog` | All posts, no filter |
| `/blog?tags=testing` | Posts with "testing" tag |
| `/blog?tags=testing,automation` | Posts with BOTH tags (AND) |
| `/blog/my-post` | Individual post, sidebar visible |
| `/blog/my-post?tags=testing` | Individual post with filter context preserved |

## Mobile Responsiveness

- **Desktop (>= 768px):** Sidebar fixed left (~250px), main content fills remainder
- **Mobile (< 768px):** Sidebar hidden by default. Toggle button (folder icon) at top of blog area. Opens as slide-in `Sheet` panel. Matches existing `Navbar.tsx` mobile hamburger pattern.

## Empty States

| Scenario | Category Tree | Tag Filter | Post List |
|----------|--------------|------------|-----------|
| No posts exist | `> NO ENTRIES IN INDEX` | Hidden | `> NO POSTS FOUND. BUFFER EMPTY.` |
| No filter matches | All posts greyed out, categories visible | Active pills remain visible | `> NO MATCHES. REFINE SEARCH PARAMETERS.` |
| Post has no category | Falls under "Uncategorized" group | N/A | N/A |

## Navigation Behavior

- Clicking a post in the tree navigates to `/blog/:slug` (preserves active tag params)
- Clicking a tag pill toggles it in URL params
- Clicking a tag on a post card navigates to `/blog?tags=tagname`
- "Back to posts" link on individual post preserves `?tags=` params
- Sidebar expand/collapse state persists across navigation within `/blog/*` (layout doesn't unmount)

## Styling

- Matrix-themed: CSS variables for colors (`--matrix-primary`, `--matrix-bg`)
- Tree nodes use Lucide icons (ChevronRight, Folder, FileText)
- Active tag pills: Matrix green background, dark text
- Inactive tag pills: bordered, muted
- Greyed-out posts in tree: reduced opacity
- Framer Motion for tree expand/collapse animations
