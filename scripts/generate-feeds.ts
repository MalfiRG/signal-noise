import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { loadPublishedBlogPosts, loadBlogPosts, type BlogPostRaw } from "./load-blog-data.ts";
import { SITE_URL } from "./seo-config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEED_TITLE = "SIGNAL_NOISE - Piotr Tarach";
const FEED_DESC = "Technical blog on AI workflows, test automation, DevOps";
const FEED_LANG = "en";

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc2822(dateStr: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + "T00:00:00Z" : dateStr);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d.toUTCString();
}

function toRfc3339(dateStr: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + "T00:00:00Z" : dateStr);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d.toISOString();
}

export function generateRss(posts: BlogPostRaw[], buildDate: Date): string {
  const items = posts.map((p) => {
    const cats = p.tags
      .map((t) => `      <category>${escapeXml(t)}</category>`)
      .join("\n");
    return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${toRfc2822(p.date)}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
${cats}
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml(FEED_DESC)}</description>
    <language>${FEED_LANG}</language>
    <lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>
`;
}

export function generateAtom(posts: BlogPostRaw[], buildDate: Date): string {
  const entries = posts.map((p) => {
    const cats = p.tags
      .map((t) => `    <category term="${escapeXml(t)}"/>`)
      .join("\n");
    return `  <entry>
    <title>${escapeXml(p.title)}</title>
    <link href="${SITE_URL}/blog/${p.slug}"/>
    <id>${SITE_URL}/blog/${p.slug}</id>
    <published>${toRfc3339(p.date)}</published>
    <updated>${toRfc3339(p.date)}</updated>
    <summary>${escapeXml(p.excerpt)}</summary>
${cats}
  </entry>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(FEED_TITLE)}</title>
  <link href="${SITE_URL}/blog"/>
  <link href="${SITE_URL}/atom.xml" rel="self" type="application/atom+xml"/>
  <id>${SITE_URL}/blog</id>
  <updated>${buildDate.toISOString()}</updated>
  <author>
    <name>Piotr Tarach</name>
  </author>
${entries.join("\n")}
</feed>
`;
}

function loadPostsForEnv(): BlogPostRaw[] {
  const env = process.env.VERCEL_ENV || "";
  if (env === "production") return loadPublishedBlogPosts();
  return loadBlogPosts();
}

function main() {
  const posts = loadPostsForEnv();
  const buildDate = new Date();

  const distDir = resolve(__dirname, "../dist");
  mkdirSync(distDir, { recursive: true });

  const rss = generateRss(posts, buildDate);
  const atom = generateAtom(posts, buildDate);

  writeFileSync(resolve(distDir, "feed.xml"), rss, "utf-8");
  writeFileSync(resolve(distDir, "atom.xml"), atom, "utf-8");

  console.log(`feeds: ${posts.length} posts (env=${process.env.VERCEL_ENV || "local"}) -> dist/feed.xml + dist/atom.xml`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
