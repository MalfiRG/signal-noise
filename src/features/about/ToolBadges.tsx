import { toolCategories } from "./data";

const ToolBadges = () => {
  return (
    <div className="tools-grid space-y-6">
      {toolCategories.map((category) => (
        <div key={category.name}>
          <h4>{category.name}</h4>
          <div className="row">
            {category.tools.map((tool) => (
              <span key={tool.name} className="badge">
                {tool.name}
                {tool.version !== null && <span className="ver">{tool.version}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToolBadges;
