import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { howIDoItPages } from "./data";
import { useItemVariant } from "@/lib/motion";

const MOBILE_BREAKPOINT = 640;

const desktopStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.5, delayChildren: 0.2 } },
};

const mobileItemReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

const MethodologyCard = ({ slug, title, description }: { slug: string; title: string; description: string }) => (
  <Link
    to={`/how-i-do-it/${slug}`}
    className="block border border-border bg-card/50 p-6 hover:border-primary/50 transition-all group"
  >
    <div className="flex items-center gap-3 mb-3">
      <FileText className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
      <h3 className="font-display text-lg font-bold text-foreground group-hover:text-glow">
        {title}
      </h3>
    </div>
    <p className="text-muted-foreground text-sm leading-relaxed">
      {description}
    </p>
  </Link>
);

const HowIDoItIndex = () => {
  const itemVariant = useItemVariant();
  const prefersReduced = useReducedMotion();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">
            {">"} ls ~/methodology/
          </p>
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">
            HOW I DO IT
          </h1>
          <p className="text-muted-foreground text-sm mt-4 max-w-2xl">
            A look into my QA methodology — how I plan tests, design cases, build frameworks, and
            report bugs.
          </p>
        </div>

        {isMobile ? (
          <div className="grid gap-6">
            {howIDoItPages.map((page) => (
              <motion.div
                key={page.slug}
                variants={prefersReduced ? undefined : mobileItemReveal}
                initial={prefersReduced ? undefined : "hidden"}
                whileInView={prefersReduced ? undefined : "visible"}
                viewport={{ once: true, margin: "-80px" }}
              >
                <MethodologyCard {...page} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid gap-6 md:grid-cols-2"
            variants={desktopStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {howIDoItPages.map((page) => (
              <motion.div key={page.slug} variants={itemVariant}>
                <MethodologyCard {...page} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HowIDoItIndex;
