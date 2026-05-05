import { useParams, Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMarkdownContent } from "@/hooks/useMarkdownContent";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { TableOfContents, TocHeading } from "@/components/TableOfContents";
import Seo from "@/components/Seo";
import { visiblePosts } from "./data";
import type { BlogOutletContext } from "./data";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { activeTags } = useOutletContext<BlogOutletContext>();

  const contentMap = useMemo(() => {
    const map: Record<string, () => Promise<string>> = {};
    for (const post of visiblePosts) {
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

  const [headings, setHeadings] = useState<TocHeading[]>([]);

  const postInfo = visiblePosts.find((p) => p.slug === slug);

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
        <>
        <Seo
          title={postInfo.title}
          description={postInfo.excerpt}
          path={`/blog/${postInfo.slug}`}
          type="article"
          publishedTime={postInfo.date}
          tags={postInfo.tags}
        />
        <div className="mb-8 space-y-2">
          <span className="block text-muted-foreground text-xs tracking-wider">
            {postInfo.date}
          </span>
          {postInfo.tags.length > 0 && (
            <div
              data-testid="blog-post-tag-list"
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              {postInfo.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/blog?tags=${tag}`}
                  className="text-xs text-primary/60 tracking-wider hover:text-primary transition-colors break-all"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          <h1 className="font-display text-3xl font-bold text-foreground text-glow break-words [overflow-wrap:anywhere]">
            {postInfo.title}
          </h1>
        </div>
        </>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-8"
      >
        {isLoading ? (
          <div className="flex justify-center py-20 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <MarkdownRenderer
                content={markdownContent}
                className="p-6"
                onHeadingsExtracted={setHeadings}
              />
            </div>
            <TableOfContents headings={headings} />
          </>
        )}
      </motion.div>
    </>
  );
};

export default BlogPostPage;
