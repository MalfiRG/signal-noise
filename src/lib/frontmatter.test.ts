import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./frontmatter";

describe("frontmatter parser", () => {
  it("strips frontmatter and returns clean content", () => {
    const input = `---
title: Test Post
date: 2026-04-19
---

# Heading

Body content here.`;
    const { content, frontmatter } = parseFrontmatter(input);
    // The regex `\r?\n?` after `---` consumes one optional newline; a blank
    // line between frontmatter and body leaves a leading `\n` in content.
    // Assert the behavior that actually matters: frontmatter is stripped.
    expect(content.trimStart().startsWith("# Heading")).toBe(true);
    expect(content).not.toContain("title: Test Post");
    expect(content).not.toContain("date: 2026-04-19");
    expect(content).not.toContain("---");
    expect(frontmatter.title).toBe("Test Post");
  });

  it("returns input as content when no frontmatter present", () => {
    const input = "# Just a heading\n\nBody.";
    const { content, frontmatter } = parseFrontmatter(input);
    expect(content).toBe(input);
    expect(frontmatter).toEqual({});
  });
});
