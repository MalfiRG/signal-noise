import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const Blog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} cat ~/blog/posts.md</p>
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">BLOG</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-8">
            {posts.map((post, i) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="block border border-border bg-card/50 p-6 hover:border-primary/50 transition-all group animate-fade-in opacity-0"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-muted-foreground text-xs tracking-wider">
                    {format(new Date(post.created_at), "yyyy.MM.dd")}
                  </span>
                  {post.tags && post.tags.length > 0 && (
                    <>
                      <span className="text-border">|</span>
                      {post.tags.map((tag: string) => (
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

export default Blog;
