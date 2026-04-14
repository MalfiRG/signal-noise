import { ExternalLink, Github, Star, GitFork, Clock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { projects, type Project } from "./data";
import { useItemVariant } from "@/lib/motion";

const MOBILE_BREAKPOINT = 640;

const desktopStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.5, delayChildren: 0.3 } },
};

const mobileItemReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

const ProjectCard = ({ project }: { project: Project }) => (
  <div className="border border-border bg-card/50 p-6 hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/15 transition-all duration-200 group neon-border-trace">
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

    <div className="flex gap-3">
      {project.github_url && (
        <a
          href={project.github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border/50 hover:border-primary/50 px-3 py-1.5 tracking-wider transition-all"
        >
          <Github className="h-3.5 w-3.5" />
          SOURCE
        </a>
      )}
      {project.live_url && (
        <a
          href={project.live_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/50 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_12px_hsl(var(--primary)/0.3)] px-3 py-1.5 tracking-wider transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          VISIT SITE
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
  </div>
);

const ProjectsList = () => {
  const itemVariant = useItemVariant();
  const prefersReduced = useReducedMotion();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{">"} ls ~/projects</p>
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">PROJECTS</h1>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 border border-border/50">
            <p className="text-muted-foreground text-sm tracking-wider">
              {">"} NO PROJECTS FOUND. INITIALIZING...
            </p>
          </div>
        ) : isMobile ? (
          /* Mobile: each card has its own scroll trigger — reveals as you scroll */
          <div className="grid gap-6">
            {projects.map((project) => (
              <motion.div
                key={project.title}
                variants={prefersReduced ? undefined : mobileItemReveal}
                initial={prefersReduced ? undefined : "hidden"}
                whileInView={prefersReduced ? undefined : "visible"}
                viewport={{ once: true, margin: "-80px" }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </div>
        ) : (
          /* Desktop: parent-orchestrated stagger, all cards cascade together */
          <motion.div
            className="grid gap-6 md:grid-cols-2"
            variants={desktopStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {projects.map((project) => (
              <motion.div key={project.title} variants={itemVariant}>
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProjectsList;
