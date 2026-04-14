import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, Maximize2, X } from "lucide-react";

const CODE_BG = "#2d2d2d";

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
    const text = getCodeText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-HTTPS contexts (mobile over HTTP, meshnet IPs)
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getCodeText]);

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

  return (
    <>
      {/* Inline code block — always mounted, hidden via CSS when expanded */}
      <div
        ref={wrapperRef}
        className="code-block-wrapper relative my-4 group rounded-md overflow-hidden"
        style={{ background: CODE_BG, display: expanded ? "none" : undefined }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: CODE_BG }}>
          {language ? (
            <span className="code-lang-badge text-xs opacity-60 select-none" style={{ color: "#abb2bf" }}>
              {language}
            </span>
          ) : <span />}
          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
            <button
              className="p-1 rounded hover:bg-white/10"
              style={{ color: "#abb2bf" }}
              aria-label="Expand code"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-1 rounded hover:bg-white/10"
              style={{ color: "#abb2bf" }}
              aria-label="Copy code"
              onClick={handleCopy}
            >
              {copied ? (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#98c379" }}>
                  <Check className="h-3.5 w-3.5" /> Copied!
                </span>
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        {/* Code content */}
        <div
          ref={scrollRef}
          className="code-scroll-container overflow-x-auto px-3 pb-3"
          style={{ background: CODE_BG }}
        >
          {children}
        </div>
      </div>

      {/* Fullscreen overlay — portaled to body, z-[100] above navbar z-50 */}
      {expanded && createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: CODE_BG }}
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/10"
            style={{ background: "#21252b" }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-mono" style={{ color: "#98c379" }}>
              {language || "code"}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded hover:bg-white/10"
                style={{ color: "#abb2bf" }}
                aria-label="Copy code"
                onClick={handleCopy}
              >
                {copied ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#98c379" }}>
                    <Check className="h-3.5 w-3.5" /> Copied!
                  </span>
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                className="p-1.5 rounded hover:bg-white/10"
                style={{ color: "#abb2bf" }}
                aria-label="Close"
                onClick={() => setExpanded(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div
            ref={modalScrollRef}
            className="flex-1 overflow-auto p-4 text-sm"
            style={{ background: CODE_BG }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
