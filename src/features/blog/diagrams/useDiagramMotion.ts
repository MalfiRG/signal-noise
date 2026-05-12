import { useReducedMotion } from "framer-motion";

export function useDiagramMotion() {
  const prefersReduced = !!useReducedMotion();
  return { animate: !prefersReduced };
}
