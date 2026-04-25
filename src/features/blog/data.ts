export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  category: string;
  excerpt: string;
  draft?: boolean;
}

export interface BlogOutletContext {
  filteredPosts: BlogPost[];
  activeTags: string[];
  allTags: string[];
  sidebarProps: {
    posts: BlogPost[];
    filteredSlugs: string[];
    allTags: string[];
    activeTags: string[];
    onToggleTag: (tag: string) => void;
  };
}

/**
 * Filter draft posts out of a post list when running in a production build.
 * Pure function — exported for unit testing. The runtime decision uses the
 * `visiblePosts` constant below, which calls this with `import.meta.env.PROD`.
 *
 * Contract:
 *   - isProd=true  → drops every post with `draft: true`. Posts without the
 *                    `draft` field (undefined) are kept.
 *   - isProd=false → returns the input list unchanged so authors can preview
 *                    drafts during `npm run dev`.
 */
export function getVisiblePosts(
  posts: BlogPost[],
  isProd: boolean,
): BlogPost[] {
  if (!isProd) return posts;
  return posts.filter((p) => !p.draft);
}

export const blogPosts: BlogPost[] = [
  {
    slug: "claude-code-cache-ttl-worktree-trap",
    title:
      "Two Independent Causes of Claude Code's 5-Minute-TTL Cache Drift — Session Size and Git Worktrees (an ANCOVA)",
    date: "2026-04-22",
    tags: [
      "AI",
      "Claude",
      "prompt-caching",
      "git-worktrees",
      "cost-optimization",
      "statistics",
      "ANCOVA",
    ],
    category: "AI & Automation",
    excerpt:
      "Parsed 30 days of my Claude Code JSONL transcripts and ran an ANCOVA. Two factors independently drive prompt-cache TTL drift: session length and whether the session ran inside a git worktree. +39 percentage points at any session size, p = 2×10⁻⁵, partial η² = 0.156 — with graphs, hypotheses, and a primer on Analysis of Covariance because it somehow didn't come up in my biotech PhD.",
    draft: true,
  },
  {
    slug: "rag-retrieval-harness",
    title: "I Didn't Read Any RAG Papers. I Just Built a Test Harness.",
    date: "2026-04-11",
    tags: ["AI", "RAG", "memory-systems", "testing", "ChromaDB", "Claude"],
    category: "AI & Automation",
    excerpt:
      "How a QA engineer approached AI memory optimization the only way he knows — by building a regression test harness first, then iterating until the numbers moved.",
    draft: true,
  },
  {
    slug: "autonomous-qa-loop",
    title: "I Built an Autonomous QA Agent That Develops Its Own Fixes",
    date: "2026-04-01",
    tags: ["AI", "QA", "automation", "Claude", "Playwright"],
    category: "AI & Automation",
    excerpt:
      "How a 30-minute autonomous loop screenshotted my frontends, found bugs, fixed them, built 8 new pages, wired up an Apify scraper, and scraped 254 real jobs — all in one session.",
    draft: true,
  },
  {
    slug: "style-test",
    title: "Style Test Kitchen Sink",
    date: "2026-03-15",
    tags: ["testing", "design", "internal"],
    category: "QA Engineering",
    excerpt:
      "A comprehensive preview of every content element — headings, code blocks, tables, Mermaid diagrams, images, GIFs, callouts, and more.",
    draft: true,
  },
];

/**
 * The post list as exposed to consumers. In production builds, posts marked
 * `draft: true` are filtered out. In development (`npm run dev`), all posts
 * are visible so authors can preview drafts.
 *
 * `import.meta.env.PROD` is statically substituted by Vite at build time:
 * the dev bundle inlines `false`, the prod bundle inlines `true`, and the
 * dead branch is tree-shaken.
 */
export const visiblePosts: BlogPost[] = getVisiblePosts(
  blogPosts,
  import.meta.env.PROD,
);
