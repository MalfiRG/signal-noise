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
 * Three-tier visibility model for blog posts.
 *
 *   "production"  — Vercel deploy on the main domain. Drafts are hidden so
 *                   end users never see unpublished work.
 *   "preview"     — Vercel preview deploys (PR URLs, branch URLs) and any
 *                   non-Vercel prod build. Drafts are visible so the author
 *                   can review unpublished content on the share-able URL.
 *   "development" — `npm run dev`. Everything visible.
 */
export type VisibilityMode = "production" | "preview" | "development";

/**
 * Pure environment-shape contract used by detectVisibilityMode. Accepts a
 * minimal subset of import.meta.env so unit tests can pass plain objects
 * without constructing the full Vite ImportMetaEnv type.
 */
export interface VisibilityModeEnv {
  PROD: boolean;
  VITE_VERCEL_ENV?: string;
}

/**
 * Maps a Vite env snapshot to a visibility tier. Pure function — exported
 * for unit testing.
 *
 *   PROD=false                                  → development
 *   PROD=true,  VITE_VERCEL_ENV="production"    → production
 *   PROD=true,  VITE_VERCEL_ENV="preview"       → preview
 *   PROD=true,  VITE_VERCEL_ENV="development"   → preview (Vercel-local dev)
 *   PROD=true,  VITE_VERCEL_ENV=""|undefined    → preview (local prod build)
 */
export function detectVisibilityMode(env: VisibilityModeEnv): VisibilityMode {
  if (!env.PROD) return "development";
  if (env.VITE_VERCEL_ENV === "production") return "production";
  return "preview";
}

/**
 * Filter draft posts out of a post list according to the three-tier
 * visibility model. Pure function — exported for unit testing.
 *
 *   mode = "production"           → drops every post with draft:true
 *   mode = "preview"|"development" → returns the input list unchanged
 */
export function getVisiblePosts(
  posts: BlogPost[],
  mode: VisibilityMode,
): BlogPost[] {
  if (mode !== "production") return posts;
  return posts.filter((p) => !p.draft);
}

export const blogPosts: BlogPost[] = [
  {
    slug: "mempalace-retrieval-economics",
    title: "85,000 Memories, 3,000 Tokens - Why Retrieval Beats Context Every Time",
    date: "2026-05-20",
    tags: ["AI", "vector-databases", "sqlite-vec", "MemPalace", "local-AI", "token-economics"],
    category: "AI & Automation",
    excerpt:
      "I used to load 50K tokens of context to find a paragraph. Now I search 85K memories for 3K tokens. When local AI shrinks your context window to 128K, efficient retrieval stops being optional.",
    draft: false,
  },
  {
    slug: "mempalace-sqlite-vec-migration",
    title: "How I Broke ChromaDB at 100K Vectors and Fixed It with sqlite-vec",
    date: "2026-05-20",
    tags: ["AI", "vector-databases", "sqlite-vec", "ChromaDB", "MemPalace"],
    category: "AI & Automation",
    excerpt:
      "I mined 85K conversation drawers into a memory palace and ChromaDB silently lost 17% of them. Here's why, and how sqlite-vec's ACID transactions fix it by construction.",
    draft: false,
  },
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

export const visibilityMode: VisibilityMode = detectVisibilityMode({
  PROD: import.meta.env.PROD,
  VITE_VERCEL_ENV: import.meta.env.VITE_VERCEL_ENV as string | undefined,
});

export const visiblePosts: BlogPost[] = getVisiblePosts(
  blogPosts,
  visibilityMode,
);
