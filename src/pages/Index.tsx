import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AboutSection from "@/features/about/AboutSection";
import LetterReveal from "@/components/LetterReveal";
import { useHeroStaggerVariant, useMotionPolicy } from "@/lib/motion";

const HERO_PLAYED_KEY = "hero-cascade-played";

/**
 * True only while the Vite dev server is running (`npm run dev`). Vercel
 * preview AND production both run `vite build`, so `import.meta.env.DEV` is
 * false for them and the cascade-replay flag persists as designed.
 *
 * Earlier hostname-based gate (`*.vercel.app`) accidentally treated the live
 * production subdomain as dev, so the back-button suppression never armed
 * for actual visitors. Build-time DEV is the durable signal.
 */
function isDevBuild(): boolean {
  return import.meta.env.DEV === true;
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

let devHostWriteSkipWarned = false;

function writeHeroReplayFlag(): void {
  if (isDevBuild()) {
    if (!devHostWriteSkipWarned) {
      console.info("[digital-matrix] dev build: cascade replay flag NOT persisted (import.meta.env.DEV is true)");
      devHostWriteSkipWarned = true;
    }
    return;
  }
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
  const rafRef = useRef<number | null>(null);
  const viewProjectsRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
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

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
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
        schedule(5800, () => {
          setPhase(3);
          writeHeroReplayFlag();
        });
      }
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [animationsDisabled, prefersReducedMotion, tier]);

  const animClass = (gateMet: boolean, cls: string): string => {
    if (!gateMet) return "opacity-0";
    return animationsDisabled ? "" : cls;
  };

  const skipToPhase3 = () => {
    if (phase >= 3) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPhase(3);
    writeHeroReplayFlag();
    // Move focus to the first CTA so keyboard users aren't stranded on an
    // unmounted SKIP button (a11y — Wave 3 review B5 / F-UX-05).
    setTimeout(() => viewProjectsRef.current?.focus(), 0);
  };

  const BADGE_DISMISS_KEY = "hero-badge-dismissed";
  const [badgeDismissed, setBadgeDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(BADGE_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const dismissBadge = () => {
    setBadgeDismissed(true);
    try {
      localStorage.setItem(BADGE_DISMISS_KEY, "1");
    } catch {
      /* ignore — dismissal is cosmetic */
    }
  };

  // Tri-state badge per F-UX-03 + F-CONS-05 convergence. animationsDisabled can
  // be caused by (1) OS reduced-motion, (2) session replay-skip, or (3) tier
  // default. The cause determines the label so the user understands WHY motion
  // is off. Priority: OS > session > tier (matches §4 evaluation chain order).
  const showReducedMotionBadge = prefersReducedMotion && !badgeDismissed;
  const showSessionBadge =
    !prefersReducedMotion && animationsDisabled && heroReplaySkip && !badgeDismissed;
  const showTierBadge =
    !prefersReducedMotion && animationsDisabled && !heroReplaySkip && !badgeDismissed;

  return (
    <>
      <div className="scanline fixed inset-0 z-10" />

      {(showReducedMotionBadge || showSessionBadge || showTierBadge) && (
        <motion.button
          type="button"
          onClick={dismissBadge}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="fixed bottom-4 right-4 z-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted-foreground text-[10px] font-mono px-3 py-2 rounded border border-border bg-background/60 backdrop-blur-sm cursor-pointer hover:opacity-100 hover:border-primary/50"
          aria-label={
            showReducedMotionBadge
              ? "Reduced motion is on. Click to dismiss."
              : showSessionBadge
                ? "Motion off for this session. Click to dismiss."
                : "Motion off for this device. Click to dismiss."
          }
          data-testid={
            showReducedMotionBadge
              ? "badge-reduced-motion"
              : showSessionBadge
                ? "badge-animations-off-session"
                : "badge-animations-off-device"
          }
        >
          {showReducedMotionBadge
            ? "reduce-motion: on"
            : showSessionBadge
              ? "motion: off (session)"
              : "motion: off (device)"}
        </motion.button>
      )}

      {/* SKIP button MUST be a direct child of the top-level fragment to avoid
          stacking-context traps. Sibling <section> and <div className="relative
          z-20"> around AboutSection each create later stacking contexts that
          would paint over a nested z-40 button. See Wave 3 review B2. */}
      {phase >= 1 && phase < 3 && !animationsDisabled && (
        <button
          type="button"
          onClick={skipToPhase3}
          aria-label="Skip intro"
          className="fixed bottom-4 right-4 z-40 border border-border px-3 py-1 text-xs tracking-widest text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all bg-background/60 backdrop-blur-sm"
        >
          SKIP ›
        </button>
      )}

      <section
        className="relative z-20 min-h-screen flex items-center justify-center overflow-hidden"
        data-testid={phase >= 3 ? "hero-phase3" : "hero-cascading"}
      >
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 block animate-hero-glow-slow pointer-events-none"
          style={{ backgroundColor: 'hsl(var(--hero-orb-primary))', mixBlendMode: 'screen' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 block animate-hero-glow-slower pointer-events-none"
          style={{ backgroundColor: 'hsl(var(--hero-orb-accent))', mixBlendMode: 'screen' }}
        />

        <div className="text-center px-4 max-w-3xl">
          {/* LetterReveal skipAnimation receives animationsDisabled (which composes
              heroReplaySkip via useMotionPolicy) — no double-pass needed per §5.3. */}
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
            <p aria-hidden="true" className="text-muted-foreground text-sm tracking-[0.3em] mb-4 opacity-0">
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
              <span className="block opacity-0" aria-hidden="true" aria-label="BUILD IT">BUILD IT</span>
            )}
            <span
              className={animClass(phase >= 2, "hero-stamp-entrance")}
              style={phase >= 2 && !animationsDisabled ? { animationDelay: "2.2s" } : undefined}
            >
              PROVE IT
            </span>
          </h1>

          {/* The CTA region uses the modern HTML `inert` attribute (React 19
              boolean prop) to gate it during the cascade. `inert` is one
              attribute that subsumes three older ones we used to coordinate
              by hand: it removes the subtree from the accessibility tree
              (like aria-hidden), prevents focus from reaching descendants
              (like tabindex=-1 on each child), and disables pointer events
              (like pointer-events-none). axe-DevTools previously flagged
              the aria-hidden + focusable-children pair as a Serious WCAG
              violation; `inert` resolves it cleanly. */}
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.5, delayChildren: 0.05 } } }}
            initial={animationsDisabled ? "visible" : "hidden"}
            animate={phase >= 3 ? "visible" : "hidden"}
            inert={phase < 3}
          >
            <motion.div variants={heroItem}>
              <p className="text-foreground/80 text-lg mb-8 leading-relaxed">
                Every bug is a hypothesis waiting to be tested.<br />
                Research. Execute. Certify.
              </p>
            </motion.div>

            <motion.div variants={heroItem} className="flex gap-4 justify-center">
              <Link
                ref={viewProjectsRef}
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
