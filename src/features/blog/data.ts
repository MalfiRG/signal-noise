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

export const blogPosts: BlogPost[] = [
  {
    slug: "style-test",
    title: "Style Test Kitchen Sink",
    date: "2026-03-15",
    tags: ["testing", "style"],
    category: "QA Engineering",
    excerpt:
      "Preview every content element the blog renderer supports — typography, code blocks, tables, Mermaid diagrams, and more.",
  },
];
