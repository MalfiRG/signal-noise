import { useNavigate, useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { BlogOutletContext } from "./data";

const BlogIndex = () => {
  const { filteredPosts, activeTags } = useOutletContext<BlogOutletContext>();
  const navigate = useNavigate();

  const tagParams = activeTags.length > 0 ? `?tags=${activeTags.join(",")}` : "";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-12">
        <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} cat ~/blog/posts.md</p>
        <h1 className="font-display text-4xl font-bold text-foreground text-glow">BLOG</h1>
      </div>

      {filteredPosts.length > 0 ? (
        <div className="space-y-8">
          {filteredPosts.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/blog/${post.slug}${tagParams}`}
                className="block border border-border bg-card/50 p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/15 transition-all duration-200 group"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-muted-foreground text-xs tracking-wider">
                    {post.date}
                  </span>
                  {post.tags.length > 0 && (
                    <>
                      <span className="text-border">|</span>
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
                          className="text-xs text-primary/60 tracking-wider hover:text-primary transition-colors cursor-pointer"
                        >
                          #{tag}
                        </span>
                      ))}
                    </>
                  )}
                </div>
                <h2 className="font-display text-xl font-bold text-foreground group-hover:text-glow mb-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      ) : activeTags.length > 0 ? (
        <div className="text-center py-20 border border-border/50">
          <p className="text-muted-foreground text-sm tracking-wider">
            {">"} NO MATCHES. REFINE SEARCH PARAMETERS.
          </p>
        </div>
      ) : (
        <div className="text-center py-20 border border-border/50">
          <p className="text-muted-foreground text-sm tracking-wider">
            {">"} NO POSTS FOUND. BUFFER EMPTY.
          </p>
        </div>
      )}
    </div>
  );
};

export default BlogIndex;
