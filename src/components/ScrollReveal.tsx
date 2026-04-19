import { motion } from "framer-motion";
import { staggerContainer, useItemVariant } from "@/lib/motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
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
