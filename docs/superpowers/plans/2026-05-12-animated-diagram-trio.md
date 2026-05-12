# Animated Diagram Trio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 3 animated diagram React components (DualWriteVsACID, KGTunnelOverlay, QueryFlow) for the MemPalace sqlite-vec blog post, each following the PalaceStructure.tsx reference pattern.

**Architecture:** Each component is an exported named function wrapped in `DiagramShell` render prop. Dual layout: vertical compact inline, horizontal cinematic expanded. Dual color scheme: light cream tones inline (matching Mermaid contrast), dark cinematic expanded, reading-mode adaptation via MutationObserver on `.theme-reading`. `useDiagramMotion()` for reduced-motion respect. Lazy-loaded via `DiagramRegistry`.

**Tech Stack:** React 19, Framer Motion 12 (`^12.38.0`), Tailwind, DiagramShell/useDiagramMotion (local)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/blog/diagrams/DualWriteVsACID.tsx` | Create | Split-screen before/after - ChromaDB dual-write vs sqlite-vec ACID |
| `src/features/blog/diagrams/KGTunnelOverlay.tsx` | Create | KG entity graph + tunnel bridges over simplified palace wings |
| `src/features/blog/diagrams/QueryFlow.tsx` | Create | Query pipeline sequence with stage highlighting |
| `src/features/blog/diagrams/DiagramRegistry.tsx` | Modify | Add 3 lazy imports + registry entries |
| `src/pages/content/blog/mempalace-sqlite-vec-migration.md` | Modify | Add 3 `animated-diagram` code blocks at content-appropriate seams |

## Shared Patterns (from PalaceStructure.tsx reference)

Every component uses these exact patterns. Repeated in full in each task's code.

**Imports:**
```tsx
import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { useDiagramMotion } from "./useDiagramMotion";
import { DiagramShell } from "./DiagramShell";
```

**Reading-mode observer:**
```tsx
const [isReadingMode, setIsReadingMode] = useState(
  () => document.documentElement.classList.contains("theme-reading")
);

