import { useEffect, useState } from "react";
import { useMotionPolicy } from "@/lib/motion";
import { formatTimeOfDay, formatUtcDate, PLACEHOLDER_TIME, PLACEHOLDER_DATE } from "./clock";

const IdStrip = () => {
  const { animationsDisabled } = useMotionPolicy();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date()); // first paint replaces placeholders with mount-time clock
    if (animationsDisabled) return; // no interval — static page-load timestamp
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNow(new Date());
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [animationsDisabled]);

  const ts = now ? formatTimeOfDay(now) : PLACEHOLDER_TIME;
  const utc = now ? formatUtcDate(now) : PLACEHOLDER_DATE;

  return (
    <p
      className={`id-strip${animationsDisabled ? " motion-disabled" : ""}`}
      aria-hidden="true"
    >
      <span className="seg">NODE_<b>07</b></span><span className="div">//</span>
      <span className="seg">OP: <b>PT</b></span><span className="div">//</span>
      <span className="seg">TS: <b>{ts}</b></span><span className="div">//</span>
      <span className="seg">UTC: <b>{utc}</b></span><span className="div">//</span>
      <span className="seg"><span className="pulse" />SEC: <b>OK</b></span>
    </p>
  );
};

export default IdStrip;
