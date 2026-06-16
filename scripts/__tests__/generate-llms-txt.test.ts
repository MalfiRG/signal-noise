import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { generate } from "../generate-llms-txt.ts";
import { loadPublishedBlogPosts, loadBlogPosts } from "../load-blog-data.ts";

const LLMS_PATH = resolve(__dirname, "../../public/llms.txt");

describe("generate-llms-txt.ts", () => {
  beforeAll(async () => {
    await generate();
  });

  describe("smoke", () => {
    it("produces public/llms.txt", () => {
      const content = readFileSync(LLMS_PATH, "utf-8");
      expect(content.length).toBeGreaterThan(0);
    });

    it("contains ## Blog Posts section", () => {
      const content = readFileSync(LLMS_PATH, "utf-8");
      expect(content).toContain("## Blog Posts");
    });

    it("contains ## How I Do It section", () => {
      const content = readFileSync(LLMS_PATH, "utf-8");
      expect(content).toContain("## How I Do It");
    });

    it("contains ## Site Metadata section", () => {
      const content = readFileSync(LLMS_PATH, "utf-8");
      expect(content).toContain("## Site Metadata");
    });
  });

  describe("functional", () => {
    let content: string;

    beforeAll(() => {
      content = readFileSync(LLMS_PATH, "utf-8");
    });

    it("Site Metadata contains Author, Site, Feed fields", () => {
      expect(content).toContain("Author: Piotr Tarach");
      expect(content).toContain("Site: https://piotrtarach.dev");
      expect(content).toContain("Feed: https://piotrtarach.dev/feed.xml");
    });

    it("How I Do It section contains all 5 methodology pages", () => {
      expect(content).toContain("Test Plan");
      expect(content).toContain("Test Case Design");
      expect(content).toContain("Test Architecture");
      expect(content).toContain("Automation Framework");
      expect(content).toContain("Bug Reporting");
    });

    it("How I Do It entries have absolute URLs", () => {
      const howitLinks = [...content.matchAll(/\(https:\/\/piotrtarach\.dev\/how-i-do-it\/[^)]+\)/g)];
      expect(howitLinks.length).toBe(5);
    });

    it("Blog Posts count matches published posts", () => {
      const posts = loadPublishedBlogPosts();
      if (posts.length === 0) {
        expect(content).toContain("(No published posts yet)");
      } else {
        const blogLinks = [...content.matchAll(/\(https:\/\/piotrtarach\.dev\/blog\/[^)]+\)/g)];
        expect(blogLinks.length).toBe(posts.length);
      }
    });

    it("each blog post entry contains title, URL, date, and tags", () => {
      const posts = loadPublishedBlogPosts();
      for (const post of posts) {
        expect(content).toContain(`[${post.title}]`);
        expect(content).toContain(`/blog/${post.slug}`);
        expect(content).toContain(post.date);
        expect(content).toContain("tags:");
      }
    });

    it("reading_time is included when present on a post", () => {
      const posts = loadPublishedBlogPosts();
      const postsWithReadingTime = posts.filter((p) => p.reading_time);
      for (const post of postsWithReadingTime) {
        expect(content).toContain(`${post.reading_time} min read`);
      }
    });

    it("draft posts do not appear in llms.txt", () => {
      const drafts = loadBlogPosts().filter((p) => p.draft);
      for (const draft of drafts) {
        expect(content).not.toContain(`/blog/${draft.slug}`);
      }
    });

    it("all markdown links have non-empty text and URL", () => {
      const links = [...content.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)];
      for (const m of links) {
        expect(m[1].length).toBeGreaterThan(0);
        expect(m[2].length).toBeGreaterThan(0);
      }
    });

    it("titles with ], ), or newlines do not break markdown links", () => {
      const links = [...content.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)];
      for (const m of links) {
        expect(m[1]).not.toContain("\n");
        expect(m[2]).not.toContain("\n");
        expect(m[2]).toMatch(/^https?:\/\//);
      }
    });
  });
});
