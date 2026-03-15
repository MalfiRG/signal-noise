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
