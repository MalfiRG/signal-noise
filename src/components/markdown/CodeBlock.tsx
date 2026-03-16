import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  language: string;
  children: ReactNode;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    const codeText = scrollRef.current?.textContent || "";
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

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

  return (
    <div ref={wrapperRef} className="code-block-wrapper relative my-4 group">
      {language && (
        <span className="code-lang-badge absolute top-2 left-3 text-xs text-muted-foreground opacity-60 select-none z-10">
          {language}
        </span>
      )}
      <button
        className="code-copy-btn absolute top-2 right-3 p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
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
      <div
        ref={scrollRef}
        className="code-scroll-container overflow-x-auto"
        onScroll={updateScrollShadows}
      >
        {children}
      </div>
    </div>
  );
}
