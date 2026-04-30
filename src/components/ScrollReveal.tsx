import { motion } from "framer-motion";
import { staggerContainer, useItemVariant } from "@/lib/motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  margin?: string;
  delay?: number;
  stagger?: number;
}

const ScrollReveal = ({ children, className, margin = "-50px", delay, stagger }: ScrollRevealProps) => {
  const variants =
    delay !== undefined || stagger !== undefined
      ? {
          hidden: {},
          visible: {
            transition: {
              staggerChildren: stagger ?? 0.1,
              delayChildren: delay ?? 0.05,
            },
          },
        }
      : staggerContainer;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

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
