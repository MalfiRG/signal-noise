/**
 * LetterReveal — per-character entrance animation. See ARCHITECTURE.md §10.
 *
 * Uses a single CSS @keyframes (.letter-reveal in index.css) with per-span
 * animation-delay, instead of N Framer Motion instances per headline.
 *
 * Accessibility: aria-label on wrapper gives screen readers the full string;
 * individual spans are aria-hidden. The skipAnimation prop (external) OR the
 * internal hasPlayed ref (second mount) renders all spans in settled state.
 */

import { useRef, useEffect, useState } from "react";

interface LetterRevealProps {
  text: string;
  className?: string;
  tag?: "h1" | "h2" | "h3" | "span";
  /** Milliseconds between each letter. Default: 40 */
  delayPerLetter?: number;
  /** Milliseconds before the first letter starts. Default: 0 */
  startDelay?: number;
  /** External skip — render in final state immediately (e.g., return visit). Default: false */
  skipAnimation?: boolean;
}

const LetterReveal = ({
  text,
  className,
  tag: Tag = "h1",
  delayPerLetter = 40,
  startDelay = 0,
  skipAnimation: externalSkip = false,
}: LetterRevealProps) => {
  const hasPlayed = useRef(false);
  const [internalSkip, setInternalSkip] = useState(false);

  useEffect(() => {
    if (hasPlayed.current) {
      setInternalSkip(true);
    } else {
      hasPlayed.current = true;
    }
  }, []);

  const effectiveSkip = externalSkip || internalSkip;

  return (
    <Tag className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={
            effectiveSkip
              ? "inline-block"
              : `letter-reveal${char === " " ? " letter-reveal-space" : ""}`
          }
          style={
            effectiveSkip
              ? undefined
              : { animationDelay: `${startDelay + i * delayPerLetter}ms` }
          }
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </Tag>
  );
};

export default LetterReveal;
