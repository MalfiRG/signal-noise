import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useInRouterContext } from "react-router-dom";
import { useDiagramMotion } from "./useDiagramMotion";
import { useDiagramMode } from "./types";
import type { Mode } from "./types";
import { DiagramShell } from "./DiagramShell";
import { AnimatedBar } from "./AnimatedBar";

interface FlowStep {
  label: string;
  detail?: string;
  tone: "neutral" | "warning" | "success" | "accent";
}

const LEFT_STEPS: FlowStep[] = [
  { label: "Query", tone: "accent" },
  { label: "Load architecture.md", tone: "warning" },
  { label: "Load debug-session.jsonl", tone: "warning" },
  { label: "Load auth-notes.md", tone: "warning" },
  { label: "Parse all content", tone: "neutral" },
];

const RIGHT_STEPS: FlowStep[] = [
  { label: "Query", tone: "neutral" },
  { label: "KNN cosine search", detail: "85K drawers, 119ms", tone: "neutral" },
  { label: "KG entity lookup", detail: "3ms", tone: "neutral" },
  { label: "Top-5 drawers", tone: "success" },
];

const STAGGER_MS = 120;
const SPRING_SETTLE_MS = 300;
const STAGGER_S = STAGGER_MS / 1000;
const SETTLE_S = SPRING_SETTLE_MS / 1000;
const LEFT_DELAY_S = 0.15;
const LEFT_DONE_S = LEFT_DELAY_S + (LEFT_STEPS.length - 1) * STAGGER_S + SETTLE_S;
const RIGHT_DONE_S = LEFT_DONE_S + (RIGHT_STEPS.length - 1) * STAGGER_S + SETTLE_S;
const PHASE_1_MS = Math.ceil(RIGHT_DONE_S * 1000);
const PHASE_2_MS = 400;

const toneColors: Record<
  Mode,
  Record<FlowStep["tone"], { bg: string; border: string; text: string }>
> = {
  inline: {
    neutral: { bg: "bg-[#f4f2f1]", border: "border-[#67594c]", text: "text-[#2d2520]" },
    accent: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-800" },
    warning: { bg: "bg-red-50", border: "border-red-400", text: "text-red-700" },
    success: { bg: "bg-green-50", border: "border-green-500", text: "text-green-700" },
  },
  expanded: {
    neutral: { bg: "bg-[#1a2038]", border: "border-foreground/25", text: "text-foreground/80" },
    accent: { bg: "bg-yellow-950/40", border: "border-primary/60", text: "text-primary" },
    warning: { bg: "bg-red-950/40", border: "border-red-500/60", text: "text-red-400" },
    success: { bg: "bg-green-950/40", border: "border-green-500/60", text: "text-green-400" },
  },
  reading: {
    neutral: { bg: "bg-white", border: "border-[#67594c]", text: "text-[#2d2520]" },
    accent: { bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-900" },
    warning: { bg: "bg-red-50", border: "border-red-400", text: "text-red-800" },
    success: { bg: "bg-green-50", border: "border-green-500", text: "text-green-900" },
  },
};

const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const staticNodeVariants: Variants = {
  hidden: { opacity: 1, scale: 1, y: 0 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

function StepBox({
  step,
  mode,
  anim,
}: {
  step: FlowStep;
  mode: Mode;
  anim: boolean;
}) {
  const c = toneColors[mode][step.tone];
  return (
    <motion.div
      variants={anim ? nodeVariants : staticNodeVariants}
      className={`rounded-lg ${c.bg} ${c.border} border px-3 py-1.5 text-center w-full`}
    >
      <span className={`block text-xs font-mono font-medium ${c.text}`}>
        {step.label}
      </span>
      {step.detail && (
        <span className={`block text-[10px] ${c.text} opacity-60`}>
          {step.detail}
        </span>
      )}
    </motion.div>
  );
}

function FlowColumn({
  steps,
  delayChildren,
  mode,
  anim,
  dividerColor,
}: {
  steps: FlowStep[];
  delayChildren: number;
  mode: Mode;
  anim: boolean;
  dividerColor: string;
}) {
  const containerVariants: Variants = anim
    ? {
        hidden: {},
        visible: {
          transition: { staggerChildren: STAGGER_MS / 1000, delayChildren },
        },
      }
    : { hidden: {}, visible: {} };

  return (
    <motion.div
      variants={containerVariants}
      className="flex flex-col items-center gap-1.5 flex-1"
    >
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 w-full max-w-[220px]">
          {i > 0 && (
            <motion.div
              variants={anim ? nodeVariants : staticNodeVariants}
              className={`w-0.5 h-3 ${dividerColor}`}
            />
          )}
          <StepBox step={step} mode={mode} anim={anim} />
        </div>
      ))}
    </motion.div>
  );
}

