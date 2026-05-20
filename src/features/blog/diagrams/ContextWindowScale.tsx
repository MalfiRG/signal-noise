import { motion, type Variants } from "framer-motion";
import { useState, useEffect, useContext } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { useDiagramMotion } from "./useDiagramMotion";
import { DiagramShell } from "./DiagramShell";
import type { Mode } from "./types";
import { AnimatedBar } from "./AnimatedBar";
import { UNSAFE_RouteContext } from "react-router-dom";

const MODEL_BARS = [
  { model: "Opus 4.6", value: 1_000_000, color: "#533483" as const },
  { model: "Sonnet 4.6", value: 200_000, color: "#533483" as const },
  { model: "GPT-4 Turbo", value: 128_000, color: "#0f3460" as const },
  { model: "Llama 3.1 70B", value: 128_000, color: "#0f3460" as const },
  { model: "Llama 3.2 8B Q4", value: 32_000, color: "#0f3460" as const, minWidth: 32 },
  { model: "7B 4-bit laptop", value: 8_000, color: "#660000" as const, minWidth: 24 },
] as const;

const MAX_VALUE = 1_000_000;
const STAGGER_MS = 100;
const SPRING_SETTLE_MS = 700;
const PHASE_1_MS = MODEL_BARS.length * STAGGER_MS + SPRING_SETTLE_MS;

function useSafeMode(expanded: boolean): Mode {
  const routeCtx = useContext(UNSAFE_RouteContext);
  const inRouter = routeCtx !== null;
  if (expanded) return "expanded";
  if (!inRouter) return "inline";
  const { pathname } = window.location;
  return /^\/(blog|how-i-do-it)\/[^/]+/.test(pathname) ? "reading" : "inline";
}

function resolveBarColors(mode: Mode): { labelColor: string; labelColorOutside: string; subLabelColor: string } {
  if (mode === "expanded") return { labelColor: "#f5e9a3", labelColorOutside: "#f5e9a3", subLabelColor: "rgba(245,233,163,0.6)" };
  return { labelColor: "#f5e9a3", labelColorOutside: "#2d2520", subLabelColor: "#4a3f36" };
}

function resolveModelNameColor(mode: Mode): string {
  return mode === "expanded" ? "rgba(245,233,163,0.8)" : "#2d2520";
}

function resolveSeparatorColor(mode: Mode): string {
  return mode === "expanded" ? "rgba(245,233,163,0.3)" : "rgba(103,89,76,0.4)";
}

const containerVariants: Variants = { hidden: {}, visible: {} };

export function ContextWindowScale() {
  const { animate } = useDiagramMotion();

  return (
    <DiagramShell title="Context Window Scale - model context vs retrieval cost">
      {(expanded) => (
        <Inner animate={animate} expanded={expanded} />
      )}
    </DiagramShell>
  );
}

function Inner({ animate, expanded }: { animate: boolean; expanded: boolean }) {
  const mode = useSafeMode(expanded);
  const [showSeparator, setShowSeparator] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setShowSeparator(true);
      return;
    }
    setShowSeparator(false);
    const t = setTimeout(() => setShowSeparator(true), PHASE_1_MS);
    return () => clearTimeout(t);
  }, [animate, expanded]);

  const { labelColor, labelColorOutside, subLabelColor } = resolveBarColors(mode);
  const modelNameColor = resolveModelNameColor(mode);
  const separatorColor = resolveSeparatorColor(mode);

  return (
    <motion.div
      role="figure"
      aria-label="Context Window Scale: model context windows range from 1M (Opus) to 8K (7B laptop), while MemPalace retrieval costs 2-5K tokens regardless of model"
      initial={animate ? "hidden" : "visible"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={containerVariants}
      className="py-4 w-full"
    >
      <div className="flex flex-col gap-2 w-full">
        {MODEL_BARS.map((bar, i) => {
          const isWorstCase = bar.model === "7B 4-bit laptop";
          return (
            <div key={bar.model} className="flex items-center gap-2">
              <span
                className="text-xs font-mono shrink-0 w-36 text-right"
                style={{ color: modelNameColor }}
              >
                {bar.model}
                {expanded && isWorstCase && (
                  <AlertTriangle
                    className="inline-block ml-1 h-3 w-3 text-red-400"
                    aria-hidden="true"
                  />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <AnimatedBar
                  value={bar.value}
                  maxValue={MAX_VALUE}
                  color={bar.color}
                  labelColor={labelColor}
                  labelColorOutside={labelColorOutside}
                  subLabelColor={subLabelColor}
                  ariaLabel={`${bar.model}: ${bar.value.toLocaleString()} tokens`}
                  animate={animate}
                  delay={i * 0.1}
                  growDuration={0.5}
                  minWidth={"minWidth" in bar ? bar.minWidth : undefined}
                  countUp
                  height={20}
                />
              </div>
            </div>
          );
        })}

        <div
          className="my-2 w-full origin-left"
          style={{
            height: 1,
            backgroundColor: separatorColor,
            transform: showSeparator ? "scaleX(1)" : "scaleX(0)",
            transition: animate ? "transform 0.3s ease-out, opacity 0.3s ease-out" : "none",
            opacity: showSeparator ? 1 : 0,
          }}
        />

        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono shrink-0 w-36 text-right flex items-center justify-end gap-1"
            style={{ color: mode === "expanded" ? "#52e3c8" : "#0f766e" }}
          >
            MemPalace
            <CheckCircle className="inline-block h-3 w-3" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <AnimatedBar
              value={3500}
              maxValue={MAX_VALUE}
              label="2-5K"
              color={{ from: "#52e3c8", to: "#34d399" }}
              labelColor={labelColor}
              labelColorOutside={labelColorOutside}
              subLabelColor={subLabelColor}
              ariaLabel="MemPalace retrieval: 2-5K tokens regardless of model"
              animate={animate}
              delay={MODEL_BARS.length * 0.1 + 0.35}
              growDuration={0.4}
              minWidth={18}
              countUp={false}
              height={20}
              subLabel="constant regardless of model"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
