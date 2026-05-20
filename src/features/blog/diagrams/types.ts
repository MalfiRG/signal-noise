import { useReadingMode } from "./useReadingMode";

export type Mode = "inline" | "expanded" | "reading";

export function useDiagramMode(expanded: boolean): Mode {
  const isReadingMode = useReadingMode();
  if (expanded) return "expanded";
  return isReadingMode ? "reading" : "inline";
}
