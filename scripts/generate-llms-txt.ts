import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { loadPublishedBlogPosts } from "./load-blog-data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://piotrtarach.dev";

async function loadHowIDoItPages() {
  const mod = await import("../src/features/how-i-do-it/data.ts");
  return mod.howIDoItPages;
}

async function generate() {
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
    "## Blog Posts",
    "",
    ...blogPosts.map(
      (p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.excerpt}`
    ),
    "",
    "## How I Do It",
    "",
    ...howIDoItPages.map(
      (p: { title: string; slug: string }) => `- [${p.title}](${SITE_URL}/how-i-do-it/${p.slug})`
    ),
    "",
  ];

  const outPath = resolve(__dirname, "../public/llms.txt");
  writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`llms.txt: written to ${outPath}`);
}

generate();
