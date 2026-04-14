import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import AboutSection from "@/features/about/AboutSection";
// SocialProof removed from Index — repo cards merged into ProjectsList
import LetterReveal from "@/components/LetterReveal";
import { staggerContainer, staggerItem, useIsCyberTheme } from "@/lib/motion";

const Index = () => {
  const isCyber = useIsCyberTheme();
  const prefersReduced = useReducedMotion();

  // Three-phase hero cascade:
  // Phase 1 (200ms):  "INITIALIZING SYSTEM..." letter reveal
  // Phase 2 (2000ms): h1 headline — BREAK IT → BUILD IT → PROVE IT
  // Phase 3 (5000ms): subtitle, buttons, scroll hint
  // If prefers-reduced-motion: same cascade order but faster, no animations.
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (prefersReduced) {
        setTimeout(() => setPhase(1), 100);
        setTimeout(() => setPhase(2), 600);
        setTimeout(() => setPhase(3), 1200);
      } else {
        setTimeout(() => setPhase(1), 200);
        setTimeout(() => setPhase(2), 2000);
        setTimeout(() => setPhase(3), 5000);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [prefersReduced]);

  return (
    <>
      <div className="scanline fixed inset-0 z-10" />

      {/* Reduced-motion guard — dev + prod visible warning */}
      {prefersReduced && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="fixed bottom-4 right-4 z-50 text-yellow-500/70 text-[10px] font-mono px-2 py-1 rounded border border-yellow-500/20 bg-background/50 backdrop-blur-sm"
        >
          reduce-motion: on
        </motion.div>
      )}

      <section className="relative z-20 min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 hidden sm:block animate-hero-glow-slow pointer-events-none"
          style={{ backgroundColor: 'hsl(var(--hero-orb-primary))', mixBlendMode: 'screen' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 hidden sm:block animate-hero-glow-slower pointer-events-none"
          style={{ backgroundColor: 'hsl(var(--hero-orb-accent))', mixBlendMode: 'screen' }}
        />

        <div className="text-center px-4 max-w-3xl">
          {/* Phase 1: INITIALIZING SYSTEM... letter reveal */}
          {phase >= 1 ? (
            <LetterReveal
              text="> INITIALIZING SYSTEM..."
              tag="p"
              className="text-muted-foreground text-sm tracking-[0.3em] mb-4"
              delayPerLetter={40}
              startDelay={0}
            />
          ) : (
            <p className="text-muted-foreground text-sm tracking-[0.3em] mb-4 opacity-0">
              {">"} INITIALIZING SYSTEM...
            </p>
          )}

          {/* Phase 2: Headline cascade */}
          <h1 className="font-display text-5xl md:text-7xl font-black text-foreground text-glow mb-6 flex flex-col items-center gap-1 md:gap-2">
            <span
              className={phase >= 2 ? "hero-glitch-entrance" : "opacity-0"}
              data-text="BREAK IT"
            >
              BREAK IT
            </span>
            {phase >= 2 ? (
              <LetterReveal
                text="BUILD IT"
                tag="span"
                className="block"
                delayPerLetter={70}
                startDelay={1000}
              />
            ) : (
              <span className="block opacity-0" aria-label="BUILD IT">BUILD IT</span>
            )}
            <span
              className={phase >= 2 ? "hero-stamp-entrance" : "opacity-0"}
              style={phase >= 2 ? { animationDelay: "2.2s" } : undefined}
            >
              PROVE IT
            </span>
          </h1>

          {/* Phase 3: Subtitle, buttons, scroll — staggered together */}
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.5, delayChildren: 0.05 } } }}
            initial="hidden"
            animate={phase >= 3 ? "visible" : "hidden"}
          >
            <motion.div variants={staggerItem}>
              <p className="text-foreground/80 text-lg mb-8 leading-relaxed">
                Every bug is a hypothesis waiting to be tested.<br />
                Research. Execute. Certify.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} className="flex gap-4 justify-center">
              <Link
                to="/projects"
                className={`border border-primary/50 bg-primary/10 px-8 py-3 text-sm tracking-widest text-primary hover:bg-primary/20 hover:border-primary transition-all box-glow btn-interactive${isCyber ? " glitch-hover" : ""}`}
                data-text="VIEW PROJECTS"
              >
                VIEW PROJECTS
              </Link>
              <Link
                to="/blog"
                className={`border border-border px-8 py-3 text-sm tracking-widest text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all btn-interactive${isCyber ? " glitch-hover" : ""}`}
                data-text="READ BLOG"
              >
                READ BLOG
              </Link>
            </motion.div>

            <motion.div variants={staggerItem} className="mt-8">
              <p className="text-muted-foreground text-xs tracking-[0.2em] animate-glow-pulse">
                ▼ SCROLL TO EXPLORE ▼
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="relative z-20">
        <AboutSection />
      </div>
    </>
  );
};

export default Index;
