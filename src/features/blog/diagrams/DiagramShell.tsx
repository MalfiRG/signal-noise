import { useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import type { ReactNode } from "react";

const EXPANDED_BG = "#131620";

interface DiagramShellProps {
  title: string;
  children: (expanded: boolean) => ReactNode;
}

export function DiagramShell({ title, children }: DiagramShellProps) {
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  return (
    <>
      {!expanded && (
        <div className="relative my-8 group -mx-6">
          <div className="flex items-center justify-between px-6 py-2 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-xs tracking-widest text-primary/70 uppercase font-mono break-words">
                {title}
              </span>
            </div>
            <button
              className="relative p-1.5 rounded-md border border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all shrink-0"
              aria-label="Expand diagram"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="h-3.5 w-3.5 text-primary/60 hover:text-primary transition-colors" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary/70 animate-pulse" />
            </button>
          </div>
          <div className="overflow-x-hidden px-6">
            {children(false)}
          </div>
        </div>
      )}

      {expanded && createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: EXPANDED_BG }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/10"
            style={{ background: "#0e1118" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-mono text-primary/80 tracking-widest uppercase">
                {title}
              </span>
            </div>
            <button
              className="p-1.5 rounded hover:bg-white/10"
              style={{ color: "#abb2bf" }}
              aria-label="Close"
              onClick={() => setExpanded(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            className="flex-1 overflow-auto p-4 sm:p-8"
            style={{ background: EXPANDED_BG }}
            onClick={(e) => e.stopPropagation()}
          >
            {children(true)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
