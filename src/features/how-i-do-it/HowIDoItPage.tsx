import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useMarkdownContent } from "@/hooks/useMarkdownContent";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { howIDoItPages } from "./data";

const HowIDoItPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const contentMap = useMemo(() => {
    return {
      "test-plan": () =>
        import("../../pages/content/how-i-do-it/test-plan.md?raw").then((mod) => mod.default),
      "test-case": () =>
        import("../../pages/content/how-i-do-it/test-case.md?raw").then((mod) => mod.default),
      "test-architecture": () =>
        import("../../pages/content/how-i-do-it/test-architecture.md?raw").then(
          (mod) => mod.default
        ),
      "automation-framework": () =>
        import("../../pages/content/how-i-do-it/automation-framework.md?raw").then(
          (mod) => mod.default
        ),
      "bug-reporting": () =>
        import("../../pages/content/how-i-do-it/bug-reporting.md?raw").then((mod) => mod.default),
    };
  }, []);

  const { markdownContent, isLoading } = useMarkdownContent({
    contentMap,
    slug: slug || "",
    fallback: "# Content not found",
  });

  const pageInfo = howIDoItPages.find((p) => p.slug === slug);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <Link
          to="/how-i-do-it"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm tracking-wider mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          BACK TO INDEX
        </Link>

        {pageInfo && (
          <div className="mb-8">
            <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2 hidden-in-reading">
              {">"} cat ~/methodology/{slug}.md
            </p>
            <h1 className="font-display text-3xl font-bold text-foreground text-glow">
              {pageInfo.title}
            </h1>
          </div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <MarkdownRenderer
              content={markdownContent}
              className="p-6"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default HowIDoItPage;
