import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }

    const durationMs = duration * 1000;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(Math.floor(target * progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, active]);

  return value;
}
