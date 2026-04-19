import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { usePageVariant } from "@/lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const variant = usePageVariant();
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
