import { motion } from "framer-motion";
import { Star, GitFork, ExternalLink, Clock } from "lucide-react";
import { projects, type Project } from "@/features/projects/data";

const RepoCard = ({ project }: { project: Project }) => (
  <a
    href={project.github_url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex flex-col p-5 border border-border bg-card/50 hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/15 transition-all duration-200 group"
  >
    <p className="text-xs text-muted-foreground tracking-wider mb-1">
      {project.github_owner_repo}
    </p>
    <p className="text-sm text-foreground/80 leading-relaxed mb-4 flex-1">
      {project.description}
    </p>
    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/50">
      {project.stars !== "0" ? (
        <>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {project.stars}
          </span>
          {project.forks !== "0" && (
            <span className="flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5" />
              {project.forks}
            </span>
          )}
        </>
      ) : (
        <>
          {project.language && (
            <span>{project.language}</span>
          )}
          {project.pushedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {project.pushedAt}
            </span>
          )}
        </>
      )}
      <span className="ml-auto text-primary group-hover:underline flex items-center gap-1">
        View
        <ExternalLink className="w-3 h-3" />
      </span>
    </div>
  </a>
);

const SocialProof = () => {
  const githubProjects = projects.filter((p) => p.github_owner_repo);

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">{"> cat ~/social.log"}</p>
          <h2 className="font-display text-4xl font-bold text-foreground text-glow">SIGNALS</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {githubProjects.map((project, i) => (
            <motion.div
              key={project.github_owner_repo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
            >
              <RepoCard project={project} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
