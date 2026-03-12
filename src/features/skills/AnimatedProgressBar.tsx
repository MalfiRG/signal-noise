import { motion } from "framer-motion";

interface AnimatedProgressBarProps {
  percentage: number;
  variant: "primary" | "learning";
  delay: number;
}

const AnimatedProgressBar = ({ percentage, variant, delay }: AnimatedProgressBarProps) => (
  <div className="h-2 bg-secondary rounded-sm overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${percentage}%` }}
      transition={{ duration: 1, delay }}
      className={`h-full rounded-sm ${
        variant === "primary" ? "bg-primary" : "bg-amber-500"
      }`}
    />
  </div>
);

export default AnimatedProgressBar;
