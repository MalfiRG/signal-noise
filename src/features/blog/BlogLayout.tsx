import { useMemo, useCallback } from "react";
import { Outlet, useSearchParams, useMatch, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { visiblePosts } from "./data";
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
    () => [...new Set(visiblePosts.flatMap((p) => p.tags))].sort(),
    []
  );

  const filteredPosts = useMemo(() => {
    if (activeTags.length === 0) return visiblePosts;
    return visiblePosts.filter((post) =>
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
    posts: visiblePosts,
    filteredSlugs,
    allTags,
    activeTags,
    onToggleTag: handleToggleTag,
  };
  const context: BlogOutletContext = { filteredPosts, activeTags, allTags, sidebarProps };
  const isPostPage = useMatch("/blog/:slug");
  const location = useLocation();

  const readingVariant = useReadingPageVariant();
  const pageVariant = usePageVariant();
  const outletVariant = isPostPage ? readingVariant : pageVariant;

  return (
    <div className="min-h-dvh pt-[calc(6rem_+_env(safe-area-inset-top,0px))] pb-16 bg-background">
      <div className="flex">
        {!isPostPage && (
          <div className="hidden md:block">
            <BlogSidebar
              posts={visiblePosts}
              filteredSlugs={filteredSlugs}
              allTags={allTags}
              activeTags={activeTags}
              onToggleTag={handleToggleTag}
            />
          </div>
        )}
        <main className="flex-1 min-w-0 px-4">
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
