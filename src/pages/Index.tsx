import MatrixRain from "@/components/MatrixRain";
import AboutSection from "@/features/about/AboutSection";

const Index = () => {
  return (
    <>
      <MatrixRain />
      <div className="scanline fixed inset-0 z-10" />

      <section className="relative z-20 min-h-screen flex items-center justify-center overflow-hidden">
        {/* Ambient orbs — mix-blend-mode: screen ensures visibility behind canvas */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 hidden sm:block animate-hero-glow-slow pointer-events-none"
          style={{ backgroundColor: 'hsl(var(--hero-orb-primary))', mixBlendMode: 'screen' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 hidden sm:block animate-hero-glow-slower pointer-events-none"
          style={{ backgroundColor: 'hsl(var(--hero-orb-accent))', mixBlendMode: 'screen' }}
        />

        <div className="text-center px-4 max-w-3xl">
          <p className="text-muted-foreground text-sm tracking-[0.3em] mb-4 animate-fade-in opacity-0" style={{ animationDelay: "0.2s" }}>
            {">"} INITIALIZING SYSTEM...
          </p>

          <h1 className="font-display text-5xl md:text-7xl font-black text-foreground text-glow mb-6 animate-fade-in opacity-0" style={{ animationDelay: "0.6s" }}>
            SOFTWARE<br />
            DEVELOPER<br />
            IN TEST
          </h1>

          <div className="animate-fade-in opacity-0" style={{ animationDelay: "1s" }}>
            <p className="text-foreground/80 text-lg mb-8 leading-relaxed">
              Engineering quality into every line of code.<br />
              Automation architect. Bug hunter. System breaker.
            </p>
          </div>

          <div className="flex gap-4 justify-center animate-fade-in opacity-0" style={{ animationDelay: "1.4s" }}>
            <a
              href="/projects"
              className="border border-primary/50 bg-primary/10 px-8 py-3 text-sm tracking-widest text-primary hover:bg-primary/20 hover:border-primary transition-all box-glow"
            >
              VIEW PROJECTS
            </a>
            <a
              href="/blog"
              className="border border-border px-8 py-3 text-sm tracking-widest text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
            >
              READ BLOG
            </a>
          </div>

          <div className="mt-16 animate-fade-in opacity-0" style={{ animationDelay: "1.8s" }}>
            <p className="text-muted-foreground text-xs tracking-[0.2em] animate-glow-pulse">
              ▼ SCROLL TO EXPLORE ▼
            </p>
          </div>
        </div>
      </section>

      <div className="relative z-20">
        <AboutSection />
      </div>
    </>
  );
};

export default Index;
