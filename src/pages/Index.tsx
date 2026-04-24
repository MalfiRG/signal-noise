import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AboutSection from "@/features/about/AboutSection";
import LetterReveal from "@/components/LetterReveal";
import { useHeroStaggerVariant, useMotionPolicy } from "@/lib/motion";

const HERO_PLAYED_KEY = "hero-cascade-played";

function isDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".vercel.app");
}

function readHeroReplaySkip(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(HERO_PLAYED_KEY) === "1";
  } catch (err) {
    console.warn("[hero] sessionStorage read failed; replay-skip defaulted to false", err);
    return false;
  }
}

function writeHeroReplayFlag(): void {
  if (isDevHost()) return;
  try {
    sessionStorage.setItem(HERO_PLAYED_KEY, "1");
  } catch (err) {
    console.warn("[hero] sessionStorage write failed; cascade may replay next visit", err);
  }
}

const Index = () => {
  const heroItem = useHeroStaggerVariant();

  const [heroReplaySkip] = useState(() => readHeroReplaySkip());
  const policy = useMotionPolicy({ heroReplaySkip });
  const { animationsDisabled, prefersReducedMotion, tier } = policy;

  const [phase, setPhase] = useState(animationsDisabled ? 3 : 0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (animationsDisabled) {
      setPhase(3);
      return;
    }

    setPhase(0);
    const schedule = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timeoutsRef.current.push(id);
    };

    const raf = requestAnimationFrame(() => {
      if (prefersReducedMotion) {
        schedule(100, () => setPhase(1));
        schedule(1100, () => setPhase(2));
        schedule(1200, () => {
          setPhase(3);
          writeHeroReplayFlag();
        });
      } else {
        schedule(200, () => setPhase(1));
        schedule(2500, () => setPhase(2));
        schedule(6000, () => {
          setPhase(3);
          writeHeroReplayFlag();
        });
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [animationsDisabled, prefersReducedMotion, tier]);

  const animClass = (gateMet: boolean, cls: string): string => {
    if (!gateMet) return "opacity-0";
    return animationsDisabled ? "" : cls;
  };

  return (
    <>
      <div className="scanline fixed inset-0 z-10" />

      {prefersReducedMotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="fixed bottom-4 right-4 z-50 text-orange-400/80 text-[10px] font-mono px-2 py-1 rounded border border-orange-400/30 bg-background/50 backdrop-blur-sm"
        >
          reduce-motion: on
        </motion.div>
      )}

      <section className="relative z-20 min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 block animate-hero-glow-slow pointer-events-none"
          style={{ backgroundColor: 'hsl(var(--hero-orb-primary))', mixBlendMode: 'screen' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 block animate-hero-glow-slower pointer-events-none"
          style={{ backgroundColor: 'hsl(var(--hero-orb-accent))', mixBlendMode: 'screen' }}
        />

        <div className="text-center px-4 max-w-3xl">
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

          <h1 className="font-display text-5xl md:text-7xl font-black text-foreground text-glow mb-6 flex flex-col items-center gap-1 md:gap-2">
            <span
              className={animClass(phase >= 2, "hero-glitch-entrance")}
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
                skipAnimation={animationsDisabled}
              />
            ) : (
              <span className="block opacity-0" aria-label="BUILD IT">BUILD IT</span>
            )}
            <span
              className={animClass(phase >= 2, "hero-stamp-entrance")}
              style={phase >= 2 && !animationsDisabled ? { animationDelay: "2.2s" } : undefined}
            >
              PROVE IT
            </span>
          </h1>

          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.5, delayChildren: 0.05 } } }}
            initial={animationsDisabled ? "visible" : "hidden"}
            animate={phase >= 3 ? "visible" : "hidden"}
          >
            <motion.div variants={heroItem}>
              <p className="text-foreground/80 text-lg mb-8 leading-relaxed">
                Every bug is a hypothesis waiting to be tested.<br />
                Research. Execute. Certify.
              </p>
            </motion.div>

            <motion.div variants={heroItem} className="flex gap-4 justify-center">
              <Link
                to="/projects"
                className={`border border-primary/50 bg-primary/10 px-8 py-3 text-sm tracking-widest text-primary hover:bg-primary/20 hover:border-primary transition-all box-glow btn-interactive glitch-hover`}
                data-text="VIEW PROJECTS"
              >
                VIEW PROJECTS
              </Link>
              <Link
                to="/blog"
                className={`border border-border px-8 py-3 text-sm tracking-widest text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all btn-interactive glitch-hover`}
                data-text="READ BLOG"
              >
                READ BLOG
              </Link>
            </motion.div>

            <motion.div variants={heroItem} className="mt-8">
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
