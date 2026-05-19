import { motion, type Variants } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useDiagramMotion } from "./useDiagramMotion";
import { DiagramShell } from "./DiagramShell";
import { useReadingMode } from "./useReadingMode";
import { useCountUp } from "./useCountUp";

interface FlowStep {
  id: string;
  label: string;
  detail: string;
  tone: "neutral" | "success" | "warning" | "error";
}

const brokenSteps: FlowStep[] = [
  { id: "add", label: "collection.add()", detail: "Python API call", tone: "neutral" },
  { id: "sqlite", label: "SQLite INSERT", detail: "synchronous, ACID", tone: "success" },
  { id: "queue", label: "embeddings_queue", detail: "C++ background thread", tone: "warning" },
  { id: "hnsw", label: "HNSW graph INSERT", detail: "async, no transaction", tone: "warning" },
  { id: "kill", label: "SIGTERM", detail: "thread dies mid-work", tone: "error" },
];

const fixedSteps: FlowStep[] = [
  { id: "add", label: "collection.add()", detail: "Python API call", tone: "neutral" },
  { id: "begin", label: "BEGIN", detail: "SQLite transaction", tone: "neutral" },
  { id: "insert-d", label: "INSERT sv_drawers", detail: "metadata + document", tone: "neutral" },
  { id: "insert-v", label: "INSERT sv_vec", detail: "embedding vector", tone: "neutral" },
  { id: "commit", label: "COMMIT", detail: "both or neither", tone: "success" },
];

type Mode = "inline" | "expanded" | "reading";

