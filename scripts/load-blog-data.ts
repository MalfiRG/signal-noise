import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "../src/features/blog/data.ts");

export interface BlogPostRaw {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  category: string;
  excerpt: string;
  reading_time?: number;
  draft?: boolean;
}

export function loadBlogPosts(): BlogPostRaw[] {
  const content = readFileSync(DATA_PATH, "utf-8");
  const match = content.match(/export const blogPosts:\s*BlogPost\[\]\s*=\s*(\[[\s\S]*?\n\];)/);
  if (!match) throw new Error("Could not parse blogPosts from data.ts");
  const fn = new Function(`return ${match[1].replace(/;\s*$/, "")}`);
  return fn() as BlogPostRaw[];
}

export function loadPublishedBlogPosts(): BlogPostRaw[] {
  return loadBlogPosts().filter((p) => !p.draft);
}
