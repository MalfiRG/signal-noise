import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Folder, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BlogPost } from "./data";
import LetterReveal from "@/components/LetterReveal";
import { useMotionPolicy } from "@/lib/motion";

interface CategoryTreeProps {
  posts: BlogPost[];
  filteredSlugs: string[];
  activeTags: string[];
}

const CategoryTree = ({ posts, filteredSlugs, activeTags }: CategoryTreeProps) => {
  const { animationsDisabled } = useMotionPolicy();
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
        <LetterReveal text="> NO ENTRIES IN INDEX" tag="p" className="text-muted-foreground text-xs tracking-wider" delayPerLetter={40} skipAnimation={animationsDisabled} />
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
              className="flex items-center gap-1 w-full px-2 py-1.5 text-xs tracking-wider text-primary/90 hover:text-primary transition-colors font-medium"
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform text-muted-foreground ${isExpanded ? "rotate-90" : ""}`}
              />
              <Folder className="h-3 w-3 text-primary/60" />
              <span>{cat}</span>
              <span className="ml-auto text-muted-foreground/50 font-normal">{postsByCategory[cat].length}</span>
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
                        className={`flex items-center gap-1.5 px-2 py-1.5 pl-7 text-xs tracking-wider transition-colors hover:text-primary ${
                          isDimmed
                            ? "text-muted-foreground opacity-30"
                            : "text-foreground/70"
                        }`}
                      >
                        <FileText className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
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
