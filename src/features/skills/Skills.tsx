import { motion } from "framer-motion";
import { categories, tiers, type Tier } from "./data";
import LetterReveal from "@/components/LetterReveal";
import { useMotionPolicy, useItemVariant } from "@/lib/motion";

const TERMINAL_TEXT = "> cat ~/skills.json";
const DELAY_PER_LETTER_MS = 20;
const TERMINAL_DURATION_S = (TERMINAL_TEXT.length * DELAY_PER_LETTER_MS) / 1000;

const tierColor: Record<Tier, string> = {
  expert: "border-primary text-primary skill-glow-expert",
  strong: "border-accent text-accent skill-glow-strong",
  growing: "border-learning text-learning skill-glow-growing",
  exploring: "border-muted-foreground/50 text-muted-foreground skill-glow-exploring",
};

const tierDot: Record<Tier, string> = {
  expert: "bg-primary",
  strong: "bg-accent",
  growing: "bg-learning",
  exploring: "bg-muted-foreground/50",
};

const Skills = () => {
  const { animationsDisabled } = useMotionPolicy();
  const itemVariant = useItemVariant();

  const containerVariants = animationsDisabled
    ? {}
    : {
        hidden: {},
        visible: {
          transition: {
            delayChildren: TERMINAL_DURATION_S + 0.3,
            staggerChildren: 0.12,
          },
        },
      };

  const legendVariants = animationsDisabled
    ? {}
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { delay: TERMINAL_DURATION_S + 0.1, duration: 0.4 },
        },
      };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-10">
          <LetterReveal
            text={TERMINAL_TEXT}
            tag="p"
            className="text-muted-foreground text-xs tracking-[0.3em] mb-2"
            delayPerLetter={DELAY_PER_LETTER_MS}
            skipAnimation={animationsDisabled}
          />
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">
            TECH RADAR
          </h1>
        </div>

        {/* Tier legend - fades in after terminal text */}
        <motion.div
          className="flex flex-wrap gap-4 mb-10 text-sm"
          initial={animationsDisabled ? undefined : "hidden"}
          animate="visible"
          variants={legendVariants}
        >
          {(Object.entries(tiers) as [Tier, { label: string; description: string }][]).map(
            ([key, { label, description }]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${tierDot[key]}`} />
                <span className="text-foreground/80 font-medium">{label}</span>
                <span className="text-muted-foreground hidden sm:inline">
                  - {description}
                </span>
              </div>
            ),
          )}
        </motion.div>

        {/* Category grid - stacks after legend */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          initial={animationsDisabled ? undefined : "hidden"}
          animate="visible"
          variants={containerVariants}
        >
          {categories.map((category) => (
            <motion.div
              key={category.name}
              className="space-y-3"
              variants={itemVariant}
            >
              <h2 className="font-heading text-lg text-foreground/90 tracking-wide border-b border-border/50 pb-2">
                {category.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <span
                    key={item.name}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm cursor-default transition-shadow duration-200 ${tierColor[item.tier]}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${tierDot[item.tier]}`}
                    />
                    {item.name}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Skills;
