import { useMotionPolicy } from "@/lib/motion";
import { generateDataColumnContent } from "./dataColumnContent";

const DATA_COLUMN_TEXT = generateDataColumnContent();

const DataColumn = () => {
  const { animationsDisabled } = useMotionPolicy();
  return (
    <div
      className={`data-column${animationsDisabled ? " motion-disabled" : ""}`}
      aria-hidden="true"
    >
      <span className="dc-track">{DATA_COLUMN_TEXT}</span>
    </div>
  );
};

export default DataColumn;
