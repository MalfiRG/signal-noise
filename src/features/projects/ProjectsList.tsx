import { motion } from "framer-motion";
import { ExternalLink, Github, Star, GitFork, Clock } from "lucide-react";
import { projects } from "./data";

const ProjectsList = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} ls ~/projects</p>
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">PROJECTS</h1>
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project, i) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="border border-border bg-card/50 p-6 hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/15 transition-all duration-200 group"
              >
                <h3 className="font-display text-xl font-bold text-foreground group-hover:text-glow mb-3">
                  {project.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {project.description}
                </p>

                {project.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tech_stack.map((tech) => (
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
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                  {project.live_url && (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  {project.stars !== "0" ? (
                    <>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {project.stars}
                      </span>
                      {project.forks !== "0" && (
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          {project.forks}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {project.language && (
                        <span className="flex items-center gap-1">
                          {project.language}
                        </span>
                      )}
                      {project.pushedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {project.pushedAt}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
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

export default ProjectsList;
