import { describe, it, expect, beforeAll } from "vitest";
import { generateRss, generateAtom, escapeXml } from "../generate-feeds.ts";
import { loadPublishedBlogPosts, loadBlogPosts, type BlogPostRaw } from "../load-blog-data.ts";

const buildDate = new Date("2026-05-09T12:00:00Z");

const fixturePost: BlogPostRaw = {
  title: "AI & Automation: <Testing> \"Quotes\"",
  slug: "ai-and-automation",
  date: "2026-05-01",
  tags: ["AI", "testing", "automation"],
  excerpt: "A post about AI & test <automation>",
  draft: false,
  category: "testing",
};

describe("generate-feeds.ts", () => {
  describe("smoke - with real data", () => {
    let rss: string;
    let atom: string;

    beforeAll(() => {
      const posts = loadPublishedBlogPosts();
      rss = generateRss(posts, buildDate);
      atom = generateAtom(posts, buildDate);
    });

    it("RSS output starts with XML declaration", () => {
      expect(rss.startsWith("<?xml")).toBe(true);
    });

    it("Atom output starts with XML declaration", () => {
      expect(atom.startsWith("<?xml")).toBe(true);
    });

    it("item count matches published posts", () => {
      const posts = loadPublishedBlogPosts();
      const itemCount = (rss.match(/<item>/g) || []).length;
      expect(itemCount).toBe(posts.length);
    });

    it("entry count matches published posts", () => {
      const posts = loadPublishedBlogPosts();
      const entryCount = (atom.match(/<entry>/g) || []).length;
      expect(entryCount).toBe(posts.length);
    });
  });

  describe("functional - RSS", () => {
    let rss: string;

    beforeAll(() => {
      rss = generateRss([fixturePost], buildDate);
    });

    it("contains <channel> with title, link, description", () => {
      expect(rss).toContain("<channel>");
      expect(rss).toContain("<title>SIGNAL_NOISE");
      expect(rss).toContain("<link>https://piotrtarach.dev/blog</link>");
      expect(rss).toContain("<description>");
    });

    it("RSS link values are absolute URLs", () => {
      const links = [...rss.matchAll(/<link>(https?:\/\/[^<]+)<\/link>/g)];
      for (const m of links) {
        expect(m[1]).toMatch(/^https:\/\/piotrtarach\.dev\//);
      }
    });

    it("lastBuildDate is valid RFC 2822", () => {
      const match = rss.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
      expect(match).not.toBeNull();
      if (match) {
        const d = new Date(match[1]);
        expect(d.getTime()).not.toBeNaN();
      }
    });

    it("each <item> has <title>, <link>, <pubDate>, <description>", () => {
      const itemBlocks = rss.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of itemBlocks) {
        expect(item).toContain("<title>");
        expect(item).toContain("<link>");
        expect(item).toContain("<pubDate>");
        expect(item).toContain("<description>");
      }
    });

    it("<category> elements exist per item when post has tags", () => {
      expect(rss).toContain("<category>AI</category>");
      expect(rss).toContain("<category>testing</category>");
      expect(rss).toContain("<category>automation</category>");
    });

    it("special characters in titles are XML-escaped", () => {
      expect(rss).toContain("&amp;");
      expect(rss).toContain("&lt;Testing&gt;");
      expect(rss).toContain("&quot;Quotes&quot;");
    });

    it("feed.xml parses as valid XML", () => {
      const doc = new DOMParser().parseFromString(rss, "application/xml");
      const parseError = doc.querySelector("parsererror");
      expect(parseError).toBeNull();
    });
  });

  describe("functional - Atom", () => {
    let atom: string;

    beforeAll(() => {
      atom = generateAtom([fixturePost], buildDate);
    });

    it("contains <feed> with title, link, author", () => {
      expect(atom).toContain("<feed");
      expect(atom).toContain("<title>SIGNAL_NOISE");
      expect(atom).toContain("<author>");
      expect(atom).toContain("<name>Piotr Tarach</name>");
    });

    it("Atom link href values are absolute URLs", () => {
      const links = [...atom.matchAll(/href="(https?:\/\/[^"]+)"/g)];
      for (const m of links) {
        expect(m[1]).toMatch(/^https:\/\/piotrtarach\.dev\//);
      }
    });

    it("updated is valid RFC 3339", () => {
      const match = atom.match(/<updated>([^<]+)<\/updated>/);
      expect(match).not.toBeNull();
      if (match) {
        expect(match[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it("atom.xml parses as valid XML", () => {
      const doc = new DOMParser().parseFromString(atom, "application/xml");
      const parseError = doc.querySelector("parsererror");
      expect(parseError).toBeNull();
    });
  });

  describe("draft filtering", () => {
    it("draft posts do not appear in RSS output", () => {
      const allPosts = loadBlogPosts();
      const published = allPosts.filter((p) => !p.draft);
      const rss = generateRss(published, buildDate);
      const drafts = allPosts.filter((p) => p.draft);
      for (const draft of drafts) {
        expect(rss).not.toContain(`/blog/${draft.slug}`);
      }
    });

    it("draft posts do not appear in Atom output", () => {
      const allPosts = loadBlogPosts();
      const published = allPosts.filter((p) => !p.draft);
      const atom = generateAtom(published, buildDate);
      const drafts = allPosts.filter((p) => p.draft);
      for (const draft of drafts) {
        expect(atom).not.toContain(`/blog/${draft.slug}`);
      }
    });
  });

  describe("escapeXml", () => {
    it("escapes &, <, >, quotes", () => {
      expect(escapeXml("A & B")).toBe("A &amp; B");
      expect(escapeXml("<tag>")).toBe("&lt;tag&gt;");
      expect(escapeXml('"hello"')).toBe("&quot;hello&quot;");
      expect(escapeXml("it's")).toBe("it&apos;s");
    });
  });
});
