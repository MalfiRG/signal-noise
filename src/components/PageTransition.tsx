/**
 * PageTransition — top-level AnimatePresence wrapper for route transitions.
 *
 * This is the FIRST tier of the two-tier transition system (spec A1):
 *   1. PageTransition (here) — catches cross-section navigation (Home→Blog, Blog→Projects)
 *   2. BlogLayout Outlet-level AnimatePresence — catches intra-blog navigation
 *
 * mode="wait" ensures exit completes before enter starts, preventing double-render flash.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { usePageVariant } from "@/lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const variant = usePageVariant();

  // Key on the top-level path segment so intra-section navigation
  // (e.g., /blog → /blog/slug) does NOT trigger this outer transition.
  // The BlogLayout's own AnimatePresence handles that.
  const topSegment = "/" + (location.pathname.split("/")[1] ?? "");

  return (
    <AnimatePresence mode="wait">
      <motion.div key={topSegment} {...variant}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
