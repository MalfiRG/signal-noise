import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import { useDiagramMotion } from "./useDiagramMotion";
import { useReadingMode } from "./useReadingMode";
import { DiagramShell } from "./DiagramShell";

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

interface TierStyle {
  bg: string;
  border: string;
  tierText: string;
  labelText: string;
  glow: string;
}

const inlineColors: Record<TreeNode["tier"], TierStyle> = {
  palace: {
    bg: "bg-[#f4f2f1]",
    border: "border-primary border-2",
    tierText: "text-[#67594c]",
    labelText: "text-[#2d2520]",
    glow: "",
  },
  wing: {
    bg: "bg-[#f4f2f1]",
    border: "border-accent border-2",
    tierText: "text-[#2a5d53]",
    labelText: "text-[#2d2520]",
    glow: "",
  },
  room: {
    bg: "bg-[#f4f2f1]",
    border: "border-[#a78bfa] border-2",
    tierText: "text-[#5b3a8a]",
    labelText: "text-[#2d2520]",
    glow: "",
  },
  closet: {
    bg: "bg-[#e8e5e2]",
    border: "border-[#67594c]",
    tierText: "text-[#67594c]",
    labelText: "text-[#2d2520]",
    glow: "",
  },
  drawer: {
    bg: "bg-[#e8e5e2]",
    border: "border-[#67594c]",
    tierText: "text-[#67594c]",
    labelText: "text-[#2d2520]",
    glow: "",
  },
};

const expandedColors: Record<TreeNode["tier"], TierStyle> = {
  palace: {
    bg: "bg-card",
    border: "border-primary border-2",
    tierText: "text-primary",
    labelText: "text-foreground",
    glow: "shadow-[0_0_24px_rgba(243,230,0,0.4)]",
  },
  wing: {
    bg: "bg-[#1c2640]",
    border: "border-accent border-2",
    tierText: "text-accent",
    labelText: "text-foreground/90",
    glow: "shadow-[0_0_16px_rgba(82,227,200,0.25)]",
  },
  room: {
    bg: "bg-[#1e2350]",
    border: "border-[#a78bfa] border-2",
    tierText: "text-[#c4b5fd]",
    labelText: "text-foreground/90",
    glow: "",
  },
  closet: {
    bg: "bg-[#1a2038]",
    border: "border-foreground/25",
    tierText: "text-foreground/50",
    labelText: "text-foreground/80",
    glow: "",
  },
  drawer: {
    bg: "bg-card",
    border: "border-border",
    tierText: "text-foreground/40",
    labelText: "text-foreground/70",
    glow: "",
  },
};

const readingModeInlineColors: Record<TreeNode["tier"], TierStyle> = {
  palace: { ...inlineColors.palace, bg: "bg-white", border: "border-[#67594c] border-2" },
  wing: { ...inlineColors.wing, bg: "bg-white", border: "border-[#2a5d53] border-2" },
  room: { ...inlineColors.room, bg: "bg-white", border: "border-[#5b3a8a] border-2" },
  closet: { ...inlineColors.closet, bg: "bg-[#f4f2f1]" },
  drawer: { ...inlineColors.drawer, bg: "bg-[#f4f2f1]" },
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

const fastNodeVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
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

const inlineContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
};

