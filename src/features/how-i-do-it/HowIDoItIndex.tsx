import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { howIDoItPages } from "./data";

const HowIDoItIndex = () => {
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

        <div className="grid gap-6 md:grid-cols-2">
          {howIDoItPages.map((page, i) => (
            <motion.div
              key={page.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/how-i-do-it/${page.slug}`}
                className="block border border-border bg-card/50 p-6 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                  <h3 className="font-display text-lg font-bold text-foreground group-hover:text-glow">
                    {page.title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {page.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowIDoItIndex;
