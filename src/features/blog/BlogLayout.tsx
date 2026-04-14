import { useMemo, useCallback } from "react";
import { Outlet, useSearchParams, useMatch, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { blogPosts } from "./data";
import type { BlogOutletContext } from "./data";
import BlogSidebar from "./BlogSidebar";
import { useReadingPageVariant, usePageVariant } from "@/lib/motion";

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

  const sidebarProps = {
    posts: blogPosts,
    filteredSlugs,
    allTags,
    activeTags,
    onToggleTag: handleToggleTag,
  };
  const context: BlogOutletContext = { filteredPosts, activeTags, allTags, sidebarProps };
  const isPostPage = useMatch("/blog/:slug");
  const location = useLocation();

  // Intra-blog navigation uses reading variant (200ms opacity) for slug pages,
  // full page variant for the index — second tier of two-tier transition (A1).
  const readingVariant = useReadingPageVariant();
  const pageVariant = usePageVariant();
  const outletVariant = isPostPage ? readingVariant : pageVariant;

  return (
    <div className="min-h-dvh pt-[calc(6rem_+_env(safe-area-inset-top,0px))] pb-16 bg-background">
      <div className="flex">
        {/* Desktop: sidebar as aside (mobile EXPLORER is rendered in BlogIndex) */}
        {!isPostPage && (
          <div className="hidden md:block">
            <BlogSidebar
              posts={blogPosts}
              filteredSlugs={filteredSlugs}
              allTags={allTags}
              activeTags={activeTags}
              onToggleTag={handleToggleTag}
            />
          </div>
        )}
        <main className="flex-1 min-w-0 px-4">
          {/* max-w-6xl gives code blocks room to breathe while keeping layout centered.
              BlogIndex constrains itself to max-w-3xl internally.
              Prose elements are constrained to 680px via CSS in index.css. */}
          <div className="mx-auto max-w-6xl">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} {...outletVariant}>
                <Outlet context={context} />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BlogLayout;
