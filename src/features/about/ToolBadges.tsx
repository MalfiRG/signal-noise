import { toolCategories } from "./data";

const ToolBadges = () => {
  return (
    <div className="space-y-6">
      {toolCategories.map((category) => (
        <div key={category.name}>
          <h3 className="text-xs tracking-[0.2em] text-muted-foreground mb-3 uppercase">
            {category.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {category.tools.map((tool) => (
              <span
                key={tool}
                className="text-xs border border-primary/30 text-primary/80 px-3 py-1 tracking-wider hover:border-primary hover:text-primary transition-colors"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToolBadges;
