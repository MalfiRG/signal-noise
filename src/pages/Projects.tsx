import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Github, Loader2 } from "lucide-react";

const Projects = () => {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} ls ~/projects</p>
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">PROJECTS</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project, i) => (
              <div
                key={project.id}
                className="border border-border bg-card/50 p-6 hover:border-primary/50 transition-all group animate-fade-in opacity-0"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <h3 className="font-display text-xl font-bold text-foreground group-hover:text-glow mb-3">
                  {project.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {project.description}
                </p>

                {project.tech_stack && project.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tech_stack.map((tech: string) => (
                      <span
                        key={tech}
                        className="text-xs border border-primary/30 text-primary/80 px-2 py-0.5 tracking-wider"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                  {project.live_url && (
                    <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-border/50">
            <p className="text-muted-foreground text-sm tracking-wider">
              {">"} NO PROJECTS FOUND. INITIALIZING...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
