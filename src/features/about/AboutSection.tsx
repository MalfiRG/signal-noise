import { Github, Linkedin } from "lucide-react";
import ToolBadges from "./ToolBadges";
import { introText, socialLinks } from "./data";

const AboutSection = () => {
  return (
    <section className="flex items-center pt-8 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12">
          <p className="text-muted-foreground text-xs tracking-[0.3em] mb-2">
            {introText.terminal}
          </p>
          <h2 className="font-display text-4xl font-bold text-foreground text-glow">
            {introText.headline}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            {introText.bio.map((paragraph, i) => (
              <p
                key={i}
                className="text-foreground/80 text-sm leading-relaxed animate-fade-in opacity-0"
                style={{ animationDelay: `${0.2 + i * 0.2}s` }}
              >
                {paragraph}
              </p>
            ))}

            <div
              className="flex gap-4 pt-4 animate-fade-in opacity-0"
              style={{ animationDelay: "0.8s" }}
            >
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

          <div className="animate-fade-in opacity-0" style={{ animationDelay: "0.4s" }}>
            <ToolBadges />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
