import { useRef, useEffect, useState } from "react";

interface LetterRevealProps {
  text: string;
  className?: string;
  tag?: "h1" | "h2" | "h3" | "span" | "p";
  delayPerLetter?: number;
  startDelay?: number;
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
