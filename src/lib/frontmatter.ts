export interface FrontmatterResult {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * Lightweight YAML frontmatter parser for blog posts.
 * Handles the subset of YAML used in blog frontmatter:
 * quoted strings, unquoted scalars, JSON arrays, booleans.
 */
export function parseFrontmatter(raw: string): FrontmatterResult {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, content: raw };
  }

  const [, yamlBlock, content] = match;
  const frontmatter: Record<string, unknown> = {};

  for (const line of yamlBlock.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    if (!key) continue;

    let value: unknown = line.slice(colonIdx + 1).trim();

    if (typeof value === "string") {
      // Quoted string — strip quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      // JSON array — parse it
      else if (value.startsWith("[")) {
        try {
          value = JSON.parse(value as string);
        } catch {
          /* keep as string */
        }
      }
      // Booleans
      else if (value === "true") value = true;
      else if (value === "false") value = false;
    }

    frontmatter[key] = value;
  }

  return { frontmatter, content };
}
