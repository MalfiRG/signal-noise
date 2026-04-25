import { describe, expect, it } from "vitest";
import { getVisiblePosts, type BlogPost } from "./data";

const fixturePosts: BlogPost[] = [
  {
    slug: "published-a",
    title: "Published A",
    date: "2026-04-01",
    tags: ["a"],
    category: "test",
    excerpt: "x",
  },
  {
    slug: "draft-a",
    title: "Draft A",
    date: "2026-04-02",
    tags: ["a"],
    category: "test",
    excerpt: "x",
    draft: true,
  },
  {
    slug: "published-b",
    title: "Published B",
    date: "2026-04-03",
    tags: ["b"],
    category: "test",
    excerpt: "x",
    draft: false,
  },
  {
    slug: "draft-b",
    title: "Draft B",
    date: "2026-04-04",
    tags: ["b"],
    category: "test",
    excerpt: "x",
    draft: true,
  },
];

describe("getVisiblePosts", () => {
  it("hides draft posts when isProd=true", () => {
    const visible = getVisiblePosts(fixturePosts, true);
    expect(visible).toHaveLength(2);
    expect(visible.map((p) => p.slug)).toEqual(["published-a", "published-b"]);
  });

  it("returns all posts unchanged when isProd=false (dev preview)", () => {
    const visible = getVisiblePosts(fixturePosts, false);
    expect(visible).toHaveLength(4);
    expect(visible).toEqual(fixturePosts);
  });

  it("treats undefined draft field as not-a-draft (publishes by default)", () => {
    const posts: BlogPost[] = [
      { slug: "p", title: "P", date: "2026", tags: [], category: "c", excerpt: "x" },
    ];
    expect(getVisiblePosts(posts, true)).toEqual(posts);
  });

  it("treats explicit draft:false as not-a-draft", () => {
    const posts: BlogPost[] = [
      {
        slug: "p",
        title: "P",
        date: "2026",
        tags: [],
        category: "c",
        excerpt: "x",
        draft: false,
      },
    ];
    expect(getVisiblePosts(posts, true)).toEqual(posts);
  });

  it("returns a new array — does not mutate the input in either mode", () => {
    const inputCopy = [...fixturePosts];
    getVisiblePosts(fixturePosts, true);
    getVisiblePosts(fixturePosts, false);
    expect(fixturePosts).toEqual(inputCopy);
  });

  it("returns empty array when every post is a draft and isProd=true", () => {
    const allDrafts = fixturePosts.map((p) => ({ ...p, draft: true }));
    expect(getVisiblePosts(allDrafts, true)).toEqual([]);
  });
});
