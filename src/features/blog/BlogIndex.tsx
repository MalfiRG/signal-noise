import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { blogPosts } from "./data";

const BlogIndex = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} cat ~/blog/posts.md</p>
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">BLOG</h1>
        </div>

        {blogPosts.length > 0 ? (
          <div className="space-y-8">
            {blogPosts.map((post, i) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="block border border-border bg-card/50 p-6 hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-muted-foreground text-xs tracking-wider">
                      {post.date}
                    </span>
                    {post.tags.length > 0 && (
                      <>
                        <span className="text-border">|</span>
                        {post.tags.map((tag) => (
                          <span key={tag} className="text-xs text-primary/60 tracking-wider">
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
        ) : (
          <div className="text-center py-20 border border-border/50">
            <p className="text-muted-foreground text-sm tracking-wider">
              {">"} NO POSTS FOUND. BUFFER EMPTY.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogIndex;
