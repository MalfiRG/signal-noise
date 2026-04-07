import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const rainColorRef = useRef<string>("hsl(120 100% 50%)");
  const trailBgRef = useRef<string>("rgba(2, 10, 2, 0.05)");

  // Cache color at mount and on theme change — NOT getComputedStyle every frame
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const raw = style.getPropertyValue('--matrix-rain-color').trim();
    rainColorRef.current = raw ? `hsl(${raw})` : "hsl(120 100% 50%)";

    const bg = style.getPropertyValue('--background').trim();
    if (bg) {
      trailBgRef.current = `hsl(${bg} / 0.05)`;
    }
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1).map(() => Math.random() * -100);

    const draw = () => {
      ctx.fillStyle = trailBgRef.current;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'Share Tech Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Use themed rain color
        ctx.fillStyle = rainColorRef.current;
        ctx.fillText(char, x, y);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
};

export default MatrixRain;
