import { useParams, Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useMarkdownContent } from "@/hooks/useMarkdownContent";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { blogPosts } from "./data";
import type { BlogOutletContext } from "./data";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { activeTags } = useOutletContext<BlogOutletContext>();

  const contentMap = useMemo(() => {
    const map: Record<string, () => Promise<string>> = {};
    for (const post of blogPosts) {
      map[post.slug] = () =>
        import(`../../pages/content/blog/${post.slug}.md?raw`).then((mod) => mod.default);
    }
    return map;
  }, []);

  const { markdownContent, isLoading } = useMarkdownContent({
    contentMap,
    slug: slug || "",
    fallback: "# Content not found",
  });

  const postInfo = blogPosts.find((p) => p.slug === slug);

  const backParams = activeTags.length > 0 ? `?tags=${activeTags.join(",")}` : "";

  return (
    <>
      <Link
        to={`/blog${backParams}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm tracking-wider mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        BACK TO BLOG
      </Link>

      {postInfo && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-muted-foreground text-xs tracking-wider">
              {postInfo.date}
            </span>
            {postInfo.tags.length > 0 &&
              postInfo.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/blog?tags=${tag}`}
                  className="text-xs text-primary/60 tracking-wider hover:text-primary transition-colors"
                >
                  #{tag}
                </Link>
              ))}
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground text-glow">
            {postInfo.title}
          </h1>
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <MarkdownRenderer
            content={markdownContent}
            className="border border-border p-6"
          />
        )}
      </motion.div>
    </>
  );
};

export default BlogPostPage;
