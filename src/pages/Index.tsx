import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import AboutSection from "@/features/about/AboutSection";
import HeroSignalNoise from "@/features/hero-signal-noise/HeroSignalNoise";
import HeroChrome from "@/features/hero-signal-noise/HeroChrome";
import { useMotionPolicy } from "@/lib/motion";

const HERO_PLAYED_KEY = "hero-cascade-played";

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

  const skipToPhase3 = () => {
    if (phase >= 3) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPhase(3);
    writeHeroReplayFlag();
    // a11y Wave 3 B5 / F-UX-05 — refocus first CTA after SKIP unmounts
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

  // Tri-state badge per F-UX-03 + F-CONS-05; priority OS > session > tier
  const showReducedMotionBadge = prefersReducedMotion && !badgeDismissed;
  const showSessionBadge =
    !prefersReducedMotion && animationsDisabled && heroReplaySkip && !badgeDismissed;
  const showTierBadge =
    !prefersReducedMotion && animationsDisabled && !heroReplaySkip && !badgeDismissed;

  return (
    <>
      <div className="scanline fixed inset-0 z-10" />
      <HeroChrome />

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

      {/* SKIP must be top-level fragment child — Wave 3 B2 stacking-context */}
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
        className="relative z-20 min-h-screen flex items-start md:items-center justify-center overflow-hidden pt-24 pb-12"
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

        <HeroSignalNoise
          phase={phase}
          animationsDisabled={animationsDisabled}
          prefersReducedMotion={prefersReducedMotion}
          viewProjectsRef={viewProjectsRef}
        />
      </section>

      <div className="relative z-20">
        <AboutSection />
      </div>
    </>
  );
};

export default Index;
