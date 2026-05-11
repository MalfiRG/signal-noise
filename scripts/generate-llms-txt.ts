import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { loadPublishedBlogPosts } from "./load-blog-data.ts";
import { SITE_URL } from "./seo-config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadHowIDoItPages() {
  const mod = await import("../src/features/how-i-do-it/data.ts");
  return mod.howIDoItPages;
}

export async function generate() {
  const blogPosts = loadPublishedBlogPosts();
  const howIDoItPages = await loadHowIDoItPages();

  const lines = [
    "# PIOTR_TARACH | SIGNAL_NOISE",
    "",
    "> Personal technical blog and portfolio by Piotr Tarach, QA Engineer based in Prague.",
    "> Topics: AI workflows, test automation, DevOps, Claude Code, Playwright, Python.",
    "",
    `- Homepage: ${SITE_URL}/`,
    `- Projects: ${SITE_URL}/projects`,
    `- Skills (Tech Radar): ${SITE_URL}/skills`,
    `- Blog: ${SITE_URL}/blog`,
    `- How I Do It: ${SITE_URL}/how-i-do-it`,
    "",
    "## Site Metadata",
    "",
    "Author: Piotr Tarach",
    "Role: QA Engineer, Prague",
    `Site: ${SITE_URL}`,
    `Feed: ${SITE_URL}/feed.xml`,
    "",
    "Content types:",
    "- Blog posts: Technical articles on AI workflows, test automation, DevOps, Claude Code",
    "- How I Do It: QA methodology guides (test plans, test cases, automation frameworks, bug reporting)",
    "- Projects: Portfolio of technical projects",
    "- Skills: Tech Radar competency map",
    "",
    "## Blog Posts",
    "",
    ...blogPosts.map(
      (p) =>
        `- [${p.title}](${SITE_URL}/blog/${p.slug}) | ${p.date}${p.reading_time ? ` | ${p.reading_time} min read` : ""} | tags: ${p.tags.join(", ")}\n  ${p.excerpt}`
    ),
    ...(blogPosts.length === 0 ? ["(No published posts yet)"] : []),
    "",
    "## How I Do It",
    "",
    ...howIDoItPages.map(
      (p: { title: string; slug: string; description: string }) =>
        `- [${p.title}](${SITE_URL}/how-i-do-it/${p.slug}): ${p.description}`
    ),
    "",
  ];

  const outPath = resolve(__dirname, "../public/llms.txt");
  writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`llms.txt: ${blogPosts.length} blog posts, ${howIDoItPages.length} how-i-do-it pages -> ${outPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generate();
}
