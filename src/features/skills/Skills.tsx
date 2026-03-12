import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnimatedProgressBar from "./AnimatedProgressBar";
import { skills, learning } from "./data";

const Skills = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">
            {">"} cat ~/skills.json
          </p>
          <h1 className="font-display text-4xl font-bold text-foreground text-glow">SKILLS</h1>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Tabs defaultValue="skills" className="w-full">
            <TabsList className="w-full justify-center bg-secondary/50 border border-border">
              <TabsTrigger
                value="skills"
                className="flex-1 tracking-wider text-xs data-[state=active]:text-primary data-[state=active]:text-glow"
              >
                SKILLS
              </TabsTrigger>
              <TabsTrigger
                value="learning"
                className="flex-1 tracking-wider text-xs data-[state=active]:text-amber-500"
              >
                LEARNING
              </TabsTrigger>
            </TabsList>

            <TabsContent value="skills" className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {skills.map((skill, index) => (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{skill.name}</span>
                      <span className="text-sm text-muted-foreground">{skill.level}%</span>
                    </div>
                    <AnimatedProgressBar
                      percentage={skill.level}
                      variant="primary"
                      delay={index * 0.1}
                    />
                    {skill.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {skill.description}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="learning" className="mt-8">
              <p className="text-muted-foreground text-sm mb-6">
                Growth is a key part of my career. Currently expanding into these areas:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {learning.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-amber-500">{item.name}</span>
                      <span className="text-sm text-amber-500/70">{item.level}%</span>
                    </div>
                    <AnimatedProgressBar
                      percentage={item.level}
                      variant="learning"
                      delay={index * 0.1}
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Skills;
