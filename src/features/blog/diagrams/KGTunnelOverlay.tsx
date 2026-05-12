import { motion, type Variants } from "framer-motion";
import { useDiagramMotion } from "./useDiagramMotion";
import { DiagramShell } from "./DiagramShell";
import { useReadingMode } from "./useReadingMode";

interface Wing {
  id: string;
  label: string;
  rooms: string[];
  count: string;
}

interface Entity {
  id: string;
  label: string;
  borderColor: string;
  textColor: string;
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
  { id: "scoutql", label: "ScoutQL", borderColor: "border-[#a78bfa]", textColor: "text-[#c4b5fd]" },
  { id: "fastapi", label: "FastAPI", borderColor: "border-green-500", textColor: "text-green-400" },
  { id: "playwright", label: "Playwright", borderColor: "border-blue-400", textColor: "text-blue-300" },
  { id: "mempalace", label: "MemPalace", borderColor: "border-primary", textColor: "text-primary" },
  { id: "chromadb", label: "ChromaDB", borderColor: "border-red-400", textColor: "text-red-300" },
  { id: "sqlitevec", label: "sqlite-vec", borderColor: "border-accent", textColor: "text-accent" },
];

const relations: Relation[] = [
  { from: "ScoutQL", to: "FastAPI", label: "uses" },
  { from: "ScoutQL", to: "Playwright", label: "tested_by" },
  { from: "MemPalace", to: "ChromaDB", label: "backed_by" },
  { from: "MemPalace", to: "sqlite-vec", label: "migrated_to" },
  { from: "ChromaDB", to: "sqlite-vec", label: "replaced_by" },
];

const tunnels: Tunnel[] = [
  { label: "auth patterns" },
  { label: "memory architecture" },
  { label: "mining scripts" },
];

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

function WingBox({ wing, mode, anim }: { wing: Wing; mode: Mode; anim: boolean }) {
  const c = wingColors[mode];
  return (
    <motion.div
      variants={anim ? nodeVariants : staticNodeVariants}
      className={`rounded-lg ${c.bg} ${c.border} px-4 py-3 text-center min-w-[140px]`}
    >
      <span className={`block text-[10px] tracking-widest uppercase ${c.room}`}>WING</span>
      <span className={`block text-xs font-mono font-medium ${c.text} truncate`}>{wing.label}</span>
      <span className={`block text-[10px] mt-1 ${c.room}`}>{wing.count} drawers</span>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
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
      variants={anim ? nodeVariants : staticNodeVariants}
      className={`flex flex-col items-center gap-1`}
    >
      <div className={`h-8 w-8 rounded-full ${c.bg} border-2 ${entity.borderColor} ${c.ring} ${glow} flex items-center justify-center`}>
        <span className={`text-[8px] font-bold ${entity.textColor}`}>
          {entity.label.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <span className={`text-[10px] font-mono ${mode === "expanded" ? entity.textColor : "text-[#2d2520]"}`}>
        {entity.label}
      </span>
    </motion.div>
  );
}

function RelationBadge({ rel, mode }: { rel: Relation; mode: Mode }) {
  const textColor = mode === "expanded" ? "text-foreground/40" : "text-[#67594c]/60";
  return (
    <span className={`text-[9px] font-mono ${textColor}`}>
      {rel.from} -&gt; {rel.label} -&gt; {rel.to}
    </span>
  );
}

function TunnelBar({ tunnel, mode, anim, expanded }: { tunnel: Tunnel; mode: Mode; anim: boolean; expanded: boolean }) {
  const c = tunnelColors[mode];
  return (
    <motion.div
      variants={anim ? nodeVariants : staticNodeVariants}
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

function KGStats({ mode, anim }: { mode: Mode; anim: boolean }) {
  const textColor = mode === "expanded" ? "text-primary/60" : "text-[#67594c]";
  const bg = mode === "expanded" ? "bg-primary/10 border-primary/20" : "bg-[#f4f2f1] border-[#67594c]/20";
  return (
    <motion.div
      variants={anim ? nodeVariants : staticNodeVariants}
      className={`text-center mt-2`}
    >
      <span className={`inline-block rounded-full border px-3 py-0.5 text-[10px] font-mono tracking-wider ${bg} ${textColor}`}>
        534 entities - 5,176 triples - 13 tunnels
      </span>
    </motion.div>
  );
}

export function KGTunnelOverlay() {
  const { animate } = useDiagramMotion();
  const isReadingMode = useReadingMode();

  const getMode = (expanded: boolean): Mode => {
    if (expanded) return "expanded";
    return isReadingMode ? "reading" : "inline";
  };

  return (
    <DiagramShell title="Knowledge Graph + Tunnels - 534 entities linking across wings">
      {(expanded) => {
        const mode = getMode(expanded);
        const cv = animate ? containerVariants : staticContainerVariants;
        return (
          <motion.div
            initial={animate ? "hidden" : "visible"}
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={cv}
            className={`py-4 ${expanded ? "min-w-[700px]" : ""}`}
          >
            <motion.div variants={cv} className="flex flex-wrap justify-center gap-4 mb-4">
              {entities.map((e) => (
                <EntityNode key={e.id} entity={e} mode={mode} anim={animate} expanded={expanded} />
              ))}
            </motion.div>

            <motion.div variants={cv} className="flex flex-wrap justify-center gap-3 mb-4">
              {relations.map((r) => (
                <RelationBadge key={`${r.from}-${r.to}`} rel={r} mode={mode} />
              ))}
            </motion.div>

            <motion.div variants={cv} className={`flex flex-wrap ${expanded ? "gap-8" : "gap-4"} justify-center mb-4`}>
              {wings.map((w) => (
                <WingBox key={w.id} wing={w} mode={mode} anim={animate} />
              ))}
            </motion.div>

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
