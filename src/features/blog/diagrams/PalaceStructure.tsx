import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import { useDiagramMotion } from "./useDiagramMotion";

interface TreeNode {
  id: string;
  label: string;
  tier: "palace" | "wing" | "room" | "closet" | "drawer";
  preview?: string;
  children?: TreeNode[];
}

const palaceData: TreeNode = {
  id: "palace",
  label: "MemPalace",
  tier: "palace",
  preview: "85,033 drawers across 2 wings",
  children: [
    {
      id: "w-convos",
      label: "convos_metaorchestrator",
      tier: "wing",
      preview: "60,935 drawers - mined from JSONL sessions",
      children: [
        {
          id: "r-tech",
          label: "technical",
          tier: "room",
          children: [
            {
              id: "c-auth",
              label: "auth patterns",
              tier: "closet",
              preview: "JWT, OAuth, session management",
              children: [
                { id: "d-jwt", label: "JWT tokens expire after 24h...", tier: "drawer" },
                { id: "d-oauth", label: "OAuth2 refresh flow requires...", tier: "drawer" },
              ],
            },
          ],
        },
        {
          id: "r-debug",
          label: "debugging",
          tier: "room",
          children: [
            {
              id: "c-hnsw",
              label: "HNSW bug",
              tier: "closet",
              preview: "ChromaDB divergence at scale",
              children: [
                { id: "d-div", label: "ChromaDB divergence at 100K...", tier: "drawer" },
                { id: "d-sig", label: "SIGTERM kills C++ thread...", tier: "drawer" },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "w-static",
      label: "metaorchestrator",
      tier: "wing",
      preview: "3,576 drawers - mined from project files",
      children: [
        {
          id: "r-scripts",
          label: "scripts",
          tier: "room",
          children: [
            { id: "d-mine", label: "mine_conversations.py...", tier: "drawer" },
            { id: "d-rebuild", label: "rebuild_palace.sh...", tier: "drawer" },
          ],
        },
        {
          id: "r-knowledge",
          label: "knowledge",
          tier: "room",
          children: [
            {
              id: "c-mem",
              label: "memory system",
              tier: "closet",
              preview: "MemPalace architecture docs",
              children: [
                { id: "d-claude", label: "CLAUDE.md routing table...", tier: "drawer" },
                { id: "d-voice", label: "voice-style-guide.md...", tier: "drawer" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const tierColors: Record<TreeNode["tier"], { bg: string; border: string; text: string; glow: string }> = {
  palace: {
    bg: "bg-[#1a1a2e]",
    border: "border-primary",
    text: "text-primary",
    glow: "shadow-[0_0_20px_rgba(243,230,0,0.3)]",
  },
  wing: {
    bg: "bg-[#16213e]",
    border: "border-accent",
    text: "text-accent",
    glow: "shadow-[0_0_12px_rgba(82,227,200,0.2)]",
  },
  room: {
    bg: "bg-[#0f3460]",
    border: "border-[#533483]",
    text: "text-[#c084fc]",
    glow: "",
  },
  closet: {
    bg: "bg-[#1a1a3e]",
    border: "border-muted-foreground/30",
    text: "text-muted-foreground",
    glow: "",
  },
  drawer: {
    bg: "bg-card",
    border: "border-border",
    text: "text-foreground/70",
    glow: "",
  },
};

const tierLabels: Record<TreeNode["tier"], string> = {
  palace: "PALACE",
  wing: "WING",
  room: "ROOM",
  closet: "CLOSET",
  drawer: "DRAWER",
};

const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const staticNodeVariants: Variants = {
  hidden: { opacity: 1, scale: 1, y: 0 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

const staticContainerVariants: Variants = {
  hidden: {},
  visible: {},
};

function TreeNodeComponent({
  node,
  depth,
  animate: shouldAnimate,
}: {
  node: TreeNode;
  depth: number;
  animate: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = tierColors[node.tier];
  const nv = shouldAnimate ? nodeVariants : staticNodeVariants;
  const cv = shouldAnimate ? containerVariants : staticContainerVariants;

  return (
    <motion.div variants={cv} className="flex flex-col items-center gap-2">
      <motion.div
        variants={nv}
        className={`relative rounded-lg border ${colors.bg} ${colors.border} ${colors.glow} px-3 py-2 text-center cursor-default transition-shadow`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ minWidth: depth > 2 ? 100 : 140 }}
      >
        <span className={`block text-[10px] tracking-widest uppercase ${colors.text} opacity-60`}>
          {tierLabels[node.tier]}
        </span>
        <span className={`block text-xs font-medium ${colors.text} truncate max-w-[180px]`}>
          {node.label}
        </span>

        {node.preview && hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 rounded border border-primary/30 bg-[#0b0d12] px-3 py-2 text-[11px] text-foreground/80 whitespace-nowrap shadow-lg"
          >
            {node.preview}
          </motion.div>
        )}
      </motion.div>

      {node.children && node.children.length > 0 && (
        <>
          <motion.div
            variants={nv}
            className="w-px h-4 bg-gradient-to-b from-current to-transparent"
            style={{ color: `var(--primary)` }}
          />
          <motion.div
            variants={cv}
            className={`flex justify-center ${depth < 2 ? "gap-6" : "gap-3"}`}
          >
            {node.children.map((child) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                depth={depth + 1}
                animate={shouldAnimate}
              />
            ))}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

export function PalaceStructure() {
  const { animate } = useDiagramMotion();

  return (
    <motion.div
      initial={animate ? "hidden" : "visible"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={animate ? containerVariants : staticContainerVariants}
      className="relative my-8 overflow-x-auto rounded-xl border border-border bg-[#0b0d12] p-6 md:p-8"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs tracking-widest text-primary/70 uppercase font-mono">
          Palace Structure - 85,033 drawers
        </span>
      </div>
      <div className="flex justify-center min-w-[900px]">
        <TreeNodeComponent node={palaceData} depth={0} animate={animate} />
      </div>
    </motion.div>
  );
}
