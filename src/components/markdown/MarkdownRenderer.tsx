import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeShiki from "@shikijs/rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onHeadingsExtracted?: (headings: { id: string; text: string; level: number }[]) => void;
}

const customSlugify = (text: string): string => {
  const customIdMatch = text.match(/{#([a-z0-9-]+)}/i);
  if (customIdMatch) {
    return customIdMatch[1];
  }

  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-");
};

const cleanTextFromIdTags = (text: string): string => {
  return typeof text === "string" ? text.replace(/{#[a-z0-9-]+}/gi, "") : text;
};

const findElementId = (href: string): string => {
  if (!href.startsWith("#")) return href;

  const linkText = decodeURIComponent(href.substring(1));

  if (document.getElementById(linkText)) {
    return linkText;
  }

  return customSlugify(linkText);
};

const matrixThemeCSS = `
  .node rect, .node circle, .node ellipse, .node polygon, .node path {
    fill: hsl(120 10% 7%);
    stroke: hsl(120 100% 50%);
  }
  .edgePath .path { stroke: hsl(120 100% 50%); }
  .cluster rect { fill: hsl(120 10% 4%); stroke: hsl(120 100% 50%); }
  .label { color: hsl(120 100% 65%); }
  .edgeLabel { background-color: hsl(120 10% 7%); color: hsl(120 100% 65%); }
`;

const readingThemeCSS = `
  /* Flowchart nodes */
  .node rect, .node circle, .node ellipse, .node polygon, .node path {
    fill: hsl(30 10% 95%);
    stroke: hsl(30 15% 35%);
    stroke-width: 1.5px;
  }
  /* Arrows and edges — darker for contrast */
  .edgePath .path { stroke: hsl(30 10% 25%) !important; stroke-width: 2px !important; }
  .edgePath marker path { fill: hsl(30 10% 25%) !important; }
  /* Clusters */
  .cluster rect { fill: hsl(30 10% 93%); stroke: hsl(30 15% 45%); }
  /* All text labels */
  .label, .nodeLabel, .edgeLabel, .labelText {
    color: hsl(30 10% 10%) !important;
    fill: hsl(30 10% 10%) !important;
  }
  /* Edge label background — transparent looks cleanest against cream */
  .labelBkg, .edgeLabel {
    background-color: transparent !important;
    background: transparent !important;
  }
  .edgeLabel {
    color: hsl(30 10% 10%) !important;
  }
  .edgeLabel p {
    background-color: transparent !important;
    background: transparent !important;
  }
  /* Sequence diagram — !important needed to override inline SVG attributes */
  rect.actor { fill: hsl(30 10% 95%) !important; stroke: hsl(30 15% 35%) !important; }
  .actor-line { stroke: hsl(30 10% 50%) !important; }
  text.actor > tspan { fill: hsl(30 10% 10%) !important; }
  .messageText { fill: hsl(30 10% 15%) !important; stroke: none !important; }
  .messageLine0, .messageLine1 { stroke: hsl(30 10% 30%) !important; stroke-width: 1.5px; }
  marker path { fill: hsl(30 10% 30%) !important; stroke: hsl(30 10% 30%) !important; }
  .activation0, .activation1, .activation2 {
    fill: hsl(30 10% 85%) !important; stroke: hsl(30 15% 45%) !important;
  }
  .loopText, .loopText > tspan { fill: hsl(30 10% 10%) !important; }
  .loopLine { stroke: hsl(30 10% 50%) !important; }
  .labelBox { fill: hsl(30 10% 92%) !important; stroke: hsl(30 15% 45%) !important; }
  /* State diagram */
  .state-note-edge .path { stroke: hsl(30 10% 40%) !important; }
  .statediagram-state rect.basic { fill: hsl(30 10% 95%) !important; stroke: hsl(30 15% 35%) !important; }
  .statediagram-state .nodeLabel { color: hsl(30 10% 10%) !important; }
  /* Alt/opt/loop sections */
  .labelText { fill: hsl(30 10% 10%) !important; }
  line { stroke: hsl(30 10% 40%) !important; }
`;

function useMermaidTheme() {
  const [isReading, setIsReading] = useState(
    () => !!document.querySelector(".theme-reading")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsReading(!!document.querySelector(".theme-reading"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeCSS: isReading ? readingThemeCSS : matrixThemeCSS,
    });
  }, [isReading]);

  return isReading;
}

const MermaidRenderer = ({ code }: { code: string }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const isReading = useMermaidTheme();

  useEffect(() => {
    if (!mermaidRef.current) return;

    const codeId = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
    mermaidRef.current.innerHTML = "";

    mermaid
      .render(codeId, code)
      .then(({ svg }) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      })
      .catch((error) => {
        console.error("Failed to render mermaid diagram:", error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<pre>Error rendering diagram: ${error.message}</pre>`;
        }
      });
  }, [code, isReading]);

  return <div className="my-6 max-w-full overflow-x-auto" ref={mermaidRef} />;
};

export function MarkdownRenderer({ content, className = "", onHeadingsExtracted }: MarkdownRendererProps) {
  const [tocLinks, setTocLinks] = useState<string[]>([]);
  const [hasTableOfContents, setHasTableOfContents] = useState(false);

  useEffect(() => {
    const hasTOC = content.includes("Table of Contents");
    setHasTableOfContents(hasTOC);

    if (hasTOC) {
      const linkRegex = /\[.*?\]\((#[^)]+)\)/g;
      const matches = Array.from(content.matchAll(linkRegex));
      const links = matches.map((match) => decodeURIComponent(match[1].substring(1)));
      setTocLinks(links);
    }
  }, [content]);

  useEffect(() => {
    if (window.location.hash) {
      const id = decodeURIComponent(window.location.hash.substring(1));
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, [content]);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onHeadingsExtracted || !contentRef.current) return;

    const timer = setTimeout(() => {
      if (!contentRef.current) return;
      const headingElements = contentRef.current.querySelectorAll('h2, h3');
      const headings = Array.from(headingElements).map((el) => ({
        id: el.id,
        text: el.textContent || '',
        level: parseInt(el.tagName.charAt(1)),
      }));
      onHeadingsExtracted(headings);
    }, 100);

    return () => clearTimeout(timer);
  }, [content, onHeadingsExtracted]);

  const renderHeading = (level: "h1" | "h2" | "h3") => {
    const sizing = {
      h1: "text-2xl font-bold mt-6 mb-4",
      h2: "text-xl font-bold mt-5 mb-3",
      h3: "text-lg font-bold mt-4 mb-2",
    };

    return ({ children, ...props }: any) => {
      const cleanChildren = cleanTextFromIdTags(children);
      const HeadingTag = level;

      const isInTOC =
        hasTableOfContents &&
        tocLinks.some((link) => {
          return link === props.id || link === customSlugify(String(cleanChildren));
        });

      if (!isInTOC) {
        return (
          <HeadingTag id={props.id} className={sizing[level]} {...props}>
            {cleanChildren}
          </HeadingTag>
        );
      }

      return (
        <HeadingTag id={props.id} className={`group flex items-center ${sizing[level]}`} {...props}>
          {cleanChildren}
          <a
            href={`#${props.id}`}
            className="ml-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </a>
        </HeadingTag>
      );
    };
  };

  const rehypePlugins: any[] = [
    [rehypeShiki, {
      theme: "one-dark-pro",
      langs: ["typescript", "javascript", "python", "bash", "json", "css", "html", "yaml", "markdown", "sql", "powershell", "dockerfile"],
    }],
    [rehypeSlug, { slugify: customSlugify }],
  ];

  if (hasTableOfContents) {
    rehypePlugins.push([
      rehypeAutolinkHeadings,
      {
        behavior: "wrap",
        properties: {
          className: ["text-primary hover:text-foreground transition-colors"],
        },
        test: (element: any) => {
          if (element.tagName === "h1" || element.tagName === "h2" || element.tagName === "h3") {
            const id = element.properties?.id;
            return tocLinks.includes(id as string);
          }
          return false;
        },
      },
    ]);
  }

  return (
    <div ref={contentRef} className={`markdown-body ${hasTableOfContents ? "has-inline-toc" : ""} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={{
          h1: renderHeading("h1"),
          h2: renderHeading("h2"),
          h3: renderHeading("h3"),

          ol: ({ ...props }) => <ol className="list-decimal pl-6 my-4 space-y-1" {...props} />,

          ul: ({ ...props }) => <ul className="list-disc pl-6 my-4 space-y-1" {...props} />,

          li: ({ ...props }) => <li className="ml-2" {...props} />,

          a: ({ href, children, ...props }) => {
            if (href?.startsWith("#")) {
              const expectedElementId = findElementId(href);

              return (
                <a
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    const targetElement = document.getElementById(expectedElementId);
                    if (targetElement) {
                      targetElement.scrollIntoView({ behavior: "smooth" });
                      window.history.pushState(null, "", href);
                    }
                  }}
                  className="text-primary hover:text-foreground transition-colors"
                  {...props}
                >
                  {children}
                </a>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-foreground transition-colors"
                {...props}
              >
                {children}
              </a>
            );
          },

          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="border-collapse border border-border" {...props} />
            </div>
          ),
          thead: ({ ...props }) => <thead className="bg-secondary" {...props} />,
          th: ({ ...props }) => (
            <th className="border border-border p-2 text-left font-bold whitespace-nowrap" {...props} />
          ),
          td: ({ ...props }) => <td className="border border-border p-2" {...props} />,
          tr: ({ ...props }) => <tr className="even:bg-card odd:bg-background" {...props} />,

          pre({ children, className: preClassName, ...preProps }) {
            // Extract language from code child's className or pre's className
            const codeEl = React.Children.toArray(children).find(
              (child) => React.isValidElement(child)
            );
            const codeClassName = React.isValidElement(codeEl)
              ? (codeEl as React.ReactElement<{ className?: string }>).props?.className || ""
              : "";

            const allClasses = `${preClassName || ""} ${codeClassName}`;

            // Mermaid blocks are handled by the code handler
            if (allClasses.includes("mermaid")) {
              return <>{children}</>;
            }

            const language = /language-(\w+)/.exec(allClasses)?.[1] || "";
            return <CodeBlock language={language}>{children}</CodeBlock>;
          },

          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            if (language === "mermaid") {
              return <MermaidRenderer code={String(children).replace(/\n$/, "")} />;
            }

            // Block code — CSS handles styling via .code-block-wrapper rules
            if (className) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            // Inline code
            return (
              <code className="bg-secondary text-foreground px-1 rounded" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
