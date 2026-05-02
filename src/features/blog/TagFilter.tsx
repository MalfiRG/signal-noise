interface TagFilterProps {
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

const TagFilter = ({ allTags, activeTags, onToggleTag }: TagFilterProps) => {
  if (allTags.length === 0) return null;

  return (
    <div className="px-3 py-4 border-t border-border max-h-48 overflow-y-auto flex-shrink-0">
      <p className="text-base tracking-[0.2em] text-muted-foreground mb-3">TAGS</p>
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const isActive = activeTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              aria-pressed={isActive}
              className={`text-base px-2.5 py-1.5 border rounded transition-colors tracking-wider ${
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
