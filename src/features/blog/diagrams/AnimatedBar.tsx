import { motion, type Variants } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useCountUp } from "./useCountUp";

interface AnimatedBarProps {
  value: number;
  maxValue: number;
  label?: string;
  color: string | { from: string; to: string };
  labelColor: string;
  subLabelColor: string;
  ariaLabel: string;
  animate: boolean;
  delay?: number;
  growDuration?: number;
  minWidth?: number;
  countUp?: boolean;
  countUpDuration?: number;
  height?: number;
  subLabel?: string;
}

export function AnimatedBar({
  value,
  maxValue,
  label,
  color,
  labelColor,
  subLabelColor,
  ariaLabel,
  animate,
  delay = 0,
  growDuration = 0.8,
  minWidth,
  countUp = false,
  countUpDuration = 1.5,
  height = 20,
  subLabel,
}: AnimatedBarProps) {
  const countValue = useCountUp(value, countUpDuration, animate && !!countUp);
  const [glowing, setGlowing] = useState(!animate);

  useEffect(() => {
    if (animate) setGlowing(false);
  }, [animate]);

  if (maxValue <= 0) return null;

  const ratio = Math.min(value / maxValue, 1);
  const widthPercent = `${ratio * 100}%`;
  const bg =
    typeof color === "string"
      ? color
      : `linear-gradient(90deg, ${color.from}, ${color.to})`;

  const barVariants: Variants = useMemo(
    () =>
      animate
        ? {
            hidden: { width: 0, opacity: 0 },
            visible: {
              width: widthPercent,
              opacity: 1,
              transition: { duration: growDuration, ease: "easeOut", delay },
            },
          }
        : {
            hidden: { width: widthPercent, opacity: 1 },
            visible: { width: widthPercent, opacity: 1 },
          },
    [animate, widthPercent, growDuration, delay]
  );

  const barStyle = useMemo(
    () => ({
      height,
      background: bg,
      minWidth: minWidth ? `${minWidth}px` : undefined,
    }),
    [height, bg, minWidth]
  );

  const handleAnimationComplete = useCallback(() => setGlowing(true), []);

  const labelOutside = ratio < 0.15;
  const displayText =
    label ?? (countUp ? countValue.toLocaleString() : value.toLocaleString());

  return (
    <div>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-label={ariaLabel}
        className="relative"
      >
        {countUp && (
          <span className="sr-only">
            {ariaLabel}: {value.toLocaleString()}
          </span>
        )}
        <motion.div
          variants={barVariants}
          className={`rounded ${glowing ? "shadow-[0_0_8px_rgba(82,227,200,0.33)]" : ""}`}
          style={barStyle}
          onAnimationComplete={handleAnimationComplete}
        >
          <span
            aria-hidden={countUp ? "true" : undefined}
            className={`absolute ${labelOutside ? "left-full pl-2 whitespace-nowrap" : "inset-0 flex items-center px-2"} text-xs font-mono font-medium`}
            style={{ color: labelColor }}
          >
            {displayText}
          </span>
        </motion.div>
      </div>
      {subLabel && (
        <div
          className="text-[10px] font-mono mt-0.5"
          style={{ color: subLabelColor }}
        >
          {subLabel}
        </div>
      )}
    </div>
  );
}
