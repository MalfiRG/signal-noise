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
    expect(content.startsWith("# Heading")).toBe(true);
    expect(content.includes("---")).toBe(false);
    expect(frontmatter.title).toBe("Test Post");
  });

  it("returns input as content when no frontmatter present", () => {
    const input = "# Just a heading\n\nBody.";
    const { content, frontmatter } = parseFrontmatter(input);
    expect(content).toBe(input);
    expect(frontmatter).toEqual({});
  });
});
