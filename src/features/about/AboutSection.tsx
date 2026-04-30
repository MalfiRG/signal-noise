import { Github, Linkedin } from "lucide-react";
import { motion } from "framer-motion";
import ToolBadges from "./ToolBadges";
import { introText, socialLinks } from "./data";
import { useItemVariant, useMotionPolicy } from "@/lib/motion";
import LetterReveal from "@/components/LetterReveal";

const desktopStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.5, delayChildren: 0.3 } },
};

const PANEL_CLASS =
  "border border-border bg-card/50 p-6 hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/15 transition-all duration-200 group neon-border-trace";

const AboutSection = () => {
  const { animationsDisabled } = useMotionPolicy();
  const itemVariant = useItemVariant();
  const lastBioIndex = introText.bio.length - 1;

  const profilePanel = (
    <div className={PANEL_CLASS}>
      <div className={`cat-block space-y-3${animationsDisabled ? " motion-disabled" : ""}`}>
        <p className="cat-head">
          <LetterReveal tag="span" text="$ " className="pmt" delayPerLetter={40} startDelay={0} skipAnimation={animationsDisabled} />
          <LetterReveal tag="span" text="cat " delayPerLetter={40} startDelay={80} skipAnimation={animationsDisabled} />
          <LetterReveal tag="span" text="~/profile.txt" className="file" delayPerLetter={40} startDelay={240} skipAnimation={animationsDisabled} />
          <LetterReveal tag="span" text="— 1.2k // utf-8" className="meta" delayPerLetter={40} startDelay={760} skipAnimation={animationsDisabled} />
        </p>

        {introText.bio.map((paragraph, i) => (
          <p
            key={i}
            className={`text-foreground/80 text-sm leading-relaxed${i === lastBioIndex ? " cursor-blink" : ""}`}
          >
            {paragraph}
          </p>
        ))}

        <div className="flex gap-4 pt-4">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label={link.label}
            >
              {link.icon === "github" ? (
                <Github className="h-5 w-5" />
              ) : (
                <Linkedin className="h-5 w-5" />
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  const toolkitPanel = (
    <div className={PANEL_CLASS}>
      <div className={`cat-block space-y-3${animationsDisabled ? " motion-disabled" : ""}`}>
        <p className="cat-head">
          <LetterReveal tag="span" text="$ " className="pmt" delayPerLetter={40} startDelay={0} skipAnimation={animationsDisabled} />
          <LetterReveal tag="span" text="ls " delayPerLetter={40} startDelay={80} skipAnimation={animationsDisabled} />
          <LetterReveal tag="span" text="~/toolkit/" className="file" delayPerLetter={40} startDelay={200} skipAnimation={animationsDisabled} />
          <LetterReveal tag="span" text="— versioned" className="meta" delayPerLetter={40} startDelay={600} skipAnimation={animationsDisabled} />
        </p>
        <ToolBadges />
      </div>
    </div>
  );

  return (
    <section className="flex items-center pt-8 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-12">
          <LetterReveal
            text={introText.terminal}
            tag="p"
            className="text-muted-foreground text-xs tracking-[0.3em] mb-2"
            delayPerLetter={40}
            skipAnimation={animationsDisabled}
          />
          <h2 className="font-display text-4xl font-bold text-foreground text-glow">
            {introText.headline}
          </h2>
        </div>

        {animationsDisabled ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>{profilePanel}</div>
            <div>{toolkitPanel}</div>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            variants={desktopStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.div variants={itemVariant}>{profilePanel}</motion.div>
            <motion.div variants={itemVariant}>{toolkitPanel}</motion.div>
          </motion.div>
        )}

        <div className="ascii-div" aria-hidden="true">
          <span>──────────────────────────────────</span>
          <span className="tag">// END_OF_FILE</span>
          <span>──────────────────────────────────</span>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
