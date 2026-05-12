import { useLocation } from "react-router-dom";

export function useReadingMode() {
  const { pathname } = useLocation();
  return /^\/(blog|how-i-do-it)\/[^/]+/.test(pathname);
}
