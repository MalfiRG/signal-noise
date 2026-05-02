import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnimatedProgressBar from "./AnimatedProgressBar";
import { skills, learning } from "./data";
import { ScrollReveal, ScrollRevealItem } from "@/components/ScrollReveal";
import LetterReveal from "@/components/LetterReveal";
import { useMotionPolicy } from "@/lib/motion";

const Skills = () => {
  const { animationsDisabled } = useMotionPolicy();

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-12">
          <LetterReveal text="> cat ~/skills.json" tag="p" className="text-muted-foreground text-xs tracking-[0.3em] mb-2" delayPerLetter={20} skipAnimation={animationsDisabled} />
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">SKILLS</h1>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Tabs defaultValue="skills" className="w-full">
            <TabsList className="w-full justify-center bg-secondary/50 border border-border">
              {/* Inactive tabs explicitly use `text-foreground/70` so they
                  meet WCAG AA 4.5:1 contrast against the translucent
                  `bg-secondary/50` of TabsList. axe-DevTools previously
                  flagged these triggers (ratio 4.00). The active state
                  still wins via `data-[state=active]:text-primary` /
                  `text-learning`, so visual hierarchy is preserved:
                  active = themed accent color, inactive = bright neutral. */}
              <TabsTrigger
                value="skills"
                className="flex-1 tracking-wider text-sm md:text-lg text-foreground/70 data-[state=active]:text-primary data-[state=active]:text-glow"
              >
                SKILLS
              </TabsTrigger>
              <TabsTrigger
                value="learning"
                className="flex-1 tracking-wider text-sm md:text-lg text-foreground/70 data-[state=active]:text-learning"
              >
                LEARNING
              </TabsTrigger>
            </TabsList>

            <TabsContent value="skills" className="mt-8">
              <ScrollReveal className="grid grid-cols-1 md:grid-cols-2 gap-6" delay={0.4}>
                {skills.map((skill, index) => (
                  <ScrollRevealItem key={skill.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-foreground">{skill.name}</span>
                      <span className="text-base text-muted-foreground">{skill.level}%</span>
                    </div>
                    <AnimatedProgressBar
                      percentage={skill.level}
                      variant="primary"
                      delay={index * 0.1}
                    />
                    {skill.description && (
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {skill.description}
                      </p>
                    )}
                  </ScrollRevealItem>
                ))}
              </ScrollReveal>
            </TabsContent>

            <TabsContent value="learning" className="mt-8">
              <p className="text-muted-foreground text-base mb-6">
                Growth is a key part of my career. Currently expanding into these areas:
              </p>
              <ScrollReveal className="grid grid-cols-1 md:grid-cols-2 gap-6" delay={0.4}>
                {learning.map((item, index) => (
                  <ScrollRevealItem key={item.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-learning">{item.name}</span>
                      <span className="text-base text-learning/70">{item.level}%</span>
                    </div>
                    <AnimatedProgressBar
                      percentage={item.level}
                      variant="learning"
                      delay={index * 0.1}
                    />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </ScrollRevealItem>
                ))}
              </ScrollReveal>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Skills;
