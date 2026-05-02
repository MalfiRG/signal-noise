import { useIsMobile } from "@/hooks/use-mobile";
import { FolderTree } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import CategoryTree from "./CategoryTree";
import TagFilter from "./TagFilter";
import type { BlogPost } from "./data";

const MIN_WIDTH = 200;
const MAX_WIDTH_CAP = 480;
const DEFAULT_WIDTH = 280;
const KEYBOARD_STEP = 10;
const STORAGE_KEY = "blog-sidebar-width";

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_WIDTH;
    const parsed = Number(raw);
    if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH_CAP) {
      return parsed;
    }
  } catch {
    // localStorage unavailable or corrupted
  }
  return DEFAULT_WIDTH;
}

interface BlogSidebarProps {
  posts: BlogPost[];
  filteredSlugs: string[];
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

const SidebarContent = ({ posts, filteredSlugs, allTags, activeTags, onToggleTag }: BlogSidebarProps) => (
  <div className="overflow-y-auto h-full">
    <div className="px-3 pt-3 pb-2">
      <p className="text-base tracking-[0.2em] text-muted-foreground">FILE EXPLORER</p>
    </div>
    <CategoryTree posts={posts} filteredSlugs={filteredSlugs} activeTags={activeTags} />
    <TagFilter allTags={allTags} activeTags={activeTags} onToggleTag={onToggleTag} />
  </div>
);

const BlogSidebar = (props: BlogSidebarProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<number>(readStoredWidth);
  const [isDragging, setIsDragging] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const maxRef = useRef<number>(MAX_WIDTH_CAP);
  const pendingRef = useRef<boolean>(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const aside = asideRef.current;
    if (!aside) return;

    const parent = aside.parentElement;
    if (!parent) return;

    const parentWidth = parent.getBoundingClientRect().width;
    maxRef.current = Math.min(parentWidth * 0.5, MAX_WIDTH_CAP);

    setIsDragging(true);
    document.body.classList.add("select-none");

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      const x = moveEvent.clientX;
      requestAnimationFrame(() => {
        pendingRef.current = false;
        const asideRect = asideRef.current?.getBoundingClientRect();
        if (!asideRect) return;
        const newWidth = Math.max(MIN_WIDTH, Math.min(x - asideRect.left, maxRef.current));
        setWidth(newWidth);
      });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.classList.remove("select-none");
      setIsDragging(false);
      pendingRef.current = false;
      setWidth((current) => {
        try {
          localStorage.setItem(STORAGE_KEY, String(current));
        } catch {
          // localStorage unavailable
        }
        return current;
      });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let handled = true;
    switch (e.key) {
      case "ArrowLeft":
        setWidth((prev) => Math.max(MIN_WIDTH, prev - KEYBOARD_STEP));
        break;
      case "ArrowRight":
        setWidth((prev) => Math.min(MAX_WIDTH_CAP, prev + KEYBOARD_STEP));
        break;
      case "Home":
        setWidth(MIN_WIDTH);
        break;
      case "End":
        setWidth(MAX_WIDTH_CAP);
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      try {
        const el = asideRef.current;
        if (el) {
          // Persist after keyboard adjustment
          requestAnimationFrame(() => {
            setWidth((current) => {
              try {
                localStorage.setItem(STORAGE_KEY, String(current));
              } catch {
                // localStorage unavailable
              }
              return current;
            });
          });
        }
      } catch {
        // safety
      }
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
    try {
      localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH));
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    return () => {
      document.body.classList.remove("select-none");
    };
  }, []);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-primary min-h-[44px] px-4 ml-2 mt-2 affordance-pulse"
            aria-label="Open blog file explorer"
          >
            <FolderTree className="h-4 w-4 mr-2" />
            <span className="text-xs tracking-wider">EXPLORER</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-background border-border w-72 p-0 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]">
          <SheetHeader className="px-3 pt-3">
            <SheetTitle className="font-display text-foreground text-glow tracking-wider text-left text-sm">
              BLOG EXPLORER
            </SheetTitle>
          </SheetHeader>
          <SidebarContent {...props} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      ref={asideRef}
      data-testid="blog-sidebar"
      className="relative flex-shrink-0 border-r border-border bg-card/30 overflow-y-auto"
      style={{ width }}
    >
      <SidebarContent {...props} />
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH_CAP}
        aria-label="Resize sidebar"
        tabIndex={0}
        data-testid="sidebar-resize-handle"
        className={`absolute top-0 right-0 w-2 h-full cursor-col-resize flex items-center justify-center ${
          isDragging ? "bg-primary/30" : "hover:bg-primary/20"
        }`}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
      >
        <div className={`w-px h-full ${isDragging ? "bg-primary" : "bg-border"}`} />
      </div>
    </aside>
  );
};

export default BlogSidebar;
