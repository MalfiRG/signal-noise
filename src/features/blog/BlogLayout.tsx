import { useMemo, useCallback } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { blogPosts } from "./data";
import type { BlogOutletContext } from "./data";
import BlogSidebar from "./BlogSidebar";

const BlogLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTags = useMemo(() => {
    const tagsParam = searchParams.get("tags");
    if (!tagsParam) return [];
    return tagsParam.split(",").filter(Boolean);
  }, [searchParams]);

  const allTags = useMemo(
    () => [...new Set(blogPosts.flatMap((p) => p.tags))].sort(),
    []
  );

  const filteredPosts = useMemo(() => {
    if (activeTags.length === 0) return blogPosts;
    return blogPosts.filter((post) =>
      activeTags.every((tag) =>
        post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
    );
  }, [activeTags]);

  const filteredSlugs = useMemo(
    () => filteredPosts.map((p) => p.slug),
    [filteredPosts]
  );

  const handleToggleTag = useCallback(
    (tag: string) => {
      const next = activeTags.includes(tag)
        ? activeTags.filter((t) => t !== tag)
        : [...activeTags, tag];
      if (next.length === 0) {
        searchParams.delete("tags");
      } else {
        searchParams.set("tags", next.join(","));
      }
      setSearchParams(searchParams, { replace: true });
    },
    [activeTags, searchParams, setSearchParams]
  );

  const context: BlogOutletContext = { filteredPosts, activeTags, allTags };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="flex">
        <BlogSidebar
          posts={blogPosts}
          filteredSlugs={filteredSlugs}
          allTags={allTags}
          activeTags={activeTags}
          onToggleTag={handleToggleTag}
        />
        <main className="flex-1 px-4">
          {/* max-w-6xl gives code blocks room to breathe while keeping layout centered.
              BlogIndex constrains itself to max-w-3xl internally.
              Prose elements are constrained to 680px via CSS in index.css. */}
          <div className="mx-auto max-w-6xl">
            <Outlet context={context} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default BlogLayout;
