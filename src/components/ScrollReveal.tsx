/**
 * ScrollReveal — reusable scroll-triggered stagger container.
 *
 * Replaces ad-hoc whileInView + inline stagger across components.
 * Uses staggerContainer for orchestration, and the theme-aware
 * useItemVariant hook for each child's entrance variant.
 *
 * Usage:
 *   <ScrollReveal>
 *     {items.map(item => (
 *       <ScrollRevealItem key={item.id}>
 *         <Card {...item} />
 *       </ScrollRevealItem>
 *     ))}
 *   </ScrollReveal>
 */

import { motion } from "framer-motion";
import { staggerContainer, useItemVariant } from "@/lib/motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Viewport margin for triggering reveal. Default: "-50px" */
  margin?: string;
}

const ScrollReveal = ({ children, className, margin = "-50px" }: ScrollRevealProps) => (
  <motion.div
    variants={staggerContainer}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin }}
    className={className}
  >
    {children}
  </motion.div>
);

interface ScrollRevealItemProps {
  children: React.ReactNode;
  className?: string;
}

const ScrollRevealItem = ({ children, className }: ScrollRevealItemProps) => {
  const itemVariant = useItemVariant();

  return (
    <motion.div variants={itemVariant} className={className}>
      {children}
    </motion.div>
  );
};

export { ScrollReveal, ScrollRevealItem };
