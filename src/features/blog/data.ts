export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
}

export const blogPosts: BlogPost[] = [];
