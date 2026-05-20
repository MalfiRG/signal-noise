import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useDiagramMotion } from "./useDiagramMotion";
import { useDiagramMode } from "./types";
import { DiagramShell } from "./DiagramShell";
import { AnimatedBar } from "./AnimatedBar";
import { useCountUp } from "./useCountUp";
import type { Mode } from "./types";

const STAGGER_MS = 120;
const GROW_DURATION_MS = 800;
const SPRING_SETTLE_MS = 300;
const PHASE_1_MS = 2 * STAGGER_MS + GROW_DURATION_MS + SPRING_SETTLE_MS;

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_MS / 1000, delayChildren: 0.15 } },
};
const staticContainerVariants: Variants = { hidden: {}, visible: {} };

const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, delay: (PHASE_1_MS + 1200) / 1000 } },
};
const staticFadeVariants: Variants = { hidden: { opacity: 1 }, visible: { opacity: 1 } };

const barColors: Record<"hnsw" | "sqlite", Record<Mode, { bar: string; label: string; subLabel: string }>> = {
  hnsw: {
    inline: { bar: "#ef4444", label: "#ffffff", subLabel: "#b91c1c" },
    expanded: { bar: "#f87171", label: "#ffffff", subLabel: "#fca5a5" },
    reading: { bar: "#dc2626", label: "#ffffff", subLabel: "#991b1b" },
  },
  sqlite: {
    inline: { bar: "#16a34a", label: "#ffffff", subLabel: "#15803d" },
    expanded: { bar: "#4ade80", label: "#111827", subLabel: "#86efac" },
    reading: { bar: "#15803d", label: "#ffffff", subLabel: "#166534" },
  },
};

const badgeColors: Record<Mode, Record<"faster" | "slower", string>> = {
  inline: {
    faster: "bg-red-100 text-red-700 border border-red-300",
    slower: "bg-green-100 text-green-700 border border-green-300",
  },
  expanded: {
    faster: "bg-red-500/20 text-red-400 border border-red-500/40",
    slower: "bg-green-500/20 text-green-400 border border-green-500/40",
  },
  reading: {
    faster: "bg-red-50 text-red-800 border border-red-300",
    slower: "bg-green-50 text-green-900 border border-green-300",
  },
};

const hitRateColors: Record<Mode, Record<"hnsw" | "sqlite", string>> = {
  inline: { hnsw: "#b91c1c", sqlite: "#15803d" },
  expanded: { hnsw: "#f87171", sqlite: "#4ade80" },
  reading: { hnsw: "#991b1b", sqlite: "#166534" },
};

const sectionHeaderColors: Record<Mode, string> = {
  inline: "text-[#67594c]",
  expanded: "text-foreground/60",
  reading: "text-gray-500",
};

const subTextColors: Record<Mode, string> = {
  inline: "text-[#2d2520]/70",
  expanded: "text-foreground/60",
  reading: "text-gray-500",
};

const dividerColors: Record<Mode, string> = {
  inline: "bg-[#67594c]/70",
  expanded: "bg-foreground/30",
  reading: "bg-gray-400",
};

const verdictColors: Record<Mode, string> = {
  inline: "text-[#2d2520]",
  expanded: "text-foreground",
  reading: "text-[#2d2520]",
};