const toneColors: Record<Mode, Record<FlowStep["tone"], { bg: string; border: string; text: string }>> = {
  inline: {
    neutral: { bg: "bg-[#f4f2f1]", border: "border-[#67594c]", text: "text-[#2d2520]" },
    success: { bg: "bg-green-50", border: "border-green-500", text: "text-green-800" },
    warning: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-800" },
    error: { bg: "bg-red-50", border: "border-red-500", text: "text-red-800" },
  },
  expanded: {
    neutral: { bg: "bg-[#1a2038]", border: "border-foreground/25", text: "text-foreground/80" },
    success: { bg: "bg-green-950/40", border: "border-green-500/60", text: "text-green-400" },
    warning: { bg: "bg-orange-950/30", border: "border-orange-500/50", text: "text-orange-300" },
    error: { bg: "bg-red-950/40", border: "border-red-500/60", text: "text-red-400" },
  },
  reading: {
    neutral: { bg: "bg-white", border: "border-[#67594c]", text: "text-[#2d2520]" },
    success: { bg: "bg-green-50", border: "border-green-600", text: "text-green-900" },
    warning: { bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-900" },
    error: { bg: "bg-red-50", border: "border-red-600", text: "text-red-900" },
  },
};

const headerColors: Record<Mode, Record<"broken" | "fixed", { bg: string; border: string; text: string }>> = {
  inline: {
    broken: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
    fixed: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700" },
  },
  expanded: {
    broken: { bg: "bg-red-950/30", border: "border-red-500/40", text: "text-red-400" },
    fixed: { bg: "bg-green-950/30", border: "border-green-500/40", text: "text-green-400" },
  },
  reading: {
    broken: { bg: "bg-red-50", border: "border-red-400", text: "text-red-800" },
    fixed: { bg: "bg-green-50", border: "border-green-400", text: "text-green-800" },
  },
};

const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const staticNodeVariants: Variants = { hidden: { opacity: 1, scale: 1, y: 0 }, visible: { opacity: 1, scale: 1, y: 0 } };
const staticContainerVariants: Variants = { hidden: {}, visible: {} };

const ENTRANCE_DURATION_MS = (brokenSteps.length * 120) + 150 + 200;
const PARTICLE_DELAY_MS = ENTRANCE_DURATION_MS;
const SCATTER_DELAY_MS = PARTICLE_DELAY_MS + 1200;


function QueueParticles({ active, scattered }: { active: boolean; scattered: boolean }) {
  const dots = Array.from({ length: 8 }, (_, i) => i);
  const scatterTargets = useRef(
    dots.map((_, i) => ({ x: (i - 4) * 28 + 56, y: (Math.random() - 0.5) * 20 }))
  ).current;

  return (
    <div className="relative h-6 w-full overflow-hidden">
      {dots.map((i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-orange-400"
          initial={{ opacity: 0, x: i * 14 + 8, y: 10 }}
          animate={
            scattered
              ? { opacity: 0, x: scatterTargets[i].x, y: scatterTargets[i].y, scale: 0.3 }
              : active
                ? { opacity: [0, 0.8, 0.8], x: i * 14 + 8, y: 10 }
                : { opacity: 0 }
          }
          transition={
            scattered
              ? { duration: 0.6, delay: i * 0.05, ease: "easeIn" }
              : { duration: 0.3, delay: i * 0.12 }
          }
        />
      ))}
    </div>
  );
}

function StepBox({ step, mode, anim }: { step: FlowStep; mode: Mode; anim: boolean }) {
  const c = toneColors[mode][step.tone];
  return (
    <motion.div
      variants={anim ? nodeVariants : staticNodeVariants}
      className={`rounded-lg ${c.bg} ${c.border} border px-3 py-1.5 text-center`}
    >
      <span className={`block text-xs font-mono font-medium ${c.text}`}>{step.label}</span>
      <span className={`block text-[10px] ${c.text} opacity-60`}>{step.detail}</span>
    </motion.div>
  );
}

function SidePanel({
  side,
  steps,
  rows,
  vectors,
  diverged,
  mode,
  anim,
  expanded,
}: {
  side: "broken" | "fixed";
  steps: FlowStep[];
  rows: number;
  vectors: number;
  diverged: boolean;
  mode: Mode;
  anim: boolean;
  expanded: boolean;
}) {
  const hdr = headerColors[mode][side];
  const [particles, setParticles] = useState(false);
  const [scatter, setScatter] = useState(false);
  const [showCounter, setShowCounter] = useState(!anim);

  const rowCount = useCountUp(rows, 1.5, anim && showCounter);
  const vecCount = useCountUp(vectors, 1.5, anim && showCounter);

  useEffect(() => {
    if (!anim || !expanded) { setShowCounter(true); return; }
    setParticles(false);
    setScatter(false);
    setShowCounter(false);
    const t1 = setTimeout(() => setParticles(true), PARTICLE_DELAY_MS);
    const t2 = setTimeout(() => { setScatter(true); setShowCounter(true); }, SCATTER_DELAY_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [anim, expanded]);

  const line = mode === "expanded" ? "bg-foreground/30" : "bg-[#67594c]/40";
  const cv = anim ? containerVariants : staticContainerVariants;
  const nv = anim ? nodeVariants : staticNodeVariants;
  const counterColor = mode === "expanded"
    ? (diverged ? "text-red-400" : "text-green-400")
    : (diverged ? "text-red-700" : "text-green-700");
  const badgeBg = mode === "expanded"
    ? (diverged ? "bg-red-500/20 border-red-500/40" : "bg-green-500/20 border-green-500/40")
    : (diverged ? "bg-red-100 border-red-300" : "bg-green-100 border-green-300");

  return (
    <motion.div variants={cv} className={`flex flex-col items-center gap-1.5 ${expanded ? "flex-1 w-full sm:min-w-[280px]" : "w-full"}`}>
      <motion.div variants={nv} className={`w-full rounded-t-lg ${hdr.bg} ${hdr.border} border px-3 py-2 text-center`}>
        <span className={`text-xs font-mono font-bold tracking-wider uppercase ${hdr.text}`}>
          {side === "broken" ? "BROKEN: Dual Write" : "FIXED: Single Transaction"}
        </span>
      </motion.div>

      {steps.map((step, i) => (
        <div key={step.id} className="flex flex-col items-center gap-1.5 w-full max-w-[220px]">
          {i > 0 && <motion.div variants={nv} className={`w-0.5 h-4 ${line}`} />}
          <StepBox step={step} mode={mode} anim={anim} />
          {side === "broken" && step.id === "queue" && expanded && (
            <QueueParticles active={particles} scattered={scatter} />
          )}
        </div>
      ))}

      <motion.div variants={nv} className="mt-3 text-center">
        <div className={`font-mono text-sm font-bold ${counterColor}`}>
          {(anim && showCounter ? rowCount : rows).toLocaleString()}
          {diverged ? " ≠ " : " = "}
          {(anim && showCounter ? vecCount : vectors).toLocaleString()}
        </div>
        <div className={`mt-1 inline-block rounded-full border px-3 py-0.5 text-[10px] font-mono tracking-widest ${badgeBg} ${counterColor}`}>
          {diverged ? "DIVERGED" : "ZERO DIVERGENCE"}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function DualWriteVsACID() {
  const { animate } = useDiagramMotion();
  const isReadingMode = useReadingMode();

  const getMode = (expanded: boolean): Mode => {
    if (expanded) return "expanded";
    return isReadingMode ? "reading" : "inline";
  };

  return (
    <DiagramShell title="Dual Write vs ACID - ChromaDB divergence vs sqlite-vec zero loss">
      {(expanded) => {
        const mode = getMode(expanded);
        return (
          <motion.div
            initial={animate ? "hidden" : "visible"}
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={animate ? containerVariants : staticContainerVariants}
            className={expanded ? "flex flex-col sm:flex-row gap-6 sm:gap-8 py-4 items-center sm:justify-center" : "flex flex-col gap-6 py-4 items-center"}
          >
            <SidePanel
              side="broken" steps={brokenSteps}
              rows={102568} vectors={84965} diverged
              mode={mode} anim={animate} expanded={expanded}
            />
            <SidePanel
              side="fixed" steps={fixedSteps}
              rows={85033} vectors={85033} diverged={false}
              mode={mode} anim={animate} expanded={expanded}
            />
          </motion.div>
        );
      }}
    </DiagramShell>
  );
}
