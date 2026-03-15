import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import BlogIndex from "./BlogIndex";
import type { BlogPost, BlogOutletContext } from "./data";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockPosts: BlogPost[] = [
  { slug: "post-a", title: "Alpha Post", date: "2026-01-01", tags: ["testing"], category: "QA", excerpt: "Excerpt A" },
  { slug: "post-b", title: "Beta Post", date: "2026-01-02", tags: ["automation"], category: "DevOps", excerpt: "Excerpt B" },
];

// Layout component that provides outlet context to child routes
const ContextProvider = ({ context }: { context: BlogOutletContext }) => (
  <Outlet context={context} />
);

const renderBlogIndex = (context: BlogOutletContext) =>
  render(
    <MemoryRouter initialEntries={["/blog"]}>
      <Routes>
        <Route path="/blog" element={<ContextProvider context={context} />}>
          <Route index element={<BlogIndex />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe("BlogIndex", () => {
  it("renders filtered posts from outlet context", () => {
    renderBlogIndex({ filteredPosts: mockPosts, activeTags: [], allTags: ["testing", "automation"] });
    expect(screen.getByText("Alpha Post")).toBeInTheDocument();
    expect(screen.getByText("Beta Post")).toBeInTheDocument();
  });

  it("shows empty state when no filtered posts with active filters", () => {
    renderBlogIndex({ filteredPosts: [], activeTags: ["nonexistent"], allTags: ["testing"] });
    expect(screen.getByText(/NO MATCHES/)).toBeInTheDocument();
  });

  it("shows buffer empty when no posts and no active tags", () => {
    renderBlogIndex({ filteredPosts: [], activeTags: [], allTags: [] });
    expect(screen.getByText(/BUFFER EMPTY/)).toBeInTheDocument();
  });
});
