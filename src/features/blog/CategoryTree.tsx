import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Folder, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BlogPost } from "./data";

interface CategoryTreeProps {
  posts: BlogPost[];
  filteredSlugs: string[];
  activeTags: string[];
}

const CategoryTree = ({ posts, filteredSlugs, activeTags }: CategoryTreeProps) => {
  const postsByCategory = useMemo(() => {
    const map: Record<string, BlogPost[]> = {};
    for (const post of posts) {
      const cat = post.category || "Uncategorized";
      if (!map[cat]) map[cat] = [];
      map[cat].push(post);
    }
    return map;
  }, [posts]);

  const categories = useMemo(() => Object.keys(postsByCategory).sort(), [postsByCategory]);

  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map((c) => [c, true]))
  );

  const toggleCategory = (cat: string) => {
    setManualExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Auto-collapse categories with zero visible posts when filters are active
  const getIsExpanded = (cat: string) => {
    if (activeTags.length > 0) {
      const hasVisiblePosts = postsByCategory[cat].some((p) => filteredSlugs.includes(p.slug));
      if (!hasVisiblePosts) return false;
    }
    return manualExpanded[cat] ?? true;
  };

  const tagParams = activeTags.length > 0 ? `?tags=${activeTags.join(",")}` : "";

  if (posts.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-muted-foreground text-xs tracking-wider">
          {">"} NO ENTRIES IN INDEX
        </p>
      </div>
    );
  }

  return (
    <div className="px-1 py-2" role="tree">
      {categories.map((cat) => {
        const isExpanded = getIsExpanded(cat);
        return (
          <div key={cat} role="treeitem" aria-expanded={isExpanded}>
            <button
              onClick={() => toggleCategory(cat)}
              className="flex items-center gap-1 w-full px-2 py-1.5 text-xs tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
              <Folder className="h-3 w-3" />
              <span>{cat}</span>
              <span className="ml-auto text-border">{postsByCategory[cat].length}</span>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {postsByCategory[cat].map((post) => {
                    const isDimmed = !filteredSlugs.includes(post.slug);
                    return (
                      <Link
                        key={post.slug}
                        to={`/blog/${post.slug}${tagParams}`}
                        className={`flex items-center gap-1 px-2 py-1 pl-7 text-xs tracking-wider transition-colors hover:text-primary ${
                          isDimmed
                            ? "text-muted-foreground opacity-30"
                            : "text-muted-foreground"
                        }`}
                      >
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{post.title}</span>
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryTree;
