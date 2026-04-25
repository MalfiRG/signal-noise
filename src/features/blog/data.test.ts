import { describe, expect, it } from "vitest";
import {
  detectVisibilityMode,
  getVisiblePosts,
  type BlogPost,
} from "./data";

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

describe("detectVisibilityMode", () => {
  it("returns 'development' when PROD is false (regardless of VERCEL_ENV)", () => {
    expect(detectVisibilityMode({ PROD: false })).toBe("development");
    expect(
      detectVisibilityMode({ PROD: false, VITE_VERCEL_ENV: "production" }),
    ).toBe("development");
    expect(
      detectVisibilityMode({ PROD: false, VITE_VERCEL_ENV: "preview" }),
    ).toBe("development");
  });

  it("returns 'production' only when PROD=true AND VERCEL_ENV='production'", () => {
    expect(
      detectVisibilityMode({ PROD: true, VITE_VERCEL_ENV: "production" }),
    ).toBe("production");
  });

  it("returns 'preview' for Vercel preview deploys", () => {
    expect(
      detectVisibilityMode({ PROD: true, VITE_VERCEL_ENV: "preview" }),
    ).toBe("preview");
  });

  it("returns 'preview' for Vercel `vercel dev` (VERCEL_ENV='development')", () => {
    expect(
      detectVisibilityMode({ PROD: true, VITE_VERCEL_ENV: "development" }),
    ).toBe("preview");
  });

  it("returns 'preview' for local prod builds where VERCEL_ENV is unset", () => {
    expect(detectVisibilityMode({ PROD: true })).toBe("preview");
    expect(
      detectVisibilityMode({ PROD: true, VITE_VERCEL_ENV: "" }),
    ).toBe("preview");
  });
});

describe("getVisiblePosts", () => {
  it("hides draft posts when mode='production'", () => {
    const visible = getVisiblePosts(fixturePosts, "production");
    expect(visible).toHaveLength(2);
    expect(visible.map((p) => p.slug)).toEqual(["published-a", "published-b"]);
  });

  it("returns all posts when mode='preview' (drafts visible on preview deploys)", () => {
    const visible = getVisiblePosts(fixturePosts, "preview");
    expect(visible).toHaveLength(4);
    expect(visible).toEqual(fixturePosts);
  });

  it("returns all posts when mode='development' (npm run dev)", () => {
    const visible = getVisiblePosts(fixturePosts, "development");
    expect(visible).toHaveLength(4);
    expect(visible).toEqual(fixturePosts);
  });

  it("treats undefined draft field as not-a-draft (publishes by default)", () => {
    const posts: BlogPost[] = [
      { slug: "p", title: "P", date: "2026", tags: [], category: "c", excerpt: "x" },
    ];
    expect(getVisiblePosts(posts, "production")).toEqual(posts);
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
    expect(getVisiblePosts(posts, "production")).toEqual(posts);
  });

  it("does not mutate the input in any mode", () => {
    const inputCopy = [...fixturePosts];
    getVisiblePosts(fixturePosts, "production");
    getVisiblePosts(fixturePosts, "preview");
    getVisiblePosts(fixturePosts, "development");
    expect(fixturePosts).toEqual(inputCopy);
  });

  it("returns empty array when every post is a draft and mode='production'", () => {
    const allDrafts = fixturePosts.map((p) => ({ ...p, draft: true }));
    expect(getVisiblePosts(allDrafts, "production")).toEqual([]);
  });

  it("returns the full list when every post is a draft and mode='preview'", () => {
    const allDrafts = fixturePosts.map((p) => ({ ...p, draft: true }));
    expect(getVisiblePosts(allDrafts, "preview")).toEqual(allDrafts);
  });
});
