interface TagFilterProps {
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

const TagFilter = ({ allTags, activeTags, onToggleTag }: TagFilterProps) => {
  if (allTags.length === 0) return null;

  return (
    <div className="px-3 py-4 border-t border-border">
      <p className="text-xs tracking-[0.2em] text-muted-foreground mb-3">TAGS</p>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const isActive = activeTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              aria-pressed={isActive}
              className={`text-xs px-2 py-1 border rounded transition-colors tracking-wider ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              #{tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TagFilter;