useEffect(() => {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === "class") {
        setIsReadingMode(document.documentElement.classList.contains("theme-reading"));
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}, []);
```

**Static vs animated variants:**
```tsx
const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const staticNode: Variants = { hidden: { opacity: 1 }, visible: { opacity: 1 } };
const staticContainer: Variants = { hidden: {}, visible: {} };
```

**Color reference (Night City palette):**
- Inline fills: `bg-[#f4f2f1]` (cream), strokes: `border-[#67594c]` (warm brown), text: `text-[#2d2520]`
- Reading-mode fills: `bg-white`, strokes same, text same
- Expanded bg: `#131620` (from DiagramShell), nodes: `bg-[#1a2038]`, text: `text-foreground/80`
- Primary yellow: `text-primary` / `bg-primary` / `#f3e600`
- Accent cyan: `text-accent` / `bg-accent` / `#52e3c8`
- Violet: `text-[#c4b5fd]` / `border-[#a78bfa]`
- Red (broken): `border-red-500`, `text-red-400` (expanded) / `text-red-700` (inline)
- Green (healthy): `border-green-500`, `text-green-400` (expanded) / `text-green-700` (inline)

**Registry entry pattern (one per component):**
```tsx
const ComponentName = lazy(() =>
  import("./ComponentName").then((m) => ({ default: m.ComponentName }))
);
// Add to registry object:
"registry-name": ComponentName,
```

---

### Task 1: DualWriteVsACID component

**Files:**
- Create: `src/features/blog/diagrams/DualWriteVsACID.tsx`

This is the hero diagram. Split-screen showing ChromaDB dual-write divergence (left, red) vs sqlite-vec ACID transactions (right, green). Inline: stacked vertically. Expanded: side-by-side with animated counters and particle effects.

- [ ] **Step 1: Create DualWriteVsACID.tsx**

```tsx
import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { useDiagramMotion } from "./useDiagramMotion";
import { DiagramShell } from "./DiagramShell";

// --- Data ---

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

// --- Colors ---

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

// --- Motion ---

const nodeV: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};
const containerV: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const staticN: Variants = { hidden: { opacity: 1 }, visible: { opacity: 1 } };
const staticC: Variants = { hidden: {}, visible: {} };

// --- Counter hook ---

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }
    setValue(0);
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(target * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return value;
}

// --- Particles (expanded broken side only) ---

function QueueParticles({ active, scattered }: { active: boolean; scattered: boolean }) {
  const dots = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="relative h-6 w-full overflow-hidden">
      {dots.map((i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-orange-400"
          initial={{ opacity: 0, x: i * 14 + 8, y: 10 }}
          animate={
            scattered
              ? { opacity: 0, x: (i - 4) * 28 + 56, y: Math.random() * 20 - 10, scale: 0.3 }
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

// --- Sub-components ---

function StepBox({ step, mode, anim }: { step: FlowStep; mode: Mode; anim: boolean }) {
  const c = toneColors[mode][step.tone];
  return (
    <motion.div
      variants={anim ? nodeV : staticN}
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

  const rowCount = useCountUp(rows, 1500, anim && showCounter);
  const vecCount = useCountUp(vectors, 1500, anim && showCounter);

  useEffect(() => {
    if (!anim || !expanded) {
      setShowCounter(true);
      return;
    }
    const t1 = setTimeout(() => setParticles(true), 800);
    const t2 = setTimeout(() => {
      setScatter(true);
      setShowCounter(true);
    }, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [anim, expanded]);

  const line = mode === "expanded" ? "bg-foreground/30" : "bg-[#67594c]/40";
  const cv = anim ? containerV : staticC;
  const nv = anim ? nodeV : staticN;
  const counterColor = mode === "expanded"
    ? (diverged ? "text-red-400" : "text-green-400")
    : (diverged ? "text-red-700" : "text-green-700");
  const badgeBg = mode === "expanded"
    ? (diverged ? "bg-red-500/20 border-red-500/40" : "bg-green-500/20 border-green-500/40")
    : (diverged ? "bg-red-100 border-red-300" : "bg-green-100 border-green-300");

  return (
    <motion.div variants={cv} className={`flex flex-col items-center gap-1.5 ${expanded ? "flex-1 min-w-[280px]" : "w-full"}`}>
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

// --- Main component ---

export function DualWriteVsACID() {
  const { animate } = useDiagramMotion();

  const [isReadingMode, setIsReadingMode] = useState(
    () => document.documentElement.classList.contains("theme-reading")
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") {
          setIsReadingMode(document.documentElement.classList.contains("theme-reading"));
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
            variants={animate ? containerV : staticC}
            className={expanded ? "flex gap-8 min-w-[700px] py-4 justify-center" : "flex flex-col gap-6 py-4 items-center"}
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
```

- [ ] **Step 2: Add registry entry to DiagramRegistry.tsx**

Add after the existing `PalaceStructure` lazy import:

```tsx
const DualWriteVsACID = lazy(() =>
  import("./DualWriteVsACID").then((m) => ({ default: m.DualWriteVsACID }))
);
```

Add to the `registry` object:

```tsx
"dual-write-vs-acid": DualWriteVsACID,
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit 2>&1 | grep -v TS5101`
Expected: no errors (only the baseUrl deprecation warning)

- [ ] **Step 4: Commit**

```bash
git add src/features/blog/diagrams/DualWriteVsACID.tsx src/features/blog/diagrams/DiagramRegistry.tsx
git commit -m "feat(blog): add DualWriteVsACID animated diagram component

Split-screen visualization of ChromaDB dual-write divergence vs
sqlite-vec ACID transactions. Dual layout (vertical inline, horizontal
expanded), particle scatter on SIGTERM, animated counters."
```

---

### Task 2: KGTunnelOverlay component

**Files:**
- Create: `src/features/blog/diagrams/KGTunnelOverlay.tsx`

Knowledge graph entity overlay with tunnel bridges. Visually distinct from PalaceStructure: graph topology (entity circles + connection lines) rather than tree hierarchy. Wing boxes are simplified rectangles - the KG entity ring is the dominant visual mass.

- [ ] **Step 1: Create KGTunnelOverlay.tsx**

```tsx
import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { useDiagramMotion } from "./useDiagramMotion";
import { DiagramShell } from "./DiagramShell";

// --- Data ---

interface Wing {
  id: string;
  label: string;
  rooms: string[];
  count: string;
}

interface Entity {
  id: string;
  label: string;
  accent: string;
}

interface Relation {
  from: string;
  to: string;
  label: string;
}

interface Tunnel {
  label: string;
}

const wings: Wing[] = [
  { id: "w1", label: "convos_metaorchestrator", rooms: ["technical", "debugging"], count: "60,935" },
  { id: "w2", label: "metaorchestrator", rooms: ["scripts", "knowledge"], count: "3,576" },
];

const entities: Entity[] = [
  { id: "scoutql", label: "ScoutQL", accent: "border-[#a78bfa] text-[#c4b5fd]" },
  { id: "fastapi", label: "FastAPI", accent: "border-green-500 text-green-400" },
  { id: "playwright", label: "Playwright", accent: "border-blue-400 text-blue-300" },
  { id: "mempalace", label: "MemPalace", accent: "border-primary text-primary" },
  { id: "chromadb", label: "ChromaDB", accent: "border-red-400 text-red-300" },
  { id: "sqlitevec", label: "sqlite-vec", accent: "border-accent text-accent" },
];

const relations: Relation[] = [
  { from: "scoutql", to: "fastapi", label: "uses" },
  { from: "scoutql", to: "playwright", label: "tested_by" },
  { from: "mempalace", to: "chromadb", label: "backed_by" },
  { from: "mempalace", to: "sqlitevec", label: "migrated_to" },
  { from: "chromadb", to: "sqlitevec", label: "replaced_by" },
];

const tunnels: Tunnel[] = [
  { label: "auth patterns" },
  { label: "memory architecture" },
  { label: "mining scripts" },
];

// --- Colors ---

type Mode = "inline" | "expanded" | "reading";

const wingColors: Record<Mode, { bg: string; border: string; text: string; room: string }> = {
  inline: {
    bg: "bg-[#f4f2f1]", border: "border-accent border-2",
    text: "text-[#2d2520]", room: "text-[#67594c]",
  },
  expanded: {
    bg: "bg-[#1c2640]", border: "border-accent border-2",
    text: "text-foreground/90", room: "text-foreground/50",
  },
  reading: {
    bg: "bg-white", border: "border-[#2a5d53] border-2",
    text: "text-[#2d2520]", room: "text-[#67594c]",
  },
};

const entityColors: Record<Mode, { bg: string; ring: string }> = {
  inline: { bg: "bg-[#f4f2f1]", ring: "ring-1 ring-[#67594c]/30" },
  expanded: { bg: "bg-[#1a2038]", ring: "ring-1 ring-foreground/20" },
  reading: { bg: "bg-white", ring: "ring-1 ring-[#67594c]/30" },
};

const tunnelColors: Record<Mode, { bg: string; text: string; dot: string }> = {
  inline: { bg: "bg-[#67594c]/20", text: "text-[#67594c]", dot: "bg-[#67594c]" },
  expanded: { bg: "bg-primary/10", text: "text-primary/70", dot: "bg-primary" },
  reading: { bg: "bg-[#67594c]/15", text: "text-[#67594c]", dot: "bg-[#67594c]" },
};

// --- Motion ---

const nodeV: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};
const containerV: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const staticN: Variants = { hidden: { opacity: 1 }, visible: { opacity: 1 } };
const staticC: Variants = { hidden: {}, visible: {} };

// --- Tunnel particle ---

function TunnelParticle({ active, color }: { active: boolean; color: string }) {
  return (
    <motion.div
      className={`absolute h-1.5 w-1.5 rounded-full ${color}`}
      initial={{ left: "0%", opacity: 0 }}
      animate={
        active
          ? { left: ["0%", "100%"], opacity: [0, 1, 1, 0] }
          : { opacity: 0 }
      }
      transition={active ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
      style={{ top: "50%", transform: "translateY(-50%)" }}
    />
  );
}

// --- Sub-components ---

function WingBox({ wing, mode, anim }: { wing: Wing; mode: Mode; anim: boolean }) {
  const c = wingColors[mode];
  return (
    <motion.div
      variants={anim ? nodeV : staticN}
      className={`rounded-lg ${c.bg} ${c.border} px-4 py-3 text-center min-w-[180px]`}
    >
      <span className={`block text-[10px] tracking-widest uppercase ${c.room}`}>WING</span>
      <span className={`block text-xs font-mono font-medium ${c.text} truncate`}>{wing.label}</span>
      <span className={`block text-[10px] mt-1 ${c.room}`}>{wing.count} drawers</span>
      <div className="flex gap-2 justify-center mt-2">
        {wing.rooms.map((r) => (
          <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded ${mode === "expanded" ? "bg-foreground/10" : "bg-[#67594c]/10"} ${c.room}`}>
            {r}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function EntityNode({ entity, mode, anim, expanded }: { entity: Entity; mode: Mode; anim: boolean; expanded: boolean }) {
  const c = entityColors[mode];
  const glow = expanded ? `shadow-[0_0_12px_rgba(243,230,0,0.15)]` : "";
  return (
    <motion.div
      variants={anim ? nodeV : staticN}
      className={`flex flex-col items-center gap-1`}
    >
      <div className={`h-8 w-8 rounded-full ${c.bg} border-2 ${entity.accent.split(" ")[0]} ${c.ring} ${glow} flex items-center justify-center`}>
        <span className={`text-[8px] font-bold ${entity.accent.split(" ")[1]}`}>
          {entity.label.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <span className={`text-[10px] font-mono ${mode === "expanded" ? entity.accent.split(" ")[1] : "text-[#2d2520]"}`}>
        {entity.label}
      </span>
    </motion.div>
  );
}

function RelationBadge({ rel, mode }: { rel: Relation; mode: Mode }) {
  const textColor = mode === "expanded" ? "text-foreground/40" : "text-[#67594c]/60";
  return (
    <span className={`text-[9px] font-mono ${textColor}`}>
      {rel.label}
    </span>
  );
}

function TunnelBar({ tunnel, mode, anim, expanded }: { tunnel: Tunnel; mode: Mode; anim: boolean; expanded: boolean }) {
  const c = tunnelColors[mode];
  return (
    <motion.div
      variants={anim ? nodeV : staticN}
      className={`relative flex items-center gap-2 w-full`}
    >
      <div className={`h-1 w-1 rounded-full ${c.dot}`} />
      <div className={`relative flex-1 h-0.5 ${c.bg} rounded-full overflow-hidden`}>
        {expanded && anim && <TunnelParticle active color={c.dot} />}
      </div>
      <span className={`text-[10px] font-mono whitespace-nowrap ${c.text}`}>{tunnel.label}</span>
      <div className={`relative flex-1 h-0.5 ${c.bg} rounded-full overflow-hidden`}>
        {expanded && anim && <TunnelParticle active color={c.dot} />}
      </div>
      <div className={`h-1 w-1 rounded-full ${c.dot}`} />
    </motion.div>
  );
}

// --- KG stats badge ---

function KGStats({ mode, anim }: { mode: Mode; anim: boolean }) {
  const textColor = mode === "expanded" ? "text-primary/60" : "text-[#67594c]";
  const bg = mode === "expanded" ? "bg-primary/10 border-primary/20" : "bg-[#f4f2f1] border-[#67594c]/20";
  return (
    <motion.div
      variants={anim ? nodeV : staticN}
      className={`text-center mt-2`}
    >
      <span className={`inline-block rounded-full border px-3 py-0.5 text-[10px] font-mono tracking-wider ${bg} ${textColor}`}>
        534 entities - 5,176 triples - 13 tunnels
      </span>
    </motion.div>
  );
}

// --- Main component ---

export function KGTunnelOverlay() {
  const { animate } = useDiagramMotion();

  const [isReadingMode, setIsReadingMode] = useState(
    () => document.documentElement.classList.contains("theme-reading")
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") {
          setIsReadingMode(document.documentElement.classList.contains("theme-reading"));
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const getMode = (expanded: boolean): Mode => {
    if (expanded) return "expanded";
    return isReadingMode ? "reading" : "inline";
  };

  return (
    <DiagramShell title="Knowledge Graph + Tunnels - 534 entities linking across wings">
      {(expanded) => {
        const mode = getMode(expanded);
        const cv = animate ? containerV : staticC;
        return (
          <motion.div
            initial={animate ? "hidden" : "visible"}
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={cv}
            className={`py-4 ${expanded ? "min-w-[700px]" : ""}`}
          >
            {/* Entity ring */}
            <motion.div variants={cv} className="flex flex-wrap justify-center gap-4 mb-4">
              {entities.map((e) => (
                <EntityNode key={e.id} entity={e} mode={mode} anim={animate} expanded={expanded} />
              ))}
            </motion.div>

            {/* Relation labels */}
            <motion.div variants={cv} className="flex flex-wrap justify-center gap-3 mb-4">
              {relations.map((r) => (
                <RelationBadge key={`${r.from}-${r.to}`} rel={r} mode={mode} />
              ))}
            </motion.div>

            {/* Wings */}
            <motion.div variants={cv} className={`flex ${expanded ? "gap-8" : "gap-4"} justify-center mb-4`}>
              {wings.map((w) => (
                <WingBox key={w.id} wing={w} mode={mode} anim={animate} />
              ))}
            </motion.div>

            {/* Tunnels */}
            <motion.div variants={cv} className="flex flex-col gap-2 max-w-[400px] mx-auto">
              {tunnels.map((t) => (
                <TunnelBar key={t.label} tunnel={t} mode={mode} anim={animate} expanded={expanded} />
              ))}
            </motion.div>

            <KGStats mode={mode} anim={animate} />
          </motion.div>
        );
      }}
    </DiagramShell>
  );
}
```

- [ ] **Step 2: Add registry entry to DiagramRegistry.tsx**

Add after previous lazy imports:

```tsx
const KGTunnelOverlay = lazy(() =>
  import("./KGTunnelOverlay").then((m) => ({ default: m.KGTunnelOverlay }))
);
```

Add to `registry`:

```tsx
"kg-tunnel-overlay": KGTunnelOverlay,
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit 2>&1 | grep -v TS5101`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/blog/diagrams/KGTunnelOverlay.tsx src/features/blog/diagrams/DiagramRegistry.tsx
git commit -m "feat(blog): add KGTunnelOverlay animated diagram component

Knowledge graph entity ring with tunnel bridges between palace wings.
Entity circles with relationship labels, animated tunnel particles
in expanded mode. Visually distinct from PalaceStructure (graph
topology vs tree hierarchy)."
```

---

### Task 3: QueryFlow component

**Files:**
- Create: `src/features/blog/diagrams/QueryFlow.tsx`

Left-to-right (expanded) or top-to-bottom (inline) pipeline showing a query traversing all retrieval layers. Sequential stage highlighting in expanded mode.

- [ ] **Step 1: Create QueryFlow.tsx**

```tsx
import { motion, type Variants } from "framer-motion";
import { useState, useEffect } from "react";
import { useDiagramMotion } from "./useDiagramMotion";
import { DiagramShell } from "./DiagramShell";

// --- Data ---

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

// --- Colors ---

type Mode = "inline" | "expanded" | "reading";

const accentMap: Record<Mode, Record<Stage["accent"], { bg: string; border: string; text: string; glow: string }>> = {
  inline: {
    primary: { bg: "bg-[#f4f2f1]", border: "border-primary border-2", text: "text-[#2d2520]", glow: "" },
    accent: { bg: "bg-[#f4f2f1]", border: "border-accent border-2", text: "text-[#2d2520]", glow: "" },
    violet: { bg: "bg-[#f4f2f1]", border: "border-[#a78bfa] border-2", text: "text-[#2d2520]", glow: "" },
    neutral: { bg: "bg-[#e8e5e2]", border: "border-[#67594c]", text: "text-[#2d2520]", glow: "" },
  },
  expanded: {
    primary: { bg: "bg-card", border: "border-primary border-2", text: "text-foreground", glow: "shadow-[0_0_20px_rgba(243,230,0,0.3)]" },
    accent: { bg: "bg-[#1c2640]", border: "border-accent border-2", text: "text-foreground/90", glow: "shadow-[0_0_16px_rgba(82,227,200,0.25)]" },
    violet: { bg: "bg-[#1e2350]", border: "border-[#a78bfa] border-2", text: "text-foreground/90", glow: "" },
    neutral: { bg: "bg-[#1a2038]", border: "border-foreground/25", text: "text-foreground/80", glow: "" },
  },
  reading: {
    primary: { bg: "bg-white", border: "border-[#67594c] border-2", text: "text-[#2d2520]", glow: "" },
    accent: { bg: "bg-white", border: "border-[#2a5d53] border-2", text: "text-[#2d2520]", glow: "" },
    violet: { bg: "bg-white", border: "border-[#5b3a8a] border-2", text: "text-[#2d2520]", glow: "" },
    neutral: { bg: "bg-[#f4f2f1]", border: "border-[#67594c]", text: "text-[#2d2520]", glow: "" },
  },
};

const latencyBadge: Record<Mode, { bg: string; text: string }> = {
  inline: { bg: "bg-primary/10", text: "text-[#67594c]" },
  expanded: { bg: "bg-primary/20", text: "text-primary" },
  reading: { bg: "bg-[#67594c]/10", text: "text-[#67594c]" },
};

// --- Motion ---

const nodeV: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};
const containerV: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};
const staticN: Variants = { hidden: { opacity: 1 }, visible: { opacity: 1 } };
const staticC: Variants = { hidden: {}, visible: {} };

// --- Sub-components ---

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
      variants={anim ? nodeV : staticN}
      className={`rounded-lg ${c.bg} ${c.border} ${activeGlow} px-3 py-2 text-center transition-shadow duration-300 ${expanded ? "min-w-[120px]" : "w-full max-w-[260px]"}`}
      animate={isActive ? { scale: 1.05 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <span className={`block text-[10px] tracking-widest uppercase ${mode === "expanded" ? c.text.replace("/90", "/50").replace("/80", "/40") : "text-[#67594c]"}`}>
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

// --- Main component ---

export function QueryFlow() {
  const { animate } = useDiagramMotion();
  const [activeStage, setActiveStage] = useState(-1);

  const [isReadingMode, setIsReadingMode] = useState(
    () => document.documentElement.classList.contains("theme-reading")
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") {
          setIsReadingMode(document.documentElement.classList.contains("theme-reading"));
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const getMode = (expanded: boolean): Mode => {
    if (expanded) return "expanded";
    return isReadingMode ? "reading" : "inline";
  };

  return (
    <DiagramShell title="Query Flow - KG + Closets + Vector search in one pass">
      {(expanded) => {
        const mode = getMode(expanded);
        const cv = animate ? containerV : staticC;
        const nv = animate ? nodeV : staticN;
        const lineColor = mode === "expanded" ? "bg-foreground/30" : "bg-[#67594c]/40";
        const isHorizontal = expanded;

        return (
          <QueryFlowInner
            expanded={expanded}
            mode={mode}
            animate={animate}
            cv={cv}
            nv={nv}
            lineColor={lineColor}
            isHorizontal={isHorizontal}
          />
        );
      }}
    </DiagramShell>
  );
}

function QueryFlowInner({
  expanded,
  mode,
  animate: anim,
  cv,
  nv,
  lineColor,
  isHorizontal,
}: {
  expanded: boolean;
  mode: Mode;
  animate: boolean;
  cv: Variants;
  nv: Variants;
  lineColor: string;
  isHorizontal: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    if (!anim || !expanded) return;
    let i = 0;
    const interval = setInterval(() => {
      setActiveIdx(i);
      i = (i + 1) % stages.length;
    }, 800);
    return () => clearInterval(interval);
  }, [anim, expanded]);

  return (
    <motion.div
      initial={anim ? "hidden" : "visible"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={cv}
      className={`py-4 ${isHorizontal ? "flex items-center gap-2 min-w-[800px] justify-center" : "flex flex-col items-center gap-1.5"}`}
    >
      {stages.map((stage, i) => (
        <div
          key={stage.id}
          className={isHorizontal ? "flex items-center gap-2" : "flex flex-col items-center gap-1.5"}
        >
          {i > 0 && (
            <motion.div
              variants={nv}
              className={
                isHorizontal
                  ? `h-0.5 w-6 ${lineColor}`
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
```

- [ ] **Step 2: Add registry entry to DiagramRegistry.tsx**

Add after previous lazy imports:

```tsx
const QueryFlow = lazy(() =>
  import("./QueryFlow").then((m) => ({ default: m.QueryFlow }))
);
```

Add to `registry`:

```tsx
"query-flow": QueryFlow,
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit 2>&1 | grep -v TS5101`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/blog/diagrams/QueryFlow.tsx src/features/blog/diagrams/DiagramRegistry.tsx
git commit -m "feat(blog): add QueryFlow animated diagram component

Pipeline visualization showing query traversal through KG lookup,
closet scan, vector KNN, and rank fusion stages. Sequential stage
highlighting in expanded mode with latency badges."
```

---

### Task 4: Blog post integration

**Files:**
- Modify: `src/pages/content/blog/mempalace-sqlite-vec-migration.md`

Insert 3 `animated-diagram` code blocks at content-appropriate locations.

- [ ] **Step 1: Insert dual-write-vs-acid after sqlite-vec section**

Find the line ending with "because the architecture doesn't have a seam where data can fall through." (end of the "sqlite-vec: One Transaction, Zero Divergence" section). Insert a blank line and the code block AFTER it, BEFORE the `## The Benchmarks` heading:

```markdown

```animated-diagram
dual-write-vs-acid
```

```

- [ ] **Step 2: Insert query-flow after benchmarks discussion**

Find the line ending with "they use their own SQLite B-tree indexes." (end of the latency discussion in "The Benchmarks" section). Insert the code block AFTER it, BEFORE the `## Why This Matters Beyond My Laptop` heading:

```markdown

```animated-diagram
query-flow
```

```

- [ ] **Step 3: Insert kg-tunnel-overlay in Why This Matters section**

Find the line ending with "Closets provide topic-level boosting." (the paragraph describing all layers in "Why This Matters Beyond My Laptop"). Insert the code block AFTER it, BEFORE the paragraph starting with "The total stack:":

```markdown

```animated-diagram
kg-tunnel-overlay
```

```

- [ ] **Step 4: Verify no `<!-- IMAGE:` placeholders remain**

Run: `grep -n "<!-- IMAGE:" src/pages/content/blog/mempalace-sqlite-vec-migration.md`
Expected: no output (the published file has no IMAGE placeholders - those only exist in the draft at `content/blog/drafts/`)

- [ ] **Step 5: Commit**

```bash
git add src/pages/content/blog/mempalace-sqlite-vec-migration.md
git commit -m "feat(blog): wire 3 animated diagrams into mempalace blog post

Places dual-write-vs-acid after the ACID explanation, query-flow
after benchmarks, kg-tunnel-overlay in the architecture overview."
```

---

### Task 5: Visual verification

**Files:** None (read-only verification)

- [ ] **Step 1: Start dev server**

Ask the user to start the dev server outside the harness:

```
! cd ~/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npm run dev
```

Or if already running, confirm it's on port 8080.

- [ ] **Step 2: Verify all 4 diagrams render inline**

Navigate to `http://localhost:8080/blog/mempalace-sqlite-vec-migration` and confirm:

1. `palace-structure` - existing, renders tree hierarchy
2. `dual-write-vs-acid` - two panels (broken red, fixed green), counters visible
3. `query-flow` - 6-stage pipeline, latency badges visible
4. `kg-tunnel-overlay` - entity circles, wing boxes, tunnel bars, stats badge

All should render on the page background with cream node fills and readable labels.

- [ ] **Step 3: Verify all 4 diagrams expand**

Click the expand button (Maximize2 icon, top-right of each diagram) for each. Confirm:

1. Dark background overlay appears
2. Content renders larger with cinematic colors
3. Animations play (stagger entrance, counters, particles, stage highlighting)
4. Escape key closes the overlay

- [ ] **Step 4: Verify reading-mode adaptation**

Toggle reading mode (if available via the blog's theme switcher). Confirm inline diagrams switch to white background fills while maintaining colored borders and readable labels.

- [ ] **Step 5: Verify reduced-motion**

In browser DevTools, toggle "Prefers reduced motion" emulation. Confirm all diagrams render statically with no animations - all content still visible and labeled.