function TokenEconomicsInner({
  expanded,
  animate,
  mode,
}: {
  expanded: boolean;
  animate: boolean;
  mode: Mode;
}) {
  const [showBars, setShowBars] = useState(!animate);
  const [showDivider, setShowDivider] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setShowDivider(true);
      setShowBars(true);
      return;
    }
    setShowDivider(false);
    setShowBars(false);
    const t1 = setTimeout(() => setShowDivider(true), PHASE_1_MS);
    const t2 = setTimeout(() => setShowBars(true), PHASE_1_MS + PHASE_2_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [animate, expanded]);

  const dividerLine =
    mode === "expanded" ? "bg-foreground/30" : "bg-[#67594c]/40";
  const resultText =
    mode === "expanded" ? "text-foreground/60" : "text-[#67594c]/60";

  const redBarColor = { from: "#ef4444", to: "#dc2626" };
  const greenBarColor = { from: "#52e3c8", to: "#34d399" };

  const redLabelColor =
    mode === "expanded" ? "#f87171" : "#b91c1c";
  const greenLabelColor =
    mode === "expanded" ? "#4ade80" : "#15803d";
  const redSubColor =
    mode === "expanded" ? "#f87171" : "#991b1b";
  const greenSubColor =
    mode === "expanded" ? "#4ade80" : "#166534";

  const outerContainerVariants: Variants = animate
    ? {
        hidden: {},
        visible: { transition: { staggerChildren: 0 } },
      }
    : { hidden: {}, visible: {} };

  return (
    <motion.div
      initial={animate ? "hidden" : "visible"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={outerContainerVariants}
      role="figure"
      aria-label="Token Economics: flat retrieval loads 88,000 tokens at 0.9% signal; MemPalace retrieval loads 3,000 tokens at 93% signal"
    >
      <div
        className={`flex ${expanded ? "flex-col sm:flex-row" : "flex-col"} gap-4 sm:gap-6 py-2`}
      >
        <FlowColumn
          steps={LEFT_STEPS}
          delayChildren={LEFT_DELAY_S}
          mode={mode}
          anim={animate}
          dividerColor={dividerLine}
        />
        <FlowColumn
          steps={RIGHT_STEPS}
          delayChildren={LEFT_DONE_S}
          mode={mode}
          anim={animate}
          dividerColor={dividerLine}
        />
      </div>

      <div className="my-4">
        <motion.div
          className={`h-px w-full ${dividerLine}`}
          initial={animate ? { scaleX: 0, originX: 0 } : { scaleX: 1 }}
          animate={showDivider ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
        />
        <motion.div
          className="flex justify-center mt-2"
          initial={animate ? { opacity: 0 } : { opacity: 1 }}
          animate={showDivider ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <span className={`text-[10px] font-mono uppercase tracking-widest ${resultText}`}>
            Result
          </span>
        </motion.div>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center gap-2">
          {expanded && showBars && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            </motion.div>
          )}
          <motion.div
            className="flex-1"
            initial={animate ? { opacity: 0 } : { opacity: 1 }}
            animate={showBars ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedBar
              value={88000}
              maxValue={88000}
              color={redBarColor}
              labelColor={redLabelColor}
              subLabelColor={redSubColor}
              ariaLabel="Flat retrieval: 88,000 tokens"
              animate={animate && showBars}
              countUp
              subLabel="0.9% signal-to-noise"
              delay={0}
            />
          </motion.div>
        </div>

        <div className="flex items-center gap-2">
          {expanded && showBars && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
            </motion.div>
          )}
          <motion.div
            className="flex-1"
            initial={animate ? { opacity: 0 } : { opacity: 1 }}
            animate={showBars ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <AnimatedBar
              value={3000}
              maxValue={88000}
              color={greenBarColor}
              labelColor={greenLabelColor}
              subLabelColor={greenSubColor}
              ariaLabel="MemPalace retrieval: 3,000 tokens"
              animate={animate && showBars}
              countUp
              subLabel="93% signal-to-noise"
              delay={0.1}
              minWidth={60}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function TokenEconomicsWithMode({
  expanded,
  animate,
}: {
  expanded: boolean;
  animate: boolean;
}) {
  const mode = useDiagramMode(expanded);
  return <TokenEconomicsInner expanded={expanded} animate={animate} mode={mode} />;
}

function TokenEconomicsNoRouter({
  expanded,
  animate,
}: {
  expanded: boolean;
  animate: boolean;
}) {
  const mode: Mode = expanded ? "expanded" : "inline";
  return <TokenEconomicsInner expanded={expanded} animate={animate} mode={mode} />;
}

function TokenEconomicsShell({ animate }: { animate: boolean }) {
  const inRouter = useInRouterContext();

  return (
    <DiagramShell title="Token Economics - flat retrieval 88K tokens vs MemPalace 3K tokens">
      {(expanded) =>
        inRouter ? (
          <TokenEconomicsWithMode expanded={expanded} animate={animate} />
        ) : (
          <TokenEconomicsNoRouter expanded={expanded} animate={animate} />
        )
      }
    </DiagramShell>
  );
}

export function TokenEconomics() {
  const { animate } = useDiagramMotion();
  return <TokenEconomicsShell animate={animate} />;
}
