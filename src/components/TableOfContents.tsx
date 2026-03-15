import { useEffect, useRef, useState } from "react";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: TocHeading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const visibleIds = useRef(new Set<string>());

  useEffect(() => {
    if (headings.length === 0) return;
    visibleIds.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleIds.current.add(entry.target.id);
          } else {
            visibleIds.current.delete(entry.target.id);
          }
        });

        // Pick the topmost visible heading (by document order)
        const firstVisible = headings.find(({ id }) => visibleIds.current.has(id));
        if (firstVisible) {
          setActiveId(firstVisible.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="hidden lg:block w-52 shrink-0">
      <div className="sticky top-20">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          On this page
        </p>
        <ul className="space-y-1.5 text-sm">
          {headings.map(({ id, text, level }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                    window.history.pushState(null, "", `#${id}`);
                  }
                }}
                className={`block text-[0.8rem] leading-snug transition-colors ${
                  level === 3 ? "pl-3" : ""
                } ${
                  activeId === id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
