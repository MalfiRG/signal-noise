import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AdminBlog = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    tags: "",
    published: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("NOT AUTHENTICATED");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("blog_posts").insert({
      title: form.title,
      content: form.content,
      excerpt: form.excerpt || null,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      published: form.published,
      user_id: session.user.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("POST CREATED");
      navigate("/blog");
    }
    setLoading(false);
  };

  const inputClass = "bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary";

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-2xl">
        <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} write --blog</p>
        <h1 className="font-display text-3xl font-bold text-foreground text-glow mb-8">NEW BLOG POST</h1>

        <form onSubmit={handleSubmit} className="space-y-4 border border-border bg-card/50 p-6">
          <Input placeholder="Post title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} />
          <Input placeholder="Excerpt (short summary)" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={inputClass} />
          <Textarea placeholder="Write your post content..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required className={inputClass} rows={12} />
          <Input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputClass} />

          <div className="flex items-center gap-3">
            <Switch checked={form.published} onCheckedChange={(checked) => setForm({ ...form, published: checked })} />
            <Label className="text-foreground text-sm tracking-wider">PUBLISH IMMEDIATELY</Label>
          </div>

          <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/80 tracking-widest text-xs">
            {loading ? "UPLOADING..." : "CREATE POST"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminBlog;
