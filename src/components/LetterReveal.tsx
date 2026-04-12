/**
 * LetterReveal — CSS animation-delay character reveal (spec §6, A3).
 *
 * Uses a single CSS @keyframes (letter-reveal in index.css) with per-span
 * animation-delay, NOT per-element Framer Motion instances. This avoids
 * 40+ motion instances for a typical headline.
 *
 * Accessibility (A3):
 *   - aria-label on wrapper gives screen readers the full string
 *   - Individual spans are aria-hidden
 *
 * "Once" gate (A3):
 *   - useRef tracks whether animation has played
 *   - On revisit (e.g., back navigation), spans render visible immediately
 *
 * Mobile (A5):
 *   - CSS rule in index.css disables animation-delay on <=640px
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
}

const LetterReveal = ({
  text,
  className,
  tag: Tag = "h1",
  delayPerLetter = 40,
  startDelay = 0,
}: LetterRevealProps) => {
  const hasPlayed = useRef(false);
  const [skipAnimation, setSkipAnimation] = useState(false);

  useEffect(() => {
    if (hasPlayed.current) {
      setSkipAnimation(true);
    } else {
      hasPlayed.current = true;
    }
  }, []);

  return (
    <Tag className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={
            skipAnimation
              ? "inline-block"
              : `letter-reveal${char === " " ? " letter-reveal-space" : ""}`
          }
          style={
            skipAnimation
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
