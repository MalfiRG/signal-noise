import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { useDiagramMotion } from "./useDiagramMotion";
import { DiagramShell } from "./DiagramShell";
import { useReadingMode } from "./useReadingMode";

interface Stage {
  id: string;
  label: string;
  detail: string;
  latency?: string;
  accent: "primary" | "accent" | "violet" | "neutral";
}

const stages: Stage[] = [
  { id: "query", label: "Query", detail: '"How does auth work in ScoutQL?"', accent: "primary" },
  { id: "kg", label: "KG Lookup", detail: "Entity: ScoutQL - 61 triples", latency: "3ms", accent: "accent" },
  { id: "closet", label: "Closet Scan", detail: "Topic match: auth patterns", latency: "5ms", accent: "violet" },
  { id: "vector", label: "Vector KNN", detail: "Cosine search - 85K drawers", latency: "119ms", accent: "neutral" },
  { id: "rank", label: "Rank Fusion", detail: "Merge + closet boost + KG context", accent: "primary" },
  { id: "results", label: "Results", detail: "Drawer + KG facts sidebar", accent: "accent" },
];

type Mode = "inline" | "expanded" | "reading";

const accentMap: Record<Mode, Record<Stage["accent"], { bg: string; border: string; text: string; dimText: string; glow: string }>> = {
  inline: {
    primary: { bg: "bg-[#f4f2f1]", border: "border-primary border-2", text: "text-[#2d2520]", dimText: "text-[#67594c]", glow: "" },
    accent: { bg: "bg-[#f4f2f1]", border: "border-accent border-2", text: "text-[#2d2520]", dimText: "text-[#67594c]", glow: "" },
    violet: { bg: "bg-[#f4f2f1]", border: "border-[#a78bfa] border-2", text: "text-[#2d2520]", dimText: "text-[#67594c]", glow: "" },
    neutral: { bg: "bg-[#e8e5e2]", border: "border-[#67594c]", text: "text-[#2d2520]", dimText: "text-[#67594c]", glow: "" },
  },
  expanded: {
    primary: { bg: "bg-card", border: "border-primary border-2", text: "text-foreground", dimText: "text-foreground/50", glow: "shadow-[0_0_20px_rgba(243,230,0,0.3)]" },
    accent: { bg: "bg-[#1c2640]", border: "border-accent border-2", text: "text-foreground/90", dimText: "text-foreground/50", glow: "shadow-[0_0_16px_rgba(82,227,200,0.25)]" },
    violet: { bg: "bg-[#1e2350]", border: "border-[#a78bfa] border-2", text: "text-foreground/90", dimText: "text-foreground/40", glow: "" },
    neutral: { bg: "bg-[#1a2038]", border: "border-foreground/25", text: "text-foreground/80", dimText: "text-foreground/40", glow: "" },
  },
  reading: {
    primary: { bg: "bg-white", border: "border-[#67594c] border-2", text: "text-[#2d2520]", dimText: "text-[#67594c]", glow: "" },
    accent: { bg: "bg-white", border: "border-[#2a5d53] border-2", text: "text-[#2d2520]", dimText: "text-[#67594c]", glow: "" },
    violet: { bg: "bg-white", border: "border-[#5b3a8a] border-2", text: "text-[#2d2520]", dimText: "text-[#67594c]", glow: "" },
    neutral: { bg: "bg-[#f4f2f1]", border: "border-[#67594c]", text: "text-[#2d2520]", dimText: "text-[#67594c]", glow: "" },
  },
};

const latencyBadge: Record<Mode, { bg: string; text: string }> = {
  inline: { bg: "bg-primary/10", text: "text-[#67594c]" },
  expanded: { bg: "bg-primary/20", text: "text-primary" },
  reading: { bg: "bg-[#67594c]/10", text: "text-[#67594c]" },
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

function StageNode({
  stage,
  mode,
  anim,
  active,
  expanded,
}: {
  stage: Stage;
  mode: Mode;
  anim: boolean;
  active: boolean;
  expanded: boolean;
}) {
  const c = accentMap[mode][stage.accent];
  const lb = latencyBadge[mode];
  const isActive = expanded && active;
  const activeGlow = isActive ? c.glow : "";

  return (
    <motion.div
      variants={anim ? nodeVariants : staticNodeVariants}
      className={`rounded-lg ${c.bg} ${c.border} ${activeGlow} px-3 py-2 text-center ${isActive ? "scale-105" : "scale-100"} transition duration-300 ${expanded ? "w-full max-w-[260px] sm:w-auto sm:min-w-[120px]" : "w-full max-w-[260px]"}`}
    >
      <span className={`block text-[10px] tracking-widest uppercase ${c.dimText}`}>
        {stage.label}
      </span>
      <span className={`block text-[10px] mt-0.5 ${c.text} opacity-70 ${expanded ? "" : "truncate max-w-[240px]"}`}>
        {stage.detail}
      </span>
      {stage.latency && (
        <span className={`inline-block mt-1 rounded-full ${lb.bg} px-2 py-0.5 text-[10px] font-mono font-bold ${lb.text}`}>
          {stage.latency}
        </span>
      )}
    </motion.div>
  );
}

function StageFlowBody({
  expanded,
  mode,
  anim,
}: {
  expanded: boolean;
  mode: Mode;
  anim: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const cv = anim ? containerVariants : staticContainerVariants;
  const nv = anim ? nodeVariants : staticNodeVariants;
  const lineColor = mode === "expanded" ? "bg-foreground/30" : "bg-[#67594c]/40";
  const isHorizontal = expanded;

  useEffect(() => {
    if (!anim || !expanded) { setActiveIdx(-1); return; }
    let i = 0;
    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setActiveIdx(i % stages.length);
        i++;
      }, 800);
    }, 1200);
    return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
  }, [anim, expanded]);

  return (
    <motion.div
      initial={anim ? "hidden" : "visible"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={cv}
      className={`py-4 ${isHorizontal ? "flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 sm:justify-center" : "flex flex-col items-center gap-1.5"}`}
    >
      {stages.map((stage, i) => (
        <div
          key={stage.id}
          className={isHorizontal ? "flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2" : "flex flex-col items-center gap-1.5"}
        >
          {i > 0 && (
            <motion.div
              variants={nv}
              className={
                isHorizontal
                  ? `w-0.5 h-4 sm:w-6 sm:h-0.5 ${lineColor}`
                  : `w-0.5 h-4 ${lineColor}`
              }
            />
          )}
          <StageNode
            stage={stage}
            mode={mode}
            anim={anim}
            active={i === activeIdx}
            expanded={expanded}
          />
        </div>
      ))}
    </motion.div>
  );
}

export function QueryFlow() {
  const { animate } = useDiagramMotion();
  const isReadingMode = useReadingMode();

  const getMode = (expanded: boolean): Mode => {
    if (expanded) return "expanded";
    return isReadingMode ? "reading" : "inline";
  };

  return (
    <DiagramShell title="Query Flow - KG + Closets + Vector search in one pass">
      {(expanded) => {
        const mode = getMode(expanded);
        return (
          <StageFlowBody
            expanded={expanded}
            mode={mode}
            anim={animate}
          />
        );
      }}
    </DiagramShell>
  );
}
