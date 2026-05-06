import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { loadPublishedBlogPosts } from "./load-blog-data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://piotrtarach.dev";

const staticRoutes = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/projects", changefreq: "monthly", priority: "0.8" },
  { path: "/skills", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  { path: "/how-i-do-it", changefreq: "monthly", priority: "0.7" },
];

async function loadHowIDoItPages() {
  const mod = await import("../src/features/how-i-do-it/data.ts");
  return mod.howIDoItPages;
}

async function generate() {
  const blogPosts = loadPublishedBlogPosts();
  const howIDoItPages = await loadHowIDoItPages();

  const urls = [
    ...staticRoutes.map(
      (r) =>
        `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    ),
    ...howIDoItPages.map(
      (page: { slug: string }) =>
        `  <url>\n    <loc>${SITE_URL}/how-i-do-it/${page.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
    ),
    ...blogPosts.map(
      (post) =>
        `  <url>\n    <loc>${SITE_URL}/blog/${post.slug}</loc>\n    <lastmod>${post.date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    ),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

  const outPath = resolve(__dirname, "../public/sitemap.xml");
  writeFileSync(outPath, sitemap, "utf-8");
  console.log(`sitemap.xml: ${urls.length} URLs written to ${outPath}`);
}

generate();
