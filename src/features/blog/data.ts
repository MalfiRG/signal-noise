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
}

export const blogPosts: BlogPost[] = [
  {
    slug: "autonomous-qa-loop",
    title: "I Built an Autonomous QA Agent That Develops Its Own Fixes",
    date: "2026-04-01",
    tags: ["AI", "QA", "automation", "Claude", "Playwright"],
    category: "AI & Automation",
    excerpt:
      "How I set up a 30-minute autonomous loop that screenshots my frontends, finds visual bugs, fixes them, commits, and then builds new features when everything's clean.",
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
