export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  draft?: boolean;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "style-test",
    title: "Style Test Kitchen Sink",
    date: "2026-03-15",
    tags: ["testing", "design", "internal"],
    excerpt:
      "A comprehensive preview of every content element — headings, code blocks, tables, Mermaid diagrams, images, GIFs, callouts, and more.",
    draft: true,
  },
];