function LatencyTaxContent({ expanded, animate }: { expanded: boolean; animate: boolean }) {
  const mode = useDiagramMode(expanded);
  const [showHitRate, setShowHitRate] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setShowHitRate(true);
      return;
    }
    setShowHitRate(false);
    const t = setTimeout(() => setShowHitRate(true), PHASE_1_MS);
    return () => clearTimeout(t);
  }, [animate]);

  const hnswCount = useCountUp(40, 1.2, showHitRate);
  const sqliteCount = useCountUp(100, 1.2, showHitRate);

  const hnswC = barColors.hnsw[mode];
  const sqliteC = barColors.sqlite[mode];
  const hitRateC = hitRateColors[mode];
  const cv = animate ? containerVariants : staticContainerVariants;

  const hitRateFontSize = expanded ? "28px" : "24px";

  return (
    <motion.div
      role="figure"
      aria-label="The Latency Tax: HNSW queries at 80ms with 40% hit rate vs sqlite-vec at 119ms with 100% hit rate. 39ms buys 100% correctness"
      initial={animate ? "hidden" : "visible"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={cv}
      className="flex flex-col gap-6 py-4 px-2 w-full"
    >
      <div className="flex flex-col gap-3">
        <span className={`text-[10px] font-mono tracking-widest uppercase ${sectionHeaderColors[mode]}`}>
          Query Latency (lower is better)
        </span>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {expanded && (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: hnswC.bar }} />
              )}
              <span className="text-xs font-mono font-medium w-20 shrink-0" style={{ color: hnswC.bar }}>
                HNSW
              </span>
              <div className="flex-1">
                <AnimatedBar
                  value={80}
                  maxValue={119}
                  color={hnswC.bar}
                  labelColor={hnswC.label}
                  subLabelColor={hnswC.subLabel}
                  ariaLabel="HNSW query latency: 80ms"
                  animate={animate}
                  delay={0}
                  growDuration={GROW_DURATION_MS / 1000}
                  countUp
                  countUpDuration={1.5}
                  height={20}
                />
              </div>
              <span className={`text-[10px] font-mono rounded-full px-2 py-0.5 shrink-0 ${badgeColors[mode].faster}`}>
                faster
              </span>
            </div>
            <span className={`text-[10px] font-mono ml-[5.5rem] ${subTextColors[mode]}`}>
              (approximate)
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {expanded && (
                <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: sqliteC.bar }} />
              )}
              <span className="text-xs font-mono font-medium w-20 shrink-0" style={{ color: sqliteC.bar }}>
                sqlite-vec
              </span>
              <div className="flex-1">
                <AnimatedBar
                  value={119}
                  maxValue={119}
                  color={sqliteC.bar}
                  labelColor={sqliteC.label}
                  subLabelColor={sqliteC.subLabel}
                  ariaLabel="sqlite-vec query latency: 119ms"
                  animate={animate}
                  delay={STAGGER_MS / 1000}
                  growDuration={GROW_DURATION_MS / 1000}
                  countUp
                  countUpDuration={1.5}
                  height={20}
                />
              </div>
              <span className={`text-[10px] font-mono rounded-full px-2 py-0.5 shrink-0 ${badgeColors[mode].slower}`}>
                slower
              </span>
            </div>
            <span className={`text-[10px] font-mono ml-[5.5rem] ${subTextColors[mode]}`}>
              (exact)
            </span>
          </div>
        </div>
      </div>

      <div
        className={`h-px w-full ${dividerColors[mode]}`}
        style={{
          transform: showHitRate ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left",
          transition: animate ? "transform 0.3s ease-out" : "none",
        }}
      />

      <div className="flex flex-col items-center gap-3">
        <span className={`text-[10px] font-mono tracking-widest uppercase ${sectionHeaderColors[mode]}`}>
          Hit Rate
        </span>

        <div className="flex items-stretch gap-0 max-w-xs sm:max-w-none w-full">
          <div className="flex-1 flex flex-col items-center gap-1">
            <div aria-hidden="true" className="font-bold tabular-nums" style={{ fontSize: hitRateFontSize, color: hitRateC.hnsw }}>
              {hnswCount}%
            </div>
            <span className="sr-only">HNSW hit rate: 40%</span>
            <span className={`text-[10px] font-mono text-center ${subTextColors[mode]}`}>
              HNSW at 100K+
            </span>
            <span className={`text-[10px] font-mono text-center ${subTextColors[mode]}`}>
              17.2% data loss
            </span>
          </div>

          <div className={`w-px self-stretch mx-2 ${dividerColors[mode]}`} />

          <div className="flex-1 flex flex-col items-center gap-1">
            <div aria-hidden="true" className="font-bold tabular-nums" style={{ fontSize: hitRateFontSize, color: hitRateC.sqlite }}>
              {sqliteCount}%
            </div>
            <span className="sr-only">sqlite-vec hit rate: 100%</span>
            <span className={`text-[10px] font-mono text-center ${subTextColors[mode]}`}>
              sqlite-vec
            </span>
            <span className={`text-[10px] font-mono text-center ${subTextColors[mode]}`}>
              zero divergence
            </span>
          </div>
        </div>
      </div>

      <motion.div
        variants={animate ? fadeInVariants : staticFadeVariants}
        className={`text-center text-sm font-bold ${verdictColors[mode]}`}
      >
        +39ms per query buys 100% correctness
      </motion.div>
    </motion.div>
  );
}

export function LatencyTax() {
  const { animate } = useDiagramMotion();

  return (
    <DiagramShell title="The Latency Tax - speed vs correctness">
      {(expanded) => (
        <LatencyTaxContent expanded={expanded} animate={animate} />
      )}
    </DiagramShell>
  );
}