function TreeNodeComponent({
  node,
  depth,
  animate: shouldAnimate,
  layout,
  colorScheme,
}: {
  node: TreeNode;
  depth: number;
  animate: boolean;
  layout: "vertical" | "horizontal";
  colorScheme: Record<TreeNode["tier"], TierStyle>;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = colorScheme[node.tier];
  const isVertical = layout === "vertical";
  const nv = shouldAnimate ? (isVertical ? fastNodeVariants : nodeVariants) : staticNodeVariants;
  const cv = shouldAnimate
    ? (isVertical ? inlineContainerVariants : containerVariants)
    : staticContainerVariants;

  const maxDepth = isVertical ? 2 : Infinity;
  const showChildren = depth < maxDepth && node.children && node.children.length > 0;

  const tooltipBg = isVertical ? "bg-[#f4f2f1] border-[#67594c]/30" : "bg-[#0e1118] border-primary/30";
  const tooltipText = isVertical ? "text-[#2d2520]" : "text-foreground/80";

  return (
    <motion.div variants={cv} className="flex flex-col items-center gap-2">
      <motion.div
        variants={nv}
        className={`relative rounded-lg ${colors.bg} ${colors.border} ${colors.glow} px-3 py-2 text-center cursor-default transition-shadow`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ minWidth: isVertical ? undefined : (depth > 2 ? 100 : 140), left: node.tier === "palace" ? (isVertical ? 20 : 70) : undefined }}
      >
        <span className={`block text-[10px] tracking-widest uppercase ${colors.tierText}`}>
          {tierLabels[node.tier]}
        </span>
        <span className={`block text-xs font-medium ${colors.labelText} ${isVertical ? "break-words" : "truncate max-w-[220px]"}`}>
          {node.label}
        </span>

        {node.preview && hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 rounded border ${tooltipBg} px-3 py-2 text-[11px] ${tooltipText} max-w-[min(280px,90vw)] whitespace-normal shadow-lg`}
          >
            {node.preview}
          </motion.div>
        )}
      </motion.div>

      {showChildren && (
        <>
          <motion.div
            variants={nv}
            className={`w-0.5 h-5 ${isVertical ? "bg-[#67594c]" : "bg-foreground/40"}`}
            style={depth === 0 ? { position: "relative" as const, left: isVertical ? 20 : 70, marginLeft: !isVertical ? 140 : undefined } : undefined}
          />
          {(isVertical && depth > 0) || node.children!.length === 1 ? (
            <motion.div
              variants={cv}
              className={
                isVertical
                  ? "flex flex-col items-center gap-2"
                  : "flex justify-center"
              }
            >
              {node.children!.map((child) => (
                <TreeNodeComponent
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  animate={shouldAnimate}
                  layout={layout}
                  colorScheme={colorScheme}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={cv}
              className={isVertical ? "flex flex-col sm:flex-row justify-center items-center sm:items-start gap-2 sm:gap-0 w-full sm:-mt-1" : "flex justify-center"}
            >
              {node.children!.map((child, i) => {
                const connectorColor = isVertical ? "bg-[#67594c]" : "bg-foreground/40";
                return (
                  <motion.div key={child.id} variants={cv} className={`flex flex-col items-center ${isVertical ? "sm:flex-1" : ""} ${depth < 2 ? "px-1 sm:px-3" : "px-1.5"}`}>
                    <motion.div
                      variants={nv}
                      className={`h-0.5 self-stretch ${connectorColor} ${isVertical ? "hidden sm:block" : ""} ${
                        i === 0
                          ? "ml-[50%]"
                          : i === node.children!.length - 1
                            ? "mr-[50%]"
                            : ""
                      }`}
                    />
                    <motion.div variants={nv} className={`w-0.5 ${isVertical ? "h-5 hidden sm:block" : "h-3"} ${connectorColor}`} />
                    <TreeNodeComponent
                      node={child}
                      depth={depth + 1}
                      animate={shouldAnimate}
                      layout={layout}
                      colorScheme={colorScheme}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

export function PalaceStructure() {
  const { animate } = useDiagramMotion();

  const isReadingMode = useReadingMode();

  const getColorScheme = (expanded: boolean) => {
    if (expanded) return expandedColors;
    return isReadingMode ? readingModeInlineColors : inlineColors;
  };

  return (
    <DiagramShell title="Palace Structure - 2 wings, 4 rooms (expand for full tree)">
      {(expanded) => (
        <motion.div
          role="figure"
          aria-label="Palace Structure: MemPalace with 2 wings - convos_metaorchestrator (60,935 drawers) and metaorchestrator (3,576 drawers)"
          initial={animate ? "hidden" : "visible"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={animate ? containerVariants : staticContainerVariants}
        >
          <div
            className={
              expanded
                ? "flex sm:justify-center sm:min-w-[900px] py-4"
                : "flex flex-col items-center py-4"
            }
          >
            <TreeNodeComponent
              node={palaceData}
              depth={0}
              animate={animate}
              layout={expanded ? "horizontal" : "vertical"}
              colorScheme={getColorScheme(expanded)}
            />
          </div>
        </motion.div>
      )}
    </DiagramShell>
  );
}
