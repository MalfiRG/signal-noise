import { useNavigate, useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
import { ScrollReveal, ScrollRevealItem } from "@/components/ScrollReveal";
import LetterReveal from "@/components/LetterReveal";
import { useMotionPolicy } from "@/lib/motion";
import BlogSidebar from "./BlogSidebar";
import type { BlogOutletContext } from "./data";

const BlogIndex = () => {
  const { filteredPosts, activeTags, sidebarProps } = useOutletContext<BlogOutletContext>();
  const navigate = useNavigate();
  const { animationsDisabled } = useMotionPolicy();

  const tagParams = activeTags.length > 0 ? `?tags=${activeTags.join(",")}` : "";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <LetterReveal text="> cat ~/blog/posts.md" tag="p" className="text-muted-foreground text-xs tracking-[0.3em] mb-2" delayPerLetter={40} skipAnimation={animationsDisabled} />
        <h1 className="font-display text-4xl font-bold text-foreground text-glow">BLOG</h1>
      </div>

      <div className="md:hidden mb-8">
        <BlogSidebar {...sidebarProps} />
      </div>

      {filteredPosts.length > 0 ? (
        <ScrollReveal key={activeTags.join(",") || "all"} className="space-y-8">
          {filteredPosts.map((post) => (
            <ScrollRevealItem key={post.slug}>
              <Link
                to={`/blog/${post.slug}${tagParams}`}
                data-testid="blog-post-tile"
                className="block border border-border bg-card/50 p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/15 transition-all duration-200 group overflow-hidden"
              >
                <div className="mb-3 space-y-2">
                  <span className="block text-muted-foreground text-xs tracking-wider">
                    {post.date}
                  </span>
                  {post.tags.length > 0 && (
                    <div
                      data-testid="blog-tag-list"
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                    >
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          role="link"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/blog?tags=${tag}`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/blog?tags=${tag}`);
                            }
                          }}
                          className="text-xs text-primary/60 tracking-wider hover:text-primary transition-colors cursor-pointer break-all"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <h2 className="font-display text-xl font-bold text-foreground group-hover:text-glow mb-2 break-words [overflow-wrap:anywhere]">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-muted-foreground text-sm leading-relaxed break-words">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </ScrollRevealItem>
          ))}
        </ScrollReveal>
      ) : activeTags.length > 0 ? (
        <div className="text-center py-20 border border-border/50">
          <LetterReveal text="> NO MATCHES. REFINE SEARCH PARAMETERS." tag="p" className="text-muted-foreground text-sm tracking-wider" delayPerLetter={40} skipAnimation={animationsDisabled} />
        </div>
      ) : (
        <div className="text-center py-20 border border-border/50">
          <LetterReveal text="> NO POSTS FOUND. BUFFER EMPTY." tag="p" className="text-muted-foreground text-sm tracking-wider" delayPerLetter={40} skipAnimation={animationsDisabled} />
        </div>
      )}
    </div>
  );
};

export default BlogIndex;
