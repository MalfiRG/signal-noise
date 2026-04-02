import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Copy, Check, Maximize2, X } from "lucide-react";

interface CodeBlockProps {
  language: string;
  children: ReactNode;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const getCodeText = useCallback(() => {
    return (expanded ? modalScrollRef : scrollRef).current?.textContent || "";
  }, [expanded]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(getCodeText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getCodeText]);

  const updateScrollShadows = useCallback(() => {
    const el = scrollRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;

    wrapper.classList.toggle("can-scroll-left", canScrollLeft);
    wrapper.classList.toggle("can-scroll-right", canScrollRight);
  }, []);

  useEffect(() => {
    updateScrollShadows();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateScrollShadows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollShadows]);

  useEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    // Nuclear: strip all background colors from overlay children via DOM
    // CSS !important can't reliably beat highlight.js themes across Tailwind layers
    requestAnimationFrame(() => {
      const container = modalScrollRef.current;
      if (!container) return;
      container.querySelectorAll("*").forEach((el) => {
        (el as HTMLElement).style.backgroundColor = "transparent";
        (el as HTMLElement).style.background = "transparent";
      });
    });

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  return (
    <>
      {/* Inline code block — hidden when overlay is open */}
      {!expanded && (
        <div ref={wrapperRef} className="code-block-wrapper relative my-4 group">
          {/* Top bar: language + buttons on same row */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-1.5 z-10">
            {language ? (
              <span className="text-xs text-muted-foreground opacity-60 select-none">
                {language}
              </span>
            ) : <span />}
            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
              <button
                className="p-1 rounded text-muted-foreground hover:text-foreground"
                aria-label="Expand code"
                onClick={() => setExpanded(true)}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1 rounded text-muted-foreground hover:text-foreground"
                aria-label="Copy code"
                onClick={handleCopy}
              >
                {copied ? (
                  <span aria-live="polite" className="flex items-center gap-1 text-xs">
                    <Check className="h-3.5 w-3.5" /> Copied!
                  </span>
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          {/* Code content — padded top to clear the bar */}
          <div
            ref={scrollRef}
            className="code-scroll-container overflow-x-auto pt-8"
            onScroll={updateScrollShadows}
          >
            {children}
          </div>
        </div>
      )}

      {/* Fullscreen overlay modal */}
      {expanded && (
        <div
          className="code-overlay-modal fixed inset-0 z-50 flex flex-col"
          style={{ background: "hsl(220 13% 18%)" }}
          onClick={() => setExpanded(false)}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-border/30"
            style={{ background: "hsl(220 13% 14%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-mono text-primary">
              {language || "code"}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded text-muted-foreground hover:text-foreground"
                aria-label="Copy code"
                onClick={handleCopy}
              >
                {copied ? (
                  <span aria-live="polite" className="flex items-center gap-1 text-xs text-green-400">
                    <Check className="h-3.5 w-3.5" /> Copied!
                  </span>
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                className="p-1.5 rounded text-muted-foreground hover:text-foreground"
                aria-label="Close"
                onClick={() => setExpanded(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable code — horizontal scroll, no line wrapping */}
          <div
            ref={modalScrollRef}
            className="flex-1 overflow-auto p-4 text-sm"
            style={{ background: "hsl(220 13% 18%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      )}
    </>
  );
}
