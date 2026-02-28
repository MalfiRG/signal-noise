import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const AdminProject = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    tech_stack: "",
    github_url: "",
    live_url: "",
    image_url: "",
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

    const { error } = await supabase.from("projects").insert({
      title: form.title,
      description: form.description,
      tech_stack: form.tech_stack.split(",").map((s) => s.trim()).filter(Boolean),
      github_url: form.github_url || null,
      live_url: form.live_url || null,
      image_url: form.image_url || null,
      user_id: session.user.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("PROJECT CREATED");
      navigate("/projects");
    }
    setLoading(false);
  };

  const inputClass = "bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary";

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-2xl">
        <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} create --project</p>
        <h1 className="font-display text-3xl font-bold text-foreground text-glow mb-8">NEW PROJECT</h1>

        <form onSubmit={handleSubmit} className="space-y-4 border border-border bg-card/50 p-6">
          <Input placeholder="Project title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} />
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className={inputClass} rows={4} />
          <Input placeholder="Tech stack (comma separated)" value={form.tech_stack} onChange={(e) => setForm({ ...form, tech_stack: e.target.value })} className={inputClass} />
          <Input placeholder="GitHub URL" value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} className={inputClass} />
          <Input placeholder="Live URL" value={form.live_url} onChange={(e) => setForm({ ...form, live_url: e.target.value })} className={inputClass} />
          <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/80 tracking-widest text-xs">
            {loading ? "DEPLOYING..." : "CREATE PROJECT"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminProject;
