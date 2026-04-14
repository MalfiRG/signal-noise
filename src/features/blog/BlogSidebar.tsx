import { useIsMobile } from "@/hooks/use-mobile";
import { FolderTree } from "lucide-react";
import { useState } from "react";
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
      <p className="text-xs tracking-[0.2em] text-muted-foreground">FILE EXPLORER</p>
    </div>
    <CategoryTree posts={posts} filteredSlugs={filteredSlugs} activeTags={activeTags} />
    <TagFilter allTags={allTags} activeTags={activeTags} onToggleTag={onToggleTag} />
  </div>
);

const BlogSidebar = (props: BlogSidebarProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

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
    <aside className="w-[250px] flex-shrink-0 border-r border-border bg-card/30 overflow-y-auto">
      <SidebarContent {...props} />
    </aside>
  );
};

export default BlogSidebar;
