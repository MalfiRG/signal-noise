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
    return scrollRef.current?.textContent || modalScrollRef.current?.textContent || "";
  }, []);

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

  // Close modal on Escape
  useEffect(() => {
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

  const copyButton = (
    <button
      className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-opacity"
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
  );

  return (
    <>
      {/* Inline code block */}
      <div ref={wrapperRef} className="code-block-wrapper relative my-4 group">
        {language && (
          <span className="code-lang-badge absolute top-2 left-3 text-xs text-muted-foreground opacity-60 select-none z-10">
            {language}
          </span>
        )}
        <div className="absolute top-2 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
          <button
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-opacity"
            aria-label="Expand code"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {copyButton}
        </div>
        <div
          ref={scrollRef}
          className="code-scroll-container overflow-x-auto"
          onScroll={updateScrollShadows}
        >
          {children}
        </div>
      </div>

      {/* Fullscreen overlay modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setExpanded(false)}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-card/80 border-b border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-mono text-primary">
              {language || "code"}
            </span>
            <div className="flex items-center gap-2">
              {copyButton}
              <button
                className="p-1.5 rounded text-muted-foreground hover:text-foreground"
                aria-label="Close"
                onClick={() => setExpanded(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable code area */}
          <div
            ref={modalScrollRef}
            className="flex-1 overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="code-block-wrapper">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
