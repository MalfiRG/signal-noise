import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CategoryTree from "./CategoryTree";
import type { BlogPost } from "./data";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

const mockPosts: BlogPost[] = [
  { slug: "post-1", title: "Post One", date: "2026-01-01", tags: ["testing"], category: "QA", excerpt: "" },
  { slug: "post-2", title: "Post Two", date: "2026-01-02", tags: ["automation"], category: "QA", excerpt: "" },
  { slug: "post-3", title: "Post Three", date: "2026-01-03", tags: ["devops"], category: "DevOps", excerpt: "" },
];

const renderTree = (props: Partial<Parameters<typeof CategoryTree>[0]> = {}) =>
  render(
    <MemoryRouter>
      <CategoryTree
        posts={mockPosts}
        filteredSlugs={mockPosts.map((p) => p.slug)}
        activeTags={[]}
        {...props}
      />
    </MemoryRouter>
  );

describe("CategoryTree", () => {
  it("renders category groups from posts", () => {
    renderTree();
    expect(screen.getByText("QA")).toBeInTheDocument();
    expect(screen.getByText("DevOps")).toBeInTheDocument();
  });

  it("renders post titles as links", () => {
    renderTree();
    expect(screen.getByRole("link", { name: /Post One/ })).toHaveAttribute("href", "/blog/post-1");
    expect(screen.getByRole("link", { name: /Post Three/ })).toHaveAttribute("href", "/blog/post-3");
  });

  it("categories start expanded by default", () => {
    renderTree();
    expect(screen.getByText("Post One")).toBeVisible();
    expect(screen.getByText("Post Three")).toBeVisible();
  });

  it("collapses category when clicking category header", async () => {
    const user = userEvent.setup();
    renderTree();
    await user.click(screen.getByText("QA"));
    expect(screen.queryByText("Post One")).not.toBeInTheDocument();
    expect(screen.getByText("Post Three")).toBeVisible(); // DevOps still expanded
  });

  it("dims posts not in filteredSlugs", () => {
    const { container } = renderTree({ filteredSlugs: ["post-1"] });
    const links = container.querySelectorAll("a");
    const post2Link = Array.from(links).find((a) => a.textContent?.includes("Post Two"));
    expect(post2Link?.className).toContain("opacity-30");
  });

  it("auto-collapses categories with zero visible posts when filters active", () => {
    renderTree({ filteredSlugs: ["post-3"], activeTags: ["devops"] });
    expect(screen.queryByText("Post One")).not.toBeInTheDocument();
    expect(screen.getByText("Post Three")).toBeVisible();
  });

  it("shows empty state when no posts", () => {
    renderTree({ posts: [] });
    expect(screen.getByLabelText(/NO ENTRIES IN INDEX/)).toBeInTheDocument();
  });

  it("groups posts without category under Uncategorized", () => {
    const posts: BlogPost[] = [
      { slug: "no-cat", title: "No Cat Post", date: "2026-01-01", tags: [], category: "", excerpt: "" },
    ];
    renderTree({ posts, filteredSlugs: ["no-cat"] });
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    expect(screen.getByText("No Cat Post")).toBeInTheDocument();
  });
});
