import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <p className="text-muted-foreground">Post not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <Link to="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> BACK TO BLOG
        </Link>

        <div className="mb-4 flex items-center gap-3">
          <span className="text-muted-foreground text-xs tracking-wider">
            {format(new Date(post.created_at), "yyyy.MM.dd")}
          </span>
          {post.tags && post.tags.length > 0 && post.tags.map((tag: string) => (
            <span key={tag} className="text-xs text-primary/60 tracking-wider">#{tag}</span>
          ))}
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground text-glow mb-8">
          {post.title}
        </h1>

        <div className="prose prose-invert prose-green max-w-none text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>
      </div>
    </div>
  );
};

export default BlogPost;
