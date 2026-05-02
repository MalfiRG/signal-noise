import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { type RefObject, useEffect, useState } from "react";
import IdStrip from "./IdStrip";
import LetterReveal from "@/components/LetterReveal";
import { useHeroStaggerVariant } from "@/lib/motion";

interface HeroSignalNoiseProps {
  phase: number;
  animationsDisabled: boolean;
  prefersReducedMotion: boolean;
  viewProjectsRef: RefObject<HTMLAnchorElement | null>;
}

const animClass = (gateMet: boolean, cls: string, animationsDisabled: boolean): string => {
  if (!gateMet) return "opacity-0";
  return animationsDisabled ? "" : cls;
};

const HeroSignalNoise = ({
  phase,
  animationsDisabled,
  viewProjectsRef,
}: HeroSignalNoiseProps) => {
  const heroItem = useHeroStaggerVariant();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="text-center px-4 w-full max-w-[960px]">
      <IdStrip />

      {phase >= 1 ? (
        <LetterReveal
          text="> INITIALIZING SYSTEM..."
          tag="p"
          className="text-muted-foreground text-sm tracking-[0.3em] mb-4 letter-reveal-linear"
          delayPerLetter={40}
          startDelay={0}
          skipAnimation={animationsDisabled}
        />
      ) : (
        <p className="text-muted-foreground text-sm tracking-[0.3em] mb-4 opacity-0">
          {">"} INITIALIZING SYSTEM...
        </p>
      )}

      <h1 className="hero-h">
        <span
          className={`h-row left ${animClass(phase >= 2, "hero-glitch-entrance", animationsDisabled)}`}
          data-row="break"
          data-text="BREAK IT"
        >
          BREAK IT
        </span>
        <span className="h-row center" data-row="build" aria-label="BUILD IT">
          {phase >= 2 ? (
            <LetterReveal
              text="BUILD IT"
              tag="span"
              className="block"
              delayPerLetter={70}
              startDelay={1000}
              skipAnimation={animationsDisabled}
            />
          ) : (
            <span className="block opacity-0" aria-hidden="true">BUILD IT</span>
          )}
        </span>
        <span
          className={`h-row right ${animClass(phase >= 2, "hero-stamp-entrance", animationsDisabled)}`}
          data-row="prove"
          style={phase >= 2 && !animationsDisabled ? { animationDelay: "2.2s" } : undefined}
        >
          PROVE IT
        </span>
      </h1>

      {/* React 19 boolean inert prop — Wave 3 B5 / F-UX-05 a11y.
          Outer plain div owns the inert attribute and data-cta-wrap selector;
          inner motion.div owns the stagger-children animation. */}
      <div
        data-cta-wrap=""
        {...(phase < 3 ? { inert: true } : {})}
      >
        <motion.div
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.5, delayChildren: 0.05 } } }}
          initial={animationsDisabled ? "visible" : "hidden"}
          animate={phase >= 3 ? "visible" : "hidden"}
        >
          <motion.div variants={heroItem}>
            <p className="text-foreground/80 text-lg mt-10 mb-8 leading-relaxed">
              Every bug is a hypothesis waiting to be tested.<br />
              Research. Execute. Certify.
            </p>
          </motion.div>

          <motion.div variants={heroItem} className="flex gap-4 justify-center">
            <Link
              ref={viewProjectsRef}
              to="/projects"
              className="border border-primary/50 bg-primary/10 px-8 py-3 text-base tracking-widest text-primary hover:bg-primary/20 hover:border-primary transition-all box-glow btn-interactive glitch-hover"
              data-text="VIEW PROJECTS"
            >
              VIEW PROJECTS
            </Link>
            <Link
              to="/blog"
              className="border border-muted-foreground/50 px-8 py-3 text-base tracking-widest text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all btn-interactive glitch-hover"
              data-text="READ BLOG"
            >
              READ BLOG
            </Link>
          </motion.div>

          <div
            className={`transition-opacity duration-300 ${scrolled ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            aria-hidden={scrolled ? "true" : undefined}
          >
            <motion.div variants={heroItem} className="mt-8">
              <p className="text-muted-foreground text-sm tracking-[0.2em] animate-glow-pulse">
                ▼ SCROLL TO EXPLORE ▼
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSignalNoise;
